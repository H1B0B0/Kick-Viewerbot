"""
Test Script for Kick AI Chat Bot Feature
Tests the AI chat functionality both locally and with Kick integration
"""
import socketio
import time
import sys
import json

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(70)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_chat_message(user, message, is_bot=False):
    if is_bot:
        print(f"{Colors.OKGREEN}🤖 Bot: {message}{Colors.ENDC}")
    else:
        print(f"{Colors.OKCYAN}💬 {user}: {message}{Colors.ENDC}")

class ChatBotTester:
    def __init__(self, server_url='http://localhost:8765'):
        self.server_url = server_url
        self.sio = socketio.Client()
        self.connected = False
        self.chat_available = False
        self.chat_ready = False
        self.kick_chat_running = False
        
        # Setup event handlers
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.sio.on('connect')
        def on_connect():
            self.connected = True
            print_success(f"Connected to server at {self.server_url}")
        
        @self.sio.on('connected')
        def on_connected(data):
            print_info(f"Server version: {data.get('version', 'unknown')}")
            print_info(f"Bot available: {data.get('bot_available', False)}")
        
        @self.sio.on('disconnect')
        def on_disconnect():
            self.connected = False
            print_warning("Disconnected from server")
        
        @self.sio.on('chat_status_response')
        def on_chat_status(data):
            self.chat_available = data.get('available', False)
            status = data.get('status', 'unknown')
            message = data.get('message', '')
            
            if self.chat_available:
                if status == 'ready':
                    self.chat_ready = True
                    print_success(f"Chat AI Status: {message}")
                elif status == 'loading':
                    print_info(f"Chat AI Status: {message}")
                else:
                    print_warning(f"Chat AI Status: {message}")
            else:
                print_error(f"Chat AI not available: {message}")
        
        @self.sio.on('chat_response')
        def on_chat_response(data):
            user_msg = data.get('message', '')
            bot_response = data.get('response', '')
            error = data.get('error')
            
            if error:
                print_error(f"Chat error: {error}")
            else:
                print_chat_message("You", user_msg)
                print_chat_message("Bot", bot_response, is_bot=True)
        
        @self.sio.on('kick_chat_started')
        def on_kick_chat_started(data):
            self.kick_chat_running = True
            channel = data.get('channel', 'unknown')
            message = data.get('message', '')
            print_success(f"Kick Chat Bot Started: {message}")
        
        @self.sio.on('kick_chat_stopped')
        def on_kick_chat_stopped(data):
            self.kick_chat_running = False
            message = data.get('message', '')
            print_success(f"Kick Chat Bot Stopped: {message}")
        
        @self.sio.on('kick_chat_error')
        def on_kick_chat_error(data):
            error = data.get('error', 'Unknown error')
            print_error(f"Kick Chat Error: {error}")
        
        @self.sio.on('kick_chat_status_response')
        def on_kick_chat_status(data):
            enabled = data.get('enabled', False)
            status = data.get('status', 'unknown')
            channel = data.get('channel', 'N/A')
            
            print_info(f"Kick Chat Status: {'Enabled' if enabled else 'Disabled'}")
            if enabled:
                print_info(f"  - Status: {status}")
                print_info(f"  - Channel: {channel}")
    
    def connect(self):
        """Connect to the server"""
        try:
            print_info(f"Connecting to {self.server_url}...")
            self.sio.connect(self.server_url)
            time.sleep(1)  # Wait for connection to stabilize
            return True
        except Exception as e:
            print_error(f"Failed to connect: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from server"""
        if self.connected:
            self.sio.disconnect()
    
    def check_chat_status(self, max_wait=300):
        """Check if chat AI is available and ready"""
        print_info("Checking chat AI status...")
        self.sio.emit('chat_status')
        time.sleep(2)  # Wait for initial response
        
        if not self.chat_available:
            print_error("Chat AI feature not available (transformers not installed)")
            return False
        
        # If model is loading, wait for it
        if not self.chat_ready:
            print_warning("Model is loading... This may take a few minutes on first run")
            print_info("The model (~117MB) will be downloaded automatically if needed")
            
            elapsed = 0
            while not self.chat_ready and elapsed < max_wait:
                for i in range(10):
                    if self.chat_ready:
                        break
                    time.sleep(1)
                    elapsed += 1
                    if elapsed % 30 == 0:
                        print_info(f"Still waiting... ({elapsed}s elapsed)")
                        self.sio.emit('chat_status')  # Check status again
                        time.sleep(2)
            
            if not self.chat_ready:
                print_error(f"Model did not load within {max_wait} seconds")
                return False
        
        return self.chat_ready
    
    def test_simple_conversation(self):
        """Test simple conversation with AI"""
        print_header("TEST 1: Simple Conversation")
        
        test_messages = [
            "Hello! How are you?",
            "What's your favorite color?",
            "Tell me a joke",
            "What can you help me with?",
        ]
        
        for msg in test_messages:
            print_info(f"Sending: {msg}")
            self.sio.emit('chat_message', {'message': msg})
            time.sleep(3)  # Wait for AI to generate response
        
        print_success("Conversation test completed!")
    
    def test_context_memory(self):
        """Test if AI remembers context"""
        print_header("TEST 2: Context Memory")
        
        messages = [
            "My name is Alice",
            "What's my name?",  # Should remember "Alice"
            "I like pizza",
            "What do I like to eat?",  # Should remember "pizza"
        ]
        
        for msg in messages:
            print_info(f"Sending: {msg}")
            self.sio.emit('chat_message', {'message': msg})
            time.sleep(3)
        
        print_success("Context memory test completed!")
    
    def test_clear_history(self):
        """Test clearing conversation history"""
        print_header("TEST 3: Clear History")
        
        # Send a message
        print_info("Sending message...")
        self.sio.emit('chat_message', {'message': 'Remember this: SECRET123'})
        time.sleep(2)
        
        # Clear history
        print_info("Clearing conversation history...")
        self.sio.emit('chat_clear', {})
        time.sleep(1)
        
        # Ask about previous message (should not remember)
        print_info("Asking about cleared message...")
        self.sio.emit('chat_message', {'message': 'What did I just tell you to remember?'})
        time.sleep(2)
        
        print_success("Clear history test completed!")
    
    def test_kick_chat_integration(self, channel_name, auth_token=None):
        """Test Kick chat integration"""
        print_header("TEST 4: Kick Chat Integration")
        
        if not channel_name:
            print_warning("Skipping Kick chat test - no channel name provided")
            return
        
        # Start Kick chat bot
        print_info(f"Starting Kick chat bot for channel: {channel_name}")
        self.sio.emit('kick_chat_start', {
            'channel_name': channel_name,
            'auth_token': auth_token,
            'response_chance': 0.5,  # 50% for testing
            'min_interval': 3  # Short interval for testing
        })
        time.sleep(3)
        
        if self.kick_chat_running:
            print_success("Kick chat bot is running!")
            print_info("The bot is now monitoring the Kick chat...")
            print_info("It will respond to messages based on the configured chance")
            
            if not auth_token:
                print_warning("No auth token provided - bot can only read, not send messages")
            else:
                print_success("Auth token provided - bot can send responses!")
            
            # Let it run for a bit
            print_info("Letting bot run for 30 seconds...")
            for i in range(30, 0, -5):
                print_info(f"  {i} seconds remaining...")
                time.sleep(5)
            
            # Stop the bot
            print_info("Stopping Kick chat bot...")
            self.sio.emit('kick_chat_stop')
            time.sleep(2)
        
        print_success("Kick chat integration test completed!")
    
    def run_all_tests(self, channel_name=None, auth_token=None):
        """Run all tests"""
        print_header("🤖 KICK AI CHAT BOT TEST SUITE 🤖")
        
        # Connect
        if not self.connect():
            print_error("Cannot proceed - connection failed")
            return False
        
        # Check status
        if not self.check_chat_status():
            print_error("Chat AI not ready - cannot proceed with tests")
            print_info("Please wait for the model to load and try again")
            self.disconnect()
            return False
        
        # Run tests
        try:
            self.test_simple_conversation()
            time.sleep(2)
            
            self.test_context_memory()
            time.sleep(2)
            
            self.test_clear_history()
            time.sleep(2)
            
            if channel_name:
                self.test_kick_chat_integration(channel_name, auth_token)
            else:
                print_warning("Skipping Kick integration test - no channel provided")
            
            print_header("✅ ALL TESTS COMPLETED SUCCESSFULLY ✅")
            
        except KeyboardInterrupt:
            print_warning("\nTests interrupted by user")
        except Exception as e:
            print_error(f"Test failed with error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.disconnect()
        
        return True

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║           🤖 KICK AI CHAT BOT - TEST SCRIPT 🤖                   ║
    ║                                                                   ║
    ║  This script tests the AI chat bot functionality                 ║
    ║  Make sure the backend is running first!                         ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # Configuration
    server_url = input("Enter server URL (default: http://localhost:8765): ").strip()
    if not server_url:
        server_url = "http://localhost:8765"
    
    print("\n" + "="*70)
    print("KICK CHAT INTEGRATION (Optional)")
    print("="*70)
    print("To test Kick chat integration, provide your channel name.")
    print("Leave blank to skip Kick integration tests.\n")
    
    channel_name = input("Enter your Kick channel name (or press Enter to skip): ").strip()
    
    auth_token = None
    if channel_name:
        print("\n⚠️  AUTH TOKEN (Optional but recommended)")
        print("Without auth token, bot can only READ chat messages.")
        print("With auth token, bot can SEND responses to chat.\n")
        auth_token = input("Enter your Kick auth token (or press Enter to skip): ").strip()
        if not auth_token:
            auth_token = None
            print_warning("No auth token - bot will run in READ-ONLY mode")
    
    # Create tester
    tester = ChatBotTester(server_url)
    
    # Run tests
    print("\n")
    tester.run_all_tests(channel_name or None, auth_token)
    
    print("\n" + "="*70)
    print("Test script finished!")
    print("="*70)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n" + "="*70)
        print("Test script interrupted by user")
        print("="*70)
        sys.exit(0)
