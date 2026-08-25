from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_windows_colorama_dependency_is_pinned_and_hashed() -> None:
    lock = (ROOT / "requirements.lock").read_text(encoding="utf-8")
    colorama_block = lock.split("colorama==0.4.6", maxsplit=1)[1].split("\n\n", maxsplit=1)[0]

    assert "--hash=sha256:" in colorama_block


def test_release_bootstrap_keeps_commands_at_repository_root() -> None:
    workflow = (ROOT / ".github/workflows/tauri-release.yml").read_text(encoding="utf-8")

    assert "cd frontend && npm ci" not in workflow
    assert "npm --prefix frontend ci" in workflow
    assert "cargo fetch --locked --manifest-path frontend/src-tauri/Cargo.toml" in workflow
    assert "self-hosted" not in workflow
    assert 'os_runner: "macos-15-intel"' in workflow
    assert 'os_runner: "macos-15"' in workflow
