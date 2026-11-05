from __future__ import annotations

import array
import math
import re
import subprocess
import sys
from pathlib import Path
from threading import Event

import imageio_ffmpeg
from imageio_ffmpeg._definitions import FNAME_PER_PLATFORM, get_platform


class MediaError(ValueError):
    pass


class Cancelled(MediaError):
    pass


def executable() -> str:
    # imageio-ffmpeg carries a platform-specific binary into the packaged app.
    filename = FNAME_PER_PLATFORM.get(get_platform())
    if not filename:
        raise MediaError("encoder_platform_unsupported")
    path = Path(imageio_ffmpeg.__file__).parent / "binaries" / filename
    if not path.is_file():
        raise MediaError("encoder_unavailable")
    return str(path)


def inspect_video(path: Path) -> float:
    try:
        result = subprocess.run(
            [executable(), "-hide_banner", "-protocol_whitelist", "file,pipe", "-i", str(path)],
            capture_output=True, text=True, timeout=30,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        raise MediaError("video_inspection_failed") from exc
    match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match or "Video:" not in result.stderr:
        raise MediaError("invalid_video")
    hours, minutes, seconds = (float(value) for value in match.groups())
    duration = hours * 3600 + minutes * 60 + seconds
    if not 1 <= duration <= 12 * 3600:
        raise MediaError("video_duration_limit")
    return duration


def select_windows(energy: list[float], duration: float, length: float, count: int) -> list[dict]:
    """Non-overlapping candidates from one-second audio RMS, not semantic/AI claims."""
    length = min(length, duration)
    candidates = sorted(enumerate(energy), key=lambda item: item[1], reverse=True)
    windows: list[dict] = []
    for second, score in candidates:
        if score <= 0:
            continue
        start = max(0, min(duration - length, second - length / 3))
        if any(abs(start - window["start"]) < length for window in windows):
            continue
        windows.append({"start": round(start, 2), "duration": round(length, 2), "reason": "audio_peak"})
        if len(windows) >= count:
            break
    # Silent/short sources can still be turned into usable videos.
    if not windows:
        for index in range(min(count, max(1, int(duration // length)))):
            start = min(duration - length, index * duration / count)
            if any(abs(start - window["start"]) < length for window in windows):
                continue
            windows.append({"start": round(start, 2), "duration": round(length, 2), "reason": "sampled"})
    return sorted(windows, key=lambda item: item["start"])


def analyze_audio(path: Path, cancel: Event) -> list[float]:
    process = subprocess.Popen(
        [executable(), "-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe",
         "-i", str(path), "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    energy: list[float] = []
    try:
        while True:
            if cancel.is_set():
                raise Cancelled("cancelled")
            block = process.stdout.read(16000)
            if not block:
                break
            samples = array.array("h")
            samples.frombytes(block[:len(block) - len(block) % 2])
            if sys.byteorder != "little":
                samples.byteswap()
            energy.append(math.sqrt(sum(value * value for value in samples) / max(1, len(samples))))
        process.wait(timeout=30)
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
        process.stdout.close()
    return energy


def render_clip(
    source: Path,
    output: Path,
    start: float,
    duration: float,
    cancel: Event,
    progress=None,
    framing: str = "blurred",
) -> None:
    if framing not in {"blurred", "crop"}:
        raise MediaError("invalid_clip_options")
    if framing == "crop":
        # Center-cropped 9:16 full-screen vertical frame.
        graph = "[0:v]crop=ih*9/16:ih,scale=720:1280:flags=lanczos,fps=30,format=yuv420p[v]"
    else:
        # Preserve the whole frame over a blurred vertical background.
        graph = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:2[back];"
            "[fg]scale=720:1280:force_original_aspect_ratio=decrease[front];"
            "[back][front]overlay=(W-w)/2:(H-h)/2,setsar=1[v]"
        )
    if callable(progress):
        progress(0)
    process = subprocess.Popen(
        [executable(), "-v", "error", "-nostdin", "-y", "-protocol_whitelist", "file,pipe",
         "-ss", str(start), "-i", str(source), "-t", str(duration),
         "-filter_complex", graph, "-map", "[v]", "-map", "0:a?", "-c:v", "libx264",
         "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-threads", "2", str(output)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    try:
        while process.poll() is None:
            if cancel.wait(0.2):
                process.kill()
                raise Cancelled("cancelled")
        if process.returncode != 0 or not output.is_file() or not output.stat().st_size:
            raise MediaError("render_failed")
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
        if cancel.is_set() and output.exists():
            output.unlink()
