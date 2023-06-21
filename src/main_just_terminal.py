import os
import sys
import shutil
import argparse
import time
import random
import requests
import datetime
import streamlink
from random import shuffle
from threading import Thread
from streamlink import Streamlink
from fake_useragent import UserAgent

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
    def __init__(self, nb_of_threads, channel_name):
        self.channel_url = "https://www.kick.com/" + channel_name
        self.nb_of_threads = nb_of_threads
        self.request_count = 0  # initialize the counter variable
        self.all_proxies = []
        self.processes = []
        self.proxyrefreshed = False

    def get_proxies(self):
        # Fetch proxies from an API or use the provided proxy list
        if self.proxyrefreshed == False: 
            try:
                response = requests.get(f"https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all")
                if response.status_code == 200:
                    lines = []
                    lines = response.text.split("\n")
                    lines = [line.strip() for line in lines if line.strip()]
                    self.proxyrefreshed = True
                    return lines
            except:
                pass

    def get_url(self):
        url = ""
        try:
            streams = session.streams(self.channel_url)
            try:
                url = streams['audio_only'].url
            except:
                url = streams['worst'].url
        except:
            pass
        return url

    def open_url(self, proxy_data):
        try:
            headers = {'User-Agent': ua.random}
            current_index = self.all_proxies.index(proxy_data)

            if proxy_data['url'] == "":
                proxy_data['url'] = self.get_url()
            current_url = proxy_data['url']
            try:
                if time.time() - proxy_data['time'] >= random.randint(1, 5):
                    current_proxy = {"http": proxy_data['proxy'], "https": proxy_data['proxy']}
                    with requests.Session() as s:
                        s.head(current_url, proxies=current_proxy, headers=headers, timeout=10)
                        self.request_count += 1  # increment the counter variable
                    proxy_data['time'] = time.time()
                    self.all_proxies[current_index] = proxy_data
            except:
                pass

        except (KeyboardInterrupt):
            sys.exit()

    def stop(self):
        for thread in self.processes:
            thread.join()
        sys.exit()

    def main(self):
        print(f"Number of requests sent: {self.request_count}", end="", flush=True)  # initial print statement
        proxies = self.get_proxies()
        start = datetime.datetime.now()
        while True:
            elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

            for p in proxies:
                self.all_proxies.append({'proxy': p, 'time': time.time(), 'url': ""})

            for i in range(0, int(self.nb_of_threads)):
                threaded = Thread(target=self.open_url, args=(self.all_proxies[random.randrange(len(self.all_proxies))],))
                threaded.daemon = True  # This thread dies when main thread (only non-daemon thread) exits.
                # print the request count
                print(f"\rNumber of requests sent: {self.request_count}", end="", flush=True)
                threaded.start()

            if elapsed_seconds >= 300:
                # Refresh the proxies after 300 seconds (5 minutes)
                start = datetime.datetime.now()
                self.proxyrefreshed = False
                proxies = self.get_proxies()
                elapsed_seconds = 0  # Reset elapsed time

            shuffle(self.all_proxies)

if __name__ == '__main__':

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
    parser = argparse.ArgumentParser()
    parser.add_argument('-threads', type=int, help='Number of threads')
    parser.add_argument('-kickname', type=str, help='Kick channel name')
    args = parser.parse_args()

    nb_of_threads = args.threads if args.threads else int(input("Enter the number of threads: "))
    channel_name = args.kickname if args.kickname else input("Enter the name of the Kick channel: ")
    bot = ViewerBot(nb_of_threads=nb_of_threads, channel_name=channel_name)
    bot.main()
