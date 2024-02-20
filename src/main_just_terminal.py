import os
import shutil
import signal
import sys
import argparse
import time
import random
import requests
import datetime
from random import shuffle
from threading import Thread
from streamlink import Streamlink
from fake_useragent import UserAgent
from threading import Semaphore
from rich.console import Console
from rich.live import Live
from rich.prompt import Prompt
from rich.spinner import Spinner
from rich.table import Table
from rich.text import Text
import streamlink

console = Console()


# Session creating for request
ua = UserAgent()
session = Streamlink()
if 'kick' not in session.get_plugins():
    print("")
    console.print("[bold red]The Kick plugin is not installed, please install it and try again.[/bold red]")    
    sys.exit(1)
session.set_option("http-headers", {
    "Accept-Language": "en-US,en;q=0.5",
    'Accept': 'application/json',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": ua.random,
    "Client-ID": "ewvlchtxgqq88ru9gmfp1gmyt6h2b93",
    "Referer": "https://www.google.com/"
})

class ViewerBot:
    def __init__(self, nb_of_threads, channel_name, proxy_file=None, proxy_imported=False, debug_mode=False):
        self.debug_mode = debug_mode
        self.proxy_imported = proxy_imported
        self.proxy_file = proxy_file
        self.nb_of_threads = int(nb_of_threads)
        self.channel_name = channel_name
        self.request_count = 0  # initialize the counter variable
        self.all_proxies = []
        self.processes = []
        self.proxyrefreshed = False
        self.channel_url = "https://www.kick.com/" + self.channel_name
        self.thread_semaphore = Semaphore(int(nb_of_threads))
        self.active_threads = 0
        self.should_stop = False

    def get_proxies(self):
        # Fetch proxies from an API or use the provided proxy list
        if self.proxyrefreshed == False: 
            if self.proxy_file:
                try:
                    with open(self.proxy_file, 'r') as f:
                        lines = [line.strip() for line in f.readlines() if line.strip()]
                        self.proxyrefreshed = True
                        return lines
                except FileNotFoundError:
                    print(f"Proxy file {self.proxy_file} not found.")
                    sys.exit(1)
            else:
                try:
                    response = requests.get(f"https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all")
                    if response.status_code == 200:
                        lines = []
                        lines = response.text.split("\n")
                        lines = [line.strip() for line in lines if line.strip()]
                        self.proxyrefreshed = True
                        return lines
                except:
                    if len(response.text) == "":
                        console.print("Limit of proxy retrieval reached. Retry later", style="bold red")
                        return []
                    pass

    def get_url(self):
        url = ""
        try:
            proxy = self.all_proxies[random.randrange(len(self.all_proxies))]['proxy']
            session.set_option("http-proxy", proxy)
            try:
                streams = session.streams(self.channel_url)
                print(streams)
                if 'audio_only' in streams:
                    url = streams['audio_only'].url
                elif 'worst' in streams:
                    url = streams['worst'].url
                else:
                    if self.debug_mode:
                        console.print(f"No suitable stream found for URL: {self.channel_url}", style="bold red")
            except streamlink.exceptions.NoPluginError:
                if self.debug_mode:
                    console.print(f"No plugin to handle URL: {self.channel_url}", style="bold red")
            except streamlink.exceptions.PluginError as e:
                if self.debug_mode:
                    console.print(f"Plugin error: {str(e)}", style="bold red")
        except Exception as e:
            if self.debug_mode:
                console.print(f"Error getting URL: {e}", style="bold red")
            pass
        return url
    
    def stop(self):
        console.print("[bold red]Bot has been stopped[/bold red]")        
        self.should_stop = True  # Set the flag to True

    def update_display(self):
        with Live(console=console, refresh_per_second=10) as live:
            while True:
                table = Table(show_header=False, show_edge=False)
                table.add_column(justify="right")
                table.add_column(justify="left")
                
                text = Text(f"Number of requests sent: {self.request_count}")
                text.stylize("bold magenta")
                table.add_row(text, Spinner("aesthetic"))
                
                active_threads_text = Text(f"Active threads: {self.active_threads}")
                active_threads_text.stylize("bold cyan")  # add style to the active threads text
                table.add_row(active_threads_text, Spinner("aesthetic"))  # display the number of active threads
                
                live.update(table)
                if self.should_stop:
                        sys.exit()

    def open_url(self, proxy_data):
        self.active_threads += 1
        try:
            headers = {'User-Agent': ua.random}
            current_index = self.all_proxies.index(proxy_data)

            if proxy_data['url'] == "":
                proxy_data['url'] = self.get_url()
            current_url = proxy_data['url']
            if current_url == "":
                if self.debug_mode:
                    console.print("URL is empty, cannot open", style="bold red")
                return
            try:
                if time.time() - proxy_data['time'] >= random.randint(1, 5):
                    current_proxy = {"http": proxy_data['proxy'], "https": proxy_data['proxy']}
                    with requests.Session() as s:
                        s.head(current_url, proxies=current_proxy, headers=headers, timeout=10)
                        self.request_count += 1
                    proxy_data['time'] = time.time()
                    self.all_proxies[current_index] = proxy_data
            except requests.exceptions.RequestException as e:
                if self.debug_mode:
                    console.print(f"Error opening URL: {e}", style="bold red")
                else:
                    pass
            finally:
                self.active_threads -= 1
                self.thread_semaphore.release()  # Release the semaphore

        except (KeyboardInterrupt):
            self.should_stop = True

    def main(self):
        start = datetime.datetime.now()
        proxies = self.get_proxies()

        signal.signal(signal.SIGINT, lambda signal, frame: self.stop())

        # Start a separate thread for updating the display
        self.display_thread = Thread(target=self.update_display)
        self.display_thread.daemon = True
        self.display_thread.start()
        while True:
            elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

            for p in proxies:
                self.all_proxies.append({'proxy': p, 'time': time.time(), 'url': ""})

            for i in range(0, int(self.nb_of_threads)):
                acquired = self.thread_semaphore.acquire()  # Acquire the semaphore with a timeout
                if acquired:
                    threaded = Thread(target=self.open_url, args=(self.all_proxies[random.randrange(len(self.all_proxies))],))
                    threaded.daemon = True  # This thread dies when main thread (only non-daemon thread) exits.
                    threaded.start()

            if elapsed_seconds >= 300 and self.proxy_imported == False:
                # Refresh the proxies after 300 seconds (5 minutes)
                start = datetime.datetime.now()
                self.proxyrefreshed = False
                proxies = self.get_proxies()
                elapsed_seconds = 0  # Reset elapsed time

            if self.should_stop:
                sys.exit()

