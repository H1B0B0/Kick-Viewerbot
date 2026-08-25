"""
Kick Viewer Bot - WebSocket Server
Serveur simplifié qui utilise uniquement WebSocket pour toutes les communications
"""
from flask import Flask, request
from flask_cors import CORS

from backend.runtime.models import BotState, RuntimeConfig
from backend.runtime.manager import BotManager as CoreBotManager

from flask_socketio import SocketIO, emit
import logging
import os
import sys
import psutil
import time
from threading import Thread
from werkzeug.utils import secure_filename
from pathlib import Path

# Configure logging for the entire service, defaulting to INFO but allowing overrides
LOG_LEVEL_NAME = os.getenv("KICK_BOT_LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME, logging.ERROR)
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger("kick_viewer_bot")

# Import bot classes
sys.path.append(str(Path(__file__).parent / "api"))
try:
    from api.viewer_bot import ViewerBot
    from api.viewer_bot_stability import ViewerBot_Stability
    BOT_AVAILABLE = True
except ImportError:
    logger.warning("Bot modules not found. Running in mock mode.")
    BOT_AVAILABLE = False
    ViewerBot = None
    ViewerBot_Stability = None

ALLOWED_STABILITY_SUBSCRIPTIONS = {'active', 'premium', 'lifetime'}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kick-viewer-bot-secret'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# CORS - Accept all origins
CORS(app, resources={r"/*": {"origins": ['tauri://localhost', 'http://tauri.localhost', 'http://localhost:3000']}})

# Initialize SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins=['tauri://localhost', 'http://tauri.localhost', 'http://localhost:3000'],
    async_mode='gevent',
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=16 * 1024 * 1024
)

# Bot Manager Class
class BotManager:
    def __init__(self):
        def _factory(*args, **kwargs):
            if not BOT_AVAILABLE:
                raise RuntimeError("Bot implementation unavailable (mock mode disabled)")

            stability_mode = kwargs.pop('stability_mode', False)
            bot_class = ViewerBot_Stability if stability_mode else ViewerBot
            print(f"Using bot class: {bot_class.__name__}")

            return bot_class(*args, **kwargs)

        self.manager = CoreBotManager(_factory)
        self.last_channel = None
        self.last_net_io = psutil.net_io_counters()
        self.last_net_io_time = time.time()
        self.config = None

    @property
    def is_running(self):
        return self.manager.get_state() in (BotState.STARTING, BotState.RUNNING)

    def start_bot(
        self,
        channel_name,
        threads,
        proxy_file=None,
        timeout=10000,
        proxy_type="http",
        stability_mode=False,
        subscription_status='unknown'
    ):
        if self.is_running:
            return {'success': False, 'error': 'Bot is already running'}

        logger.info(f"Starting bot: {channel_name}, threads: {threads}, stability: {stability_mode}")
        print(f"Starting bot: {channel_name}, threads: {threads}, stability: {stability_mode}")

        normalized_status = (subscription_status or '').lower()
        if stability_mode and normalized_status not in ALLOWED_STABILITY_SUBSCRIPTIONS:
            logger.warning("Stability mode requested without valid subscription")
            return {
                'success': False,
                'error': 'Stability mode requires an active subscription.'
            }

        cfg = RuntimeConfig(
            channel_name=channel_name,
            threads=int(threads),
            timeout_ms=int(timeout),
            proxy_type=proxy_type,
            stability_mode=stability_mode,
            subscription_status=subscription_status
        )
        self.config = cfg
        self.last_channel = channel_name

        success, err = self.manager.start(cfg)
        if not success:
            return {'success': False, 'error': err.message}

        # Auto-ready for now to keep backward compatibility
        gen = self.manager._generation
        if gen:
            self.manager.report_ready(gen.generation_id)

        return {'success': True, 'message': 'Bot started successfully'}

    def stop_bot(self):
        success, err = self.manager.stop(timeout=5.0)
        if not success:
            return {'success': False, 'error': err.message if err else 'Unknown error'}
        logger.info("Bot stopped")
        return {'success': True, 'message': 'Bot stopped successfully'}

    def get_stats(self):
        try:
            # System metrics
            current_net_io = psutil.net_io_counters()
            current_time = time.time()
            time_delta = max(current_time - self.last_net_io_time, 0.1)

            bytes_sent = (current_net_io.bytes_sent - self.last_net_io.bytes_sent) / time_delta
            bytes_recv = (current_net_io.bytes_recv - self.last_net_io.bytes_recv) / time_delta

            self.last_net_io = current_net_io
            self.last_net_io_time = current_time

            system_metrics = {
                'cpu': psutil.cpu_percent() or 0,
                'memory': psutil.virtual_memory().percent or 0,
                'network_up': max(bytes_sent / (1024 * 1024), 0),
                'network_down': max(bytes_recv / (1024 * 1024), 0)
            }

            gen = self.manager._generation
            bot = gen.bot if gen else None

            is_stability = self.config.stability_mode if self.config else False
            active_connections = getattr(bot, 'active_connections', 0) if bot else 0
            request_count = getattr(bot, 'request_count', 0) if bot else 0

            state = self.manager.get_state()
            is_running = state in (BotState.STARTING, BotState.RUNNING, BotState.STOPPING)

            stats = {
                'is_running': is_running,
                'channel_name': self.last_channel,
                'active_threads': getattr(bot, 'active_threads', 0) if bot else 0,
                'active_connections': active_connections,
                'total_proxies': len(getattr(bot, 'all_proxies', [])) if bot else 0,
                'alive_proxies': getattr(bot, 'alive_proxies', 0) if bot else 0,
                'request_count': active_connections if is_stability else request_count,
                'config': self.config.__dict__ if self.config else None,
                'status': getattr(bot, 'status', {
                    'code': 'stopped' if not is_running else 'running',
                    'message': 'Bot is running' if is_running else 'Bot is stopped',
                    'proxy_count': 0,
                    'proxy_loading_progress': 0,
                    'startup_progress': 0
                }) if bot else {
                    'code': 'stopped',
                    'message': 'Bot is stopped',
                    'proxy_count': 0,
                    'proxy_loading_progress': 0,
                    'startup_progress': 0
                },
                'system_metrics': system_metrics
            }

            return stats
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                'is_running': False,
                'error': str(e)
            }


