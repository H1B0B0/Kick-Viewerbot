import io
import json
import subprocess
import time
from pathlib import Path
from threading import Event
from urllib.parse import parse_qs, urlparse

import pytest
from flask import Flask

from backend.creator.accounts import AccountError, Accounts
from backend.creator.media import executable, inspect_video, select_windows, render_clip, Cancelled
from backend.creator.service import CreatorService, create_blueprint
from backend.creator.store import Store


class Vault:
    def __init__(self):
        self.values = {}
    def get(self, provider):
        return self.values.get(provider)
    def set(self, provider, value):
        self.values[provider] = value
    def delete(self, provider):
        self.values.pop(provider, None)


@pytest.fixture
def accounts(tmp_path):
    return Accounts(tmp_path, vault=Vault(), config={})


@pytest.fixture
def service(tmp_path, accounts):
    return CreatorService(tmp_path / "data", accounts=accounts)


@pytest.fixture
def client(service):
    app = Flask(__name__)
    app.instance_nonce = "test-nonce"
    app.server_port = 8765
    app.register_blueprint(create_blueprint(service))
    return app.test_client()


headers = {"X-VelBots-Nonce": "test-nonce"}


def test_local_auth_and_missing_configuration(client):
    assert client.get("/creator/workspace").status_code == 401
    snapshot = client.get("/creator/workspace", headers=headers).json
    assert all(not account["configured"] for account in snapshot["accounts"])
    assert snapshot["encoder_ready"] is True
    assert client.post("/creator/accounts/twitch/connect", headers=headers).json["error"] == "twitch_application_missing"
    assert client.post("/creator/accounts/youtube/connect", headers=headers).json["error"] == "google_application_missing"


def test_bad_media_rejected_without_saved_source(client, service):
    response = client.post("/creator/sources", headers=headers, data={"file": (io.BytesIO(b"not a video"), "test.mp4")})
    assert response.status_code == 400
    assert response.json["error"] == "invalid_video"
    assert service.store.list("source") == []
    assert list((service.store.root / "sources").iterdir()) == []


def test_selection_no_overlap_and_silent_fallback():
    values = [0.0] * 180
    values[70], values[75], values[140] = 10, 5, 8
    windows = select_windows(values, 180, 30, 3)
    assert len(windows) == 2
    assert all(b["start"] >= a["start"] + a["duration"] for a, b in zip(windows, windows[1:]))
    assert select_windows([], 10, 30, 3) == [{"start": 0, "duration": 10, "reason": "sampled"}]


def test_restart_interrupts_jobs_and_does_not_retry_unknown_uploads(tmp_path):
    store = Store(tmp_path)
    job = store.create("job", state="rendering")
    clip = store.create("clip", publication={"state": "uploading"})
    restarted = Store(tmp_path)
    assert restarted.get(job["id"])["state"] == "interrupted"
    assert restarted.get(clip["id"])["publication"]["state"] == "unknown"


