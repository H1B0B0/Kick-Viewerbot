from backend import main


def test_creator_growth_beta_returns_local_workspace_stats(monkeypatch) -> None:
    monkeypatch.setattr(main.app, "creator_growth_beta", True)

    stats = main.bot_manager.get_stats()

    assert stats["is_running"] is False
    assert stats["active_connections"] == 0
    assert stats["status"]["code"] == "standby"
    assert "Creator Growth Beta" in stats["status"]["message"]


def test_creator_growth_beta_flag_is_opt_in(monkeypatch) -> None:
    monkeypatch.setattr(main.app, "creator_growth_beta", False)

    assert main.creator_growth_beta_enabled() is False
    assert main.legacy_synthetic_controls_allowed() is True


def test_creator_growth_beta_disables_legacy_controls(monkeypatch) -> None:
    monkeypatch.setattr(main.app, "creator_growth_beta", True)

    assert main.creator_growth_beta_enabled() is True
    assert main.legacy_synthetic_controls_allowed() is False
