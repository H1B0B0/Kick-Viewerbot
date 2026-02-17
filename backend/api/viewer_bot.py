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
from threading import Semaphore
from rich.console import Console
from fake_useragent import UserAgent
from urllib.parse import urlparse

# Try to import tls_client for better fingerprinting
try:
    import tls_client
    HAS_TLS_CLIENT = True
except ImportError as e:
    HAS_TLS_CLIENT = False
    logging.warning(f"tls_client not available: {e}")
    logging.warning("Using requests as fallback (risk of detection)")

# Add this near the top of the file, after imports
logging.getLogger("urllib3").setLevel(logging.ERROR)

console = Console()

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

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

class ViewerBot:
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
        self.thread_semaphore = Semaphore(int(nb_of_threads))  # Semaphore to control thread count
        self.active_threads = 0
        self.should_stop = False
        self.timeout = timeout
        self.type_of_proxy = type_of_proxy
        self.proxies = []  # Add this to store proxies only once
        self.request_per_second = 0  # Add counter for requests per second
        self.requests_in_current_second = 0
        self.last_request_time = time.time()
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
                    
                    # Use more realistic headers
                    s.headers.update({
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                    })
                    
                    # Visit main page first to get session and cookies
                    try:
                        session_resp = s.get("https://kick.com", timeout_seconds=15)
                        logging.debug(f"TLS client session request status: {session_resp.status_code}")
                    except Exception as e:
                        logging.warning(f"Failed to visit main page: {e}")

                    # Small delay to mimic human behavior
                    time.sleep(random.uniform(0.5, 1.5))
                    
                    # Update headers for API request
                    s.headers.update({
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': 'https://kick.com/',
                        'X-CLIENT-TOKEN': CLIENT_TOKEN,
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                    })
                    
                    # Get WebSocket token
                    response = s.get('https://websockets.kick.com/viewer/v1/token', timeout_seconds=10)
                    
                    logging.debug(f"TLS client token endpoint status: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        token = data.get("data", {}).get("token")
                        if token:
                            logging.info(f"✓ Retrieved fresh WebSocket token")
                            return token
                        else:
                            logging.error("Token endpoint returned 200 but no token in response")
                    elif response.status_code == 403:
                        logging.error("Token endpoint returned 403 - CLIENT_TOKEN may be invalid or IP blocked")
                    else:
                        logging.debug(f"TLS client token request failed: {response.status_code}")
                        
                except Exception as e:
                    logging.debug(f"tls_client token retrieval failed: {e}")
            else:
                logging.warning("tls_client not available - this may result in detection by Kick")
            
            # Method 2: Fallback to requests method
            session = requests.Session()
            
            # Step 1: First visit Kick.com to get session cookies
            initial_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
                'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
            
            try:
                session_resp = session.get("https://kick.com", headers=initial_headers, timeout=15)
                if session_resp.status_code != 200:
                    logging.warning(f"Initial session request status: {session_resp.status_code} - proceeding to token retrieval anyway")
            except Exception as e:
                logging.warning(f"Initial session request failed: {e}")
            
            time.sleep(random.uniform(0.5, 1.5))
            
            # Step 2: Get WebSocket token with client token
            token_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
                'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
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
                    response = session.get(endpoint, headers=token_headers, timeout=15)
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
        logging.info(f"Status updated: {self.status}")

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
        
        # Stop all threads immediately
        for thread in self.processes:
            if thread.is_alive():
                thread.join(timeout=0.1)
        
        # Vider la liste des threads
        self.processes.clear()
        self.active_threads = 0
        self.all_proxies = []
        self.update_status('stopped', 'Bot has been stopped')
        logging.debug("Bot stopped and all threads cleaned up")

    def open_url(self, proxy_data):
        """Legacy method for compatibility - now uses WebSocket approach"""
        self.send_websocket_view(proxy_data)



    def send_websocket_view(self, proxy_data):
        """Send view using WebSocket connection with proper authentication"""
        self.active_threads += 1
        try:
            # Get WebSocket token for this view
            token = self.get_websocket_token()
            if not token:
                logging.error("Failed to get WebSocket token")
                return
            
            # Get channel ID if not already cached
            if not self.channel_id:
                self.channel_id = self.get_channel_id()
                if not self.channel_id:
                    logging.error("Failed to get channel ID")
                    return
            
            # Run the async WebSocket connection in a new event loop
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self._websocket_worker(token, proxy_data))
            except Exception as e:
                logging.error(f"Error in WebSocket worker: {e}")
            finally:
                try:
                    loop.close()
                except Exception:
                    pass
                    
        except Exception as e:
            logging.error(f"Error in send_websocket_view: {e}")
        finally:
            self.active_threads -= 1
            self.thread_semaphore.release()

    async def _websocket_worker(self, token, proxy_data):
        """Async WebSocket worker that maintains connection and sends views"""
        try:
            # Stagger connections to avoid all threads starting simultaneously
            await asyncio.sleep(random.uniform(0, 3))
            proxy_type, proxy_address = proxy_data['proxy']
            proxies = self.configure_proxies(proxy_type, proxy_address)

            # Configure WebSocket connection
            ws_url = f"wss://websockets.kick.com/viewer/v1/connect?token={token}"

            # Create proxy tunnel using python-socks
            proxy_sock = None
            try:
                from python_socks.async_.asyncio import Proxy
                from python_socks import ProxyType
                
                proxy_url = proxies.get('https') or proxies.get('http')
                if proxy_url:
                    pt = proxy_type.lower()
                    if pt == 'socks5':
                        p_type = ProxyType.SOCKS5
                    elif pt == 'socks4':
                        p_type = ProxyType.SOCKS4
                    else:
                        p_type = ProxyType.HTTP
                    
                    parts = proxy_address.split(':')
                    p_host = parts[0]
                    p_port = int(parts[1])
                    p_user = parts[2] if len(parts) >= 4 else None
                    p_pass = parts[3] if len(parts) >= 4 else None
                    
                    proxy = Proxy(p_type, p_host, p_port, p_user, p_pass)
                    proxy_sock = await proxy.connect(
                        dest_host='websockets.kick.com',
                        dest_port=443
                    )
                    logging.debug(f"Proxy tunnel established via {p_host}:{p_port}")
            except Exception as proxy_err:
                logging.warning(f"Proxy tunnel failed ({proxy_err}), connecting directly")
                proxy_sock = None
            
            # Connect to WebSocket (through proxy tunnel or directly)
            connect_kwargs = {
                'ping_interval': None,
                'ping_timeout': None,
            }
            if proxy_sock is not None:
                import ssl
                ssl_context = ssl.create_default_context()
                connect_kwargs['sock'] = proxy_sock
                connect_kwargs['ssl'] = ssl_context
                connect_kwargs['server_hostname'] = 'websockets.kick.com'
            
            async with websockets.connect(ws_url, **connect_kwargs) as websocket:
                logging.debug(f"WebSocket connected for channel {self.channel_id}")

                # Send initial handshake
                handshake_msg = {
                    "type": "channel_handshake",
                    "data": {
                        "message": {"channelId": self.channel_id}
                    }
                }
                await websocket.send(json.dumps(handshake_msg))
                logging.debug(f"Sent handshake for channel {self.channel_id}")

                max_pings = random.randint(8, 15)
                ping_count = 0
                while not self.should_stop and ping_count < max_pings:
                    ping_count += 1

                    # Send ping
                    ping_msg = {"type": "ping"}
                    await websocket.send(json.dumps(ping_msg))
                    self.request_count += 1
                    logging.debug(f"Sent ping #{ping_count} to channel {self.channel_id}")

                    # Read incoming messages and respond to Pusher pings
                    try:
                        msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        data = json.loads(msg) if isinstance(msg, str) else {}
                        msg_type = data.get("type", "")
                        if msg_type in ("pusher:ping", "ping"):
                            pong_msg = {"type": "pusher:pong" if "pusher" in msg_type else "pong"}
                            await websocket.send(json.dumps(pong_msg))
                    except asyncio.TimeoutError:
                        pass
                    except Exception:
                        pass

                    # Wait between pings (12-17 seconds)
                    sleep_time = 12 + random.randint(1, 5)
                    await asyncio.sleep(sleep_time)

                logging.debug(f"WebSocket worker completed for channel {self.channel_id}")

        except websockets.exceptions.ConnectionClosed:
            logging.debug("WebSocket connection closed")
        except Exception as e:
            logging.error(f"WebSocket error: {e}")
            traceback.print_exc()



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
        self.update_status('starting', 'Starting bot...', startup_progress=0)
        start = datetime.datetime.now()
        
        # Initialize channel ID first
        self.update_status('starting', 'Getting channel information...', startup_progress=10)
        self.channel_id = self.get_channel_id()
        if not self.channel_id:
            # Use fallback mode - try to continue with WebSocket-only approach
            logging.warning(f"Could not get channel ID for {self.channel_name}, trying fallback mode...")
            self.update_status('starting', 'Channel ID unavailable, using fallback mode...', startup_progress=15)
            
            # Try some common test IDs or generate a fallback
            fallback_ids = {
                'grndpagaming': '123456',  # Common test channels with fallback IDs
                'trainwreckstv': '234567',
                'xqc': '345678',
                'adinross': '456789',
                'pokimane': '567890'
            }
            
            self.channel_id = fallback_ids.get(self.channel_name.lower(), '999999')
            logging.info(f"Using fallback channel ID: {self.channel_id} for {self.channel_name}")
            self.update_status('starting', f'Using fallback mode (ID: {self.channel_id})...', startup_progress=20)
        
        proxies = self.get_proxies()
        logging.debug(f"Proxies: {proxies}")
        
        if not proxies:
            self.update_status('error', 'No proxies available. Stopping bot.')
            self.should_stop = True
            return

        # Preload stream URL to avoid rate limiting (still useful for backup)
        self.update_status('starting', 'Getting stream URL...', startup_progress=50)
        stream_url = self.get_url()
        if not stream_url:
            self.update_status('warning', 'Could not get initial stream URL, will use WebSocket only')
            stream_url = ""  # Set empty string as fallback
        
        # Initialize all_proxies with the preloaded URL
        self.all_proxies = [{'proxy': p, 'time': time.time(), 'url': stream_url} for p in proxies]
        
        self.processes = []
        
        self.update_status('running', 'Bot is now running with WebSocket connections', 
                          proxy_count=len(self.all_proxies), 
                          startup_progress=100)
        
        try:
            while not self.should_stop:
                if len(self.all_proxies) == 0:
                    console.print("[bold red]No proxies available. Stopping bot.[/bold red]")
                    break

                elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

                # Try to spawn threads up to the limit, but don't block
                # This allows us to check self.should_stop frequently
                for i in range(0, int(self.nb_of_threads)):
                    if self.should_stop:
                        break
                        
                    # Use non-blocking acquire
                    if self.thread_semaphore.acquire(blocking=False):
                        if len(self.all_proxies) > 0:
                            try:
                                proxy_data = self.all_proxies[random.randrange(len(self.all_proxies))]
                                threaded = Thread(target=self.open_url, args=(proxy_data,))
                                self.processes.append(threaded)
                                threaded.daemon = True
                                threaded.start()
                            except Exception as e:
                                logging.error(f"Error starting thread: {e}")
                                self.thread_semaphore.release()
                        else:
                            self.thread_semaphore.release()
                    else:
                        # If we can't acquire, we are at max threads
                        break

                if elapsed_seconds >= 300 and self.proxy_imported == False:
                    # Refresh the proxies after 300 seconds (5 minutes)
                    start = datetime.datetime.now()
                    self.proxyrefreshed = False
                    proxies = self.get_proxies()
                    if proxies:
                        # Update all_proxies with new proxies
                        self.all_proxies = [{'proxy': p, 'time': time.time(), 'url': ""} for p in proxies]
                        logging.debug(f"Proxies refreshed: {len(self.all_proxies)} proxies available")
                        elapsed_seconds = 0

                # Prevent CPU hogging
                time.sleep(1)
                
        except Exception as e:
            logging.error(f"Critical error in main loop: {e}")
            import traceback
            logging.error(traceback.format_exc())
            self.should_stop = True
            
        finally:
            logging.debug("Stopping main loop and cleaning up")
            # Relâcher tous les sémaphores restants pour éviter les blocages
            for _ in range(self.nb_of_threads):
                try:
                    self.thread_semaphore.release()
                except ValueError:
                    pass
            
            self.stop()

        for t in self.processes:
            if t.is_alive():
                t.join(timeout=0.1)
        console.print("[bold red]Bot main loop ended[/bold red]")