# Global bot manager
bot_manager = BotManager()

# Upload directory
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)

# ============================================
# WebSocket Events
# ============================================

@socketio.on('connect')
def handle_connect():
    print(f"\n🔌 [WEBSOCKET] Client connecté: {request.sid}")
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {
        'message': 'Connected to Kick Viewer Bot',
        'status': 'ok',
        'version': '2.0.0',
        'bot_available': BOT_AVAILABLE
    })
    print(f"✅ [WEBSOCKET] Message 'connected' envoyé au client {request.sid}\n")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"\n❌ [WEBSOCKET] Client déconnecté: {request.sid}\n")
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('start_bot')
def handle_start_bot(data):
    """Start the bot via WebSocket"""
    print(f"\n🚀 [START_BOT] Demande reçue du client {request.sid}")

    try:
        channel_name = data.get('channelName')
        threads = int(data.get('threads', 100))
        timeout = int(data.get('timeout', 10000))
        proxy_type = data.get('proxyType', 'http')
        stability_mode = data.get('stabilityMode', False)
        subscription_status = (data.get('subscriptionStatus') or 'unknown')

        print(f"⚙️  [START_BOT] Config: channel={channel_name}, threads={threads}, stability={stability_mode}")

        # Handle proxy file if base64 encoded
        proxy_file_path = None
        if 'proxyFileData' in data:
            import base64
            filename = secure_filename(data.get('proxyFileName', 'proxies.txt'))
            filepath = UPLOAD_FOLDER / filename

            # Decode base64 and save
            file_data = base64.b64decode(data['proxyFileData'])
            with open(filepath, 'wb') as f:
                f.write(file_data)

            proxy_file_path = str(filepath)

        if not channel_name:
            print(f"❌ [START_BOT] Erreur: channel_name manquant")
            emit('bot_error', {'error': 'Channel name is required'})
            return

        if stability_mode and subscription_status.lower() not in ALLOWED_STABILITY_SUBSCRIPTIONS:
            print("❌ [START_BOT] Erreur: subscription inactive pour le stability mode")
            emit('bot_error', {'error': 'Stability mode requires an active subscription.'})
            return

        print(f"▶️  [START_BOT] Lancement du bot...")
        result = bot_manager.start_bot(
            channel_name=channel_name,
            threads=threads,
            proxy_file=proxy_file_path,
            timeout=timeout,
            proxy_type=proxy_type,
            stability_mode=stability_mode,
            subscription_status=subscription_status
        )

        if result['success']:
            print(f"✅ [START_BOT] Bot démarré avec succès!")
            emit('bot_started', {
                'message': result['message'],
                'channel': channel_name,
                'threads': threads,
                'stability_mode': stability_mode
            })
            # Broadcast to all clients
            socketio.emit('bot_status_changed', {'is_running': True, 'channel': channel_name})
        else:
            print(f"❌ [START_BOT] Erreur: {result['error']}")
            emit('bot_error', {'error': result['error']})

    except Exception as e:
        print(f"💥 [START_BOT] Exception: {e}")
        logger.error(f"Error starting bot: {e}")
        emit('bot_error', {'error': str(e)})

