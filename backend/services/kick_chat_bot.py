"""
Kick Chat Bot with AI
Connects to Kick chat, reads messages, and responds with AI-generated replies
"""
import logging
import asyncio
import json
import websockets
import time
import random
import threading
import re
from queue import Queue
from typing import Optional, Callable, Dict, List

try:
    import tls_client
    HAS_TLS_CLIENT = True
except ImportError:
    HAS_TLS_CLIENT = False

logger = logging.getLogger("kick_chat_bot")

class KickChatBot:
    def __init__(
        self, 
        channel_name: str, 
        auth_tokens: Optional[List[str]] = None
    ):
        """
        Initialize Kick Chat Bot
        
        Args:
            channel_name: The Kick channel to monitor
            auth_tokens: Optional list of authentication tokens to send messages
        """
        self.channel_name = self.extract_channel_name(channel_name)
        self.auth_tokens = auth_tokens if auth_tokens else []
        self.current_token_index = 0
        self.ws = None
        self.running = False
        self.channel_id = None
        self.chatroom_id = None
        
        # Message queues
        self.incoming_messages = Queue()
        self.outgoing_messages = Queue()
        
        # Callbacks
        self.on_message_callback: Optional[Callable] = None
        self.on_connect_callback: Optional[Callable] = None
        self.on_disconnect_callback: Optional[Callable] = None
        self.generate_callback: Optional[Callable] = None  # AI generate function
        
        # Rate limiting for responses
        self.last_response_time = 0
        self.min_response_interval = 3  # Minimum 3 seconds between responses
        self.response_chance = 0.3  # 30% chance to respond to a message
        
        # Proactive message settings
        self.proactive_enabled = True
        self.proactive_min_interval = 15   # Min seconds between proactive messages
        self.proactive_max_interval = 45   # Max seconds between proactive messages
        self.last_proactive_time = 0
        self.sent_messages: List[str] = []  # Track sent msgs to avoid repeats
        self.max_sent_history = 50
        self._cached_xsrf = None  # Cached XSRF token
        
        # Conversation context
        self.recent_messages: List[Dict] = []
        self.max_context_messages = 10
        
        # Realistic stream chat message pool
        self._stream_messages = {
            "hype": [
                "lets gooo", "LETS GOOOO", "yooo this is fire", "bro this stream is crazy",
                "no way lmaooo", "this is insane", "HES CRACKED", "sheeeesh",
                "W stream fr", "this man is different", "goated stream", "banger content",
                "absolute legend", "no cap this is heat", "too good bro", "W W W",
                "YOOOO", "bruh moment", "this is it chief", "certified banger",
                "on god this is fire", "built different fr", "the GOAT", "massive W",
            ],
            "reactions": [
                "lmao", "lmaooo", "bruhh", "nah bro", "ayoo", "no shot",
                "im dead", "crying rn", "bro what", "how", "LMAOO",
                "thats crazy", "wait what", "nah thats wild", "hollyyy",
                "aint no way", "bro chill", "yo thats tough", "pain",
            ],
            "emotes": [
                "PogU", "KEKW", "OMEGALUL", "Sadge", "PepeLaugh",
                "monkaW", "EZ Clap", "Pog", "POGGERS", "FeelsStrongMan",
                "widepeepoHappy", "catJAM", "HYPERS", "PauseChamp",
                "Pepega", "5Head", "pepeMeltdown", "COPIUM",
            ],
            "engagement": [
                "gg", "gg wp", "ez", "nice one", "good stuff",
                "clutch", "clean", "smooth", "big brain play", "200 iq",
                "that was sick", "insane play", "perfect", "so clean",
                "yo drop that follow", "everyone drop a follow",
            ],
            "support": [
                "love the content bro", "keep it up", "best streamer",
                "always a vibe here", "glad i clicked", "W streamer",
                "fav stream rn", "this guy never misses", "quality content fr",
            ],
            "casual": [
                "yo", "whats good chat", "hey everyone", "im here",
                "just got here whats happening", "back again", "vibing",
                "chilling", "this is chill", "good vibes", "we in here",
                "yooo whats up", "waddup chat", "hello hello",
            ],
        }
        
        # Category weights for random selection
        self._category_weights = {
            "hype": 25, "reactions": 25, "emotes": 15,
            "engagement": 15, "support": 10, "casual": 10,
        }
        
    def set_response_settings(self, min_interval: int = 3, response_chance: float = 0.3):
        """Configure response behavior"""
        self.min_response_interval = min_interval
        self.response_chance = response_chance
    
    def set_generate_callback(self, callback: Callable):
        """Register AI generation callback for proactive messages"""
        self.generate_callback = callback
        logger.info("🧠 AI generate callback registered for proactive messages")
        
    def on_message(self, callback: Callable):
        """Register callback for incoming messages"""
        self.on_message_callback = callback
        
    def on_connect(self, callback: Callable):
        """Register callback for connection"""
        self.on_connect_callback = callback
        
    def on_disconnect(self, callback: Callable):
        """Register callback for disconnection"""
        self.on_disconnect_callback = callback
    
    def extract_channel_name(self, input_str: str) -> str:
        """Extract username from full Kick URL if necessary"""
        if not input_str:
            return ""
        if 'kick.com/' in input_str:
            parts = input_str.split('kick.com/')
            channel = parts[1].split('/')[0]
            return channel.lower()
        return input_str.lower()

    async def get_channel_info(self) -> bool:
        """Get channel ID and chatroom ID from Kick API"""
        try:
            import requests
            from fake_useragent import UserAgent
            ua = UserAgent()
            
            # Method 1: Try v2 API with tls_client (most robust)
            if HAS_TLS_CLIENT:
                try:
                    s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                    s.headers.update({
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://kick.com/',
                        'Origin': 'https://kick.com',
                        'User-Agent': ua.random,
                    })
                    response = s.get(f'https://kick.com/api/v2/channels/{self.channel_name}')
                    if response.status_code == 200:
                        data = response.json()
                        # Log full data for debugging pusher cluster
                        logger.debug(f"Raw channel info: {json.dumps(data)[:500]}...")
                        self.channel_id = data.get('id')
                        if 'chatroom' in data:
                            self.chatroom_id = data['chatroom'].get('id')
                        
                        # Try to find pusher info in data
                        pusher_info = data.get('pusher', {})
                        if not pusher_info and 'chatroom' in data:
                            pusher_info = data['chatroom'].get('pusher', {})
                        
                        if pusher_info:
                            logger.info(f"🔍 Found Pusher info in API: {pusher_info}")
                            # You could potentially extract key/cluster here if Kick provides them
                            
                        logger.info(f"✅ Channel info (v2/tls): ID={self.channel_id}, Chatroom={self.chatroom_id}")
                        return True
                except Exception as e:
                    logger.debug(f"tls_client v2 API failed: {e}")

            # Method 2: Try v1 API with requests (fallback)
            try:
                headers = {
                    'User-Agent': ua.random,
                    'Accept': 'application/json',
                    'Referer': f'https://kick.com/{self.channel_name}',
                }
                response = requests.get(
                    f'https://kick.com/api/v1/channels/{self.channel_name}', 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    self.channel_id = data.get('id')
                    # Chatroom ID is often the same or in a different field in v1
                    self.chatroom_id = data.get('chatroom', {}).get('id')
                    logger.info(f"✅ Channel info (v1/requests): ID={self.channel_id}, Chatroom={self.chatroom_id}")
                    return True
            except Exception as e:
                logger.debug(f"v1 API failed: {e}")

            # Method 3: Try scraping the channel page directly (last resort)
            try:
                headers = {'User-Agent': ua.random}
                response = requests.get(f'https://kick.com/{self.channel_name}', headers=headers, timeout=10)
                if response.status_code == 200:
                    patterns = [
                        r'"id":(\d+).*?"slug":"' + re.escape(self.channel_name) + r'"',
                        r'"channel_id":(\d+)',
                        r'channelId["\']:\s*(\d+)'
                    ]
                    for pattern in patterns:
                        match = re.search(pattern, response.text, re.IGNORECASE)
                        if match:
                            self.channel_id = int(match.group(1))
                            # For chatroom ID, we might need another search or use channel_id as fallback
                            self.chatroom_id = self.channel_id # Often they match or can be found similarly
                            logger.info(f"✅ Channel info (scrape): ID={self.channel_id}")
                            return True
            except Exception as e:
                logger.debug(f"Page scraping failed: {e}")

            logger.error(f"❌ All method failed to get channel info for {self.channel_name}")
            return False
                
        except Exception as e:
            logger.error(f"Error getting channel info: {e}")
            return False
    
    async def connect_to_chat(self):
        """Connect to Kick chat WebSocket"""
        try:
            # Get channel info first
            if not await self.get_channel_info():
                logger.error("Cannot connect without channel info")
                return False
            
            # Connect to Pusher WebSocket (Kick uses Pusher for chat)
            pusher_key = "32cbd69e4b950bf97679"  # Kick's current Pusher key (updated 2025+)
            clusters = ["us2", "us3", "eu", "ap1", "ap2"]
            
            last_error = None
            for cluster in clusters:
                try:
                    cluster_prefix = f"ws-{cluster}." if cluster != "mt1" else "ws."
                    ws_url = f"wss://{cluster_prefix}pusher.com/app/{pusher_key}?protocol=7&client=js&version=8.4.0-rc2&flash=false"
                    
                    logger.info(f"🔌 Attempting connection to Kick chat ({cluster})...")
                    self.ws = await asyncio.wait_for(
                        websockets.connect(ws_url), 
                        timeout=10
                    )
                    
                    # Wait for connection established
                    connection_msg = await asyncio.wait_for(self.ws.recv(), timeout=10)
                    logger.debug(f"Connection message ({cluster}): {connection_msg}")
                    
                    # Pusher sends "pusher:connection_established" on success
                    # or "pusher:error" if there's a problem
                    conn_data = json.loads(connection_msg)
                    if conn_data.get('event') == 'pusher:error':
                        # Pusher error data comes as a JSON string, not a dict
                        error_data = conn_data.get('data', '{}')
                        if isinstance(error_data, str):
                            try:
                                error_data = json.loads(error_data)
                            except json.JSONDecodeError:
                                error_data = {'message': error_data}
                        error_msg = error_data.get('message', 'Unknown error')
                        logger.warning(f"⚠️ Pusher error on cluster {cluster}: {error_msg}")
                        if 'not in this cluster' in str(error_msg):
                            await self.ws.close()
                            continue
                    
                    logger.info(f"✅ Connected to Kick chat via cluster: {cluster}")
                    break
                except asyncio.TimeoutError:
                    last_error = f"Connection to {cluster} timed out"
                    logger.warning(f"⏰ Connection timed out for cluster {cluster}")
                    if self.ws:
                        try:
                            await self.ws.close()
                        except:
                            pass
                except Exception as e:
                    last_error = e
                    logger.warning(f"❌ Connection failed for cluster {cluster}: {e}")
                    if self.ws:
                        try:
                            await self.ws.close()
                        except:
                            pass
            else:
                logger.error(f"❌ Failed to connect to any Pusher cluster. Last error: {last_error}")
                return False
            
            # Subscribe to chatroom channel
            if self.chatroom_id:
                subscribe_msg = {
                    "event": "pusher:subscribe",
                    "data": {
                        "auth": "",
                        "channel": f"chatrooms.{self.chatroom_id}.v2"
                    }
                }
                await self.ws.send(json.dumps(subscribe_msg))
                logger.info(f"📡 Subscribed to chatroom {self.chatroom_id}")
            
            if self.on_connect_callback:
                self.on_connect_callback()
            
            return True
            
        except Exception as e:
            logger.error(f"Error connecting to chat: {e}")
            return False
    
    async def listen_to_chat(self):
        """Listen for incoming chat messages"""
        last_ping_time = time.time()
        ping_interval = 30  # Pusher expects pings every ~30 seconds
        
        try:
            while self.running and self.ws:
                try:
                    message = await asyncio.wait_for(self.ws.recv(), timeout=5.0)
                    await self.process_message(message)
                    
                except asyncio.TimeoutError:
                    # Send ping to keep connection alive (every 30s, not every timeout)
                    if time.time() - last_ping_time >= ping_interval:
                        try:
                            await self.ws.send(json.dumps({"event": "pusher:ping", "data": {}}))
                            last_ping_time = time.time()
                        except Exception as e:
                            logger.warning(f"Failed to send ping: {e}")
                            break
                    
                except websockets.exceptions.ConnectionClosed:
                    logger.warning("⚠️ WebSocket connection closed")
                    break
                    
        except Exception as e:
            logger.error(f"Error listening to chat: {e}")
        finally:
            if self.on_disconnect_callback:
                self.on_disconnect_callback()
    
    async def process_message(self, raw_message: str):
        """Process incoming WebSocket message"""
        try:
            data = json.loads(raw_message)
            event = data.get('event', '')
            
            # Handle pusher internal events
            if event.startswith('pusher:') or event.startswith('pusher_internal:'):
                if event == 'pusher:pong':
                    return
                if event == 'pusher:connection_established':
                    return
                if event == 'pusher_internal:subscription_succeeded':
                    logger.info(f"✅ Subscription confirmed")
                    return
                logger.debug(f"Pusher internal event: {event}")
                return
            
            # Log ALL non-pusher events for debugging
            logger.debug(f"📨 Event received: {event}")
            
            # Handle chat messages - Kick uses various event name formats
            chat_event_names = [
                'App\\Events\\ChatMessageEvent',
                'App\\\\Events\\\\ChatMessageEvent',
                'ChatMessageEvent',
            ]
            
            is_chat_message = event in chat_event_names or 'ChatMessage' in event
            
            if is_chat_message:
                raw_data = data.get('data', '{}')
                if isinstance(raw_data, str):
                    message_data = json.loads(raw_data)
                else:
                    message_data = raw_data
                
                username = message_data.get('sender', {}).get('username', 'Unknown')
                content = message_data.get('content', '')
                
                # Add to recent messages for context
                self.recent_messages.append({
                    'username': username,
                    'content': content,
                    'timestamp': time.time()
                })
                
                # Keep only recent messages
                if len(self.recent_messages) > self.max_context_messages:
                    self.recent_messages.pop(0)
                
                logger.info(f"💬 [{username}]: {content}")
                
                # Trigger callback if set
                if self.on_message_callback:
                    if asyncio.iscoroutinefunction(self.on_message_callback):
                        await self.on_message_callback(username, content, message_data)
                    else:
                        self.on_message_callback(username, content, message_data)
                
                # Add to queue for AI processing
                self.incoming_messages.put({
                    'username': username,
                    'content': content,
                    'data': message_data
                })
            else:
                # Log any unrecognized events for debugging
                logger.info(f"📩 Unhandled event: {event} | data: {str(data.get('data', ''))[:200]}")
                
        except json.JSONDecodeError:
            logger.debug(f"Non-JSON message: {raw_message[:200]}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def should_respond(self, username: str, content: str) -> bool:
        """Determine if bot should respond to this message"""
        # Rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_response_time
        if time_since_last < self.min_response_interval:
            logger.debug(f"⏭️ Rate limited ({time_since_last:.1f}s < {self.min_response_interval}s)")
            return False
        
        # Random chance to respond
        roll = random.random()
        if roll > self.response_chance:
            logger.debug(f"⏭️ Random skip (rolled {roll:.2f} > {self.response_chance})")
            return False
        
        # Don't respond to very short messages
        if len(content.strip()) < 3:
            logger.debug(f"⏭️ Message too short: '{content}'")
            return False
        
        logger.info(f"✅ Will respond to [{username}]: {content}")
        return True
    
    def _pick_proactive_message(self) -> str:
        """Pick a random realistic chat message, avoiding repeats"""
        categories = list(self._category_weights.keys())
        weights = [self._category_weights[c] for c in categories]
        
        # Try up to 10 times to find a non-repeat
        for _ in range(10):
            category = random.choices(categories, weights=weights, k=1)[0]
            msgs = self._stream_messages[category]
            msg = random.choice(msgs)
            
            # Skip if recently sent
            if msg.lower() in [m.lower() for m in self.sent_messages[-15:]]:
                continue
            
            # Random small variations to feel natural
            roll = random.random()
            if roll < 0.15:
                msg = msg.upper()  # ALL CAPS sometimes
            elif roll < 0.25:
                msg = msg + random.choice([" 🔥", " 💀", " 😂", " 🫡", " 👏", " ❤️", ""])
            elif roll < 0.35 and not msg.endswith("!"):
                msg = msg + random.choice(["!", "!!", ""])
            
            # Track and return
            self.sent_messages.append(msg)
            if len(self.sent_messages) > self.max_sent_history:
                self.sent_messages.pop(0)
            return msg
        
        # Fallback - just pick anything
        msg = random.choice(self._stream_messages["hype"])
        self.sent_messages.append(msg)
        return msg
    
    async def _get_xsrf_token(self, tls_session):
        """Fetch XSRF token from Kick using multiple strategies"""
        import urllib.parse
        import re as re_module
        
        # Return cached token if fresh (cache for 5 minutes)
        if self._cached_xsrf:
            age = time.time() - self._cached_xsrf.get('time', 0)
            if age < 300:
                return self._cached_xsrf.get('token')
        
        # Try multiple URLs to get the XSRF token
        urls_to_try = [
            'https://kick.com/kick-token-provider',  # Dedicated CSRF endpoint
            f'https://kick.com/{self.channel_name}',  # Channel page
            'https://kick.com/api/v1/channels/' + self.channel_name,  # API
        ]
        
        for url in urls_to_try:
            try:
                resp = tls_session.get(url)
                logger.info(f"🔑 XSRF try {url}: status {resp.status_code}")
                
                xsrf = None
                
                # Strategy 1: Check ALL cookies in the jar
                try:
                    jar = tls_session.cookies.jar
                    for cookie in jar:
                        logger.debug(f"  Cookie: {cookie.name} = {cookie.value[:30]}...")
                        if cookie.name.upper() == 'XSRF-TOKEN':
                            xsrf = cookie.value
                            logger.info(f"🔑 Found XSRF in cookie jar!")
                            break
                except Exception as e:
                    # tls_client might have different cookie jar interface
                    logger.debug(f"Cookie jar iteration failed: {e}")
                    # Fallback: try direct get
                    for name in ['XSRF-TOKEN', 'xsrf-token']:
                        val = tls_session.cookies.get(name)
                        if val:
                            xsrf = val
                            logger.info(f"🔑 Found XSRF via cookies.get('{name}')")
                            break
                
                # Strategy 2: Parse Set-Cookie from response headers
                if not xsrf:
                    try:
                        # Try to get all Set-Cookie headers
                        headers_dict = dict(resp.headers) if resp.headers else {}
                        for header_name, header_val in headers_dict.items():
                            if 'set-cookie' in header_name.lower():
                                logger.debug(f"  Set-Cookie header: {header_val[:100]}...")
                                match = re_module.search(r'XSRF-TOKEN=([^;]+)', header_val, re_module.IGNORECASE)
                                if match:
                                    xsrf = match.group(1)
                                    logger.info(f"🔑 Found XSRF in Set-Cookie header!")
                                    break
                    except Exception as e:
                        logger.debug(f"Header parse error: {e}")
                
                # Strategy 3: Check response body for meta tag
                if not xsrf and resp.status_code == 200:
                    try:
                        body = resp.text[:3000] if resp.text else ''
                        meta_match = re_module.search(r'csrf-token["\']?\s*content=["\']([^"\']+)', body, re_module.IGNORECASE)
                        if meta_match:
                            xsrf = meta_match.group(1)
                            logger.info(f"🔑 Found XSRF in HTML meta tag!")
                    except Exception as e:
                        logger.debug(f"Body parse error: {e}")
                
                if xsrf:
                    xsrf = urllib.parse.unquote(xsrf)
                    self._cached_xsrf = {'token': xsrf, 'time': time.time()}
                    logger.info(f"🔑 XSRF token ready ({len(xsrf)} chars)")
                    return xsrf
                    
            except Exception as e:
                logger.debug(f"XSRF fetch from {url} failed: {e}")
                continue
        
        # If we get here, none of the URLs worked
        # Log all available cookies for debugging
        try:
            all_cookies = []
            try:
                for cookie in tls_session.cookies.jar:
                    all_cookies.append(cookie.name)
            except:
                for name in ['XSRF-TOKEN', 'xsrf-token', 'kick_session', '__cf_bm', '_cfuvid']:
                    if tls_session.cookies.get(name):
                        all_cookies.append(name)
            logger.warning(f"⚠️ No XSRF token found after trying {len(urls_to_try)} URLs. Cookies: {all_cookies}")
        except Exception as e:
            logger.warning(f"⚠️ No XSRF token found: {e}")
        
        return None
    
    async def send_message(self, message: str):
        """Send a message to Kick chat using token rotation.
        Tries cookie auth first (most likely to work), then Bearer methods as fallback.
        """
        if not self.auth_tokens:
            logger.warning("⚠️ Cannot send message: no auth tokens provided")
            return False
            
        if not self.chatroom_id:
            logger.warning("⚠️ Cannot send message: chatroom_id not set")
            return False
        
        # Select current token
        token_idx = self.current_token_index
        auth_token = self.auth_tokens[token_idx]
        self.current_token_index = (self.current_token_index + 1) % len(self.auth_tokens)
        
        # URL-decode the token if it contains encoded characters
        import urllib.parse
        decoded_token = urllib.parse.unquote(auth_token)
        
        # Log token preview
        token_preview = f"{decoded_token[:20]}...{decoded_token[-10:]}" if len(decoded_token) > 35 else decoded_token
        logger.info(f"📤 Attempting to send message via token {token_idx} ({len(decoded_token)} chars): {token_preview}")
        
        from fake_useragent import UserAgent
        ua = UserAgent()
        user_agent = ua.random
        
        # ============================================================
        # Method 1: Cookie auth (kick_session) — PRIMARY METHOD
        # ============================================================
        try:
            if HAS_TLS_CLIENT:
                # Step 1: Fetch XSRF token using our kick_session
                s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                xsrf_resp = s.get('https://kick.com/kick-token-provider', headers={
                    'Cookie': f'kick_session={decoded_token}',
                    'User-Agent': user_agent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': f'https://kick.com/{self.channel_name}',
                })
                logger.info(f"🔑 XSRF fetch status: {xsrf_resp.status_code}")
                
                # Extract XSRF from response cookies
                xsrf_raw = s.cookies.get('XSRF-TOKEN') or s.cookies.get('xsrf-token') or ''
                import urllib.parse as up
                xsrf_decoded = up.unquote(xsrf_raw) if xsrf_raw else ''
                
                if xsrf_raw:
                    logger.info(f"🔑 XSRF: raw={len(xsrf_raw)} decoded={len(xsrf_decoded)} same={xsrf_raw == xsrf_decoded}")
                else:
                    logger.warning("⚠️ No XSRF token found")
                
                # Step 2: POST with ORIGINAL kick_session (NOT the rotated one!)
                # The rotated cookie from Set-Cookie is an anonymous session.
                # The XSRF was generated for OUR original session.
                url = f'https://kick.com/api/v2/messages/send/{self.chatroom_id}'
                
                # Build Cookie with ORIGINAL session + XSRF cookie
                cookie_str = f'kick_session={decoded_token}'
                if xsrf_raw:
                    cookie_str += f'; XSRF-TOKEN={xsrf_raw}'
                
                post_headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': user_agent,
                    'Referer': f'https://kick.com/{self.channel_name}',
                    'Origin': 'https://kick.com',
                    'Cookie': cookie_str,
                }
                if xsrf_decoded:
                    post_headers['X-XSRF-TOKEN'] = xsrf_decoded
                
                logger.info(f"📨 POST with ORIGINAL kick_session + XSRF")
                
                payload = {'content': message, 'type': 'message'}
                
                # Fresh session for POST (empty jar, so only our Cookie header is used)
                s2 = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                response = s2.post(url, json=payload, headers=post_headers)
                
                if response.status_code == 200:
                    logger.info(f"✅ Sent message via cookie auth (token {token_idx}): {message}")
                    self.last_response_time = time.time()
                    return True
                else:
                    try:
                        err = response.json()
                        logger.warning(f"Cookie auth {response.status_code}: {err}")
                    except:
                        logger.warning(f"Cookie auth {response.status_code}: {response.text[:200]}")
            else:
                # Fallback: requests library
                import requests
                session = requests.Session()
                session.headers.update({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': user_agent,
                    'Referer': f'https://kick.com/{self.channel_name}',
                    'Origin': 'https://kick.com',
                    'Cookie': f'kick_session={decoded_token}',
                })
                response = session.post(url, json=payload, timeout=10)
                if response.status_code == 200:
                    logger.info(f"✅ Sent message via cookie auth/requests (token {token_idx}): {message}")
                    self.last_response_time = time.time()
                    return True
                else:
                    try:
                        err = response.json()
                        logger.warning(f"Cookie auth/requests {response.status_code}: {err}")
                    except:
                        logger.warning(f"Cookie auth/requests {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.warning(f"Cookie auth method failed: {e}")
        
        # ============================================================
        # Method 2: Public API with Bearer token (api.kick.com)
        # Only works with OAuth tokens, not kick_session cookies
        # ============================================================
        try:
            url = 'https://api.kick.com/public/v1/chat'
            payload = {
                'content': message,
                'type': 'message',
                'chatroom_id': self.chatroom_id,
            }
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {decoded_token}',
                'User-Agent': user_agent,
            }
            
            if HAS_TLS_CLIENT:
                s = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)
                s.headers.update(headers)
                response = s.post(url, json=payload)
            else:
                import requests
                response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code in (200, 201):
                logger.info(f"✅ Sent message via public API (token {token_idx}): {message}")
                self.last_response_time = time.time()
                return True
            else:
                try:
                    err = response.json()
                    logger.debug(f"Public API {response.status_code}: {err}")
                except:
                    logger.debug(f"Public API {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.debug(f"Public API method failed: {e}")
        
        logger.error(f"❌ All auth methods failed for token {token_idx}")
        return False

    
    def get_conversation_context(self) -> str:
        """Get recent conversation context for AI"""
        context = "Recent chat messages:\n"
        for msg in self.recent_messages[-5:]:  # Last 5 messages
            context += f"{msg['username']}: {msg['content']}\n"
        return context
    
    def start(self):
        """Start the chat bot in a background thread"""
        if self.running:
            logger.warning("Chat bot already running")
            return
        
        self.running = True
        thread = threading.Thread(target=self._run_async_loop, daemon=True)
        thread.start()
        logger.info("🚀 Kick chat bot started")
    
    def stop(self):
        """Stop the chat bot"""
        self.running = False
        logger.info("🛑 Kick chat bot stopped")
    
    def _run_async_loop(self):
        """Run the async event loop in a thread"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(self._run())
        except Exception as e:
            logger.error(f"Error in chat bot loop: {e}")
        finally:
            loop.close()
    
    async def _proactive_message_loop(self):
        """Periodically send realistic chat messages"""
        # Wait a bit after connecting before first message
        initial_wait = random.uniform(8, 20)
        logger.info(f"⏳ Proactive loop starting in {initial_wait:.0f}s...")
        await asyncio.sleep(initial_wait)
        
        logger.info(f"💬 Proactive message loop started (interval: {self.proactive_min_interval}-{self.proactive_max_interval}s)")
        
        while self.running and self.ws:
            try:
                if not self.auth_tokens:
                    logger.warning("⚠️ No auth tokens - proactive messages disabled")
                    return
                
                # Pick a realistic chat message
                msg = self._pick_proactive_message()
                
                logger.info(f"📤 Sending message: {msg}")
                success = await self.send_message(msg)
                if success:
                    self.last_proactive_time = time.time()
                    logger.info(f"✅ Message sent: {msg}")
                else:
                    logger.warning("⚠️ Failed to send message")
                
                # Wait random interval before next message
                interval = random.uniform(self.proactive_min_interval, self.proactive_max_interval)
                logger.debug(f"⏳ Next message in {interval:.0f}s")
                await asyncio.sleep(interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in proactive message loop: {e}")
                await asyncio.sleep(10)
    
    async def _run(self):
        """Main async loop - connects then runs listener + message loop concurrently"""
        try:
            if await self.connect_to_chat():
                tasks = [self.listen_to_chat()]
                
                if self.proactive_enabled and self.auth_tokens:
                    tasks.append(self._proactive_message_loop())
                    logger.info("🤖 Proactive message generation ENABLED")
                else:
                    reasons = []
                    if not self.proactive_enabled:
                        reasons.append("disabled")
                    if not self.auth_tokens:
                        reasons.append("no auth tokens")
                    logger.info(f"ℹ️ Proactive messages OFF ({', '.join(reasons)})")
                
                await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Error in chat bot: {e}")
