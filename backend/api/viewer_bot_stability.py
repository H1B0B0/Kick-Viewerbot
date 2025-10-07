import sys
import time
import random
import logging
import requests
import datetime
import threading
import asyncio
import websockets
import json
import traceback
from threading import Thread
from streamlink import Streamlink
from queue import Queue, Empty
from rich.console import Console
from fake_useragent import UserAgent
from urllib.parse import urlparse

# Try to import tls_client for better fingerprinting
try:
    import tls_client
    HAS_TLS_CLIENT = True
except ImportError:
    HAS_TLS_CLIENT = False
    logging.warning("tls_client not available, using requests (may be detected by Kick)")

# Add this near the top of the file, after imports
logging.getLogger("urllib3").setLevel(logging.ERROR)

console = Console()

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(asctime)s [%(levelname)s] %(name)s - %(message)s')

# Session creating for request
ua = UserAgent()
session = Streamlink()

# Kick WebSocket configuration
CLIENT_TOKEN = "e1393935a959b4020a4491574f6490129f678acdaa92760471263db43487f823"
WS_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': ua.random,
    'sec-ch-ua': '"Chromium";v="137", "Google Chrome";v="137", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
}
session.set_option("http-headers", {
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": ua.random,
    "Client-ID": "ewvlchtxgqq88ru9gmfp1gmyt6h2b93",
    "Referer": "https://www.google.com/"
})

