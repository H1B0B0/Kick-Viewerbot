import time
from pathlib import Path
from types import SimpleNamespace

import pytest
import requests

from backend.creator.accounts import AccountError, Accounts
from tests.backend.test_creator_studio import Vault


def test_twitch_device_uses_public_client_and_verified_identity(tmp_path, monkeypatch):
    accounts = Accounts(tmp_path, vault=Vault(), config={"twitch_client_id": "public-id"})
    calls = []
    def request(method, url, **kwargs):
        calls.append((url, kwargs))
        if url.endswith("/device"):
            return {"verification_uri": "https://www.twitch.tv/activate", "device_code": "private-code", "user_code": "ABCD", "expires_in": 600}
        return {"client_id": "public-id", "user_id": "creator-id", "login": "creator", "scopes": ["clips:edit"]}
    monkeypatch.setattr(accounts, "request", request)
    monkeypatch.setattr("backend.creator.accounts.Thread", lambda **kwargs: SimpleNamespace(start=lambda: None))
    result = accounts.connect_twitch()
    assert result == {"url": "https://www.twitch.tv/activate", "user_code": "ABCD"}
    assert "client_secret" not in calls[0][1]["data"]
    accounts._save("twitch", {"access_token": "private-token", "refresh_token": "private-refresh", "expires_in": 3600})
    assert accounts.status()[0]["state"] == "connected"
    assert accounts.status()[0]["name"] == "creator"


def test_twitch_rejects_wrong_client_or_missing_scope(tmp_path, monkeypatch):
    accounts = Accounts(tmp_path, vault=Vault(), config={"twitch_client_id": "public-id"})
    monkeypatch.setattr(accounts, "request", lambda *args, **kwargs: {"client_id": "other-id", "scopes": []})
    with pytest.raises(AccountError, match="platform_permission_denied"):
        accounts._save("twitch", {"access_token": "invalid"})
    assert accounts.vault.get("twitch") is None


def test_upload_uses_explicit_audience_and_platform_confirmed_visibility(tmp_path):
    events = []
    class Http:
        def post(self, url, **kwargs):
            events.append((url, kwargs))
            return SimpleNamespace(ok=True, headers={"Location": "https://www.googleapis.com/upload/session"})
        def put(self, url, **kwargs):
            assert kwargs["data"].read() == b"owned-video"
            return SimpleNamespace(ok=True, json=lambda: {"id": "verified-id", "status": {"privacyStatus": "private"}})
    accounts = Accounts(tmp_path, vault=Vault(), config={}, http=Http())
    accounts.vault.set("youtube", {"access_token": "private", "expires_at": time.time() + 3600})
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"owned-video")
    result = accounts.upload_youtube(path, "Title", "Description", "public", made_for_kids=True)
    assert events[0][1]["json"]["status"] == {"privacyStatus": "public", "selfDeclaredMadeForKids": True}
    assert result["privacy"] == "private"
    assert result["state"] == "uploaded" and result["video_id"] == "verified-id"


def test_upload_timeout_is_unknown_not_retryable_success(tmp_path):
    class Http:
        def post(self, *args, **kwargs):
            return SimpleNamespace(ok=True, headers={"Location": "https://www.googleapis.com/upload/session"})
        def put(self, *args, **kwargs):
            raise requests.Timeout()
    accounts = Accounts(tmp_path, vault=Vault(), config={}, http=Http())
    accounts.vault.set("youtube", {"access_token": "private", "expires_at": time.time() + 3600})
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"owned-video")
    with pytest.raises(AccountError, match="upload_outcome_unknown"):
        accounts.upload_youtube(path, "Title", "", "private")


def test_upload_rejects_untrusted_redirect_location(tmp_path):
    http = SimpleNamespace(post=lambda *args, **kwargs: SimpleNamespace(ok=True, headers={"Location": "https://malicious.invalid/upload"}))
    accounts = Accounts(tmp_path, vault=Vault(), config={}, http=http)
    accounts.vault.set("youtube", {"access_token": "private", "expires_at": time.time() + 3600})
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"owned-video")
    with pytest.raises(AccountError, match="upload_start_failed"):
        accounts.upload_youtube(path, "Title", "")
