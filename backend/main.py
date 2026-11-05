"""
VelBots Creator Studio - Local Backend Service
"""
from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path
from threading import Thread

import psutil
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from backend.creator.server_log import SafeWebSocketHandler
from backend.creator.service import CreatorService, create_blueprint

LOG_LEVEL_NAME = os.getenv("KICK_BOT_LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME, logging.ERROR)
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger("velbots_creator")

app = Flask(__name__)
app.config["SECRET_KEY"] = "velbots-creator-studio-local"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.creator_growth_beta = True
app.service_version = "0.0.0"
app.instance_nonce = ""

creator_service = CreatorService(Path(os.getenv("VELBOTS_CREATOR_DATA", "creator-data")))
app.register_blueprint(create_blueprint(creator_service))


def creator_growth_beta_enabled() -> bool:
    return bool(getattr(app, "creator_growth_beta", True))


def legacy_synthetic_controls_allowed() -> bool:
    return False


LOCAL_ORIGINS = [
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]
CORS(app, resources={r"/*": {"origins": LOCAL_ORIGINS}})

socketio = SocketIO(
    app,
    cors_allowed_origins=LOCAL_ORIGINS,
    async_mode="gevent",
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=16 * 1024 * 1024,
)

_last_net_io = psutil.net_io_counters()
_last_net_io_time = time.time()


def get_stats() -> dict:
    """Return legitimate local system telemetry for the Creator Studio."""
    global _last_net_io, _last_net_io_time
    try:
        current_net_io = psutil.net_io_counters()
        current_time = time.time()
        time_delta = max(current_time - _last_net_io_time, 0.1)
        bytes_sent = (current_net_io.bytes_sent - _last_net_io.bytes_sent) / time_delta
        bytes_recv = (current_net_io.bytes_recv - _last_net_io.bytes_recv) / time_delta
        _last_net_io = current_net_io
        _last_net_io_time = current_time

        cpu = psutil.cpu_percent() or 0.0
        memory = psutil.virtual_memory().percent or 0.0
        network_up = max(bytes_sent / (1024 * 1024), 0.0)
        network_down = max(bytes_recv / (1024 * 1024), 0.0)
    except Exception:
        cpu = 0.0
        memory = 0.0
        network_up = 0.0
        network_down = 0.0

    system_metrics = {
        "cpu": cpu,
        "memory": memory,
        "network_up": network_up,
        "network_down": network_down,
    }
    return {
        "cpu": cpu,
        "memory": memory,
        "network_up": network_up,
        "network_down": network_down,
        "status": {
            "code": "ready",
            "message": "Creator Studio active",
        },
        "system_metrics": system_metrics,
    }


@socketio.on("connect")
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit(
        "connected",
        {
            "message": "Connected to VelBots Creator Growth local service",
            "status": "ok",
            "version": app.service_version,
            "creator_growth_beta": creator_growth_beta_enabled(),
        },
    )


@socketio.on("disconnect")
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on("get_stats")
def handle_get_stats():
    emit("stats_update", get_stats())


@socketio.on("ping")
def handle_ping():
    emit(
        "pong",
        {
            "timestamp": time.time(),
            "status": "ok",
        },
    )


@app.route("/health")
def health_check():
    port = getattr(app, "server_port", 0)
    nonce = getattr(app, "instance_nonce", "")
    return {
        "status": "healthy",
        "protocol_version": 1,
        "instance_nonce": nonce,
        "port": port,
        "pid": os.getpid(),
        "lifecycle_state": "creator_growth_beta",
        "creator_growth_beta": True,
        "legacy_synthetic_controls_enabled": False,
        "version": app.service_version,
        "ready": True,
    }


@app.route("/")
def index():
    return {
        "service": "VelBots Creator Growth local service",
        "version": app.service_version,
        "websocket": "ws://localhost:8080/socket.io/",
        "status": "online",
    }


def main():
    import argparse
    import json
    from gevent.pywsgi import WSGIServer

    parser = argparse.ArgumentParser(description="VelBots Creator Studio Backend")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=0, help="Port to bind to (0 for random)")
    parser.add_argument("--dev", action="store_true", help="Development mode")
    parser.add_argument("--no-browser", action="store_true", help="Disable opening browser on startup")
    parser.add_argument("--instance-nonce", type=str, default="", help="Tauri instance nonce for readiness")
    parser.add_argument("--protocol-version", type=int, default=1, help="Protocol version")
    parser.add_argument("--app-version", type=str, default="0.0.0", help="App version")
    parser.add_argument("--creator-growth-beta", action="store_true", help="Disable legacy synthetic-engagement controls")

    args, _unknown = parser.parse_known_args()

    if args.dev:
        logger.info("Development mode enabled")

    app.creator_growth_beta = True
    app.service_version = args.app_version

    try:
        server = WSGIServer((args.host, args.port), app, handler_class=SafeWebSocketHandler)
        server.start()
        actual_port = server.server_port
        app.server_port = actual_port
        app.instance_nonce = args.instance_nonce or ("dev-nonce" if args.dev else os.urandom(32).hex())

        def refresh_creator_live():
            while True:
                if creator_service.auto_clips:
                    creator_service.refresh_live()
                time.sleep(30)

        Thread(target=refresh_creator_live, daemon=True).start()

        def watch_creator_recordings():
            while True:
                creator_service.recording_automation.scan()
                time.sleep(5)

        Thread(target=watch_creator_recordings, daemon=True).start()

        ready_payload = {
            "type": "service_ready",
            "protocol_version": 1,
            "instance_nonce": app.instance_nonce,
            "port": actual_port,
            "pid": os.getpid(),
            "lifecycle_state": "creator_growth_beta",
            "ready": True,
        }
        print(json.dumps(ready_payload), flush=True)

        server.serve_forever()
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