if __name__ == '__main__':

    plugins_dir = streamlink.plugins.__path__[0]

    plugin_file = os.path.join(plugins_dir, "kick.py")

    if not os.path.exists(plugin_file):
        # Chemin du fichier du plugin source
        plugin_source = os.path.dirname(os.path.abspath(__file__)) + "/streamlinks_plugins/kick.py"
        
        # Copier le fichier du plugin vers le dossier des plugins de Streamlink
        shutil.copy(plugin_source, plugins_dir)
        console.print("Plugin added successfully to the streamlinks folder.", style="bold green")
    else:
        plugin_source = os.path.dirname(os.path.abspath(__file__)) + "/streamlinks_plugins/kick.py"
        shutil.copy(plugin_source, plugins_dir)
        console.print("Plugin updated successfully on the streamlinks folder.", style="bold green")

    parser = argparse.ArgumentParser()
    parser.add_argument('-threads', type=int, help='Number of threads')
    parser.add_argument('-kickname', type=str, help='Kick channel name')
    parser.add_argument('-proxyfile', type=str, help='File containing list of proxies')
    parser.add_argument('-debug', type=bool, help='Debug mode')
    args = parser.parse_args()

    nb_of_threads = args.threads if args.threads else Prompt.ask("Enter the number of threads", default="100")
    channel_name = args.kickname if args.kickname else Prompt.ask("Enter the name of the Kick channel")
    proxy_file = args.proxyfile if args.proxyfile else Prompt.ask("Do you want to use a proxy file?", choices=["y", "n"], default="n")
    debug_mode = args.debug if args.debug else False

    if proxy_file.lower().startswith('y'):
        proxy_file = args.proxyfile if args.proxyfile else Prompt.ask("Enter the path of the proxy file")
        proxy_imported = True
    else:
        proxy_file = None
        proxy_imported=False
    bot = ViewerBot(nb_of_threads=nb_of_threads, channel_name=channel_name, proxy_file=proxy_file, proxy_imported=proxy_imported, debug_mode=debug_mode)
    try:
        bot.main()
    except KeyboardInterrupt:
        bot.stop()
        sys.exit()
