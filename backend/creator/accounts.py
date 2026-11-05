from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import sys
import time
from pathlib import Path
from threading import RLock, Thread
from urllib.parse import urlencode, urlparse

import requests


class AccountError(ValueError):
    pass


class TokenVault:
    """OAuth tokens live in the OS credential store, never in browser storage or SQLite."""
    def __init__(self):
        import keyring
        self.keyring = keyring
        self.scope = {}

    def configure_scope(self, account_id: str, config: dict) -> None:
        self.scope = {provider: hashlib.sha256((account_id + ':' + config.get(key, '')).encode()).hexdigest()
                      for provider, key in (("twitch", "twitch_client_id"), ("youtube", "google_client_id"))}

    def key(self, provider: str) -> str:
        return provider + ':' + self.scope[provider] if provider in self.scope else provider

    def get(self, provider: str) -> dict | None:
        try:
            raw = self.keyring.get_password("VelBots Creator V4", self.key(provider))
            return json.loads(raw) if raw else None
        except Exception as exc:
            raise AccountError("credential_store_unavailable") from exc

    def set(self, provider: str, payload: dict) -> None:
        try:
            self.keyring.set_password("VelBots Creator V4", self.key(provider), json.dumps(payload))
        except Exception as exc:
            raise AccountError("credential_store_unavailable") from exc

    def delete(self, provider: str) -> None:
        if self.get(provider):
            self.keyring.delete_password("VelBots Creator V4", self.key(provider))


def load_config(root: Path) -> dict:
    bundled = Path(getattr(sys, "_MEIPASS", Path(__file__).parents[2])) / "creator-oauth.json"
    config = {}
    for path in (bundled, root / "oauth-config.json"):
        if path.is_file():
            config.update(json.loads(path.read_text(encoding="utf-8")))
    config["twitch_client_id"] = os.getenv("VELBOTS_TWITCH_CLIENT_ID", config.get("twitch_client_id", ""))
    config["google_client_id"] = os.getenv("VELBOTS_GOOGLE_CLIENT_ID", config.get("google_client_id", ""))
    config["google_client_secret"] = os.getenv("VELBOTS_GOOGLE_CLIENT_SECRET", config.get("google_client_secret", ""))
    return config


