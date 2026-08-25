#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv, no pip install needed):
#      uv run scripts/ci/test_runtime_contract_failures.py
# 3. Or make executable and run:
#      chmod +x scripts/ci/test_runtime_contract_failures.py && ./scripts/ci/test_runtime_contract_failures.py
# ──────────────────

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from collections.abc import Callable
from pathlib import Path

from runtime_contract_validation import JsonMap, JsonValue

FIXTURE_SOURCE = Path("contracts/fixtures")
SCHEMA = Path("contracts/runtime-v1.schema.json")
VALIDATOR = Path("scripts/ci/validate_runtime_contract.py")


def _read(path: Path) -> JsonMap:
    value: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _write(path: Path, document: JsonMap) -> None:
    path.write_text(json.dumps(document), encoding="utf-8")


def _run(fixture_directory: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["python", str(VALIDATOR), str(SCHEMA), str(fixture_directory)],
        capture_output=True,
        text=True,
        check=False,
    )


def _assert_controlled_failure(label: str, result: subprocess.CompletedProcess[str]) -> None:
    assert result.returncode != 0, f"{label}: expected nonzero exit"
    assert "FAIL " in result.stdout, f"{label}: missing controlled FAIL output"
    assert "PASS runtime protocol v1" not in result.stdout, f"{label}: false final PASS"
    assert "Traceback" not in result.stderr, f"{label}: traceback escaped\n{result.stderr}"


def _missing_command_id(directory: Path) -> None:
    path = directory / "command-acks.json"
    document = _read(path)
    del document["cases"][0]["payload"]["command_id"]
    _write(path, document)


def _unknown_state(directory: Path) -> None:
    path = directory / "bot-state.json"
    document = _read(path)
    document["cases"][0]["payload"]["state"] = "unknown_state"
    _write(path, document)


def _unknown_event(directory: Path) -> None:
    path = directory / "bot-error.json"
    document = _read(path)
    document["cases"][0]["event"] = "unknown_event"
    _write(path, document)


def _invalid_progress(directory: Path) -> None:
    path = directory / "stats-update.json"
    document = _read(path)
    document["cases"][0]["payload"]["status"]["startup_progress"] = 101
    _write(path, document)


def _numeric_standard_connections(directory: Path) -> None:
    path = directory / "stats-update.json"
    document = _read(path)
    document["cases"][0]["payload"]["metrics"]["active_connections"] = 0
    _write(path, document)


def _stale_sequence(directory: Path) -> None:
    path = directory / "bot-state.json"
    document = _read(path)
    document["cases"][1]["payload"]["sequence"] = document["cases"][0]["payload"]["sequence"]
    _write(path, document)


def _protocol_mismatch(directory: Path) -> None:
    path = directory / "service-ready.json"
    document = _read(path)
    document["cases"][0]["payload"]["protocol_version"] = 2
    _write(path, document)


def _run_invalid_copy(label: str, mutate: Callable[[Path], None]) -> None:
    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        shutil.copytree(FIXTURE_SOURCE, directory, dirs_exist_ok=True)
        mutate(directory)
        _assert_controlled_failure(label, _run(directory))
    print(f"PASS invalid copy: {label} controlled failure")


def main() -> None:
    probes = (
        ("missing command_id", _missing_command_id),
        ("unknown state", _unknown_state),
        ("unknown event", _unknown_event),
        ("invalid progress", _invalid_progress),
        ("standard numeric active_connections", _numeric_standard_connections),
        ("stale sequence", _stale_sequence),
        ("protocol mismatch", _protocol_mismatch),
    )
    for label, mutate in probes:
        _run_invalid_copy(label, mutate)

    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        shutil.copytree(FIXTURE_SOURCE, directory, dirs_exist_ok=True)
        (directory / "stats-update.json").write_text("{", encoding="utf-8")
        _assert_controlled_failure("malformed fixture", _run(directory))
    print("PASS invalid copy: malformed fixture controlled failure")

    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        shutil.copytree(FIXTURE_SOURCE, directory, dirs_exist_ok=True)
        (directory / "bot-error.json").unlink()
        _assert_controlled_failure("partial fixture set", _run(directory))
    print("PASS invalid copy: partial fixture set controlled failure")


if __name__ == "__main__":
    main()
