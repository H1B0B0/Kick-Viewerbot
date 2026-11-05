from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import math
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Event, Lock, Thread
from uuid import uuid4

from flask import Blueprint, Response, current_app, jsonify, request, send_file
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from .accounts import AccountError, Accounts
from .automation import RecordingAutomation
from .media import Cancelled, MediaError, analyze_audio, executable, inspect_video, render_clip, select_windows
from .store import Store


class CreatorService:
    def __init__(self, root: Path, accounts=None):
        self.store = Store(root)
        self.accounts = accounts if accounts is not None else Accounts(root, store=self.store)
        if getattr(self.accounts, "store", None) is None:
            self.accounts.store = self.store
        self.cancel_flags: dict[str, Event] = {}
        self.worker_lock = Lock()
        self.signing_key = secrets.token_bytes(32)
        self.live_snapshot: dict | None = None
        self.live_error: str | None = None
        self.auto_clips = False
        self.last_clip_at = 0.0
        self.live_lock = Lock()
        self.upload_lock = Lock()
        self.recording_automation = RecordingAutomation(self)

    def _prune_metrics(self, limit: int = 20) -> list[dict]:
        metrics = self.store.list("metrics")
        for stale in metrics[limit:]:
            self.store.delete(stale["id"])
        return metrics[:limit]

    def asset_url(self, clip_id: str) -> str:
        expires = int(time.time()) + 3600
        signature = hmac.new(self.signing_key, f"{clip_id}:{expires}".encode(), hashlib.sha256).hexdigest()
        return f"/creator/clips/{clip_id}/media?expires={expires}&signature={signature}"

    def asset_allowed(self, clip_id: str, expires: str, signature: str) -> bool:
        try:
            expiry = int(expires)
        except (ValueError, TypeError):
            return False
        expected = hmac.new(self.signing_key, f"{clip_id}:{expiry}".encode(), hashlib.sha256).hexdigest()
        return time.time() < expiry <= time.time() + 3601 and hmac.compare_digest(expected, signature)

    def snapshot(self) -> dict:
        clips = []
        for clip in self.store.list("clip"):
            public = {key: value for key, value in clip.items() if key not in {"path", "captions_path"}}
            public["media_url"] = self.asset_url(clip["id"])
            if clip.get("captions_path"):
                public["captions_url"] = public["media_url"] + "&captions=1"
            clips.append(public)
        try:
            encoder_ready = bool(executable())
        except Exception:
            encoder_ready = False
        return {"sources": [{key: value for key, value in source.items() if key != "path"} for source in self.store.list("source")],
                "jobs": self.store.list("job"), "clips": clips, "accounts": self.accounts.status(),
                "encoder_ready": encoder_ready, "live": self.live_snapshot, "live_error": self.live_error,
                "auto_clips": self.auto_clips, "official_clips": self.store.list("official_clip"),
                "metrics": self._prune_metrics(20), "recording_automation": self.recording_automation.snapshot()}

    def import_source(self, upload) -> dict:
        name = secure_filename(upload.filename or "")
        suffix = Path(name).suffix.lower()
        if suffix not in {".mp4", ".mov", ".mkv", ".webm"}:
            raise MediaError("unsupported_file")
        path = self.store.root / "sources" / (uuid4().hex + suffix)
        try:
            upload.save(path)
            duration = inspect_video(path)
        except Exception:
            path.unlink(missing_ok=True)
            raise
        return self.store.create("source", name=name, path=str(path), duration=duration, created_at=datetime.now(timezone.utc).isoformat())

    def queue(self, source_id: str, count: int = 3, length: float = 30, start: float | None = None, framing: str = "blurred") -> dict:
        source = self.store.get(source_id, "source")
        if not 1 <= count <= 5 or not math.isfinite(length) or not 5 <= length <= 60 or framing not in {"blurred", "crop"}:
            raise MediaError("invalid_clip_options")
        if start is not None and (not math.isfinite(start) or start < 0 or start >= source["duration"]):
            raise MediaError("invalid_clip_start")
        if len([job for job in self.store.list("job") if job["state"] in {"queued", "analyzing", "rendering"}]) >= 3:
            raise MediaError("queue_full")
        job = self.store.create("job", source_id=source_id, state="queued", progress=0, count=count,
                                length=length, start=start, framing=framing, error=None, created_at=datetime.now(timezone.utc).isoformat())
        cancel = Event()
        self.cancel_flags[job["id"]] = cancel
        Thread(target=self._produce, args=(job, source, cancel), daemon=True).start()
        return job

    def _produce(self, job: dict, source: dict, cancel: Event) -> None:
        try:
            with self.worker_lock:
                if cancel.is_set():
                    raise Cancelled("cancelled")
                path = Path(source["path"])
                framing = job.get("framing", "blurred")
                self.store.update(job["id"], state="analyzing", progress=5)
                if job["start"] is None:
                    energy = analyze_audio(path, cancel)
                    windows = select_windows(energy, source["duration"], job["length"], job["count"])
                else:
                    windows = [{"start": job["start"], "duration": min(job["length"], source["duration"] - job["start"]), "reason": "manual"}]
                for index, window in enumerate(windows):
                    if cancel.is_set():
                        raise Cancelled("cancelled")
                    self.store.update(job["id"], state="rendering", progress=20 + int(index / len(windows) * 75))
                    output = self.store.root / "clips" / (uuid4().hex + ".mp4")
                    try:
                        render_clip(path, output, window["start"], window["duration"], cancel, framing=framing)
                        self.store.create("clip", source_id=source["id"], job_id=job["id"], path=str(output),
                                          title=Path(source["name"]).stem[:90] + f" · {index + 1}",
                                          description="", framing=framing, publication={"state": "unpublished"}, **window)
                    except Exception:
                        output.unlink(missing_ok=True)
                        raise
                self.store.update(job["id"], state="ready", progress=100)
        except Cancelled:
            self.store.update(job["id"], state="cancelled", error="cancelled")
        except Exception as exc:
            self.store.update(job["id"], state="failed", error=str(exc) if isinstance(exc, MediaError) else "processing_failed")
        finally:
            self.cancel_flags.pop(job["id"], None)

    def publish(self, clip_id: str, title: str, description: str, privacy: str, publish_at: str | None, made_for_kids: bool = False) -> dict:
        if privacy not in {"private", "unlisted", "public"} or not title.strip():
            raise AccountError("invalid_publication_options")
        with self.accounts.lock:
            self.accounts.token("youtube")
            generation = self.accounts.generation
        with self.upload_lock:
            clip = self.store.get(clip_id, "clip")
            if clip["publication"]["state"] in {"uploading", "uploaded", "unknown"}:
                raise AccountError("publication_already_submitted")
            self.store.update(clip_id, title=title.strip()[:100], description=description[:5000], publication={"state": "uploading"})
        Thread(target=self._publish, args=(clip_id, privacy, publish_at, made_for_kids, generation), daemon=True).start()
        return {"state": "uploading"}

    def _publish(self, clip_id: str, privacy: str, publish_at: str | None, made_for_kids: bool, generation: int) -> None:
        clip = self.store.get(clip_id)
        try:
            publication = self.accounts.upload_youtube(Path(clip["path"]), clip["title"], clip["description"], privacy, publish_at, made_for_kids, expected_generation=generation)
        except Exception as exc:
            error = str(exc) if isinstance(exc, AccountError) else "upload_outcome_unknown"
            publication = {"state": "unknown" if error == "upload_outcome_unknown" else "failed", "error": error}
        self.store.update(clip_id, publication=publication)

    def refresh_live(self) -> None:
        if not self.live_lock.acquire(blocking=False):
            return
        try:
            self.reconcile_twitch_clips()
            twitch_error: AccountError | None = None
            current: dict | None = None
            try:
                twitch = self.accounts.twitch_live()
                if twitch:
                    current = {**twitch, "provider": "twitch", "source": "Twitch Helix"}
            except AccountError as exc:
                twitch_error = exc

            if not current:
                yt = self.accounts.youtube_live()
                if yt and yt.get("live"):
                    current = {**yt, "provider": "youtube", "source": "YouTube Data API"}
                elif twitch_error is not None and yt is None:
                    raise twitch_error

            previous = self.live_snapshot
            peak_detected = False
            if current and previous and current["id"] == previous["id"]:
                prev_viewers = int(previous.get("viewer_count", 0) or 0)
                threshold = max(prev_viewers + 10, int(prev_viewers * 1.3))
                peak_detected = int(current.get("viewer_count", 0) or 0) >= threshold

            self.live_snapshot = (
                {
                    "id": current["id"],
                    "title": current.get("title", ""),
                    "started_at": current.get("started_at"),
                    "viewer_count": int(current.get("viewer_count", 0) or 0),
                    "provider": current.get("provider", "twitch"),
                    "url": current.get("url"),
                    "peak_detected": peak_detected,
                    "source": current.get("source", "Twitch Helix"),
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                if current
                else None
            )
            self.live_error = None
            if (
                peak_detected
                and self.auto_clips
                and current
                and current.get("provider", "twitch") == "twitch"
                and time.time() - self.last_clip_at >= 1200
            ):
                self.last_clip_at = time.time()
                self.capture_twitch_clip()
        except AccountError as exc:
            self.live_error = str(exc)
        finally:
            self.live_lock.release()

    def capture_twitch_clip(self) -> dict:
        result = self.accounts.create_twitch_clip()
        return self.store.create("official_clip", provider="twitch", **{key: result[key] for key in ("edit_url", "confirmed")},
                                 platform_id=result["id"], url=result.get("url"), title=result.get("title"),
                                 creator_owner=self.accounts.account_id,
                                 created_at=datetime.now(timezone.utc).isoformat())

    def reconcile_twitch_clips(self):
        pending = [clip for clip in self.store.list('official_clip') if not clip['confirmed']
                   and clip.get('creator_owner') == self.accounts.account_id]
        for clip in pending[:5]:
            result = self.accounts.twitch_clip(clip['platform_id'])
            if result:
                self.store.update(clip['id'], confirmed=True, url=result['url'], title=result.get('title'))


def create_blueprint(service: CreatorService) -> Blueprint:
    bp = Blueprint("creator", __name__, url_prefix="/creator")

    @bp.before_request
    def authorize():
        if request.method == "OPTIONS" or request.endpoint in {"creator.oauth_callback", "creator.media"}:
            return None
        nonce = getattr(current_app, "instance_nonce", "")
        if not nonce or not secrets.compare_digest(request.headers.get("X-VelBots-Nonce", ""), nonce):
            return jsonify(error="local_authorization_required"), 401
        if request.endpoint == "creator.import_video":
            request.max_content_length = 4 * 1024 ** 3
        return None

    @bp.errorhandler(AccountError)
    @bp.errorhandler(MediaError)
    def known_error(error):
        return jsonify(error=str(error)), 400

    @bp.errorhandler(KeyError)
    def missing_record(_error):
        return jsonify(error="item_not_found"), 404

    @bp.errorhandler(RequestEntityTooLarge)
    def too_large(_error):
        return jsonify(error="file_too_large"), 413

    @bp.errorhandler(ValueError)
    @bp.errorhandler(TypeError)
    def invalid_value(_error):
        return jsonify(error="invalid_request"), 400

    @bp.get("/workspace")
    def workspace():
        return jsonify(service.snapshot())

    @bp.post('/accounts/configure')
    def configure_accounts():
        changed = service.accounts.configure(request.get_json())
        if changed:
            service.auto_clips = False
            service.live_snapshot = None
            service.live_error = None
        return jsonify(accounts=service.accounts.status())

    @bp.post('/automation/recordings')
    def configure_recordings():
        data = request.get_json()
        return jsonify(service.recording_automation.configure(data.get('folder'), data.get('enabled'), int(data.get('count', 3)), int(data.get('length', 30))))

    @bp.post('/accounts/lock')
    def lock_accounts():
        service.accounts.lock_context()
        service.auto_clips = False
        service.live_snapshot = None
        service.live_error = None
        automation = service.recording_automation
        automation.pause()
        return jsonify(locked=True)

    @bp.post("/sources")
    def import_video():
        upload = request.files.get("file")
        if not upload:
            raise MediaError("missing_file")
        source = service.import_source(upload)
        return jsonify({key: value for key, value in source.items() if key != "path"}), 201

    @bp.post("/jobs")
    def produce():
        data = request.get_json()
        return jsonify(service.queue(
            data["source_id"],
            int(data.get("count", 3)),
            float(data.get("length", 30)),
            float(data["start"]) if data.get("start") is not None else None,
            str(data.get("framing", "blurred")),
        )), 202

    @bp.delete("/sources/<source_id>")
    def delete_source(source_id):
        source = service.store.get(source_id, "source")
        jobs = [job for job in service.store.list("job") if job["source_id"] == source_id]
        if any(job["state"] in {"queued", "analyzing", "rendering"} for job in jobs):
            raise MediaError("processing_in_progress")
        Path(source["path"]).unlink(missing_ok=True)
        for job in jobs:
            service.store.delete(job["id"])
        service.store.delete(source_id)
        return jsonify(deleted=True)

    @bp.post("/jobs/<job_id>/cancel")
    def cancel(job_id):
        service.store.get(job_id, "job")
        flag = service.cancel_flags.get(job_id)
        if flag:
            flag.set()
        return jsonify(state="cancelling" if flag else "inactive")

    @bp.get("/clips/<clip_id>/media")
    def media(clip_id):
        if not service.asset_allowed(clip_id, request.args.get("expires", ""), request.args.get("signature", "")):
            return jsonify(error="preview_expired"), 401
        clip = service.store.get(clip_id, "clip")
        captions = request.args.get("captions") == "1"
        if captions and not clip.get("captions_path"):
            raise KeyError("captions")
        response = send_file(clip["captions_path"] if captions else clip["path"], mimetype="text/vtt" if captions else "video/mp4", conditional=True, as_attachment=request.args.get("download") == "1", download_name=secure_filename(clip["title"]) + (".vtt" if captions else ".mp4"), max_age=0)
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @bp.patch("/clips/<clip_id>")
    def edit_clip(clip_id):
        service.store.get(clip_id, "clip")
        data = request.get_json()
        title = str(data.get("title", "")).strip()[:100]
        if not title:
            raise MediaError("missing_title")
        clip = service.store.update(clip_id, title=title, description=str(data.get("description", ""))[:5000])
        return jsonify({key: value for key, value in clip.items() if key not in {"path", "captions_path"}})

    @bp.post("/clips/<clip_id>/captions")
    def captions(clip_id):
        service.store.get(clip_id, "clip")
        upload = request.files.get("file")
        if not upload:
            raise MediaError("missing_file")
        data = upload.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024 or not data.decode("utf-8-sig", errors="replace").startswith("WEBVTT"):
            raise MediaError("invalid_captions")
        path = service.store.root / "clips" / (clip_id + ".vtt")
        path.write_bytes(data)
        service.store.update(clip_id, captions_path=str(path))
        return jsonify(saved=True)

    @bp.delete("/clips/<clip_id>")
    def delete_clip(clip_id):
        with service.upload_lock:
            clip = service.store.get(clip_id, "clip")
            if clip["publication"]["state"] == "uploading":
                raise MediaError("upload_in_progress")
            Path(clip["path"]).unlink(missing_ok=True)
            if clip.get("captions_path"):
                Path(clip["captions_path"]).unlink(missing_ok=True)
            service.store.delete(clip_id)
        return jsonify(deleted=True)

    @bp.post("/clips/<clip_id>/publish")
    def publish(clip_id):
        data = request.get_json()
        if data.get("confirmed") is not True:
            raise AccountError("publication_confirmation_required")
        if not isinstance(data.get("made_for_kids"), bool):
            raise AccountError("audience_selection_required")
        return jsonify(service.publish(clip_id, str(data.get("title", "")), str(data.get("description", "")), str(data.get("privacy", "private")), data.get("publish_at"), data["made_for_kids"])), 202

    @bp.post("/accounts/<provider>/connect")
    def connect(provider):
        if provider == "twitch":
            return jsonify(service.accounts.connect_twitch())
        if provider == "youtube":
            callback = f"http://127.0.0.1:{current_app.server_port}/creator/oauth/youtube/callback"
            return jsonify(service.accounts.connect_youtube(callback))
        if provider == "kick":
            data = request.get_json(silent=True) or {}
            channel = data.get("channel") or data.get("channel_slug") or ""
            return jsonify(service.accounts.connect_kick(str(channel)))
        raise AccountError("provider_unavailable")

    @bp.get("/oauth/youtube/callback")
    def oauth_callback():
        service.accounts.complete_youtube(request.args.get("state", ""), request.args.get("code", ""), bool(request.args.get("error")))
        return Response("<!doctype html><meta charset=utf-8><title>VelBots</title><h1>Connexion YouTube terminée</h1><p>Vous pouvez revenir dans VelBots.</p>", content_type="text/html", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})

    @bp.post("/accounts/<provider>/disconnect")
    def disconnect(provider):
        if provider not in {"twitch", "youtube", "kick"}:
            raise AccountError("provider_unavailable")
        service.accounts.disconnect(provider)
        if provider == "twitch":
            service.auto_clips = False
            service.live_snapshot = None
        return jsonify(disconnected=True)

    @bp.post("/live/refresh")
    def live_refresh():
        if service.accounts.vault.get("twitch"):
            service.accounts.token("twitch")
        elif service.accounts.vault.get("youtube"):
            service.accounts.token("youtube")
        else:
            service.accounts.token("twitch")
        Thread(target=service.refresh_live, daemon=True).start()
        return jsonify(state="refreshing"), 202

    @bp.post("/live/auto-clips")
    def auto_clips():
        service.accounts.token("twitch")
        service.auto_clips = request.get_json().get("enabled") is True
        return jsonify(enabled=service.auto_clips)

    @bp.post("/live/clip")
    def clip_live():
        if time.time() - service.last_clip_at < 60:
            raise AccountError("clip_cooldown")
        service.accounts.token("twitch")
        service.last_clip_at = time.time()
        def capture():
            try:
                service.capture_twitch_clip()
            except AccountError as exc:
                service.live_error = str(exc)
        Thread(target=capture, daemon=True).start()
        return jsonify(state="requested"), 202

    @bp.post("/metrics/refresh")
    def refresh_metrics():
        ids = [clip["publication"]["video_id"] for clip in service.store.list("clip") if clip["publication"].get("video_id")]
        data = service.accounts.youtube_metrics(ids)
        service.store.create("metrics", platform="youtube", source="YouTube Data API", fetched_at=datetime.now(timezone.utc).isoformat(), videos=data)
        service._prune_metrics(20)
        return jsonify(videos=data)

    @bp.get("/export")
    def export():
        clips = service.snapshot()["clips"]
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["id", "title", "start_seconds", "duration_seconds", "reason", "publication_state", "platform_url"])
        for clip in clips:
            # Protect spreadsheets from formula injection in editable titles.
            title = clip["title"]
            if title[:1] in {"=", "+", "-", "@", "\t", "\r"}:
                title = "'" + title
            writer.writerow([clip["id"], title, clip["start"], clip["duration"], clip["reason"], clip["publication"]["state"], clip["publication"].get("url", "")])
        return Response(out.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=velbots-clips.csv"})

    return bp