@socketio.on('stop_bot')
def handle_stop_bot():
    """Stop the bot via WebSocket"""
    print(f"\n⏹️  [STOP_BOT] Demande reçue du client {request.sid}")
    try:
        result = bot_manager.stop_bot()

        if result['success']:
            emit('bot_stopped', {'message': result['message']})
            # Broadcast to all clients
            socketio.emit('bot_status_changed', {'is_running': False})
        else:
            print(f"❌ [STOP_BOT] Erreur: {result['error']}")
            emit('bot_error', {'error': result['error']})

    except Exception as e:
        print(f"💥 [STOP_BOT] Exception: {e}")
        logger.error(f"Error stopping bot: {e}")
        emit('bot_error', {'error': str(e)})

@socketio.on('get_stats')
def handle_get_stats():
    """Get bot stats via WebSocket"""
    try:
        stats = bot_manager.get_stats()
        emit('stats_update', stats)
    except Exception as e:
        print(f"💥 [GET_STATS] Exception: {e}")
        logger.error(f"Error getting stats: {e}")
        emit('bot_error', {'error': str(e)})

@socketio.on('ping')
def handle_ping():
    """Health check via WebSocket"""
    emit('pong', {
        'timestamp': time.time(),
        'status': 'ok'
    })

# ============================================
# Background Task - Auto broadcast stats
# ============================================

def stats_broadcast_task():
    """Broadcast stats to all connected clients every 2 seconds"""
    while True:
        socketio.sleep(2)
        if bot_manager.is_running:
            stats = bot_manager.get_stats()
            socketio.emit('stats_update', stats)

# Start background task
socketio.start_background_task(stats_broadcast_task)

# ============================================
# Minimal HTTP endpoints (health check only)
# ============================================

@app.route('/health')
def health_check():
    import os
    from backend.runtime.models import BotState

    # args.instance_nonce and actual_port are in main() scope
    # So we need to store them globally or fetch them dynamically
    # For now, we will return the dynamic state

    port = getattr(app, 'server_port', 0)
    nonce = getattr(app, 'instance_nonce', '')

    state = bot_manager.get_state() if hasattr(bot_manager, 'get_state') else "stopped"
    if hasattr(state, 'value'):
        state = state.value

    return {
        "protocol_version": 1,
        "instance_nonce": nonce,
        "port": port,
        "pid": os.getpid(),
        "lifecycle_state": state,
        "ready": True
    }

@app.route('/')
def index():
    return {
        'service': 'Kick Viewer Bot - WebSocket Server',
        'version': '2.0.0',
        'websocket': 'ws://localhost:8080/socket.io/',
        'status': 'online'
    }

# ============================================
# Main
# ============================================

def find_available_port(preferred_ports, host='0.0.0.0'):
    """Trouve un port disponible parmi la liste fournie"""
    import socket

    logger.info(f"🔍 Searching for available port among: {preferred_ports}")

    for port in preferred_ports:
        try:
            # Tester si le port est disponible
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host if host != '0.0.0.0' else 'localhost', port))
            sock.close()

            if result != 0:  # Port disponible
                logger.info(f"✅ Port {port} is available - Selected!")
                return port
            else:
                logger.info(f"❌ Port {port} is already in use - Trying next...")
        except Exception as e:
            logger.debug(f"Error testing port {port}: {e}")
            logger.info(f"⚠️  Port {port} - Test error - Trying next...")
            continue

    # Si aucun port de la liste n'est disponible, laisser le système en choisir un
    logger.error("❌ NO available port found in the list!")
    return None

def main():
    import argparse
    import json
    import os
    import sys
    from gevent.pywsgi import WSGIServer
    from geventwebsocket.handler import WebSocketHandler

    parser = argparse.ArgumentParser(description='Kick Viewer Bot Backend')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=0, help='Port to bind to (0 for random)')
    parser.add_argument('--dev', action='store_true', help='Development mode')
    parser.add_argument('--no-browser', action='store_true', help='Disable opening browser on startup')
    parser.add_argument('--instance-nonce', type=str, default='', help='Tauri instance nonce for readiness')
    parser.add_argument('--protocol-version', type=int, default=1, help='Protocol version')
    parser.add_argument('--app-version', type=str, default='0.0.0', help='App version')

    args, unknown = parser.parse_known_args()

    if args.dev:
        logger.info("Development mode enabled")

    socketio.start_background_task(stats_broadcast_task)

    try:
        server = WSGIServer((args.host, args.port), app, handler_class=WebSocketHandler)
        server.start()
        actual_port = server.server_port
        app.server_port = actual_port
        app.instance_nonce = args.instance_nonce

        ready_payload = {
            "type": "service_ready",
            "protocol_version": 1,
            "instance_nonce": args.instance_nonce,
            "port": actual_port,
            "pid": os.getpid(),
            "lifecycle_state": "stopped",
            "ready": True
        }
        print(json.dumps(ready_payload), flush=True)

        if not args.no_browser and actual_port:
            from threading import Timer
            import webbrowser
            Timer(1.5, lambda: webbrowser.open('https://kick.velbots.shop')).start()

        server.serve_forever()
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
