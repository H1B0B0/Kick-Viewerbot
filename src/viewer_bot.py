import os
import shutil
import time
import random
import datetime
import requests
from sys import exit
from threading import Thread, Semaphore
from streamlink import Streamlink
from fake_useragent import UserAgent
from requests import RequestException
import streamlink

class ViewerBot:
    def __init__(self, nb_of_threads, channel_name, proxylist, proxy_imported, timeout, stop=False, type_of_proxy="http"):
        self.nb_of_threads = nb_of_threads
        self.nb_requests = 0
        self.stop_event = stop
        self.proxylist = proxylist
        self.all_proxies = []
        self.proxyrefreshed = True
        self.stream_info = None
        try:
            self.type_of_proxy = type_of_proxy.get()
        except:
            self.type_of_proxy = type_of_proxy
        self.proxy_imported = proxy_imported
        self.timeout = timeout
        self.channel_url = "https://www.kick.com/" + channel_name.lower()
        self.proxyreturned1time = False
        self.thread_semaphore = Semaphore(int(nb_of_threads))  # Semaphore to control thread count
        plugins_dir = streamlink.plugins.__path__[0]

        plugin_file = os.path.join(plugins_dir, "kick.py")

        if not os.path.exists(plugin_file):
            # Chemin du fichier du plugin source
            plugin_source = os.path.dirname(os.path.abspath(__file__)) + "/streamlinks_plugins/kick.py"
            
            # Copier le fichier du plugin vers le dossier des plugins de Streamlink
            shutil.copy(plugin_source, plugins_dir)
            print("the plugin Kick as been added successful")
        else:
            plugin_source = os.path.dirname(os.path.abspath(__file__)) + "/streamlinks_plugins/kick.py"
            shutil.copy(plugin_source, plugins_dir)
            print("the plugin Kick as been updated successful")
        

    def create_session(self):
        # Create a session for making requests
        self.ua = UserAgent()
        self.session = Streamlink()
        if 'kick' not in self.session.get_plugins():
            print("The Kick plugin is not installed, please install it and try again.")
            return
        self.session.set_option("http-headers", {
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": self.ua.random,
            "Client-ID": "ewvlchtxgqq88ru9gmfp1gmyt6h2b93",
            "Referer": "https://www.google.com/"
        })
        return self.session
    
    def make_request_with_retry(self, session, url, proxy, headers, proxy_used, max_retries=3):
        for _ in range(max_retries):
            try:
                # send requests to the kick service
                response = session.head(url, proxies=proxy, headers=headers, timeout=((self.timeout/1000)+1))
                if response.status_code == 200:
                    return response
                else:
                    # Remove bad proxy from the list
                    if proxy_used in self.proxies:
                        self.proxies.remove(proxy_used)
                    return None
            except RequestException as e:
                # Sort exception for remove bad proxy from the list
                if "400 Bad Request" in str(e) or "403 Forbidden" in str(e) or "RemoteDisconnected" in str(e) or "connect timeout=10.0" in str(e):
                    if proxy_used in self.proxies:
                        self.proxies.remove(proxy_used)
                continue

        return None

    def get_proxies(self):
        # Fetch self.proxies from an API or use the provided proxy list

        if self.proxylist == None or self.proxyrefreshed == False: 
            try:
                response = requests.get(f"https://api.proxyscrape.com/v2/?request=displayproxies&protocol={self.type_of_proxy}&timeout={self.timeout}&country=all&ssl=all&anonymity=all")
                if response.status_code == 200:
                    lines = []
                    lines = response.text.split("\n")
                    lines = [line.strip() for line in lines if line.strip()]
                    self.proxyrefreshed = True
                    return lines
            except:
                pass
        elif self.proxyreturned1time == False:
            self.proxyreturned1time = True
            return self.proxylist
        

    def get_url(self):
        if self.stream_info is None:
            try:
                streams = self.session.streams(self.channel_url)
                if 'audio_only' in streams:
                    self.stream_info = streams['audio_only'].url
                elif 'worst' in streams:
                    self.stream_info = streams['worst'].url
                else:
                    if self.debug_mode:
                        print(f"No suitable stream found for URL: {self.channel_url}")
            except streamlink.exceptions.NoPluginError:
                if self.debug_mode:
                    print(f"No plugin to handle URL: {self.channel_url}")
            except streamlink.exceptions.PluginError as e:
                if self.debug_mode:
                    print(f"Plugin error: {str(e)}")
            except Exception as e:
                if self.debug_mode:
                    print(f"Error getting URL: {e}")
        return self.stream_info

    def open_url(self, proxy_data):
        # Open the stream URL using the given proxy
        headers = {'User-Agent': self.ua.random}
        current_index = self.all_proxies.index(proxy_data)

        if proxy_data['url'] == "":
            # If the URL is not fetched for the current proxy, fetch it
            proxy_data['url'] = self.get_url()
        current_url = proxy_data['url']
        username = proxy_data.get('username')
        password = proxy_data.get('password')
        if username and password:
            # Set the proxy with authentication if username and password are available
            current_proxy = {"http": f"{username}:{password}@{proxy_data['proxy']}", "https": f"{username}:{password}@{proxy_data['proxy']}"}
        else:
            current_proxy = {"http": proxy_data['proxy'], "https": proxy_data['proxy']}

        try:
            if time.time() - proxy_data['time'] >= random.randint(1, 5):
                # Refresh the proxy after a random interval
                current_proxy = {"http": proxy_data['proxy'], "https": proxy_data['proxy']}
                with requests.Session() as s:
                    response = self.make_request_with_retry(s, current_url, current_proxy, headers, proxy_data['proxy'])
                if response:
                    self.nb_requests += 1
                    proxy_data['time'] = time.time()
                    self.all_proxies[current_index] = proxy_data
        except Exception as e:
            print(e)
            pass
        finally:
            self.thread_semaphore.release()  # Release the semaphore

    def stop(self):
        # Stop the ViewerBot by setting the stop event
        self.stop_event = True

    def main(self):

        self.proxies = self.get_proxies()
        start = datetime.datetime.now()
        self.create_session()
        while not self.stop_event:
            elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

            for p in self.proxies:
                # Add each proxy to the all_proxies list
                self.all_proxies.append({'proxy': p, 'time': time.time(), 'url': ""})
            
            for proxy_data in self.all_proxies:
                # Open the URL using a proxy from the all_proxies list
                self.thread_semaphore.acquire()  # Acquire the semaphore
                self.threaded = Thread(target=self.open_url, args=(proxy_data,))
                self.threaded.daemon = True  # This thread dies when the main thread (only non-daemon thread) exits.
                self.threaded.start()

            if elapsed_seconds >= 300 and not self.proxy_imported:
                # Refresh the self.proxies after 300 seconds (5 minutes)
                start = datetime.datetime.now()
                self.proxies = self.get_proxies()
                elapsed_seconds = 0  # Reset elapsed time
                self.proxyrefreshed = False