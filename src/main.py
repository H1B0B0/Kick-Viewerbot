import os
import time
import shutil
import random
import streamlink
import customtkinter
import datetime
import requests
from sys import exit
from streamlink.session import NoPluginError
from random import shuffle
from threading import Thread
from tkinter import filedialog
from streamlink import Streamlink
from fake_useragent import UserAgent

class ViewerBot:
    def __init__(self, nb_of_threads, channel_name, proxylist, type_of_proxy, proxy_imported, timeout, stop=False):
        self.nb_of_threads = nb_of_threads
        self.nb_requests = 0
        self.stop_event = stop
        self.proxylist = proxylist
        self.all_proxies = []
        self.proxyrefreshed = True
        self.type_of_proxy = type_of_proxy.get()
        self.proxy_imported = proxy_imported
        self.timeout = timeout
        self.channel_url = "https://www.kick.com/" + channel_name
        self.proxyreturned1time = False 

    def create_session(self):
        # Create a session for making requests
        self.ua = UserAgent(use_external_data=True)
        self.session = Streamlink()
        if 'kick' not in self.session.get_plugins():
            print("Le plugin Kick n'a pas été chargé.")
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

    def get_proxies(self):
        # Fetch proxies from an API or use the provided proxy list
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
        # Retrieve the URL for the channel's stream
        try:
            streams = self.session.streams(self.channel_url)
            try: 
                url = streams['audio_only'].url
                print(self.session.get_option())
            except:
                url = streams['worst'].url
        except:
            pass
        try: 
            return url
        except:
            exit()
    

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
                    response = s.head(current_url, proxies=current_proxy, headers=headers, timeout=(self.timeout/1000))
                self.nb_requests += 1
                proxy_data['time'] = time.time()
                self.all_proxies[current_index] = proxy_data
        except:
            pass

    def stop(self):
        # Stop the ViewerBot by setting the stop event
        self.stop_event = True

    def main(self):

        proxies = self.get_proxies()
        start = datetime.datetime.now()
        self.create_session()
        while not self.stop_event:
            elapsed_seconds = (datetime.datetime.now() - start).total_seconds()

            for p in proxies:
                # Add each proxy to the all_proxies list
                self.all_proxies.append({'proxy': p, 'time': time.time(), 'url': ""})

            for i in range(0, int(self.nb_of_threads)):
                # Open the URL using a random proxy from the all_proxies list
                self.threaded = Thread(target=self.open_url, args=(self.all_proxies[random.randrange(len(self.all_proxies))],))
                self.threaded.daemon = True  # This thread dies when the main thread (only non-daemon thread) exits.
                self.threaded.start()

            if elapsed_seconds >= 300 and not self.proxy_imported:
                # Refresh the proxies after 300 seconds (5 minutes)
                start = datetime.datetime.now()
                proxies = self.get_proxies()
                elapsed_seconds = 0  # Reset elapsed time
                self.proxyrefreshed = False