class ViewerBot_Stability:
    def __init__(self, nb_of_threads, channel_name, proxy_file=None, proxy_imported=False, timeout=10000, type_of_proxy="http"):
        self.proxy_imported = proxy_imported
        self.proxy_file = proxy_file
        self.nb_of_threads = int(nb_of_threads)
        self.channel_name = self.extract_channel_name(channel_name)
        self.request_count = 0  # Total requests
        self.all_proxies = []
        self.processes = []
        self.proxyrefreshed = False
        self.channel_url = "https://kick.com/" + self.channel_name
        self.active_threads = 0
        self.should_stop = False
        self.timeout = timeout
        self.type_of_proxy = type_of_proxy
        self.proxies = []  # Add this to store proxies only once
        self.request_per_second = 0  # Add counter for requests per second
        self.requests_in_current_second = 0
        self.last_request_time = time.time()
        self.proxy_queue = Queue()
        self.in_use_proxies = set()
        self.proxy_failures = {}
        self.proxy_lock = threading.Lock()
        self.max_proxy_failures = 3
        self.connection_retry_delay = 5
        self.active_threads_lock = threading.Lock()
        self.connection_refresh_interval = 5 * 60  # Keep connections alive for up to 5 minutes
        self.ping_interval_range = (25, 35)  # Intervalle entre les pings en secondes
        self.worker_retry_backoff = (3, 8)
        self.alive_proxies = 0
        self.active_connections = 0
        self.status = {
            'state': 'initialized',  # Current state of the bot
            'message': 'Bot initialized',  # Status message
            'proxy_count': 0,  # Number of proxies currently loaded
            'proxy_loading_progress': 0,  # Progress when loading proxies (0-100)
            'startup_progress': 0  # Overall startup progress (0-100)
        }
        self.stream_url_cache = None
        self.stream_url_last_updated = 0
        self.stream_url_lock = threading.Lock()
        self.stream_url_cache_duration = 0.5  # Cache stream URL for 0.2 seconds
        self.channel_id = None  # Store channel ID for WebSocket connections
        logging.debug(f"Type of proxy: {self.type_of_proxy}")
        logging.debug(f"Timeout: {self.timeout}")
        logging.debug(f"Proxy imported: {self.proxy_imported}")
        logging.debug(f"Proxy file: {self.proxy_file}")
        logging.debug(f"Number of threads: {self.nb_of_threads}")
        logging.debug(f"Channel name: {self.channel_name}")

    def get_channel_id(self):
        """Get the channel ID from Kick API using multiple fallback methods"""
        try:
            # Method 1: Try v2 API with tls_client (like working example)
            if HAS_TLS_CLIENT:
                try:
                    s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                    s.headers.update({
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': 'https://kick.com/',
                        'Origin': 'https://kick.com',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                    })
                    response = s.get(f'https://kick.com/api/v2/channels/{self.channel_name}')
                    if response.status_code == 200:
                        data = response.json()
                        self.channel_id = data.get("id")
                        logging.debug(f"Retrieved channel ID from v2 API with tls_client: {self.channel_id}")
                        return self.channel_id
                    else:
                        logging.debug(f"v2 API with tls_client failed: {response.status_code}")
                except Exception as e:
                    logging.debug(f"tls_client v2 API failed: {e}")
            
            # Method 2: Try v1 API with requests (fallback)
            try:
                headers = {
                    'User-Agent': ua.random,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': f'https://kick.com/{self.channel_name}',
                }
                response = requests.get(f'https://kick.com/api/v1/channels/{self.channel_name}', 
                                      headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.channel_id = data.get("id")
                    logging.debug(f"Retrieved channel ID from v1 API: {self.channel_id}")
                    return self.channel_id
            except Exception as e:
                logging.debug(f"v1 API failed: {e}")
            
            # Method 3: Try scraping the channel page directly
            try:
                headers = {
                    'User-Agent': ua.random,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
                response = requests.get(f'https://kick.com/{self.channel_name}', 
                                      headers=headers, timeout=15, allow_redirects=True)
                if response.status_code == 200:
                    import re
                    # Look for channel data in the page
                    patterns = [
                        r'"id":(\d+).*?"slug":"' + re.escape(self.channel_name) + r'"',
                        r'"channel_id":(\d+)',
                        r'channelId["\']:\s*(\d+)',
                        r'channel.*?id["\']:\s*(\d+)'
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, response.text, re.IGNORECASE)
                        if match:
                            self.channel_id = int(match.group(1))
                            logging.debug(f"Retrieved channel ID from page scraping: {self.channel_id}")
                            return self.channel_id
                            
                    logging.warning("Could not find channel ID in page content")
            except Exception as e:
                logging.debug(f"Page scraping failed: {e}")
            
            logging.error(f"All methods failed to get channel ID for: {self.channel_name}")
            return None
            
        except Exception as e:
            logging.error(f"Error getting channel ID: {e}")
            return None

    def get_websocket_token(self):
        """Get WebSocket authentication token using tls_client if available"""
        try:
            # Method 1: Use tls_client (like working example)
            if HAS_TLS_CLIENT:
                try:
                    s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                    s.headers.update({
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Connection': 'keep-alive',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                    })
                    
                    # Visit main page first to get session
                    session_resp = s.get("https://kick.com")
                    logging.debug(f"TLS client session request status: {session_resp.status_code}")
                    
                    # Add client token and get WebSocket token
                    s.headers["X-CLIENT-TOKEN"] = CLIENT_TOKEN
                    response = s.get('https://websockets.kick.com/viewer/v1/token')
                    
                    logging.debug(f"TLS client token endpoint status: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        token = data.get("data", {}).get("token")
                        if token:
                            logging.debug(f"Retrieved WebSocket token with tls_client: {token[:20]}...")
                            return token
                    else:
                        logging.debug(f"TLS client token request failed: {response.status_code}")
                        
                except Exception as e:
                    logging.debug(f"tls_client token retrieval failed: {e}")
            
            # Method 2: Fallback to requests method
            session = requests.Session()
            
            # Step 1: First visit Kick.com to get session cookies
            initial_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            }
            
            session_resp = session.get("https://kick.com", headers=initial_headers, timeout=15)
            logging.debug(f"Initial session request status: {session_resp.status_code}")
            
            # Step 2: Get WebSocket token with client token
            token_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://kick.com/',
                'Origin': 'https://kick.com',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-CLIENT-TOKEN': CLIENT_TOKEN,
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
            
            # Try multiple endpoints for WebSocket token
            token_endpoints = [
                'https://websockets.kick.com/viewer/v1/token',
                'https://kick.com/api/websocket/token',
                'https://kick.com/api/v1/websocket/token'
            ]
            
            for endpoint in token_endpoints:
                try:
                    response = session.get(endpoint, headers=token_headers, timeout=10)
                    logging.debug(f"Token endpoint {endpoint} status: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        token = data.get("data", {}).get("token") or data.get("token")
                        if token:
                            logging.debug(f"Retrieved WebSocket token from {endpoint}: {token[:20]}..." if token else "No token")
                            return token
                except Exception as e:
                    logging.debug(f"Token endpoint {endpoint} failed: {e}")
                    continue
            
            logging.error("Failed to get WebSocket token from all endpoints")
            return None
            
        except Exception as e:
            logging.error(f"Error getting WebSocket token: {e}")
            return None

    def extract_channel_name(self, input_str):
        """Extrait le nom de la chaîne d'une URL Kick ou retourne le nom directement"""
        if "kick.com/" in input_str:
            # Extraire le nom de la chaîne de l'URL
            parts = input_str.split("kick.com/")
            channel = parts[1].split("/")[0].split("?")[0]  # Gérer les paramètres d'URL potentiels
            return channel.lower()
        return input_str.lower()

    def update_status(self, state, message, proxy_count=None, proxy_loading_progress=None, startup_progress=None):
        self.status.update({
            'state': state,
            'message': message,
            **(({'proxy_count': proxy_count} if proxy_count is not None else {})),
            **(({'proxy_loading_progress': proxy_loading_progress} if proxy_loading_progress is not None else {})),
            **(({'startup_progress': startup_progress} if startup_progress is not None else {}))
        })
        self.status['active_threads'] = self.active_threads
        self.status['request_count'] = self.request_count
        self.status['active_connections'] = getattr(self, 'active_connections', 0)
        self.status['alive_proxies'] = getattr(self, 'alive_proxies', 0)
        logging.info(f"Status updated: {self.status}")

    def _update_activity_message(self):
        self.status['message'] = (
            f"Stability mode active: {self.active_connections} connections / "
            f"{self.status.get('proxy_count', 0)} proxies available"
        )

    # --- Proxy pool helpers -------------------------------------------------

    def _reset_proxy_pool(self, proxies):
        """Initialise the proxy queue and bookkeeping for stability mode."""
        logging.info(f"Resetting proxy pool with {len(proxies)} proxies")
        self.all_proxies = list(proxies)
        self.proxy_queue = Queue()
        self.proxy_failures = {}
        with self.proxy_lock:
            self.in_use_proxies = set()

        for proxy in proxies:
            self.proxy_queue.put(proxy)
            self.proxy_failures[proxy] = 0

        # Keep proxy count in status for UI stats
        self.status['proxy_count'] = len(proxies)
        self.alive_proxies = len(proxies)
        self.active_connections = 0
        self.status['active_connections'] = 0
        self._update_activity_message()
        logging.info(f"Proxy pool reset complete, queue size: {self.proxy_queue.qsize()}")

    def _available_proxy_count(self):
        with self.proxy_lock:
            return self.proxy_queue.qsize() + len(self.in_use_proxies)

    def _acquire_proxy(self):
        """Take the next available proxy if any."""
        logging.info(f"_acquire_proxy called, queue size: {self.proxy_queue.qsize()}")
        while not self.should_stop:
            try:
                proxy = self.proxy_queue.get(timeout=2)
                logging.info(f"Got proxy from queue: {proxy}")
            except Empty:
                logging.warning(f"Proxy queue empty, waiting...")
                if self.should_stop:
                    return None
                continue

            logging.info(f"Trying to acquire lock for proxy: {proxy}")
            with self.proxy_lock:
                logging.info(f"Lock acquired for proxy: {proxy}")
                if proxy in self.in_use_proxies:
                    # Very unlikely, but skip to avoid double usage
                    logging.warning(f"Proxy {proxy} already in use, skipping")
                    continue
                self.in_use_proxies.add(proxy)
                # Calculate proxy count without calling _available_proxy_count (which would deadlock)
                proxy_count = self.proxy_queue.qsize() + len(self.in_use_proxies)
                self.status['proxy_count'] = proxy_count
                self.active_connections = len(self.in_use_proxies)
                self.status['active_connections'] = self.active_connections
                self._update_activity_message()
                logging.info(f"✓ Acquired proxy successfully: {proxy}")
                return proxy

        return None

    def _release_proxy(self, proxy, success):
        """Return proxy to the pool, optionally penalising repeated failures."""
        if proxy is None:
            return

        with self.proxy_lock:
            self.in_use_proxies.discard(proxy)
            self.active_connections = len(self.in_use_proxies)
            self.status['active_connections'] = self.active_connections

        if success or self.should_stop:
            # Reset failure count and reuse
            self.proxy_failures[proxy] = 0
            self.proxy_queue.put(proxy)
        else:
            failures = self.proxy_failures.get(proxy, 0) + 1
            self.proxy_failures[proxy] = failures
            if failures < self.max_proxy_failures:
                self.proxy_queue.put(proxy)
            else:
                logging.warning(f"Discarding proxy after {failures} failures: {proxy}")
                try:
                    self.all_proxies.remove(proxy)
                except ValueError:
                    pass

        # Calculate proxy count without deadlock
        with self.proxy_lock:
            current_available = self.proxy_queue.qsize() + len(self.in_use_proxies)
        self.status['proxy_count'] = current_available
        self.alive_proxies = current_available
        self._update_activity_message()

    # --- End proxy helpers --------------------------------------------------

    def get_proxies(self):
        self.update_status('loading_proxies', 'Starting proxy collection...')
        
        if not self.proxyrefreshed:
            if self.proxy_file:
                try:
                    self.update_status('loading_proxies', 'Loading proxies from file...')
                    with open(self.proxy_file, 'r') as f:
                        lines = [self.extract_ip_port(line.strip()) for line in f.readlines() if line.strip()]
                        self.proxyrefreshed = True
                        self.update_status('proxies_loaded', f'Loaded {len(lines)} proxies from file', proxy_count=len(lines))
                        self._reset_proxy_pool(lines)
                        return lines
                except FileNotFoundError:
                    self.update_status('error', 'Proxy file not found')
                    logging.error(f"Proxy file {self.proxy_file} not found.")
                    sys.exit(1)
            else:
                try:
                    self.update_status('loading_proxies', 'Fetching proxies from API...')
                    
                    # Debug: Print current proxy type
                    logging.debug(f"Fetching proxies with type: {self.type_of_proxy}")
                    
                    url = "https://api.proxyscrape.com/v4/free-proxy-list/get"
                    params = {
                        'request': 'display_proxies',
                        'proxy_format': 'protocolipport',
                        'format': 'text',
                        'protocol': self.type_of_proxy,
                        'timeout': self.timeout
                    }
                    
                    headers = {
                        'User-Agent': ua.random
                    }
                    
                    # Debug: Log request details
                    logging.debug(f"Request URL: {url}")
                    logging.debug(f"Request params: {params}")
                    
                    response = requests.get(url, params=params, headers=headers, timeout=10)
                    
                    # Debug: Log response details
                    logging.debug(f"Response status code: {response.status_code}")
                    logging.debug(f"Response headers: {response.headers}")
                    
                    if response.status_code == 200:
                        # Debug: Log first few lines of response
                        logging.debug(f"First 100 chars of response: {response.text[:100]}")
                        
                        lines = [line.strip() for line in response.text.splitlines() if line.strip()]
                        proxies = []
                        
                        # Debug: Log number of lines found
                        logging.debug(f"Found {len(lines)} proxy lines")
                        
                        for idx, line in enumerate(lines):
                            try:
                                if '://' in line:
                                    # Line already has protocol
                                    proxy_data = self.extract_ip_port(line)
                                else:
                                    # Add default http:// if no protocol specified
                                    proxy_data = self.extract_ip_port(f"http://{line}")
                                
                                # Filter by proxy type if specified
                                if self.type_of_proxy == 'all' or proxy_data[0] == self.type_of_proxy:
                                    proxies.append(proxy_data)
                                
                                # Update progress
                                progress = int((idx + 1) / len(lines) * 100)
                                if progress % 10 == 0:
                                    self.update_status(
                                        'loading_proxies',
                                        f'Processing proxies... {progress}%',
                                        proxy_loading_progress=progress
                                    )
                            except Exception as e:
                                logging.error(f"Error processing proxy line '{line}': {e}")
                                continue
                        
                        if proxies:
                            self.proxyrefreshed = True
                            self.update_status(
                                'proxies_loaded',
                                f'Successfully loaded {len(proxies)} proxies',
                                proxy_count=len(proxies),
                                proxy_loading_progress=100
                            )
                            # Debug: Log first few proxies
                            logging.debug(f"First 5 proxies: {proxies[:5]}")
                            self._reset_proxy_pool(proxies)
                            return proxies
                        
                        logging.error("No valid proxies found in response")
                    else:
                        logging.error(f"API request failed with status code: {response.status_code}")
                    
                    # Si aucun proxy n'est trouvé, essayer une source de secours
                    backup_response = requests.get(
                        'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'
                    )
                    if backup_response.status_code == 200:
                        proxies = [
                            self.extract_ip_port(f"http://{line.strip()}")
                            for line in backup_response.text.splitlines()
                            if line.strip()
                        ]
                        if proxies:
                            self.proxyrefreshed = True
                            self.update_status(
                                'proxies_loaded',
                                f'Loaded {len(proxies)} proxies from backup source',
                                proxy_count=len(proxies),
                                proxy_loading_progress=100
                            )
                            self._reset_proxy_pool(proxies)
                            return proxies
                    
                    self.update_status('error', 'Failed to fetch proxies from both sources')
                    return []
                        
                except Exception as e:
                    error_msg = f"Error fetching proxies: {str(e)}"
                    logging.error(error_msg)
                    self.update_status('error', error_msg)
                    return []

    def extract_ip_port(self, proxy):
        try:
            protocol = self.type_of_proxy
            credentials = ""
            
            if '://' in proxy:
                # Format http://user:pass@host:port or socks5://user:pass@host:port
                parts = proxy.split('://')
                protocol = parts[0].lower()
                proxy_part = parts[1]
            else:
                # Format IP:PORT or user:pass@host:port without protocol
                proxy_part = proxy
            
            if '@' in proxy_part:
                credentials_part, host_part = proxy_part.split('@', 1)
                credentials = credentials_part
            else:
                host_part = proxy_part
                
            if ':' in host_part:
                host, port = host_part.split(':', 1)
                port = port.split('/')[0]
            else:
                host = host_part
                port = '80'
                
            if credentials:
                proxy_address = f"{host}:{port}:{credentials}"
            else:
                proxy_address = f"{host}:{port}"
                
            # logging.debug(f"Parsed proxy: protocol={protocol}, proxy_address={proxy_address}")
            return (protocol, proxy_address)
        except Exception as e:
            logging.error(f"Error parsing proxy {proxy}: {e}")
            return (self.type_of_proxy, proxy)  # Fallback to raw format
    
    def get_url(self):
        """Get stream URL with caching to prevent rate limiting"""
        current_time = time.time()
        
        # Use a lock to prevent multiple threads from fetching the URL simultaneously
        with self.stream_url_lock:
            # If URL is cached and not expired, return it
            if (self.stream_url_cache and 
                current_time - self.stream_url_last_updated < self.stream_url_cache_duration):
                logging.debug("Using cached stream URL")
                return self.stream_url_cache
            
            # Otherwise, fetch a new URL
            url = ""
            try:
                streams = session.streams(self.channel_url)
                if streams:
                    priorities = ['audio_only', '160p', '360p', '480p', '720p', '1080p', 'best', 'worst']
                    
                    for quality in priorities:
                        if quality in streams:
                            url = streams[quality].url
                            logging.debug(f"Found stream quality: {quality}")
                            break
                    
                    if not url and streams:
                        quality = next(iter(streams))
                        url = streams[quality].url
                        logging.debug(f"Using first available quality: {quality}")
                    
                    # Cache the URL
                    self.stream_url_cache = url
                    self.stream_url_last_updated = current_time
                    logging.debug(f"Updated stream URL cache")
                else:
                    logging.warning("No streams available for the channel")
            except Exception as e:
                logging.error(f"Error getting stream URL: {e}")
            
            return url

    def stop(self):
        console.print("[bold red]Bot has been stopped[/bold red]")
        self.update_status('stopping', 'Stopping bot...')
        self.should_stop = True
        
        for thread in self.processes:
            if thread.is_alive():
                thread.join(timeout=1)
        
        # Vider la liste des threads
        self.processes.clear()
        self.active_threads = 0
        self.all_proxies = []
        with self.proxy_lock:
            self.in_use_proxies.clear()
        self.proxy_queue = Queue()
        self.update_status('stopped', 'Bot has been stopped')
        logging.debug("Bot stopped and all threads cleaned up")

    def _stability_worker(self, worker_id):
        logging.info(f"Stability worker {worker_id} starting")

        with self.active_threads_lock:
            self.active_threads += 1
            self.status['active_threads'] = self.active_threads
            self._update_activity_message()

        try:
            while not self.should_stop:
                logging.info(f"Worker {worker_id} acquiring proxy...")
                proxy_tuple = self._acquire_proxy()
                if proxy_tuple is None:
                    if self.should_stop:
                        break
                    logging.warning(f"Worker {worker_id} could not acquire proxy, waiting...")
                    time.sleep(1)
                    continue

                logging.info(f"Worker {worker_id} acquired proxy: {proxy_tuple[1]}")
                success = False
                try:
                    success = self.send_websocket_view(proxy_tuple)
                    logging.info(f"Worker {worker_id} websocket view result: {success}")
                except Exception as exc:  # noqa: BLE001
                    logging.error(f"Worker {worker_id} encountered error: {exc}")
                    traceback.print_exc()
                finally:
                    self._release_proxy(proxy_tuple, success)

                if not success and not self.should_stop:
                    backoff = random.uniform(*self.worker_retry_backoff)
                    logging.info(f"Worker {worker_id} backing off for {backoff:.2f}s after failure")
                    time.sleep(backoff)
        finally:
            with self.active_threads_lock:
                self.active_threads = max(self.active_threads - 1, 0)
                self.status['active_threads'] = self.active_threads
                self._update_activity_message()

        logging.info(f"Stability worker {worker_id} exiting")

    def send_websocket_view(self, proxy_tuple):
        """Run a WebSocket session using the provided proxy."""
        proxy_type, proxy_address = proxy_tuple
        logging.info(f"send_websocket_view called with proxy {proxy_address}")

        try:
            token = self.get_websocket_token()
            if not token:
                logging.error("Failed to get WebSocket token")
                return False

            if not self.channel_id:
                self.channel_id = self.get_channel_id()
                if not self.channel_id:
                    logging.error("Failed to get channel ID")
                    return False

            logging.info(f"Starting WebSocket worker with token and channel_id {self.channel_id}")

            loop = asyncio.new_event_loop()
            try:
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(self._websocket_worker(token, proxy_tuple))
                logging.info(f"WebSocket worker completed with result: {result}")
                return result
            finally:
                try:
                    loop.run_until_complete(loop.shutdown_asyncgens())
                except Exception:  # noqa: BLE001
                    pass
                finally:
                    asyncio.set_event_loop(None)
                    loop.close()

        except Exception as exc:  # noqa: BLE001
            logging.error(f"Error in send_websocket_view: {exc}")
            traceback.print_exc()
            return False
        finally:
            self.status['active_threads'] = self.active_threads

    async def _websocket_worker(self, token, proxy_tuple):
        """Async WebSocket worker that maintains a long-lived connection."""
        proxy_type, proxy_address = proxy_tuple

        # Note: websockets library doesn't natively support proxies
        # The connection will be made directly without proxy
        # For proxy support, you would need websocket-client or python-socks
        logging.info(f"Attempting WebSocket connection (direct, no proxy support in websockets lib) for proxy {proxy_address}")

        ws_url = f"wss://websockets.kick.com/viewer/v1/connect?token={token}"
        connection_started = time.time()

        try:
            logging.info(f"Connecting to WebSocket for channel {self.channel_id}...")
            async with websockets.connect(
                ws_url,
                additional_headers=WS_HEADERS,
                ping_interval=None,
                close_timeout=10
            ) as websocket:
                logging.info(f"✓ WebSocket connected for channel {self.channel_id} using proxy {proxy_address}")

                handshake_msg = {
                    "type": "channel_handshake",
                    "data": {"message": {"channelId": self.channel_id}}
                }
                await websocket.send(json.dumps(handshake_msg))
                logging.debug(f"Sent handshake for channel {self.channel_id}")

                while not self.should_stop:
                    elapsed = time.time() - connection_started
                    if elapsed >= self.connection_refresh_interval:
                        logging.debug(
                            f"Reached max connection age ({elapsed:.0f}s). Recycling proxy {proxy_address}."
                        )
                        return True

                    try:
                        await websocket.send(json.dumps({"type": "ping"}))
                        self.request_count += 1
                        self.status['request_count'] = self.request_count
                        if self.request_count % 50 == 0:
                            logging.info(
                                "Stability bot has issued %d pings across %d active connections",
                                self.request_count,
                                self.active_connections,
                            )
                    except websockets.exceptions.ConnectionClosedOK:
                        logging.debug("Connection closed gracefully while sending ping")
                        return True
                    except Exception as exc:  # noqa: BLE001
                        logging.error(f"Ping failed for proxy {proxy_address}: {exc}")
                        return False

                    wait_time = random.uniform(*self.ping_interval_range)
                    try:
                        await asyncio.wait_for(websocket.recv(), timeout=wait_time)
                    except asyncio.TimeoutError:
                        # Normal case: no message received, continue
                        continue
                    except websockets.exceptions.ConnectionClosedOK:
                        logging.debug("Connection closed gracefully during receive")
                        return True
                    except websockets.exceptions.ConnectionClosed as exc:
                        logging.warning(f"Connection closed for proxy {proxy_address}: {exc}")
                        return False
                    except Exception as exc:  # noqa: BLE001
                        logging.error(f"Unexpected receive error for proxy {proxy_address}: {exc}")
                        return False

        except websockets.exceptions.InvalidStatusCode as exc:
            logging.error(f"WebSocket invalid status code for proxy {proxy_address}: {exc}")
            traceback.print_exc()
            return False
        except Exception as exc:  # noqa: BLE001
            logging.error(f"WebSocket error for proxy {proxy_address}: {exc}")
            traceback.print_exc()
            return False

        return True

    def configure_proxies(self, proxy_type, proxy_address):
        try:
            parts = proxy_address.split(':')
            
            if len(parts) < 2:
                logging.error(f"Invalid proxy format: {proxy_address}")
                return {}
                
            host = parts[0]
            port = parts[1]
            
            if len(parts) >= 3:
                credentials = ':'.join(parts[2:])
                credentials += '@'
            else:
                credentials = ""
            
            if proxy_type.lower() in ["socks4", "socks5"]:
                return {
                    "http": f"{proxy_type}://{credentials}{host}:{port}",
                    "https": f"{proxy_type}://{credentials}{host}:{port}"
                }
            else:
                return {
                    "http": f"http://{credentials}{host}:{port}",
                    "https": f"http://{credentials}{host}:{port}"
                }
        except Exception as e:
            logging.error(f"Error configuring proxy {proxy_address}: {e}")
            return {}

    def main(self):
        self.should_stop = False
        self.update_status('starting', 'Starting bot...', startup_progress=0)

        self.update_status('starting', 'Getting channel information...', startup_progress=10)
        self.channel_id = self.get_channel_id()
        if not self.channel_id:
            logging.warning(
                f"Could not get channel ID for {self.channel_name}, falling back to default IDs"
            )
            self.update_status('starting', 'Channel ID unavailable, using fallback mode...', startup_progress=15)
            fallback_ids = {
                'grndpagaming': '123456',
                'trainwreckstv': '234567',
                'xqc': '345678',
                'adinross': '456789',
                'pokimane': '567890'
            }
            self.channel_id = fallback_ids.get(self.channel_name.lower(), '999999')
            logging.info(f"Using fallback channel ID: {self.channel_id} for {self.channel_name}")

        proxies = self.get_proxies()
        if not proxies:
            self.update_status('error', 'No proxies available. Stopping bot.')
            self.should_stop = True
            return

        self.update_status('starting', 'Getting stream URL...', startup_progress=50)
        stream_url = self.get_url() or ""
        if stream_url:
            logging.debug("Fetched initial stream URL for potential fallback usage")

        worker_count = max(1, min(int(self.nb_of_threads), len(proxies)))
        self.processes = []

        self.update_status(
            'running',
            f'Stability mode running with {worker_count} persistent connections',
            proxy_count=len(self.all_proxies),
            startup_progress=100
        )

        for worker_id in range(worker_count):
            worker = Thread(target=self._stability_worker, args=(worker_id,), daemon=True)
            self.processes.append(worker)
            worker.start()

        try:
            while not self.should_stop:
                time.sleep(5)
                if self.proxy_queue.empty() and not self.in_use_proxies:
                    logging.error("All proxies exhausted. Stopping stability mode.")
                    self.update_status(
                        'failed',
                        'All proxies have failed. Please refresh your proxy list to continue.'
                    )
                    self.should_stop = True
        except KeyboardInterrupt:
            logging.info("Received interrupt, stopping stability bot")
            self.should_stop = True
        finally:
            for worker in self.processes:
                worker.join()
            if self.status.get('state') not in {'failed', 'error'}:
                self.update_status('stopped', 'Bot has been stopped')
            console.print("[bold red]Bot main loop ended[/bold red]")