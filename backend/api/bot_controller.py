from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from threading import Thread
import psutil
import logging
import time

logger = logging.getLogger(__name__)

# Update imports to use both ViewerBot classes
from .viewer_bot import ViewerBot
from .viewer_bot_stability import ViewerBot_Stability

bot_api = Blueprint('bot_api', __name__)
active_bots = {}

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class BotManager:
    def __init__(self):
        self.bot = None
        self.stats = {
            'requests': 0,
            'active_threads': 0,
            'total_proxies': 0,
            'alive_proxies': 0
        }
        self.is_running = False
        self.last_channel = None
        self.last_net_io = psutil.net_io_counters()
        self.last_net_io_time = time.time()
        self.default_metrics = {
            'cpu': 0,
            'memory': 0,
            'network_up': 0,
            'network_down': 0
        }
        self.stability_mode = False

    def start_bot(self, channel_name, threads, proxy_file=None, timeout=1000, proxy_type="http", stability_mode=False):
        if self.is_running:
            return False
        
        self.stability_mode = stability_mode
        logger.info(f"Starting bot with stability mode: {stability_mode}")
        
        # Choose the appropriate ViewerBot class based on stability_mode
        bot_class = ViewerBot_Stability if stability_mode else ViewerBot
        logging.info(f"Using bot class: {bot_class}")
        
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
        
        self.bot_thread = Thread(target=run_bot)
        self.bot_thread.daemon = True
        self.bot_thread.start()
        self.last_channel = channel_name
        return True

    def stop_bot(self):
        if self.bot and self.is_running:
            self.is_running = False
            proxy_file = getattr(self.bot, 'proxy_file', None)
            
            def cleanup():
                self.bot.stop()
                if proxy_file and os.path.exists(proxy_file):
                    try:
                        os.remove(proxy_file)
                        logger.info(f"Removed proxy file: {proxy_file}")
                    except Exception as e:
                        logger.error(f"Failed to remove proxy file: {e}")
                
            cleanup_thread = Thread(target=cleanup)
            cleanup_thread.daemon = True
            cleanup_thread.start()
            return True
        return False

    def get_stats(self):
        try:
            if self.bot:
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
                    'network_up': max(bytes_sent / (1024 * 1024), 0),  # Ensure non-negative
                    'network_down': max(bytes_recv / (1024 * 1024), 0)  # Ensure non-negative
                }
            else:
                system_metrics = self.default_metrics

            return {
                'requests': getattr(self.bot, 'request_count', 0),
                'active_threads': self.bot.active_threads if (self.bot and self.is_running) else 0,
                'total_proxies': len(self.bot.all_proxies) if (self.bot and self.is_running) else 0,
                'alive_proxies': self.stats['alive_proxies'],
                'is_running': self.is_running,
                'channel_name': self.last_channel,
                'config': {
                    'threads': getattr(self.bot, 'nb_of_threads', 0),
                    'timeout': getattr(self.bot, 'timeout', 10000),
                    'proxy_type': getattr(self.bot, 'type_of_proxy', 'http'),
                    'stability_mode': self.stability_mode
                },
                'status': getattr(self.bot, 'status', {
                    'state': 'stopped',
                    'message': 'Bot is not running',
                    'proxy_count': 0,
                    'proxy_loading_progress': 0,
                    'startup_progress': 0
                }),
                'system_metrics': system_metrics
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                'requests': 0,
                'active_threads': 0,
                'total_proxies': 0,
                'alive_proxies': 0,
                'is_running': False,
                'channel_name': None,
                'config': {'stability_mode': self.stability_mode},
                'status': {
                    'state': 'error',
                    'message': 'Error getting stats',
                    'proxy_count': 0,
                    'proxy_loading_progress': 0,
                    'startup_progress': 0
                },
                'system_metrics': self.default_metrics
            }

bot_manager = BotManager()

@bot_api.route('/start', methods=['POST', 'OPTIONS'])
def start_bot():
    if request.method == 'OPTIONS':
        return '', 204
        
    channel_name = request.form.get('channelName')
    threads = int(request.form.get('threads', 100))
    timeout = int(request.form.get('timeout', 1000))
    proxy_type = request.form.get('proxyType', 'http')
    stability_mode = request.form.get('stabilityMode', 'false').lower() == 'true'  # Ensure correct parsing
    proxy_file_path = None

    logger.info(f"Received start request with stability_mode: {stability_mode}")

    if 'proxyFile' in request.files:
        file = request.files['proxyFile']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            proxy_file_path = filepath
            # Assurons-nous que le fichier existe
            logger.info(f"Saved proxy file to: {filepath}, exists: {os.path.exists(filepath)}")

    if not channel_name:
        return jsonify({'error': 'Channel name is required'}), 400

    success = bot_manager.start_bot(
        channel_name=channel_name,
        threads=threads,
        proxy_file=proxy_file_path,
        timeout=timeout,
        proxy_type=proxy_type,
        stability_mode=stability_mode
    )

    
    if success:
        return jsonify({'message': 'Bot started successfully'})
    return jsonify({'error': 'Bot is already running'}), 400

@bot_api.route('/stop', methods=['POST'])
def stop_bot():
    success = bot_manager.stop_bot()
    if success:
        return jsonify({'message': 'Bot stopped successfully'})
    return jsonify({'error': 'No bot is running'}), 400

@bot_api.route('/stats', methods=['GET'])
def get_stats():
    stats = bot_manager.get_stats()
    response_data = {
        'active_threads': stats['active_threads'],
        'total_proxies': stats['total_proxies'],
        'alive_proxies': stats['alive_proxies'],
        'request_count': stats['requests'],
        'is_running': stats.get('is_running', False),
        'channel_name': stats.get('channel_name', None),
        'config': stats.get('config', {}),
        'status': stats.get('status', {
            'state': 'stopped',
            'message': 'Bot is not running',
            'proxy_count': 0,
            'proxy_loading_progress': 0,
            'startup_progress': 0
        }),
        'system_metrics': stats.get('system_metrics', {})
    }
    
    return jsonify(response_data)

@bot_api.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'https://velbots.shop')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response
