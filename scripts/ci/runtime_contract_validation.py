#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv, no pip install needed):
#      uv run scripts/ci/runtime_contract_validation.py
# 3. Or make executable and run:
#      chmod +x scripts/ci/runtime_contract_validation.py && ./scripts/ci/runtime_contract_validation.py
# ──────────────────

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TypeAlias

JsonScalar: TypeAlias = None | bool | int | float | str
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
JsonMap: TypeAlias = dict[str, JsonValue]


@dataclass(frozen=True, slots=True)
class ValidationContext:
    root: JsonMap
    path: str = "$"

    def child(self, segment: str) -> ValidationContext:
        return ValidationContext(root=self.root, path=f"{self.path}{segment}")


def _mapping(value: JsonValue | None) -> JsonMap | None:
    return value if isinstance(value, dict) else None


def _sequence(value: JsonValue | None) -> list[JsonValue] | None:
    return value if isinstance(value, list) else None


def _resolve_ref(reference: str, root: JsonMap) -> JsonMap | None:
    if not reference.startswith("#/"):
        return None
    current: JsonValue = root
    for raw_segment in reference[2:].split("/"):
        mapping = _mapping(current)
        if mapping is None:
            return None
        segment = raw_segment.replace("~1", "/").replace("~0", "~")
        if segment not in mapping:
            return None
        current = mapping[segment]
    return _mapping(current)


def _matches_type(instance: JsonValue, expected: str) -> bool:
    checks = {
        "null": instance is None,
        "boolean": isinstance(instance, bool),
        "integer": isinstance(instance, int) and not isinstance(instance, bool),
        "number": isinstance(instance, int | float) and not isinstance(instance, bool),
        "string": isinstance(instance, str),
        "array": isinstance(instance, list),
        "object": isinstance(instance, dict),
    }
    return checks.get(expected, False)


def validate(instance: JsonValue, schema: JsonMap, context: ValidationContext) -> list[str]:
    errors: list[str] = []
    reference = schema.get("$ref")
    if isinstance(reference, str):
        target = _resolve_ref(reference, context.root)
        if target is None:
            return [f"{context.path}: unresolved schema reference {reference}"]
        return validate(instance, target, context)

    alternatives = _sequence(schema.get("oneOf"))
    if alternatives is not None:
        branch_errors = [
            validate(instance, branch, context)
            for value in alternatives
            if (branch := _mapping(value)) is not None
        ]
        matches = sum(not branch for branch in branch_errors)
        if matches != 1:
            errors.append(f"{context.path}: expected exactly one schema branch, matched {matches}")
        return errors

    expected = schema.get("type")
    if isinstance(expected, str) and not _matches_type(instance, expected):
        return [f"{context.path}: expected {expected}, got {type(instance).__name__}"]

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{context.path}: expected constant {schema['const']!r}")
    enum_values = _sequence(schema.get("enum"))
    if enum_values is not None and instance not in enum_values:
        errors.append(f"{context.path}: value {instance!r} is not in the allowed enum")

    if isinstance(instance, dict):
        required = _sequence(schema.get("required")) or []
        for name in required:
            if isinstance(name, str) and name not in instance:
                errors.append(f"{context.path}: missing required property {name}")
        properties = _mapping(schema.get("properties")) or {}
        for name, value in instance.items():
            property_schema = _mapping(properties.get(name))
            if property_schema is not None:
                errors.extend(validate(value, property_schema, context.child(f".{name}")))
            elif schema.get("additionalProperties") is False:
                errors.append(f"{context.path}: unexpected property {name}")

    if isinstance(instance, list):
        minimum_items = schema.get("minItems")
        if isinstance(minimum_items, int) and len(instance) < minimum_items:
            errors.append(f"{context.path}: expected at least {minimum_items} items")
        item_schema = _mapping(schema.get("items"))
        if item_schema is not None:
            for index, value in enumerate(instance):
                errors.extend(validate(value, item_schema, context.child(f"[{index}]")))

    if isinstance(instance, str):
        minimum_length = schema.get("minLength")
        if isinstance(minimum_length, int) and len(instance) < minimum_length:
            errors.append(f"{context.path}: string is shorter than {minimum_length}")
        pattern = schema.get("pattern")
        if isinstance(pattern, str) and re.search(pattern, instance) is None:
            errors.append(f"{context.path}: string does not match {pattern!r}")

    if isinstance(instance, int | float) and not isinstance(instance, bool):
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if isinstance(minimum, int | float) and instance < minimum:
            errors.append(f"{context.path}: value is below minimum {minimum}")
        if isinstance(maximum, int | float) and instance > maximum:
            errors.append(f"{context.path}: value is above maximum {maximum}")

    conditions = _sequence(schema.get("allOf")) or []
    for value in conditions:
        condition = _mapping(value)
        if condition is None:
            continue
        predicate = _mapping(condition.get("if"))
        consequence = _mapping(condition.get("then"))
        if predicate is not None and consequence is not None and not validate(instance, predicate, context):
            errors.extend(validate(instance, consequence, context))
    return errors


def validate_fixture(document: JsonMap, schema: JsonMap) -> list[str]:
    errors = validate(document, schema, ValidationContext(root=schema))
    cases = _sequence(document.get("cases")) or []
    last_sequence: int | None = None
    request_ids: set[str] = set()
    requests: set[tuple[str, str]] = set()
    for index, value in enumerate(cases):
        case = _mapping(value)
        if case is None:
            continue
        kind = case.get("kind")
        payload = _mapping(case.get("payload"))
        if payload is None:
            continue
        if kind == "server_event" and isinstance(payload.get("sequence"), int):
            sequence = payload["sequence"]
            if isinstance(sequence, int) and last_sequence is not None and sequence <= last_sequence:
                errors.append(f"$.cases[{index}].payload.sequence: stale or out-of-order sequence")
            if isinstance(sequence, int):
                last_sequence = sequence
        if kind == "command_request":
            command = case.get("command")
            command_id = payload.get("command_id")
            if isinstance(command, str) and isinstance(command_id, str):
                if command_id in request_ids:
                    errors.append(f"$.cases[{index}].payload.command_id: duplicate request UUID")
                request_ids.add(command_id)
                requests.add((command, command_id))
        if kind == "command_ack":
            command = case.get("command")
            command_id = payload.get("command_id")
            if isinstance(command, str) and isinstance(command_id, str) and (command, command_id) not in requests:
                errors.append(f"$.cases[{index}]: ack has no matching request")
    return errors


if __name__ == "__main__":
    raise SystemExit("Import this module from validate_runtime_contract.py")