class Accounts:
    TWITCH_SCOPES = "clips:edit"
    GOOGLE_SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"

    def __init__(self, root: Path, vault=None, http=None, config=None, store=None):
        self.root = Path(root).resolve()
        self.store = store
        self.config = config if config is not None else load_config(self.root)
        self.vault = vault if vault is not None else TokenVault()
        self.http = http if http is not None else requests.Session()
        self.lock = RLock()
        self.pending: dict[str, dict] = {}
        self.errors: dict[str, str] = {}
        self.account_id: str | None = None
        self.generation = 0

    def _db_path(self) -> Path:
        if self.store is not None and hasattr(self.store, "path"):
            return Path(self.store.path)
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        return self.root / "creator.sqlite"

    def _get_kick_channel(self) -> str | None:
        db_path = self._db_path()
        if not db_path.exists():
            return None
        try:
            with sqlite3.connect(db_path, timeout=30) as db:
                db.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
                row = db.execute("SELECT value FROM settings WHERE key='kick_channel'").fetchone()
                if row and row[0]:
                    return str(row[0])
                row_rec = db.execute("SELECT payload FROM records WHERE kind='settings' ORDER BY rowid DESC LIMIT 1").fetchone()
                if row_rec:
                    data = json.loads(row_rec[0])
                    if data.get("kick_channel"):
                        return str(data["kick_channel"])
        except Exception:
            return None
        return None

    def _set_kick_channel(self, channel_slug: str | None) -> None:
        db_path = self._db_path()
        with self.lock, sqlite3.connect(db_path, timeout=30) as db:
            db.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL)")
            if channel_slug:
                db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('kick_channel', ?)", (channel_slug,))
                payload = {"id": "kick_settings", "kick_channel": channel_slug}
                db.execute("INSERT OR REPLACE INTO records (id, kind, payload) VALUES ('kick_settings', 'settings', ?)", (json.dumps(payload),))
            else:
                db.execute("DELETE FROM settings WHERE key='kick_channel'")
                db.execute("DELETE FROM records WHERE id='kick_settings' OR kind='settings'")

    def connect_kick(self, channel_slug: str) -> dict:
        raw = (channel_slug or "").strip()
        for prefix in ("https://kick.com/", "http://kick.com/", "kick.com/"):
            if raw.lower().startswith(prefix):
                raw = raw[len(prefix):].split("/")[0].split("?")[0]
                break
        slug = raw.lstrip("@").strip()
        if not slug or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", slug):
            raise AccountError("invalid_kick_channel")
        self._set_kick_channel(slug)
        self.errors.pop("kick", None)
        return {"provider": "kick", "configured": True, "state": "connected", "name": slug, "error": None}

    def configure(self, payload: dict) -> bool:
        """Accept only the native/public client contract of the authenticated VelBots API."""
        try:
            owner, twitch, google = payload['account_id'], payload['twitch'], payload['youtube']
            twitch_id, google_id = twitch['client_id'], google['client_id']
            secret = google.get('client_secret', '')
            if (payload['protocol_version'] != 1 or twitch['kind'] != 'public' or google['kind'] != 'desktop'
                    or not isinstance(owner, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', owner)
                    or not isinstance(twitch_id, str) or (twitch_id and not re.fullmatch(r'[A-Za-z0-9]{5,128}', twitch_id))
                    or not isinstance(google_id, str) or (google_id and not re.fullmatch(r'[A-Za-z0-9_-]+\.apps\.googleusercontent\.com', google_id))
                    or not isinstance(secret, str) or len(secret) > 512):
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            raise AccountError('invalid_provider_configuration') from None
        config = {'twitch_client_id': twitch_id, 'google_client_id': google_id, 'google_client_secret': secret if google_id else ''}
        with self.lock:
            changed = self.account_id != owner or self.config != config
            if changed:
                self.generation += 1
                self.pending.clear()
                self.errors.clear()
                self.config = config
                self.account_id = owner
                if hasattr(self.vault, 'configure_scope'):
                    self.vault.configure_scope(owner, config)
            return changed

    def lock_context(self):
        with self.lock:
            self.generation += 1
            self.pending.clear()
            self.errors.clear()
            self.config = {}
            self.account_id = None
            if hasattr(self.vault, 'configure_scope'):
                self.vault.configure_scope('locked', {})

    def request(self, method: str, url: str, **kwargs) -> dict:
        try:
            response = self.http.request(method, url, timeout=25, **kwargs)
        except requests.RequestException as exc:
            raise AccountError("platform_unreachable") from exc
        if response.status_code == 429:
            raise AccountError("platform_rate_limited")
        if response.status_code in {401, 403}:
            raise AccountError("platform_permission_denied")
        if not response.ok:
            raise AccountError("platform_request_failed")
        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError as exc:
            raise AccountError("platform_invalid_response") from exc

    def status(self) -> list[dict]:
        with self.lock:
            for provider, pending in list(self.pending.items()):
                if pending["expires_at"] < time.time():
                    self.pending.pop(provider, None)
                    self.errors[provider] = "authorization_expired"
        result = []
        for provider in ("twitch", "youtube"):
            configured = bool(self.config.get("twitch_client_id" if provider == "twitch" else "google_client_id"))
            try:
                token = self.vault.get(provider) if configured else None
                error = self.errors.get(provider)
            except AccountError as exc:
                token, error = None, str(exc)
            result.append({
                "provider": provider, "configured": configured,
                "state": "connected" if token else "authorizing" if provider in self.pending else "disconnected",
                "name": token.get("name") if token else None, "error": error,
            })
        kick_channel = self._get_kick_channel()
        result.append({
            "provider": "kick",
            "configured": bool(kick_channel),
            "state": "connected" if kick_channel else "local_media",
            "name": kick_channel,
            "error": self.errors.get("kick"),
        })
        return result

    def connect_twitch(self) -> dict:
        client_id = self.config.get("twitch_client_id")
        if not client_id:
            raise AccountError("twitch_application_missing")
        payload = self.request("POST", "https://id.twitch.tv/oauth2/device", data={"client_id": client_id, "scopes": self.TWITCH_SCOPES})
        url = payload["verification_uri"]
        if urlparse(url).scheme != "https" or urlparse(url).hostname not in {"www.twitch.tv", "twitch.tv"}:
            raise AccountError("invalid_authorization_url")
        pending = {"code": payload["device_code"], "expires_at": time.time() + payload["expires_in"], "interval": max(5, payload.get("interval", 5))}
        with self.lock:
            self.pending["twitch"] = pending
            self.errors.pop("twitch", None)
        Thread(target=self._poll_twitch, args=(pending,), daemon=True).start()
        return {"url": url, "user_code": payload["user_code"]}

    def _poll_twitch(self, pending: dict) -> None:
        try:
            while time.time() < pending["expires_at"] and self.pending.get("twitch") is pending:
                time.sleep(pending["interval"])
                response = self.http.post("https://id.twitch.tv/oauth2/token", data={
                    "client_id": self.config["twitch_client_id"], "scopes": self.TWITCH_SCOPES,
                    "device_code": pending["code"], "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                }, timeout=25)
                payload = response.json()
                if payload.get("message") == "authorization_pending" or payload.get("error") == "authorization_pending":
                    continue
                if payload.get("error") == "slow_down" or payload.get("message") == "slow_down":
                    pending["interval"] += 5
                    continue
                if not response.ok:
                    raise AccountError("authorization_denied")
                with self.lock:
                    if self.pending.get("twitch") is not pending:
                        return
                    self._save("twitch", payload)
                return
            raise AccountError("authorization_expired")
        except Exception as exc:
            if self.pending.get("twitch") is pending:
                self.errors["twitch"] = str(exc) if isinstance(exc, AccountError) else "authorization_failed"
        finally:
            if self.pending.get("twitch") is pending:
                self.pending.pop("twitch", None)

    def connect_youtube(self, callback: str) -> dict:
        if not self.config.get("google_client_id"):
            raise AccountError("google_application_missing")
        verifier = secrets.token_urlsafe(48)
        state = secrets.token_urlsafe(32)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        self.pending["youtube"] = {"state": state, "verifier": verifier, "callback": callback, "expires_at": time.time() + 600}
        self.errors.pop("youtube", None)
        return {"url": "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
            "client_id": self.config["google_client_id"], "redirect_uri": callback,
            "response_type": "code", "scope": self.GOOGLE_SCOPES, "access_type": "offline",
            "prompt": "consent", "state": state, "code_challenge": challenge, "code_challenge_method": "S256",
        })}

    def complete_youtube(self, state: str, code: str, denied=False) -> None:
        with self.lock:
            pending = self.pending.get("youtube")
            if not pending or not secrets.compare_digest(pending["state"], state) or pending["expires_at"] < time.time():
                raise AccountError("invalid_oauth_state")
            self.pending.pop("youtube")
            generation, config = self.generation, dict(self.config)
        if denied or not code:
            self.errors["youtube"] = "authorization_denied"
            raise AccountError("authorization_denied")
        try:
            data = {"client_id": config["google_client_id"], "code": code,
                    "code_verifier": pending["verifier"], "redirect_uri": pending["callback"], "grant_type": "authorization_code"}
            if config.get("google_client_secret"):
                data["client_secret"] = config["google_client_secret"]
            result = self.request("POST", "https://oauth2.googleapis.com/token", data=data)
            with self.lock:
                if generation != self.generation:
                    raise AccountError('authorization_expired')
                self._save("youtube", result)
        except AccountError as exc:
            self.errors["youtube"] = str(exc)
            raise

    def _save(self, provider: str, payload: dict) -> None:
        token = {**payload, "expires_at": time.time() + payload.get("expires_in", 3600)}
        if provider == "twitch":
            identity = self.request("GET", "https://id.twitch.tv/oauth2/validate", headers={"Authorization": "OAuth " + token["access_token"]})
            if identity.get("client_id") != self.config["twitch_client_id"] or "clips:edit" not in identity.get("scopes", []):
                raise AccountError("platform_permission_denied")
            token.update(user_id=identity["user_id"], name=identity["login"], validated_at=time.time())
        else:
            channels = self.request("GET", "https://www.googleapis.com/youtube/v3/channels", params={"part": "snippet", "mine": "true"}, headers={"Authorization": "Bearer " + token["access_token"]})
            if not channels.get("items"):
                raise AccountError("youtube_channel_missing")
            channel = channels["items"][0]
            token.update(user_id=channel["id"], name=channel["snippet"]["title"])
        self.vault.set(provider, token)

    def token(self, provider: str) -> dict:
        with self.lock:
            token = self.vault.get(provider)
            if not token:
                raise AccountError("account_not_connected")
            if token.get("expires_at", 0) < time.time() + 60:
                if not token.get("refresh_token"):
                    raise AccountError("reconnect_required")
                data = {"client_id": self.config["twitch_client_id" if provider == "twitch" else "google_client_id"],
                        "grant_type": "refresh_token", "refresh_token": token["refresh_token"]}
                url = "https://id.twitch.tv/oauth2/token" if provider == "twitch" else "https://oauth2.googleapis.com/token"
                if provider == "youtube" and self.config.get("google_client_secret"):
                    data["client_secret"] = self.config["google_client_secret"]
                refreshed = self.request("POST", url, data=data)
                token.update(refreshed, expires_at=time.time() + refreshed["expires_in"])
                self.vault.set(provider, token)
            if provider == "twitch" and time.time() - token.get("validated_at", 0) >= 3600:
                self.request("GET", "https://id.twitch.tv/oauth2/validate", headers={"Authorization": "OAuth " + token["access_token"]})
                token["validated_at"] = time.time()
                self.vault.set(provider, token)
            return token

    def twitch_live(self) -> dict | None:
        token = self.token("twitch")
        data = self.request("GET", "https://api.twitch.tv/helix/streams", params={"user_id": token["user_id"]}, headers={
            "Authorization": "Bearer " + token["access_token"], "Client-Id": self.config["twitch_client_id"],
        })
        return data["data"][0] if data.get("data") else None

    def youtube_live(self) -> dict | None:
        try:
            token = self.token("youtube")
            data = self.request(
                "GET",
                "https://www.googleapis.com/youtube/v3/liveBroadcasts",
                params={"part": "snippet,status,statistics", "broadcastStatus": "active", "mine": "true"},
                headers={"Authorization": "Bearer " + token["access_token"]},
            )
        except AccountError:
            return None
        items = data.get("items") or []
        if not items:
            return {"provider": "youtube", "live": False}
        item = items[0]
        snippet = item.get("snippet", {})
        return {
            "provider": "youtube",
            "live": True,
            "id": item["id"],
            "title": snippet.get("title", ""),
            "viewer_count": int(item.get("statistics", {}).get("concurrentViewers", 0) or 0),
            "started_at": snippet.get("actualStartTime") or snippet.get("scheduledStartTime"),
            "url": f"https://www.youtube.com/watch?v={item['id']}",
        }

    def create_twitch_clip(self) -> dict:
        token = self.token("twitch")
        headers = {"Authorization": "Bearer " + token["access_token"], "Client-Id": self.config["twitch_client_id"]}
        result = self.request("POST", "https://api.twitch.tv/helix/clips", params={"broadcaster_id": token["user_id"]}, headers=headers)
        if not result.get("data"):
            raise AccountError("clip_request_failed")
        clip = result["data"][0]
        # A create response is only a request receipt. Poll the official clip resource.
        for _ in range(15):
            time.sleep(1)
            data = self.request("GET", "https://api.twitch.tv/helix/clips", params={"id": clip["id"]}, headers=headers)
            if data.get("data"):
                return {**data["data"][0], "edit_url": clip["edit_url"], "confirmed": True}
        return {"id": clip["id"], "edit_url": clip["edit_url"], "confirmed": False}

    def twitch_clip(self, clip_id: str) -> dict | None:
        token = self.token('twitch')
        result = self.request('GET', 'https://api.twitch.tv/helix/clips', params={'id': clip_id}, headers={
            'Authorization': 'Bearer ' + token['access_token'], 'Client-Id': self.config['twitch_client_id'],
        })
        return result['data'][0] if result.get('data') else None

    def disconnect(self, provider: str) -> None:
        with self.lock:
            self.pending.pop(provider, None)
            if provider == "kick":
                self._set_kick_channel(None)
                self.errors.pop("kick", None)
                return
            token = self.vault.get(provider)
            if token:
                try:
                    if provider == "twitch":
                        self.request("POST", "https://id.twitch.tv/oauth2/revoke", data={"client_id": self.config.get("twitch_client_id", ""), "token": token["access_token"]})
                    else:
                        self.request("POST", "https://oauth2.googleapis.com/revoke", data={"token": token.get("refresh_token") or token["access_token"]})
                except Exception:
                    pass
                finally:
                    self.vault.delete(provider)
            self.errors.pop(provider, None)

    def upload_youtube(self, path: Path, title: str, description: str, privacy: str = "private", publish_at: str | None = None, made_for_kids: bool = False, expected_generation: int | None = None) -> dict:
        with self.lock:
            if expected_generation is not None and self.generation != expected_generation:
                raise AccountError('account_changed_before_upload')
            token = dict(self.token("youtube"))
        size = path.stat().st_size
        status = {"privacyStatus": privacy, "selfDeclaredMadeForKids": made_for_kids}
        if publish_at:
            from datetime import datetime, timezone
            parsed = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
            if parsed.tzinfo is None or parsed <= datetime.now(timezone.utc):
                raise AccountError("invalid_publish_schedule")
            status.update(privacyStatus="private", publishAt=parsed.isoformat())
        response = self.http.post("https://www.googleapis.com/upload/youtube/v3/videos", params={"uploadType": "resumable", "part": "snippet,status"}, headers={
            "Authorization": "Bearer " + token["access_token"], "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": str(size), "X-Upload-Content-Type": "video/mp4",
        }, json={"snippet": {"title": title[:100], "description": description[:5000], "categoryId": "20"}, "status": status}, timeout=30)
        location = response.headers.get("Location", "")
        parsed = urlparse(location)
        if not response.ok or parsed.scheme != "https" or parsed.hostname not in {"www.googleapis.com", "upload.googleapis.com"}:
            raise AccountError("upload_start_failed")
        # A single resumable body is streamed from disk. An unknown outcome must not auto-retry.
        try:
            with path.open("rb") as handle:
                response = self.http.put(location, data=handle, headers={"Content-Type": "video/mp4", "Content-Length": str(size)}, timeout=(30, 600), allow_redirects=False)
        except requests.RequestException as exc:
            raise AccountError("upload_outcome_unknown") from exc
        if not response.ok or not response.json().get("id"):
            raise AccountError("upload_outcome_unknown")
        result = response.json()
        return {"state": "uploaded", "video_id": result["id"], "url": "https://www.youtube.com/watch?v=" + result["id"],
                "privacy": result.get("status", {}).get("privacyStatus", "unknown"), "publish_at": result.get("status", {}).get("publishAt")}

    def youtube_metrics(self, ids: list[str]) -> list[dict]:
        if not ids:
            return []
        token = self.token("youtube")
        result = self.request("GET", "https://www.googleapis.com/youtube/v3/videos", params={"part": "statistics,status", "id": ",".join(ids[:50])}, headers={"Authorization": "Bearer " + token["access_token"]})
        return [{"video_id": item["id"], "statistics": item.get("statistics", {}), "status": item.get("status", {})} for item in result.get("items", [])]