class ViewerBotGUI(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        customtkinter.set_appearance_mode("System")
        customtkinter.set_default_color_theme("green")
        self.title("Viewerbot")
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        try:
            self.wm_iconbitmap(f"{self.current_dir}/R.ico")
        except:
            pass
        self.nb_requests = 0
        self.slider = 0
        
        # Label for number of threads
        nb_threads_label = customtkinter.CTkLabel(self, text="Number of threads:")
        nb_threads_label.grid(column=0, row=0, padx=10, pady=10)
        
        # Entry for number of threads
        self.nb_threads_entry = customtkinter.CTkEntry(self)
        self.nb_threads_entry.grid(column=1, row=0, padx=10, pady=10)
        
        # Label for Kick channel name
        channel_name_label = customtkinter.CTkLabel(self, text="Kick channel name:")
        channel_name_label.grid(column=0, row=1, padx=10, pady=10)
        
        # Entry for Kick channel name
        self.channel_name_entry = customtkinter.CTkEntry(self)
        self.channel_name_entry.grid(column=1, row=1, padx=10, pady=10)

        # Label for proxy type
        proxy_type = customtkinter.CTkLabel(self, text="Proxy type")
        proxy_type.grid(column=0, row=2, columnspan=2, padx=10, pady=0)

        # select proxy type
        self.segemented_button_var = customtkinter.StringVar(value="http")
        self.segemented_button = customtkinter.CTkSegmentedButton(self, values=["http", "socks4", "socks5", "all"], variable=self.segemented_button_var)
        self.segemented_button.grid(column=0, row=3, columnspan=2, padx=10, pady=5)

        self.slider = customtkinter.CTkSlider(self, from_=1000, to=10000, command=self.slider_event)
        self.slider.grid(column=0, row=5, columnspan=2, padx=10, pady=0)

        # Label for timeout
        self.timeout = customtkinter.CTkLabel(self, text=f"timeout: {int(self.slider.get())}")
        self.timeout.grid(column=0, row=4, columnspan=2, padx=10, pady=0)
        
        # Button to start the bot
        start_button = customtkinter.CTkButton(self, text="Start bot")
        start_button.grid(column=0, row=6, padx=10, pady=10)
        start_button.configure(command=self.start_bot)
        
        # Button to stop the bot
        stop_button = customtkinter.CTkButton(self, text="Stop", state="normal")
        stop_button.grid(column=1, row=6, padx=10, pady=10)
        stop_button.configure(command=self.stop_bot)
        
        self.nb_requests_label = customtkinter.CTkLabel(self, text="Number of requests: 0")
        self.nb_requests_label.grid(column=0, row=7, columnspan=2, padx=10, pady=2)
        # Label for status
        self.status_label = customtkinter.CTkLabel(self, text="Status: Stopped")
        self.status_label.grid(column=0, row=8, columnspan=2, padx=10, pady=2)
        
        # Variables for status and threads
        self.status = "Stopped"
        self.threads = []
        self.show_dialog()

    def slider_event(self, value):
        self.timeout.configure(text=f"timeout: {int(self.slider.get())}")
        
    def start_bot(self):
        if self.status == "Stopped":
            nb_of_threads = self.nb_threads_entry.get()
            self.channel_name = self.channel_name_entry.get()
            self.bot = ViewerBot(nb_of_threads, self.channel_name, self.proxylist, self.segemented_button_var, self.proxy_imported, self.slider.get())
            self.thread = Thread(target=self.bot.main)
            app.after(50, app.configure_label)
            self.thread.daemon = True
            self.thread.start()
            # Change status and disable/enable buttons
            self.status = "Running"
            self.nb_threads_entry.configure(state="disabled")
            self.channel_name_entry.configure(state="disabled")
            self.segemented_button.configure(state="disabled")
            self.slider.configure(state="disabled")
            # Update status label and buttons
            self.status_label.configure(text="Status: Running")
            # Append thread to list of threads
            self.threads.append(self.thread)         
        
    def stop_bot(self):
        if self.status == "Running":
            # Change status and disable/enable buttons
            self.status = "Stopped"
            self.nb_threads_entry.configure(state="normal")
            self.channel_name_entry.configure(state="normal")
            self.segemented_button.configure(state="normal")
            self.slider.configure(state="normal")
            # Update status label and buttons
            self.status_label.configure(text="Status: Stopped")
            self.bot.stop()

    def configure_label(self):
        self.nb_requests_label.configure(text=f"Number of requests: {self.bot.nb_requests}")
        self.update_idletasks()
        app.after(50, app.configure_label)

    def show_dialog(self):
        self.proxylist = []
        # create new window for the parameters
        self.dialog = customtkinter.CTkToplevel(self)
        self.dialog.title("Parameters")
        self.dialog.iconbitmap(f"{self.current_dir}/R.ico")

        # Button for import proxy list
        open_file_button = customtkinter.CTkButton(self.dialog, text="import your proxy list")
        open_file_button.grid(column=1, row=1, padx=10, pady=10)
        open_file_button.configure(command=self.on_open_file) 

        scraped_button = customtkinter.CTkButton(self.dialog, text="scraped automatically proxy")
        scraped_button.grid(column=1, row=2, padx=10, pady=10)
        scraped_button.configure(command=self.scraped_proxy) 

        self.dialog.protocol("WM_DELETE_WINDOW", self.scraped_proxy)
        # center the parameters window about the object
        self.dialog.update_idletasks()
        self.wait_window(self.dialog)
        
    def scraped_proxy(self):
        self.proxylist = None
        self.proxy_imported = False
        self.dialog.destroy()

    # validation button
    def on_open_file(self):
        file_path = filedialog.askopenfilenames(filetypes=[("Text Files", "*.txt")])
        for path in file_path:
            with open(path, 'r') as f:
                for line in f:
                    self.proxylist.append(line.strip())
        self.proxy_imported = True
        # close the parameters window
        self.dialog.destroy()                   

if __name__ == '__main__':
    
    plugins_dir = streamlink.plugins.__path__[0]

    # Chemin complet du fichier du plugin à vérifier et déplacer
    plugin_file = os.path.join(plugins_dir, "kick.py")

    # Vérifier si le fichier du plugin existe
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
    app = ViewerBotGUI()
    app.mainloop()