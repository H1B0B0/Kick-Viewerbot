from __future__ import annotations

import platform
import shutil
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final


PROJECT_ROOT: Final = Path(__file__).resolve().parents[1]


@dataclass(frozen=True, slots=True)
class BuildPlan:
    spec_file: Path
    built_executable: Path
    destination: Path


@dataclass(frozen=True, slots=True)
class UnsupportedPlatformError(RuntimeError):
    platform_name: str

    def __str__(self) -> str:
        return f'Unsupported sidecar platform: {self.platform_name}'


@dataclass(frozen=True, slots=True)
class TargetTripleError(RuntimeError):
    rustc_output: str

    def __str__(self) -> str:
        return 'rustc did not report a host target triple'


@dataclass(frozen=True, slots=True)
class SidecarBuildOutputError(RuntimeError):
    expected_path: Path

    def __str__(self) -> str:
        return f'PyInstaller did not create {self.expected_path}'


def create_build_plan(
    root: Path,
    platform_name: str,
    target_triple: str,
) -> BuildPlan:
    match platform_name:
        case 'Darwin':
            executable_name = 'KickViewerBOT'
            spec_name = 'KickViewerBOT-macOS.spec'
            sidecar_name = f'backend-{target_triple}'
        case 'Windows':
            executable_name = 'KickViewerBOT.exe'
            spec_name = 'KickViewerBOT.spec'
            sidecar_name = f'backend-{target_triple}.exe'
        case unsupported:
            raise UnsupportedPlatformError(unsupported)

    return BuildPlan(
        spec_file=root / spec_name,
        built_executable=root / 'dist' / executable_name,
        destination=root / 'frontend' / 'src-tauri' / 'bin' / sidecar_name,
    )


def host_target_triple() -> str:
    result = subprocess.run(
        ['rustc', '-vV'],
        check=True,
        capture_output=True,
        text=True,
    )
    for line in result.stdout.splitlines():
        key, separator, value = line.partition(':')
        if separator and key == 'host':
            return value.strip()
    raise TargetTripleError(result.stdout)


def build_sidecar(root: Path = PROJECT_ROOT) -> BuildPlan:
    plan = create_build_plan(root, platform.system(), host_target_triple())
    subprocess.run(
        [sys.executable, '-m', 'PyInstaller', plan.spec_file.name, '--noconfirm'],
        cwd=root,
        check=True,
    )
    if not plan.built_executable.is_file():
        raise SidecarBuildOutputError(plan.built_executable)

    plan.destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(plan.built_executable, plan.destination)
    if platform.system() != 'Windows':
        executable_bits = stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        plan.destination.chmod(plan.destination.stat().st_mode | executable_bits)
    return plan


def main() -> int:
    plan = build_sidecar()
    print(f'Sidecar ready: {plan.destination}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
