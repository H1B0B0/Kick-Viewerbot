import sys
import time
import random
import logging
import requests
import datetime
import threading
from threading import Thread
from streamlink import Streamlink
from threading import Semaphore
from rich.console import Console
from fake_useragent import UserAgent
from urllib.parse import urlparse

# Add this near the top of the file, after imports
logging.getLogger("urllib3").setLevel(logging.ERROR)

console = Console()

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Session creating for request
ua = UserAgent()
session = Streamlink()
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
        logging.debug(f"Type of proxy: {self.type_of_proxy}")
        logging.debug(f"Timeout: {self.timeout}")
        logging.debug(f"Proxy imported: {self.proxy_imported}")
        logging.debug(f"Proxy file: {self.proxy_file}")
        logging.debug(f"Number of threads: {self.nb_of_threads}")
        logging.debug(f"Channel name: {self.channel_name}")

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
                
            logging.debug(f"Parsed proxy: protocol={protocol}, proxy_address={proxy_address}")
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
        self.update_status('stopped', 'Bot has been stopped')
        logging.debug("Bot stopped and all threads cleaned up")

    def open_url(self, proxy_data):
        self.active_threads += 1
        try:
            headers = {'User-Agent': ua.random}
            current_index = self.all_proxies.index(proxy_data)

            if proxy_data['url'] == "":
                proxy_data['url'] = self.get_url()
            current_url = proxy_data['url']
            try:
                if time.time() - proxy_data['time'] >= random.randint(1, 5):
                    proxy_type, proxy_address = proxy_data['proxy']
                    proxies = self.configure_proxies(proxy_type, proxy_address)
                    with requests.Session() as s:
                        s.head(current_url, proxies=proxies, headers=headers, timeout=10)
                        self.request_count += 1
                        logging.debug(f"Request sent using proxy {proxies}")
                    proxy_data['time'] = time.time()
                    self.all_proxies[current_index] = proxy_data
            except Exception as e:
                logging.error(f"Error sending request: {e}")
            finally:
                self.active_threads -= 1
                self.thread_semaphore.release()  # Release the semaphore

        except (KeyboardInterrupt, SystemExit):
            self.should_stop = True
            logging.debug("Bot interrupted by user")

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
        proxies = self.get_proxies()
        logging.debug(f"Proxies: {proxies}")
        
        if not proxies:
            self.update_status('error', 'No proxies available. Stopping bot.')
            self.should_stop = True
            return

        # Preload stream URL to avoid rate limiting
        self.update_status('starting', 'Getting stream URL...', startup_progress=50)
        stream_url = self.get_url()
        if not stream_url:
            self.update_status('warning', 'Could not get initial stream URL, will try again later')
        
        # Initialize all_proxies with the preloaded URL
        self.all_proxies = [{'proxy': p, 'time': time.time(), 'url': stream_url} for p in proxies]
        
        self.processes = []
        
        self.update_status('running', 'Bot is now running', 
                          proxy_count=len(self.all_proxies), 
                          startup_progress=100)
        
        while True:
            if len(self.all_proxies) == 0:
                console.print("[bold red]No proxies available. Stopping bot.[/bold red]")
                break

            elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

            for i in range(0, int(self.nb_of_threads)):
                acquired = self.thread_semaphore.acquire()
                if acquired and len(self.all_proxies) > 0:  # Vérifier à nouveau avant de créer le thread
                    threaded = Thread(target=self.open_url, args=(self.all_proxies[random.randrange(len(self.all_proxies))],))
                    self.processes.append(threaded)
                    threaded.daemon = True
                    threaded.start()
                elif acquired:
                    self.thread_semaphore.release()  # Relâcher le sémaphore si on ne peut pas créer de thread

            if elapsed_seconds >= 300 and self.proxy_imported == False:
                # Refresh the proxies after 300 seconds (5 minutes)
                start = datetime.datetime.now()
                self.proxyrefreshed = False
                proxies = self.get_proxies()
                # Update all_proxies with new proxies
                self.all_proxies = [{'proxy': p, 'time': time.time(), 'url': ""} for p in proxies]
                logging.debug(f"Proxies refreshed: {self.all_proxies}")
                elapsed_seconds = 0

            if self.should_stop:
                logging.debug("Stopping main loop")
                # Relâcher tous les sémaphores restants
                for _ in range(self.nb_of_threads):
                    try:
                        self.thread_semaphore.release()
                    except ValueError:
                        pass  # Ignore si déjà relâché
                break

        for t in self.processes:
            t.join()
        console.print("[bold red]Bot main loop ended[/bold red]")