"""
Kick Viewer Bot - WebSocket Server
Serveur simplifié qui utilise uniquement WebSocket pour toutes les communications
"""
from flask import Flask, request
from flask_cors import CORS
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
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=16 * 1024 * 1024
)

# Bot Manager Class
class BotManager:
    def __init__(self):
        self.bot = None
        self.is_running = False
        self.last_channel = None
        self.last_net_io = psutil.net_io_counters()
        self.last_net_io_time = time.time()
        self.stability_mode = False
        self.config = {
            'threads': 0,
            'timeout': 10000,
            'proxy_type': 'http',
            'stability_mode': False,
            'subscription_status': 'unknown'
        }

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

        self.stability_mode = stability_mode
        self.config = {
            'threads': threads,
            'timeout': timeout,
            'proxy_type': proxy_type,
            'stability_mode': stability_mode,
            'subscription_status': subscription_status
        }

        logger.info(f"Starting bot: {channel_name}, threads: {threads}, stability: {stability_mode}")
        print(f"Starting bot: {channel_name}, threads: {threads}, stability: {stability_mode}")

        normalized_status = (subscription_status or '').lower()
        if stability_mode and normalized_status not in ALLOWED_STABILITY_SUBSCRIPTIONS:
            logger.warning("Stability mode requested without valid subscription")
            return {
                'success': False,
                'error': 'Stability mode requires an active subscription.'
            }

        if BOT_AVAILABLE:
            bot_class = ViewerBot_Stability if stability_mode else ViewerBot
            print(f"Using bot class: {bot_class.__name__}")

            self.bot = bot_class(
                nb_of_threads=threads,
                channel_name=channel_name,
                proxy_file=proxy_file,
                proxy_imported=bool(proxy_file),
                timeout=timeout,
                type_of_proxy=proxy_type
            )

            def run_bot():
                self.is_running = True
                self.bot.main()
                self.is_running = False

            self.bot_thread = Thread(target=run_bot, daemon=True)
            self.bot_thread.start()
            self.last_channel = channel_name

            return {'success': True, 'message': 'Bot started successfully'}
        else:
            # Mock mode
            self.is_running = True
            self.last_channel = channel_name
            return {'success': True, 'message': 'Bot started (mock mode)'}

    def stop_bot(self):
        if not self.is_running:
            return {'success': False, 'error': 'No bot is running'}

        if self.bot and BOT_AVAILABLE:
            self.bot.stop()

        self.is_running = False
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

            # Bot stats
            # En mode stability, afficher les connexions actives au lieu du nombre de requêtes
            is_stability = self.config.get('stability_mode', False) if self.config else False
            active_connections = getattr(self.bot, 'active_connections', 0) if self.bot else 0
            request_count = getattr(self.bot, 'request_count', 0) if self.bot else 0

            stats = {
                'is_running': self.is_running,
                'channel_name': self.last_channel,
                'active_threads': getattr(self.bot, 'active_threads', 0) if self.bot else 0,
                'active_connections': active_connections,
                'total_proxies': len(getattr(self.bot, 'all_proxies', [])) if self.bot else 0,
                'alive_proxies': getattr(self.bot, 'alive_proxies', 0) if self.bot else 0,
                'request_count': active_connections if is_stability else request_count,
                'config': self.config,
                'status': getattr(self.bot, 'status', {
                    'state': 'stopped' if not self.is_running else 'running',
                    'message': 'Bot is running' if self.is_running else 'Bot is stopped',
                    'proxy_count': 0,
                    'proxy_loading_progress': 0,
                    'startup_progress': 0
                }) if self.bot else {
                    'state': 'stopped',
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

# Initialize chat service
sys.path.append(str(Path(__file__).parent / "services"))
try:
    from services.chat_service import chat_service
    CHAT_AVAILABLE = True
    # Load model asynchronously on startup
    chat_service.load_model_async()
    logger.info("🤖 Chat service initialized (model loading in background)")
except ImportError as e:
    logger.warning(f"Chat service not available: {e}")
    CHAT_AVAILABLE = False
    chat_service = None

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
# Chat AI WebSocket Events
# ============================================

@socketio.on('chat_status')
def handle_chat_status():
    """Get chat service status"""
    if not CHAT_AVAILABLE:
        emit('chat_status_response', {
            'available': False,
            'message': 'Chat service not available. Install: pip install transformers torch'
        })
        return
    
    status = chat_service.get_status()
    emit('chat_status_response', {
        'available': True,
        **status
    })

@socketio.on('chat_message')
def handle_chat_message(data):
    """Handle incoming chat message and generate AI response"""
    if not CHAT_AVAILABLE:
        emit('chat_response', {
            'error': 'Chat service not available',
            'response': '❌ Chat AI is not available. Please install required packages.'
        })
        return
    
    try:
        user_message = data.get('message', '')
        session_id = data.get('session_id', request.sid)
        
        if not user_message:
            emit('chat_response', {
                'error': 'Empty message',
                'response': '❌ Please provide a message.'
            })
            return
        
        logger.info(f"💬 Chat message from {session_id}: {user_message}")
        
        # Generate response
        response = chat_service.generate_response(user_message, session_id)
        
        emit('chat_response', {
            'message': user_message,
            'response': response,
            'session_id': session_id,
            'timestamp': time.time()
        })
        
        logger.info(f"🤖 Chat response: {response}")
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        emit('chat_response', {
            'error': str(e),
            'response': f'❌ Error: {str(e)}'
        })

@socketio.on('chat_clear')
def handle_chat_clear(data):
    """Clear chat conversation history"""
    if not CHAT_AVAILABLE:
        return
    
    try:
        session_id = data.get('session_id', request.sid)
        success = chat_service.clear_conversation(session_id)
        
        emit('chat_cleared', {
            'success': success,
            'session_id': session_id
        })
        
        logger.info(f"🗑️  Chat history cleared for session {session_id}")
        
    except Exception as e:
        logger.error(f"Error clearing chat: {e}")
        emit('chat_error', {'error': str(e)})

@socketio.on('chat_history')
def handle_chat_history(data):
    """Get chat conversation history"""
    if not CHAT_AVAILABLE:
        emit('chat_history_response', {'history': []})
        return
    
    try:
        session_id = data.get('session_id', request.sid)
        history = chat_service.get_conversation_history(session_id)
        
        emit('chat_history_response', {
            'history': history,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        emit('chat_error', {'error': str(e)})

@socketio.on('kick_chat_start')
def handle_kick_chat_start(data):
    """Start AI bot for Kick chat"""
    if not CHAT_AVAILABLE:
        emit('kick_chat_error', {'error': 'Chat service not available'})
        return
    
    try:
        channel_name = data.get('channel_name')
        auth_token = data.get('auth_token')  # Optional
        response_chance = data.get('response_chance', 0.2)  # 20% default
        min_interval = data.get('min_interval', 5)  # 5 seconds default
        
        if not channel_name:
            emit('kick_chat_error', {'error': 'Channel name required'})
            return
        
        success = chat_service.start_kick_chat(
            channel_name, 
            auth_token, 
            response_chance, 
            min_interval
        )
        
        if success:
            emit('kick_chat_started', {
                'channel': channel_name,
                'message': f'AI chat bot started for {channel_name}'
            })
            logger.info(f"🤖 Kick chat bot started for {channel_name}")
        else:
            emit('kick_chat_error', {'error': 'Failed to start Kick chat bot'})
            
    except Exception as e:
        logger.error(f"Error starting Kick chat: {e}")
        emit('kick_chat_error', {'error': str(e)})

@socketio.on('kick_chat_stop')
def handle_kick_chat_stop():
    """Stop Kick chat bot"""
    if not CHAT_AVAILABLE:
        return
    
    try:
        success = chat_service.stop_kick_chat()
        
        if success:
            emit('kick_chat_stopped', {'message': 'Kick chat bot stopped'})
            logger.info("🛑 Kick chat bot stopped")
        else:
            emit('kick_chat_error', {'error': 'Kick chat bot not running'})
            
    except Exception as e:
        logger.error(f"Error stopping Kick chat: {e}")
        emit('kick_chat_error', {'error': str(e)})

@socketio.on('kick_chat_status')
def handle_kick_chat_status():
    """Get Kick chat bot status"""
    if not CHAT_AVAILABLE:
        emit('kick_chat_status_response', {'enabled': False})
        return
    
    try:
        status = chat_service.get_kick_chat_status()
        emit('kick_chat_status_response', status)
    except Exception as e:
        logger.error(f"Error getting Kick chat status: {e}")
        emit('kick_chat_error', {'error': str(e)})

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
    return {
        'status': 'healthy',
        'bot_running': bot_manager.is_running,
        'bot_available': BOT_AVAILABLE,
        'version': '2.0.0'
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

if __name__ == '__main__':
    import argparse
    import webbrowser
    from threading import Timer

    # Import shared port configuration
    sys.path.insert(0, str(Path(__file__).parent.parent))
    try:
        from shared_config import AVAILABLE_PORTS, DEFAULT_HOST
    except ImportError:
        logger.warning("Could not import shared_config, using defaults")
        AVAILABLE_PORTS = [8765, 9876, 7890, 6543, 5432, 8081, 8082, 8083]
        DEFAULT_HOST = '0.0.0.0'

    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=None, help='Port to run on (if not specified, will try from the available list)')
    parser.add_argument('--host', default=DEFAULT_HOST, help='Host to bind to')
    parser.add_argument('--no-browser', action='store_true', help='Do not open browser')
    args = parser.parse_args()

    # Trouver un port disponible
    if args.port:
        selected_port = args.port
        logger.info(f"📌 Using specified port: {selected_port}")
    else:
        logger.info("🔄 No port specified, searching for available port...")
        selected_port = find_available_port(AVAILABLE_PORTS, args.host)
        if selected_port is None:
            logger.error("❌ Could not find any available port from the configured list!")
            print("\n" + "=" * 70)
            print("❌ ERROR: No available ports found")
            print("=" * 70)
            print(f"Tested ports: {AVAILABLE_PORTS}")
            print("\n💡 Troubleshooting steps:")
            print("  1. Close applications using these ports (check Task Manager)")
            print("  2. Close browser tabs connected to the bot (Chrome/Firefox/Edge)")
            print("  3. Kill any hung Python processes: taskkill /F /IM python.exe")
            print("  4. Restart your computer if the issue persists")
            print("\n🔍 Common causes:")
            print("  - Previous bot instance still running")
            print("  - Browser keeping WebSocket connection alive")
            print("  - Antivirus/Firewall blocking ports")
            print("  - Another service using the same ports")
            print("=" * 70 + "\n")
            sys.exit(1)
        logger.info(f"Found available port: {selected_port}")

    print("=" * 60)
    print("🚀 Kick Viewer Bot - WebSocket Server")
    print("=" * 60)
    print(f"📡 WebSocket: ws://{args.host}:{selected_port}/socket.io/")
    print(f"🌐 HTTP: http://{args.host}:{selected_port}")
    print(f"✅ Health: http://{args.host}:{selected_port}/health")
    print("=" * 60)
    print(f"\n🔌 Port utilisé: {selected_port}")
    print(f"💡 Le frontend essaiera automatiquement de se connecter à ce port")
    print("=" * 60)

    # Open browser after 1.5 seconds if not disabled
    if not args.no_browser:
        print("\n🌐 Opening browser at https://kick.velbots.shop...")
        Timer(1.5, lambda: webbrowser.open('https://kick.velbots.shop')).start()

    print("\nPress Ctrl+C to stop\n")

    try:
        socketio.run(
            app,
            host=args.host,
            port=selected_port,
            debug=False,
            use_reloader=False
        )
    except OSError as e:
        if "Address already in use" in str(e):
            logger.error(f"Port {selected_port} is already in use!")
            print(f"❌ Le port {selected_port} est déjà utilisé. Réessayez ou spécifiez un autre port avec --port")
        else:
            raise
