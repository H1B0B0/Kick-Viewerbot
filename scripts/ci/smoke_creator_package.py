"""Exercise the distributed sidecar and its bundled encoder, not Python source mocks."""
from __future__ import annotations

import argparse
import json
import queue
import secrets
import subprocess
import tempfile
import time
from pathlib import Path
from threading import Thread

import imageio_ffmpeg
import requests


def run(binary: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="velbots-package-qa-") as directory:
        root = Path(directory)
        nonce = secrets.token_hex(32)
        process = subprocess.Popen([str(binary.resolve()), "--host", "127.0.0.1", "--port", "0", "--no-browser",
                                    "--instance-nonce", nonce, "--creator-growth-beta", "--app-version", "4.0.0-6"],
                                   cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        lines = queue.Queue()
        def read_output():
            for line in process.stdout:
                lines.put(line)
        Thread(target=read_output, daemon=True).start()
        try:
            deadline = time.monotonic() + 75
            endpoint = None
            recent_lines = []
            while time.monotonic() < deadline:
                try:
                    line = lines.get(timeout=0.2)
                except queue.Empty:
                    if process.poll() is not None:
                        raise RuntimeError("Packaged backend exited before readiness: " + "".join(recent_lines[-8:]))
                    continue
                recent_lines.append(line.replace(nonce, "[redacted]"))
                try:
                    payload = json.loads(line)
                except ValueError:
                    continue
                if payload.get("type") == "service_ready" and payload.get("instance_nonce") == nonce:
                    endpoint = f"http://127.0.0.1:{payload['port']}"
                    break
            if not endpoint:
                raise RuntimeError("Packaged backend did not become ready")
            session = requests.Session()
            session.headers["X-VelBots-Nonce"] = nonce
            snapshot = session.get(endpoint + "/creator/workspace", timeout=10)
            snapshot.raise_for_status()
            assert snapshot.json()["encoder_ready"] is True
            source = root / "owned-test.mp4"
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-f", "lavfi", "-i",
                            "testsrc2=size=320x180:rate=15", "-f", "lavfi", "-i", "sine=frequency=700:sample_rate=8000",
                            "-t", "6", "-c:v", "libx264", "-c:a", "aac", str(source)], check=True, timeout=30)
            with source.open("rb") as handle:
                imported = session.post(endpoint + "/creator/sources", files={"file": (source.name, handle)}, timeout=30)
            imported.raise_for_status()
            job = session.post(endpoint + "/creator/jobs", json={"source_id": imported.json()["id"], "count": 1, "length": 5}, timeout=10)
            job.raise_for_status()
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                snapshot = session.get(endpoint + "/creator/workspace", timeout=10).json()
                current = next(item for item in snapshot["jobs"] if item["id"] == job.json()["id"])
                if current["state"] not in {"queued", "analyzing", "rendering"}:
                    break
                time.sleep(0.2)
            assert current["state"] == "ready", current
            clip = snapshot["clips"][0]
            media = session.get(endpoint + clip["media_url"], timeout=10)
            assert media.status_code == 200 and media.content[4:8] == b"ftyp"
            captions = session.post(endpoint + f"/creator/clips/{clip['id']}/captions",
                                    files={"file": ("clip.vtt", b"WEBVTT\n\n00:00.000 --> 00:02.000\nCreator QA\n")}, timeout=10)
            captions.raise_for_status()
            assert session.delete(endpoint + f"/creator/sources/{imported.json()['id']}", timeout=10).status_code == 200
            # Exercise the actual packaged background scanner, not an explicit import or /jobs request.
            folder = root / 'OBS'
            folder.mkdir()
            automation = session.post(endpoint + '/creator/automation/recordings', json={
                'folder': str(folder), 'enabled': True, 'count': 1, 'length': 5,
            }, timeout=10)
            automation.raise_for_status()
            import shutil
            shutil.copyfile(source, folder / 'automatic-recording.mp4')
            deadline = time.monotonic() + 65
            while time.monotonic() < deadline:
                snapshot = session.get(endpoint + '/creator/workspace', timeout=10).json()
                if len(snapshot['clips']) == 2:
                    break
                time.sleep(1)
            assert len(snapshot['clips']) == 2, snapshot['recording_automation']
            assert snapshot['recording_automation']['last_import'] == 'automatic-recording.mp4'
            assert (folder / 'automatic-recording.mp4').exists()
            assert all(clip['publication']['state'] == 'unpublished' for clip in snapshot['clips'])
            print("Packaged creator smoke passed: readiness, import, real MP4, preview, captions, source deletion, automatic recording-folder clips without publication.")
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            process.stdout.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("binary", type=Path)
    run(parser.parse_args().binary)
