#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv or dependency install needed):
#      uv run scripts/ci/verify_versions.py --tauri PATH --package PATH --cargo PATH --python PATH
# 3. Or invoke with the project interpreter:
#      python scripts/ci/verify_versions.py --tauri PATH --package PATH --cargo PATH --python PATH
# ──────────────────

from __future__ import annotations

import argparse
import json
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Final

VERSION_KEY: Final = "version"


@dataclass(frozen=True, slots=True)
class ManifestPaths:
    tauri: Path
    package: Path
    cargo: Path
    python: Path


@dataclass(frozen=True, slots=True)
class VersionMetadata:
    tauri: str
    package: str
    cargo: str
    python: str

    def values(self) -> tuple[str, str, str, str]:
        return (self.tauri, self.package, self.cargo, self.python)

    def describe(self) -> str:
        return ", ".join(
            (
                f"tauri={self.tauri}",
                f"package={self.package}",
                f"cargo={self.cargo}",
                f"python={self.python}",
            ),
        )


@dataclass(frozen=True, slots=True)
class MetadataReadError(Exception):
    path: Path
    detail: str

    def __str__(self) -> str:
        return f"{self.path}: {self.detail}"


def read_json_version(path: Path) -> str:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise MetadataReadError(path, str(error)) from error

    match payload:
        case {"version": str(version)} if version:
            return version
        case _:
            raise MetadataReadError(path, "missing non-empty string version")


def read_toml_version(path: Path, section: str) -> str:
    try:
        payload = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as error:
        raise MetadataReadError(path, str(error)) from error

    match payload.get(section):
        case {"version": str(version)} if version:
            return version
        case _:
            raise MetadataReadError(
                path,
                f"missing non-empty string {section}.{VERSION_KEY}",
            )


def load_metadata(paths: ManifestPaths) -> VersionMetadata:
    return VersionMetadata(
        tauri=read_json_version(paths.tauri),
        package=read_json_version(paths.package),
        cargo=read_toml_version(paths.cargo, "package"),
        python=read_toml_version(paths.python, "project"),
    )


def python_equivalent(desktop_version: str) -> str:
    release, separator, prerelease = desktop_version.partition("-")
    if separator and prerelease.isdigit():
        return f"{release}.dev{prerelease}"
    return desktop_version


def parse_args() -> ManifestPaths:
    parser = argparse.ArgumentParser(
        description="Verify that Tauri, frontend, Cargo, and Python versions match.",
    )
    parser.add_argument("--tauri", type=Path, required=True)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--cargo", type=Path, required=True)
    parser.add_argument("--python", dest="python_manifest", type=Path, required=True)
    args = parser.parse_args()
    return ManifestPaths(
        tauri=args.tauri,
        package=args.package,
        cargo=args.cargo,
        python=args.python_manifest,
    )


def main() -> int:
    try:
        metadata = load_metadata(parse_args())
    except MetadataReadError as error:
        print(f"Unable to read version metadata: {error}", file=sys.stderr)
        return 2

    desktop_versions = (metadata.tauri, metadata.package, metadata.cargo)
    if len(set(desktop_versions)) != 1 or metadata.python != python_equivalent(metadata.tauri):
        print(f"Version metadata mismatch: {metadata.describe()}", file=sys.stderr)
        return 1

    print(f"Version metadata aligned: {metadata.tauri}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
