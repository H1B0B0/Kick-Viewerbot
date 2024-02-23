import customtkinter
import platform
from pathlib import Path
from threading import Thread
from tkinter import messagebox
from tkinter import filedialog
from viewer_bot import ViewerBot

current_path = Path(__file__).resolve().parent
ICON = current_path/"R.ico"

SLIDER_MIN = 1000
SLIDER_MAX = 20000

class ViewerBotGUI(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        self.title("Viewerbot")
        customtkinter.set_appearance_mode("System")
        if platform.system() == "Windows":
            self.wm_iconbitmap(ICON)
        customtkinter.set_default_color_theme("green")
        self.nb_requests = 0
        self.slider = 0
        self.nb_of_proxies = 0
        self.nb_of_proxies_alive = 0
        self.message_gived = False
        
        # Label for number of threads
        nb_threads_label = customtkinter.CTkLabel(self, text="Number of threads:")
        nb_threads_label.grid(column=0, row=0, padx=10, pady=10)
        
        # Entry for number of threads
        self.nb_threads_entry = customtkinter.CTkEntry(self)
        self.nb_threads_entry.grid(column=1, row=0, padx=10, pady=10)
        
        # Label for kick channel name
        channel_name_label = customtkinter.CTkLabel(self, text="Kick channel name:")
        channel_name_label.grid(column=0, row=1, padx=10, pady=10)
        
        # Entry for kick channel name
        self.channel_name_entry = customtkinter.CTkEntry(self)
        self.channel_name_entry.grid(column=1, row=1, padx=10, pady=10)

        # Label for proxy type
        proxy_type = customtkinter.CTkLabel(self, text="Proxy type")
        proxy_type.grid(column=0, row=2, columnspan=2, padx=10, pady=0)

        # select proxy type
        self.segemented_button_var = customtkinter.StringVar(value="http")
        self.segemented_button = customtkinter.CTkSegmentedButton(self, values=["http", "socks4", "socks5", "all"], variable=self.segemented_button_var)
        self.segemented_button.grid(column=0, row=3, columnspan=2, padx=10, pady=5)

        self.slider = customtkinter.CTkSlider(self, from_=SLIDER_MIN, to=SLIDER_MAX, command=self.slider_event)
        self.slider.set(SLIDER_MAX)
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

        # Label for the proxy states
        self.proxies_label = customtkinter.CTkLabel(self, text="proxy states")
        self.proxies_label.grid(column=0, columnspan=2, row=9, padx=10, pady=2)

        # Label for the proxy states
        self.total_label = customtkinter.CTkLabel(self, text=f"Total:{self.nb_of_proxies}")
        self.total_label.grid(column=0, row=10, padx=10, pady=2, sticky="w")

        # Label for the proxy states
        self.alive_label = customtkinter.CTkLabel(self, text=f"Alive:{self.nb_of_proxies_alive}")
        self.alive_label.grid(column=1, row=10, padx=10, pady=2, sticky="e")

        # Label
        self.name_label = customtkinter.CTkLabel(self, text="Coded by HIBOBO")
        self.name_label.grid(column=0, columnspan=2, row=11, padx=10, pady=2)
        
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
            self.bot = ViewerBot(nb_of_threads, self.channel_name, self.proxylist, self.proxy_imported, self.slider.get(), type_of_proxy=self.segemented_button_var)
            self.thread = Thread(target=self.bot.main)
            self.after(200, self.configure_label)
            self.after(200, self.proxies_number)
            self.thread.daemon = True
            self.thread.start()
            # Change status and disable/enable buttons
            self.status = "Running"
            self.nb_threads_entry.configure(state="disabled")
            self.channel_name_entry.configure(state="disabled")
            self.segemented_button.configure(state="disabled")
            self.slider.configure(state="disabled")
            # Update status label and buttons
            self.status_label.configure(text=f"Status: {self.status}")
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
            self.status_label.configure(text=f"Status: {self.status}")
            self.bot.stop()

    def configure_label(self):
        self.nb_requests_label.configure(text=f"Number of requests: {self.bot.nb_requests}")
        try:
            alive_text = f"Alive: {len(self.bot.proxies)}"
            self.alive_label.configure(text=alive_text)
            if len(self.bot.proxies) < 50 and self.bot.proxyrefreshed==True:
                self.bot.proxyrefreshed=False
            if len(self.bot.proxies) < 50 and self.bot.proxy_imported==False and self.bot.proxyrefreshed==False:
                self.bot.get_proxies()
                self.bot.proxyrefreshed=True
                self.proxies_number()
            elif not self.message_gived and len(self.bot.proxies) < 100 and self.bot.proxy_imported==True:
                messagebox.showwarning(title="Warning", 
                                       message="Your proxies are expired or of poor quality,\n you need to import a better list or switch to automatic mode")
                self.message_gived=True
        except:
            pass
        self.update_idletasks()
        app.after(200, app.configure_label)

    def proxies_number(self):
        try:
            total_text = f"Total: {len(self.bot.proxies)}"
            self.total_label.configure(text=total_text)  # Use the 'text' attribute to update label text
            self.update_idletasks()
        except:
            self.after(200, self.proxies_number)

    def show_dialog(self):
        self.proxylist = []
        # create new window for the parameters
        self.dialog = customtkinter.CTkToplevel(self)
        self.dialog.title("Parameters")
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
        if self.proxylist == []:
            self.proxylist = None
            self.proxy_imported = False
            messagebox.showwarning(title="WARNING", message="No proxy imported, the proxy list is empty. Proxies gonna be scraped.")
        # close the parameters window
        self.dialog.destroy()                   

if __name__ == '__main__':
    app = ViewerBotGUI()
    app.mainloop()