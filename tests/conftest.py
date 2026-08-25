import pytest
import socket
import os

ALLOWED_HOSTS = {'127.0.0.1', 'localhost', '::1'}

@pytest.fixture(autouse=True)
def disable_network_calls(monkeypatch):
    """Blocks all non-loopback network calls during tests."""
    original_connect = socket.socket.connect

    def guarded_connect(self, address):
        if isinstance(address, tuple):
            host = address[0]
            if host not in ALLOWED_HOSTS:
                raise RuntimeError(f"Network call blocked in tests to host: {host}")
        return original_connect(self, address)

    if not os.environ.get("ALLOW_NETWORK_TESTS"):
        monkeypatch.setattr("socket.socket.connect", guarded_connect)
