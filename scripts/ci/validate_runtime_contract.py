#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv, no pip install needed):
#      uv run scripts/ci/validate_runtime_contract.py contracts/runtime-v1.schema.json contracts/fixtures
# 3. Or make executable and run:
#      chmod +x scripts/ci/validate_runtime_contract.py && ./scripts/ci/validate_runtime_contract.py contracts/runtime-v1.schema.json contracts/fixtures
# ──────────────────

from __future__ import annotations

import copy
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from runtime_contract_validation import JsonMap, JsonValue, validate_fixture

EXPECTED_FIXTURES = {
    "bot-error.json",
    "bot-state.json",
    "command-acks.json",
    "service-ready.json",
    "stats-update.json",
}


@dataclass(frozen=True, slots=True)
class ContractInputError(Exception):
    detail: str

    def __str__(self) -> str:
        return self.detail


def _load_json(path: Path) -> JsonMap:
    with path.open(encoding="utf-8") as handle:
        value: JsonValue = json.load(handle)
    if not isinstance(value, dict):
        raise ContractInputError(detail=f"{path}: expected a JSON object")
    return value


def _cases(document: JsonMap) -> list[JsonMap]:
    value = document.get("cases")
    if not isinstance(value, list):
        raise ContractInputError(detail="fixture cases must be an array")
    return [case for case in value if isinstance(case, dict)]


def _fixture_named(fixtures: dict[str, JsonMap], name: str) -> JsonMap:
    try:
        return fixtures[name]
    except KeyError as error:
        raise ContractInputError(detail=f"missing fixture {name}") from error


def _fixture_copy(fixtures: dict[str, JsonMap], name: str) -> JsonMap:
    return copy.deepcopy(_fixture_named(fixtures, name))


def _payload(case: JsonMap) -> JsonMap:
    value = case.get("payload")
    if not isinstance(value, dict):
        raise ContractInputError(detail="fixture case payload must be an object")
    return value


def _child(mapping: JsonMap, name: str) -> JsonMap:
    value = mapping.get(name)
    if not isinstance(value, dict):
        raise ContractInputError(detail=f"fixture {name} must be an object")
    return value


def _independent_negative_probes(fixtures: dict[str, JsonMap]) -> dict[str, JsonMap]:
    unknown_state = _fixture_copy(fixtures, "bot-state.json")
    _payload(_cases(unknown_state)[0])["state"] = "unknown_state"

    unknown_event = _fixture_copy(fixtures, "bot-error.json")
    _cases(unknown_event)[0]["event"] = "unknown_event"

    missing_command_id = _fixture_copy(fixtures, "command-acks.json")
    del _payload(_cases(missing_command_id)[0])["command_id"]

    invalid_progress = _fixture_copy(fixtures, "stats-update.json")
    invalid_stats = _payload(_cases(invalid_progress)[0])
    _child(invalid_stats, "status")["startup_progress"] = 101

    numeric_standard_connections = _fixture_copy(fixtures, "stats-update.json")
    numeric_stats = _payload(_cases(numeric_standard_connections)[0])
    _child(numeric_stats, "metrics")["active_connections"] = 0

    stale_sequence = _fixture_copy(fixtures, "bot-state.json")
    stale_cases = _cases(stale_sequence)
    _payload(stale_cases[1])["sequence"] = _payload(stale_cases[0])["sequence"]

    protocol_mismatch = _fixture_copy(fixtures, "service-ready.json")
    _payload(_cases(protocol_mismatch)[0])["protocol_version"] = 2

    return {
        "unknown state": unknown_state,
        "unknown event": unknown_event,
        "missing command_id": missing_command_id,
        "invalid progress": invalid_progress,
        "standard numeric active_connections": numeric_standard_connections,
        "stale sequence": stale_sequence,
        "protocol mismatch": protocol_mismatch,
    }


def _validate_contract_metadata(schema: JsonMap) -> list[str]:
    errors: list[str] = []
    contract = schema.get("x-runtime-contract")
    if not isinstance(contract, dict):
        return ["schema: missing x-runtime-contract metadata"]
    expected = {
        "protocol_version",
        "lifecycle",
        "commands",
        "events",
        "sequence",
        "readiness",
        "identity",
        "version_propagation",
        "units",
    }
    missing = expected.difference(contract)
    if missing:
        errors.append(f"schema: missing contract metadata {sorted(missing)}")
    return errors


def run(schema_path: Path, fixture_directory: Path) -> int:
    schema = _load_json(schema_path)
    fixture_paths = sorted(fixture_directory.glob("*.json"))
    names = {path.name for path in fixture_paths}
    if names != EXPECTED_FIXTURES:
        missing = sorted(EXPECTED_FIXTURES.difference(names))
        unexpected = sorted(names.difference(EXPECTED_FIXTURES))
        print(f"FAIL interrupted/partial fixture set: missing={missing}, unexpected={unexpected}")
        return 1

    fixtures = {path.name: _load_json(path) for path in fixture_paths}
    failures = _validate_contract_metadata(schema)
    for name, document in fixtures.items():
        failures.extend(f"{name}: {error}" for error in validate_fixture(document, schema))

    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        return 1

    try:
        json.loads("{")
    except json.JSONDecodeError:
        print("PASS malformed_input: malformed JSON rejected")

    probe_failures: list[str] = []
    for label, probe in _independent_negative_probes(fixtures).items():
        errors = validate_fixture(probe, schema)
        if errors:
            print(f"PASS negative probe: {label} rejected")
        else:
            probe_failures.append(f"negative probe unexpectedly accepted: {label}")

    if probe_failures:
        for failure in probe_failures:
            print(f"FAIL {failure}")
        return 1
    print(f"PASS runtime protocol v1: {len(fixtures)} fixtures validated")
    return 0


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: validate_runtime_contract.py SCHEMA FIXTURE_DIRECTORY")
        return 2
    try:
        return run(Path(sys.argv[1]), Path(sys.argv[2]))
    except (ContractInputError, json.JSONDecodeError, OSError) as error:
        print(f"FAIL {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
