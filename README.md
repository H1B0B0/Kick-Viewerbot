# Kick Viewer Bot

A powerful web application for generating Kick views using proxy rotation technology. Built with a **Flask/SocketIO** backend and **Next.js** frontend communicating via WebSocket.

## Warning

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️

This software is provided strictly for educational and research purposes. Using this tool to manipulate viewing metrics may violate Kick's Terms of Service and applicable laws. The developers assume no responsibility for misuse of this software.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [How to use with macOS](#how-to-use-with-macos)
- [Screenshots](#screenshots)
- [License](#license)

## Features

- 🚀 High-performance multi-threading system supporting up to 1000 concurrent connections
- 🔄 Intelligent proxy rotation with automatic failover mechanisms
- 🌐 Comprehensive proxy protocol support (HTTP, SOCKS4, SOCKS5)
- 🌐 **Proxy-tunneled WebSocket connections** — each viewer appears from a unique IP
- 📊 Real-time analytics dashboard with performance metrics
- 📱 Responsive and intuitive web interface
- 🔥 **Stability Mode** — long-lived connections with auto-reconnection
- 🔔 **Automatic update notifications** when a new version is available
- ⚙️ Advanced configuration options for power users

## Requirements

- Python 3.9+
- Node.js 18+
- Modern web browser with JavaScript enabled
- Stable internet connection
- (Optional) Custom proxy list for enhanced performance

## 💻 Installation

1. Download the latest release executable from the [releases page](https://github.com/H1B0B0/Kick-Viewerbot/releases)
2. Run `KickViewerBOT` — **no admin privileges required**
3. Configure your viewing preferences and proxy settings
4. Start the bot and monitor real-time statistics

## 🛠️ Development Setup

### 1. Clone & install dependencies

```shell
git clone https://github.com/H1B0B0/Kick-Viewerbot.git
cd Kick-Viewerbot
```

**Backend (Python):**

```shell
pip install -r requirements.txt
```

**Frontend (Node.js):**

```shell
cd frontend
npm install
```

### 2. Run the development servers

You need **two terminals** running simultaneously:

**Terminal 1 — Backend:**

```shell
python ./backend/main.py
```

**Terminal 2 — Frontend:**

```shell
cd frontend
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and communicates with the backend via WebSocket.

## How to use with macOS

1. Download the macOS build from the [releases page](https://github.com/H1B0B0/Kick-Viewerbot/releases)
   ![macOS version](./images/macos_file.png)
2. When launching, you may encounter a security warning
   ![macOS block message](./images/macos_block.png)
3. Navigate to `System Settings` → `Privacy & Security`. Click `Open Anyway`
   ![Enable macOS application](images/enable_macos.png)
4. Confirm by clicking `Open Anyway` in the dialog
   ![Execute the app](./images/use_macos.png)
5. The application will start. Configure your settings and enjoy 🚀

## 📸 Screenshots

<img width="1512" alt="Dashboard Overview" src="https://github.com/user-attachments/assets/439dde39-6370-45d5-8ec1-3587fd86c98b" />
<img width="1512" alt="Channel Configuration" src="https://github.com/user-attachments/assets/654e0e82-c828-4c30-a120-4488ba44b799" />
<img width="1512" alt="Advanced Settings" src="https://github.com/user-attachments/assets/066615f5-09fc-4077-b83c-c1e553de3f7b" />
<img width="1512" alt="Performance Analytics" src="https://github.com/user-attachments/assets/6392e0e0-cda7-49e7-9969-41753d8c6c76" />

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for detailed terms and conditions.
