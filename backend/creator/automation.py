from __future__ import annotations

import hashlib
import time
from pathlib import Path
from threading import RLock

from .media import MediaError, inspect_video


class RecordingAutomation:
    """Watch only an explicitly selected local directory, never fetch platform video."""
    EXTENSIONS = {'.mp4', '.mov', '.mkv', '.webm'}

    def __init__(self, service, settle_seconds=20, clock=time.monotonic):
        self.service = service
        self.clock = clock
        self.settle_seconds = settle_seconds
        self.lock = RLock()
        settings = service.store.list('recording_automation')
        self.settings = settings[0] if settings else service.store.create('recording_automation', enabled=False, folder='', count=3, length=30)
        self.observed = {}
        self.error = None
        self.processing = False
        self.last_import = None

    def snapshot(self):
        # Never block the dashboard while a large recording is copied in the scanner.
        settings = self.settings
        return {key: settings[key] for key in ('enabled', 'folder', 'count', 'length')} | {
            'error': self.error, 'processing': self.processing, 'last_import': self.last_import,
            'settle_seconds': self.settle_seconds,
        }

    def files(self, folder):
        path = Path(folder)
        return [file for file in path.iterdir() if not file.is_symlink() and file.is_file() and file.suffix.lower() in self.EXTENSIONS]

    @staticmethod
    def fingerprint(file):
        stat = file.stat()
        return hashlib.sha256(f'{file.resolve()}:{stat.st_size}:{stat.st_mtime_ns}'.encode()).hexdigest()

    def configure(self, folder, enabled, count=3, length=30):
        if not isinstance(enabled, bool) or not 1 <= count <= 5 or not 5 <= length <= 60:
            raise MediaError('invalid_automation_options')
        if not enabled:
            self.pause()
            self.error = None
            return self.snapshot()
        if not isinstance(folder, str):
            raise MediaError('invalid_automation_options')
        path = Path(folder).expanduser()
        if not path.is_absolute() or not path.is_dir():
            raise MediaError('recording_folder_unavailable')
        path = path.resolve()
        if path in {Path(path.anchor), Path.home().resolve()}:
            raise MediaError('recording_folder_unavailable')
        if not self.lock.acquire(blocking=False):
            raise MediaError('recording_import_in_progress')
        try:
            if self.settings['folder'] != str(path):
                # Existing recordings are not consumed automatically when a folder is selected.
                existing = self.files(path)
                self.observed.clear()
                for file in existing:
                    self.mark_seen(self.fingerprint(file), 'existing')
            self.settings = self.service.store.update(self.settings['id'], folder=str(path), enabled=enabled, count=count, length=length)
            self.error = None
        finally:
            self.lock.release()
        return self.snapshot()

    def mark_seen(self, fingerprint, state, source_id=None):
        self.service.store.create('recording_seen', fingerprint=fingerprint, state=state, source_id=source_id)

    def pause(self):
        self.settings = self.service.store.update(self.settings['id'], enabled=False)

    def scan(self):
        if not self.lock.acquire(blocking=False):
            return
        try:
            if not self.settings['enabled']:
                return
            if len([job for job in self.service.store.list('job') if job['state'] in {'queued', 'analyzing', 'rendering'}]) >= 3:
                return
            seen = {item['fingerprint'] for item in self.service.store.list('recording_seen')}
            seen.update(source['recording_fingerprint'] for source in self.service.store.list('source') if source.get('recording_fingerprint'))
            files = self.files(self.settings['folder'])
            present = {str(file) for file in files}
            self.observed = {key: value for key, value in self.observed.items() if key in present}
            for file in files:
                fingerprint = self.fingerprint(file)
                if fingerprint in seen:
                    continue
                observation = self.observed.get(str(file))
                if not observation or observation[0] != fingerprint:
                    self.observed[str(file)] = (fingerprint, self.clock())
                    continue
                if self.clock() - observation[1] < self.settle_seconds:
                    continue
                stat = file.stat()
                if not 0 < stat.st_size <= 4 * 1024 ** 3:
                    self.error = 'file_too_large' if stat.st_size else 'empty_recording'
                    self.mark_seen(fingerprint, 'failed')
                    continue
                self.processing = True
                destination = None
                try:
                    duration = inspect_video(file)
                    from uuid import uuid4
                    destination = self.service.store.root / 'sources' / (uuid4().hex + file.suffix.lower())
                    # Read only the observed size. A recording still growing must not produce an unbounded copy.
                    remaining = stat.st_size
                    with file.open('rb') as original, destination.open('xb') as copied:
                        while remaining:
                            chunk = original.read(min(1024 * 1024, remaining))
                            if not chunk:
                                raise MediaError('recording_changed')
                            copied.write(chunk)
                            remaining -= len(chunk)
                    if not self.settings['enabled'] or file.is_symlink() or self.fingerprint(file) != fingerprint:
                        destination.unlink(missing_ok=True)
                        continue
                    source = self.service.store.create('source', name=file.name, path=str(destination), duration=duration, automatic=True, recording_fingerprint=fingerprint)
                    self.service.queue(source['id'], self.settings['count'], self.settings['length'])
                    self.mark_seen(fingerprint, 'queued', source['id'])
                    self.last_import = file.name
                    self.error = None
                except Exception as exc:
                    if destination and destination.exists() and not any(source['path'] == str(destination) for source in self.service.store.list('source')):
                        destination.unlink(missing_ok=True)
                    self.mark_seen(fingerprint, 'failed')
                    self.error = str(exc) if isinstance(exc, MediaError) else 'recording_import_failed'
                finally:
                    self.processing = False
                # One recording per scan limits disk/CPU pressure; rendering already runs in the job queue.
                break
        except (OSError, ValueError):
            self.error = 'recording_folder_unavailable'
        finally:
            self.lock.release()
