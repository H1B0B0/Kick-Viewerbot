import subprocess
import time
from threading import Event

from backend import main
from backend.creator.accounts import AccountError, Accounts
from backend.creator.media import executable, render_clip
from backend.creator.service import CreatorService
from tests.backend.test_creator_studio import Vault, accounts, client, headers, service


def test_creator_growth_beta_returns_local_workspace_stats() -> None:
    stats = main.get_stats()

    assert "cpu" in stats
    assert "memory" in stats
    assert "network_up" in stats
    assert "network_down" in stats
    assert stats["status"]["code"] == "ready"
    assert stats["status"]["message"] == "Creator Studio active"


def test_creator_growth_beta_disables_legacy_controls() -> None:
    assert main.creator_growth_beta_enabled() is True
    assert main.legacy_synthetic_controls_allowed() is False


def test_health_endpoint_contract() -> None:
    main.app.instance_nonce = "test-nonce-123"
    main.app.server_port = 54321
    with main.app.test_client() as test_client:
        res = test_client.get("/health")
    assert res.status_code == 200
    payload = res.get_json()
    assert payload["status"] == "healthy"
    assert payload["protocol_version"] == 1
    assert payload["instance_nonce"] == "test-nonce-123"
    assert payload["port"] == 54321
    assert payload["ready"] is True
    assert payload["lifecycle_state"] == "creator_growth_beta"
    assert payload["creator_growth_beta"] is True
    assert payload["legacy_synthetic_controls_enabled"] is False


def test_youtube_live_and_multiplatform_peak_detection(tmp_path, monkeypatch) -> None:
    accounts = Accounts(tmp_path, vault=Vault(), config={"google_client_id": "pub.apps.googleusercontent.com"})
    assert accounts.youtube_live() is None

    accounts.vault.set("youtube", {"access_token": "yt-token", "expires_at": time.time() + 3600})
    broadcasts = [
        {
            "id": "yt-live-1",
            "snippet": {
                "title": "YouTube Stream Live",
                "actualStartTime": "2026-11-03T12:00:00Z",
            },
            "statistics": {"concurrentViewers": "100"},
        }
    ]
    monkeypatch.setattr(accounts, "request", lambda *args, **kwargs: {"items": list(broadcasts)})
    live_info = accounts.youtube_live()
    assert live_info == {
        "provider": "youtube",
        "live": True,
        "id": "yt-live-1",
        "title": "YouTube Stream Live",
        "viewer_count": 100,
        "started_at": "2026-11-03T12:00:00Z",
        "url": "https://www.youtube.com/watch?v=yt-live-1",
    }

    svc = CreatorService(tmp_path / "data", accounts=accounts)
    svc.refresh_live()
    assert svc.live_snapshot is not None
    assert svc.live_snapshot["provider"] == "youtube"
    assert svc.live_snapshot["viewer_count"] == 100
    assert svc.live_snapshot["peak_detected"] is False

    broadcasts[0]["statistics"]["concurrentViewers"] = "150"
    svc.refresh_live()
    assert svc.live_snapshot["viewer_count"] == 150
    assert svc.live_snapshot["peak_detected"] is True

    broadcasts.clear()
    assert accounts.youtube_live() == {"provider": "youtube", "live": False}
    svc.refresh_live()
    assert svc.live_snapshot is None


def test_kick_channel_connect_and_disconnect(client) -> None:
    initial = client.get("/creator/workspace", headers=headers).get_json()["accounts"]
    kick_initial = next(acc for acc in initial if acc["provider"] == "kick")
    assert kick_initial["state"] == "local_media"
    assert kick_initial["configured"] is False

    res = client.post("/creator/accounts/kick/connect", headers=headers, json={"channel": "https://kick.com/streamer_pro"})
    assert res.status_code == 200
    data = res.get_json()
    assert data == {
        "provider": "kick",
        "configured": True,
        "state": "connected",
        "name": "streamer_pro",
        "error": None,
    }

    after_connect = client.get("/creator/workspace", headers=headers).get_json()["accounts"]
    kick_connected = next(acc for acc in after_connect if acc["provider"] == "kick")
    assert kick_connected["state"] == "connected"
    assert kick_connected["configured"] is True
    assert kick_connected["name"] == "streamer_pro"

    disc = client.post("/creator/accounts/kick/disconnect", headers=headers)
    assert disc.status_code == 200
    assert disc.get_json()["disconnected"] is True

    after_disc = client.get("/creator/workspace", headers=headers).get_json()["accounts"]
    kick_disc = next(acc for acc in after_disc if acc["provider"] == "kick")
    assert kick_disc["state"] == "local_media"
    assert kick_disc["configured"] is False
    assert kick_disc["name"] is None


def test_resilient_disconnect_deletes_token_when_revocation_fails(tmp_path, monkeypatch) -> None:
    accounts = Accounts(tmp_path, vault=Vault(), config={"twitch_client_id": "public-id"})
    accounts.vault.set("twitch", {"access_token": "expired-token", "expires_at": time.time() + 3600})

    def failing_revoke(*args, **kwargs):
        raise AccountError("platform_request_failed")

    monkeypatch.setattr(accounts, "request", failing_revoke)
    accounts.disconnect("twitch")
    assert accounts.vault.get("twitch") is None


def test_render_clip_crop_framing_produces_vertical_video(tmp_path) -> None:
    source = tmp_path / "source.mp4"
    output = tmp_path / "cropped.mp4"
    subprocess.run(
        [
            executable(),
            "-v",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=320x180:rate=15",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=500:sample_rate=8000",
            "-t",
            "6",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            str(source),
        ],
        check=True,
        timeout=30,
    )
    render_clip(source, output, 0, 5, Event(), framing="crop")
    assert output.is_file() and output.stat().st_size > 0
    probe = subprocess.run([executable(), "-hide_banner", "-i", str(output)], capture_output=True, text=True, timeout=20)
    assert "720x1280" in probe.stderr


def test_metrics_history_is_bounded_to_20_entries(service, monkeypatch) -> None:
    monkeypatch.setattr(service.accounts, "youtube_metrics", lambda ids: [])
    for i in range(25):
        service.store.create("metrics", platform="youtube", source="YouTube Data API", fetched_at=f"t-{i}", videos=[])
    snap = service.snapshot()
    assert len(snap["metrics"]) == 20
    assert len(service.store.list("metrics")) == 20
