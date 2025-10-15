# 🤖 AI Chat Bot for Kick Livestreams

## Overview

KickViewerBOT includes an AI-powered chat bot that can **interact directly with your Kick livestream chat**! The bot reads messages from viewers and responds automatically with AI-generated replies - all running locally on your machine.

## Features

- ✅ **Live Chat Integration** - Connects to Kick chat in real-time
- ✅ **AI Responses** - Uses Microsoft DialoGPT for natural conversations
- ✅ **100% Local** - Runs on your PC, no cloud services
- ✅ **Smart Rate Limiting** - Won't spam chat (configurable response rate)
- ✅ **Context Aware** - Remembers recent conversation
- ✅ **Privacy First** - Your conversations never leave your computer

## How It Works

1. **Connects to Kick Chat** - Monitors your stream's chat via WebSocket
2. **AI Processes Messages** - Lightweight model (117MB) generates responses
3. **Responds Naturally** - Posts replies back to chat (optional)
4. **Rate Limited** - Smart timing to avoid spam detection

## Installation

The chat bot requires additional Python packages. Install them with:

```bash
pip install transformers torch
```

**Note:** First-time setup will download the AI model (~117MB). This happens automatically on first use.

## Quick Start

### 1. Load the AI Model

The model loads automatically when you start the backend. Check logs for:

```
🤖 Chat service initialized (model loading in background)
✅ AI chat model loaded successfully!
```

### 2. Start Chat Bot for Your Stream

**Via WebSocket:**

```javascript
socket.emit("kick_chat_start", {
  channel_name: "your_channel_name",
  auth_token: "your_kick_auth_token", // Optional - needed to send messages
  response_chance: 0.2, // 20% chance to respond to each message
  min_interval: 5, // Minimum 5 seconds between responses
});

socket.on("kick_chat_started", (data) => {
  console.log("Bot started:", data);
});
```

### 3. Monitor Activity

The bot will:

- 📖 Read all chat messages
- 🤔 Decide randomly if it should respond (based on `response_chance`)
- 🤖 Generate AI response with context
- 💬 Send response to chat (if `auth_token` provided)

## Configuration Options

### Response Chance

- `0.1` = 10% (responds rarely, ~1 in 10 messages)
- `0.2` = 20% (balanced, recommended)
- `0.5` = 50% (very active, may seem spammy)

### Min Interval

- `5` seconds = Moderate activity
- `10` seconds = Conservative
- `3` seconds = Active (risk of rate limiting)

### Getting Your Auth Token

**To send messages, you need a Kick auth token:**

1. Open Kick.com in browser and login
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies
4. Find cookie named `kick_session` or similar
5. Copy the value

**⚠️ Security Warning:** Never share your auth token publicly!

## How It Works

1. **Model Used:** Microsoft DialoGPT-small

   - Size: 117MB
   - Type: Conversational AI
   - Quality: Good for casual chat

2. **Backend Service:** `backend/services/chat_service.py`

   - Loads model asynchronously (doesn't block bot startup)
   - Maintains conversation history per session
   - Handles errors gracefully

3. **WebSocket API:**
   - `chat_status` - Check if chat is ready
   - `chat_message` - Send message and get response
   - `chat_clear` - Clear conversation history
   - `chat_history` - Get full conversation

## Usage

### Check Status

```javascript
socket.emit("chat_status");
socket.on("chat_status_response", (data) => {
  console.log(data);
  // { available: true, status: 'ready', message: 'AI chat is ready' }
});
```

### Send Message

```javascript
socket.emit("chat_message", {
  message: "Hello! How are you?",
  session_id: "user123", // Optional, defaults to socket ID
});

socket.on("chat_response", (data) => {
  console.log(data.response);
  // AI's response
});
```

### Clear History

```javascript
socket.emit("chat_clear", {
  session_id: "user123",
});
```

## Performance

- **First Message:** ~2-5 seconds (model initialization)
- **Subsequent Messages:** ~0.5-1 second
- **Memory Usage:** ~500MB RAM when loaded
- **CPU Usage:** Moderate during generation, idle otherwise

## Troubleshooting

### Model Won't Load

**Error:** `transformers library not installed`

**Solution:**

```bash
pip install transformers torch
```

### Slow Response

**Issue:** First response is slow

**Explanation:** Model loads on first use. Subsequent responses are faster.

### Out of Memory

**Issue:** Not enough RAM

**Solutions:**

- Close other applications
- Restart the bot
- Use a smaller model (edit `chat_service.py`)

## Alternative Models

You can use different models by editing `backend/services/chat_service.py`:

```python
# Change this line:
self.model_name = "microsoft/DialoGPT-small"  # 117MB

# To one of these:
# self.model_name = "microsoft/DialoGPT-medium"  # 355MB - Better quality
# self.model_name = "microsoft/DialoGPT-large"   # 774MB - Best quality
# self.model_name = "distilgpt2"                 # 82MB  - Faster, simpler
```

## Disabling Chat

If you don't want the chat feature:

1. Simply don't install `transformers` and `torch`
2. The bot will run normally without chat
3. Chat endpoints will return "not available" messages

## Security

- **Local Processing:** All AI processing happens on your machine
- **No Data Collection:** Nothing is sent to external servers
- **Session Isolation:** Each user has their own conversation context

## Future Improvements

Planned features:

- [ ] Custom system prompts
- [ ] Model switching via UI
- [ ] Response streaming for real-time typing effect
- [ ] Multi-language support
- [ ] Integration with Kick chat commands

## Need Help?

Open an issue on GitHub with:

- Python version: `python --version`
- Torch version: `pip show torch`
- Error logs from the terminal
