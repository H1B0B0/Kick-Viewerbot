from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import pytest


@dataclass(frozen=True, slots=True)
class ManifestPaths:
    tauri: Path
    package: Path
    cargo: Path
    python: Path

    def command(self) -> list[str]:
        return [
            sys.executable,
            "scripts/ci/verify_versions.py",
            "--tauri",
            str(self.tauri),
            "--package",
            str(self.package),
            "--cargo",
            str(self.cargo),
            "--python",
            str(self.python),
        ]


@pytest.fixture
def matching_manifests(tmp_path: Path) -> ManifestPaths:
    tauri = tmp_path / "tauri.conf.json"
    package = tmp_path / "package.json"
    cargo = tmp_path / "Cargo.toml"
    python = tmp_path / "pyproject.toml"

    tauri.write_text(json.dumps({"version": "0.1.0"}), encoding="utf-8")
    package.write_text(json.dumps({"version": "0.1.0"}), encoding="utf-8")
    cargo.write_text('[package]\nversion = "0.1.0"\n', encoding="utf-8")
    python.write_text('[project]\nversion = "0.1.0"\n', encoding="utf-8")
    return ManifestPaths(tauri=tauri, package=package, cargo=cargo, python=python)


def test_accepts_versions_when_all_manifests_match(
    matching_manifests: ManifestPaths,
) -> None:
    # Given: four manifests with the canonical Tauri version.
    command = matching_manifests.command()

    # When: the version verifier checks all metadata surfaces.
    result = subprocess.run(command, capture_output=True, text=True, check=False)

    # Then: verification succeeds and reports the canonical version.
    assert result.returncode == 0
    assert result.stdout.strip() == "Version metadata aligned: 0.1.0"


def test_accepts_numeric_desktop_prerelease_with_python_dev_version(
    matching_manifests: ManifestPaths,
) -> None:
    matching_manifests.tauri.write_text(json.dumps({"version": "0.1.2-1"}), encoding="utf-8")
    matching_manifests.package.write_text(json.dumps({"version": "0.1.2-1"}), encoding="utf-8")
    matching_manifests.cargo.write_text('[package]\nversion = "0.1.2-1"\n', encoding="utf-8")
    matching_manifests.python.write_text('[project]\nversion = "0.1.2.dev1"\n', encoding="utf-8")

    result = subprocess.run(
        matching_manifests.command(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert result.stdout.strip() == "Version metadata aligned: 0.1.2-1"


def test_rejects_version_when_one_manifest_drifts(
    matching_manifests: ManifestPaths,
) -> None:
    # Given: a copied frontend manifest whose version differs from Tauri.
    matching_manifests.package.write_text(
        json.dumps({"version": "9.9.9"}),
        encoding="utf-8",
    )

    # When: the version verifier checks the copied manifests.
    result = subprocess.run(
        matching_manifests.command(),
        capture_output=True,
        text=True,
        check=False,
    )

    # Then: verification fails and identifies the drifting surface.
    assert result.returncode != 0
    assert "package=9.9.9" in result.stderr
    assert "tauri=0.1.0" in result.stderr


def test_rejects_malformed_manifest(
    matching_manifests: ManifestPaths,
) -> None:
    # Given: a copied Cargo manifest that is not valid TOML.
    matching_manifests.cargo.write_text("[package", encoding="utf-8")

    # When: the version verifier parses the copied manifests.
    result = subprocess.run(
        matching_manifests.command(),
        capture_output=True,
        text=True,
        check=False,
    )

    # Then: verification fails without a traceback or false success message.
    assert result.returncode != 0
    assert "Unable to read version metadata" in result.stderr
    assert "Traceback" not in result.stderr
    assert "aligned" not in result.stdout
