import pytest
import requests

def test_network_is_blocked():
    with pytest.raises(RuntimeError, match="Network call blocked"):
        requests.get("https://kick.com")

def test_localhost_is_allowed():
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        # Just proving it doesn't raise the RuntimeError from our fixture
        s.connect(("127.0.0.1", 65535)) # Will raise ConnectionRefusedError, but not our RuntimeError
    except ConnectionRefusedError:
        pass
