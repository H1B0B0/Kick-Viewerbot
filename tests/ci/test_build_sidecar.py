import json
from pathlib import Path

import pytest

from scripts.build_sidecar import (
    UnsupportedPlatformError,
    create_build_plan,
    reuse_existing_sidecar,
)


ROOT = Path(__file__).resolve().parents[2]


def test_creates_macos_sidecar_plan() -> None:
    # Given: a macOS host target.
    # When: the build plan is created.
    plan = create_build_plan(ROOT, 'Darwin', 'aarch64-apple-darwin')

    # Then: the macOS spec and extensionless Tauri sidecar path are selected.
    assert plan.spec_file == ROOT / 'KickViewerBOT-macOS.spec'
    assert plan.built_executable == ROOT / 'dist/KickViewerBOT'
    assert plan.destination == ROOT / 'frontend/src-tauri/bin/backend-aarch64-apple-darwin'


def test_creates_windows_sidecar_plan() -> None:
    # Given: a Windows host target.
    # When: the build plan is created.
    plan = create_build_plan(ROOT, 'Windows', 'x86_64-pc-windows-msvc')

    # Then: the Windows spec and executable Tauri sidecar path are selected.
    assert plan.spec_file == ROOT / 'KickViewerBOT.spec'
    assert plan.built_executable == ROOT / 'dist/KickViewerBOT.exe'
    assert plan.destination == ROOT / 'frontend/src-tauri/bin/backend-x86_64-pc-windows-msvc.exe'


def test_rejects_unsupported_sidecar_platform() -> None:
    with pytest.raises(UnsupportedPlatformError):
        create_build_plan(ROOT, 'Linux', 'x86_64-unknown-linux-gnu')


def test_tauri_dev_reuses_a_target_specific_sidecar_before_next() -> None:
    package = json.loads((ROOT / 'frontend/package.json').read_text(encoding='utf-8'))
    tauri = json.loads(
        (ROOT / 'frontend/src-tauri/tauri.conf.json').read_text(encoding='utf-8'),
    )

    assert package['scripts']['build:sidecar'] == 'python ../scripts/build_sidecar.py'
    assert package['scripts']['dev:sidecar'] == (
        'python ../scripts/build_sidecar.py --reuse-existing'
    )
    assert tauri['build']['beforeDevCommand'] == 'npm run dev:sidecar && npm run dev'


def test_reuses_existing_sidecar_without_pyinstaller(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    destination = (
        tmp_path
        / 'frontend/src-tauri/bin/backend-aarch64-apple-darwin'
    )
    destination.parent.mkdir(parents=True)
    destination.write_bytes(b'existing-sidecar')
    monkeypatch.setattr('scripts.build_sidecar.platform.system', lambda: 'Darwin')
    monkeypatch.setattr(
        'scripts.build_sidecar.host_target_triple',
        lambda: 'aarch64-apple-darwin',
    )

    plan = reuse_existing_sidecar(tmp_path)

    assert plan is not None
    assert plan.destination == destination
    assert destination.read_bytes() == b'existing-sidecar'


def test_pyinstaller_uses_package_qualified_bot_imports() -> None:
    # Given: PyInstaller analyzes the backend from the repository root.
    main_source = (ROOT / 'backend/main.py').read_text(encoding='utf-8')
    macos_spec = (ROOT / 'KickViewerBOT-macOS.spec').read_text(encoding='utf-8')

    # When: package imports and hidden imports are inspected.
    # Then: both surfaces use the import path available to the bundled app.
    assert 'from backend.api.viewer_bot import ViewerBot' in main_source
    assert 'from backend.api.viewer_bot_stability import ViewerBot_Stability' in main_source
    assert 'sys.path.append' not in main_source
    assert "'api.viewer_bot'" not in macos_spec
    assert "'api.viewer_bot_stability'" not in macos_spec
