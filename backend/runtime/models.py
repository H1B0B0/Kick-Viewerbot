import enum
from dataclasses import dataclass
from typing import Optional

class BotState(str, enum.Enum):
    UNAVAILABLE = "unavailable"
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"

@dataclass
class ErrorPayload:
    code: str
    message: str
    retryable: bool
    generation_alive: bool

@dataclass
class RuntimeConfig:
    channel_name: str
    threads: int
    timeout_ms: int
    proxy_type: str
    stability_mode: bool
    subscription_status: str
