from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from threading import RLock
from uuid import uuid4


class Store:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        for directory in ("sources", "clips"):
            (self.root / directory).mkdir(exist_ok=True, mode=0o700)
        self.lock = RLock()
        self.path = self.root / "creator.sqlite"
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL)")
        self.path.chmod(0o600)
        for job in self.list("job"):
            if job["state"] in {"queued", "analyzing", "rendering"}:
                self.update(job["id"], state="interrupted", error="restart_required")
        for clip in self.list("clip"):
            if clip.get("publication", {}).get("state") == "uploading":
                self.update(clip["id"], publication={"state": "unknown", "error": "verify_youtube_before_retry"})

    def connect(self):
        return sqlite3.connect(self.path, timeout=30)

    def create(self, kind: str, **values) -> dict:
        payload = {"id": uuid4().hex, **values}
        with self.lock, self.connect() as db:
            db.execute("INSERT INTO records VALUES (?, ?, ?)", (payload["id"], kind, json.dumps(payload)))
        return payload

    def get(self, record_id: str, kind: str | None = None) -> dict:
        with self.lock, self.connect() as db:
            row = db.execute("SELECT kind, payload FROM records WHERE id=?", (record_id,)).fetchone()
        if not row or (kind and row[0] != kind):
            raise KeyError(record_id)
        return json.loads(row[1])

    def update(self, record_id: str, **values) -> dict:
        with self.lock, self.connect() as db:
            row = db.execute("SELECT payload FROM records WHERE id=?", (record_id,)).fetchone()
            if not row:
                raise KeyError(record_id)
            payload = json.loads(row[0])
            payload.update(values)
            db.execute("UPDATE records SET payload=? WHERE id=?", (json.dumps(payload), record_id))
        return payload

    def list(self, kind: str) -> list[dict]:
        with self.lock, self.connect() as db:
            rows = db.execute("SELECT payload FROM records WHERE kind=? ORDER BY rowid DESC", (kind,)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def delete(self, record_id: str) -> None:
        with self.lock, self.connect() as db:
            db.execute("DELETE FROM records WHERE id=?", (record_id,))
