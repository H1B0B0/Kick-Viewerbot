import pytest
import threading
import time
from backend.runtime.models import BotState, RuntimeConfig
from backend.runtime.manager import BotManager

class FakeBot:
    def __init__(self, *args, **kwargs):
        self.active_threads = 0
        self.stop_called = False
        self.fail_on_main = False
        self.hang_on_stop = False

    def main(self):
        if self.fail_on_main:
            raise RuntimeError("Bot crashed")
        while not self.stop_called:
            time.sleep(0.01)
        if self.hang_on_stop:
            time.sleep(5.0)

    def stop(self):
        self.stop_called = True

def fake_bot_factory(*args, **kwargs):
    return FakeBot(*args, **kwargs)

@pytest.fixture
def manager():
    return BotManager(bot_factory=fake_bot_factory)

@pytest.fixture
def config():
    return RuntimeConfig(
        channel_name="test",
        threads=10,
        timeout_ms=10000,
        proxy_type="http",
        stability_mode=False,
        subscription_status="active"
    )

def test_initial_state(manager):
    assert manager.get_state() == BotState.STOPPED

def test_start_success(manager, config):
    success, error = manager.start(config)
    assert success is True

    # Simulate readiness callback
    gen_id = manager._generation.generation_id if manager._generation else None
    manager.report_ready(gen_id)

    assert manager.get_state() == BotState.RUNNING

    manager.stop(timeout=1.0)
    assert manager.get_state() == BotState.STOPPED

def test_simultaneous_starts_only_create_one(manager, config):
    results = []

    def starter():
        results.append(manager.start(config))

    threads = [threading.Thread(target=starter) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    successes = [r[0] for r in results if r[0]]
    assert len(successes) == 1

    manager.stop(timeout=1.0)

def test_worker_crash_sets_error_state(manager, config):
    def crashing_bot(*args, **kwargs):
        b = FakeBot(*args, **kwargs)
        b.fail_on_main = True
        return b

    manager._bot_factory = crashing_bot
    manager.start(config)

    time.sleep(0.1)

    assert manager.get_state() == BotState.ERROR
    err = manager.get_error()
    assert err is not None
    assert err.message == "Bot crashed"

def test_stop_timeout_leaves_generation_alive(manager, config):
    def hanging_bot(*args, **kwargs):
        b = FakeBot(*args, **kwargs)
        b.hang_on_stop = True
        return b

    manager._bot_factory = hanging_bot
    manager.start(config)

    success, err = manager.stop(timeout=0.1)
    assert success is False
    assert manager.get_state() == BotState.ERROR

    err_state = manager.get_error()
    assert err_state.generation_alive is True