def test_real_import_render_preview_download_edit_export(client, service, tmp_path):
    video = tmp_path / "owned-recording.mp4"
    subprocess.run([executable(), "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=15",
                    "-f", "lavfi", "-i", "sine=frequency=800:sample_rate=8000", "-t", "12", "-c:v", "libx264", "-c:a", "aac", str(video)], check=True, timeout=30)
    with video.open("rb") as handle:
        response = client.post("/creator/sources", headers=headers, data={"file": (handle, "owned-recording.mp4")})
    assert response.status_code == 201
    source = response.json
    assert "path" not in source
    assert 11.9 <= source["duration"] <= 12.1
    queued = client.post("/creator/jobs", headers=headers, json={"source_id": source["id"], "count": 2, "length": 5})
    assert queued.status_code == 202
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        job = service.store.get(queued.json["id"])
        if job["state"] not in {"queued", "analyzing", "rendering"}:
            break
        time.sleep(0.1)
    assert job["state"] == "ready", job
    snapshot = client.get("/creator/workspace", headers=headers).json
    assert len(snapshot["clips"]) >= 1
    clip = snapshot["clips"][0]
    assert "path" not in clip
    path = Path(service.store.get(clip["id"])["path"])
    assert 4.9 <= inspect_video(path) <= 5.1
    probe = subprocess.run([executable(), "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    assert "720x1280" in probe.stderr
    assert "h264" in probe.stderr and "aac" in probe.stderr
    assert client.get(f"/creator/clips/{clip['id']}/media").status_code == 401
    preview = client.get(clip["media_url"])
    assert preview.status_code == 200 and preview.data[4:8] == b"ftyp"
    assert client.get(clip["media_url"], headers={"Range": "bytes=0-99"}).status_code == 206
    download = client.get(clip["media_url"] + "&download=1")
    assert "attachment" in download.headers["Content-Disposition"]
    assert client.patch(f"/creator/clips/{clip['id']}", headers=headers, json={"title": "=danger", "description": "Reviewed"}).status_code == 200
    csv = client.get("/creator/export", headers=headers)
    assert "'=danger" in csv.text
    assert client.post(f"/creator/clips/{clip['id']}/publish", headers=headers, json={"confirmed": False}).json["error"] == "publication_confirmation_required"
    assert client.delete(f"/creator/clips/{clip['id']}", headers=headers).status_code == 200
    assert not path.exists()


def test_cancelled_render_removes_partial_file(tmp_path):
    output = tmp_path / "clip.mp4"
    cancel = Event()
    cancel.set()
    with pytest.raises(Cancelled):
        render_clip(tmp_path / "missing.mp4", output, 0, 5, cancel)
    assert not output.exists()


def test_google_pkce_state_expiry_replay_and_no_local_tokens(accounts, monkeypatch):
    accounts.config = {"google_client_id": "public-desktop-id"}
    request = accounts.connect_youtube("http://127.0.0.1:8765/creator/oauth/youtube/callback")
    query = parse_qs(urlparse(request["url"]).query)
    assert query["code_challenge_method"] == ["S256"]
    assert query["redirect_uri"][0].startswith("http://127.0.0.1:")
    with pytest.raises(AccountError, match="invalid_oauth_state"):
        accounts.complete_youtube("tampered", "code")
    pending = accounts.pending["youtube"]
    requests = []
    def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        if url.endswith("/token"):
            return {"access_token": "private-test-token", "refresh_token": "private-test-refresh", "expires_in": 3600}
        return {"items": [{"id": "channel-id", "snippet": {"title": "Creator"}}]}
    monkeypatch.setattr(accounts, "request", fake_request)
    accounts.complete_youtube(query["state"][0], "approved-code")
    assert requests[0][2]["data"]["code_verifier"] == pending["verifier"]
    assert "private-test-token" not in json.dumps(accounts.status())
    with pytest.raises(AccountError, match="invalid_oauth_state"):
        accounts.complete_youtube(query["state"][0], "approved-code")
    accounts.connect_youtube("http://127.0.0.1:8765/callback")
    accounts.pending["youtube"]["expires_at"] = 0
    assert accounts.status()[1]["state"] == "connected"
    assert "youtube" not in accounts.pending


def test_refresh_preserves_refresh_token(accounts, monkeypatch):
    accounts.config = {"google_client_id": "public-id"}
    accounts.vault.set("youtube", {"access_token": "expired", "refresh_token": "keep", "expires_at": 0})
    monkeypatch.setattr(accounts, "request", lambda *args, **kwargs: {"access_token": "renewed", "expires_in": 3600})
    assert accounts.token("youtube")["refresh_token"] == "keep"
    assert accounts.token("youtube")["access_token"] == "renewed"


def test_unknown_publication_cannot_duplicate(service):
    service.accounts.vault.set("youtube", {"access_token": "valid", "expires_at": time.time() + 3600})
    clip = service.store.create("clip", publication={"state": "unknown"})
    with pytest.raises(AccountError, match="publication_already_submitted"):
        service.publish(clip["id"], "Title", "", "private", None)


def test_auto_clips_require_opt_in_peak_and_cooldown(service, monkeypatch):
    live = {"id": "live-id", "title": "My live", "started_at": "now", "viewer_count": 100}
    monkeypatch.setattr(service.accounts, "twitch_live", lambda: dict(live))
    captures = []
    monkeypatch.setattr(service, "capture_twitch_clip", lambda: captures.append(True))
    service.refresh_live()
    live["viewer_count"] = 150
    service.refresh_live()
    assert not captures
    service.auto_clips = True
    live["viewer_count"] = 200
    service.refresh_live()
    assert len(captures) == 1
    live["viewer_count"] = 300
    service.refresh_live()
    assert len(captures) == 1
