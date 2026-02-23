"""
Chat Service with Local AI Model
Uses a lightweight conversational model that runs entirely in Python
Can integrate with Kick chat for live stream interaction
"""
import logging
import threading
from typing import Optional, Dict, List
import time

logger = logging.getLogger("chat_service")

class ChatService:
    def __init__(self):
        self.chatbot = None
        self.tokenizer = None
        self.model = None
        self.conversation_history: Dict[str, List] = {}
        self.model_loaded = False
        self.loading = False
        self.model_name = "microsoft/DialoGPT-small"  # 117MB - Very lightweight!
        
        # Kick chat bot integration
        self.kick_chat_bot = None
        self.kick_chat_enabled = False
        
    def load_model_async(self):
        """Load the AI model asynchronously to not block startup"""
        if self.loading or self.model_loaded:
            return
            
        self.loading = True
        thread = threading.Thread(target=self._load_model, daemon=True)
        thread.start()
        
    def _load_model(self):
        """Internal method to load the model - 2025 best practice using AutoModel"""
        try:
            logger.info("🤖 Loading AI chat model (this may take a minute on first run)...")
            
            # Import - 2025 modern approach
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch
            
            logger.info("📦 Imports successful, downloading/loading model...")
            
            # Load with AutoModel (2025 recommended approach)
            logger.info("⏳ Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            logger.info("✅ Tokenizer loaded")
            
            logger.info("⏳ Loading model (downloading ~117MB on first run)...")
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                pad_token_id=self.tokenizer.eos_token_id
            )
            logger.info("✅ Model downloaded")
            
            # Set pad token if needed
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Set model to evaluation mode
            self.model.eval()
            logger.info("✅ Model ready for inference")
            
            self.model_loaded = True
            self.loading = False
            logger.info("✅ AI chat model loaded successfully and ready to use!")
            
        except ImportError as e:
            logger.error(f"❌ transformers library not installed: {e}")
            logger.error("Run: pip install transformers torch")
            self.loading = False
        except Exception as e:
            logger.error(f"❌ Failed to load AI model: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.loading = False
    
    def is_ready(self) -> bool:
        """Check if the model is ready to use"""
        return self.model_loaded
    
    def get_status(self) -> Dict:
        """Get current status of the chat service"""
        if self.model_loaded:
            return {"status": "ready", "message": "AI chat is ready"}
        elif self.loading:
            return {"status": "loading", "message": "Loading AI model... Please wait"}
        else:
            return {"status": "not_loaded", "message": "AI model not loaded"}
    
    def generate_response(self, user_message: str, session_id: str = "default", max_length: int = 100) -> str:
        """
        Generate a response to user message
        
        Args:
            user_message: The user's message
            session_id: Session identifier for conversation context
            max_length: Maximum length of response
            
        Returns:
            AI-generated response
        """
        if not self.model_loaded:
            if self.loading:
                return "🤖 AI is still loading... Please wait a moment!"
            else:
                return "❌ AI model not loaded. Please check logs."
        
        try:
            # Initialize conversation history for this session
            if session_id not in self.conversation_history:
                self.conversation_history[session_id] = []
            
            # Add user message to history
            self.conversation_history[session_id].append({"role": "user", "content": user_message})
            
            # Keep only last 5 exchanges to limit context
            if len(self.conversation_history[session_id]) > 10:
                self.conversation_history[session_id] = self.conversation_history[session_id][-10:]
            
            # Build conversation context
            context = ""
            for msg in self.conversation_history[session_id]:
                if msg["role"] == "user":
                    context += f"{msg['content']}{self.tokenizer.eos_token}"
                else:
                    context += f"{msg['content']}{self.tokenizer.eos_token}"
            
            # Encode and generate response
            input_ids = self.tokenizer.encode(context, return_tensors='pt')
            
            # Limit input length
            if input_ids.shape[1] > 512:
                input_ids = input_ids[:, -512:]
            
            # Generate response
            chat_history_ids = self.model.generate(
                input_ids,
                max_length=input_ids.shape[1] + max_length,
                pad_token_id=self.tokenizer.pad_token_id,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                no_repeat_ngram_size=3
            )
            
            # Decode the response
            response = self.tokenizer.decode(
                chat_history_ids[:, input_ids.shape[1]:][0],
                skip_special_tokens=True
            )
            
            # Clean up response
            response = response.strip()
            
            # Fallback if response is empty
            if not response:
                response = "I'm not sure how to respond to that. Can you rephrase?"
            
            # Add AI response to history
            self.conversation_history[session_id].append({"role": "assistant", "content": response})
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"❌ Error: {str(e)}"
    
    def clear_conversation(self, session_id: str = "default"):
        """Clear conversation history for a session"""
        if session_id in self.conversation_history:
            del self.conversation_history[session_id]
            return True
        return False
    
    def start_kick_chat(self, channel_name: str, auth_tokens: List[str], min_interval: int = 3, response_chance: float = 0.3):
        """Start Kick chat bot integration"""
        if not self.model_loaded:
            logger.warning("⚠️ AI model not loaded yet. Load model first.")
            return False
        
        try:
            from services.kick_chat_bot import KickChatBot
            
            # Create chat bot (KickChatBot will also clean the name anyway)
            self.kick_chat_bot = KickChatBot(channel_name, auth_tokens)
            # Use the cleaned name from the bot for service consistency
            channel_name = self.kick_chat_bot.channel_name
            self.kick_chat_bot.set_response_settings(min_interval, response_chance)
            
            # Set up callbacks
            self.kick_chat_bot.on_message(self._handle_kick_message)
            self.kick_chat_bot.on_connect(lambda: logger.info("🟢 Connected to Kick chat"))
            self.kick_chat_bot.on_disconnect(lambda: logger.info("🔴 Disconnected from Kick chat"))
            
            # Wire up AI model for proactive message generation
            self.kick_chat_bot.set_generate_callback(self.generate_response)
            
            # Start bot
            self.kick_chat_bot.start()
            self.kick_chat_enabled = True
            
            logger.info(f"🤖 AI chat bot started for channel: {channel_name}")
            return True
            
        except ImportError:
            logger.error("❌ Kick chat bot module not available")
            return False
        except Exception as e:
            logger.error(f"❌ Error starting Kick chat bot: {e}")
            return False
    
    def stop_kick_chat(self):
        """Stop Kick chat bot"""
        if self.kick_chat_bot:
            self.kick_chat_bot.stop()
            self.kick_chat_enabled = False
            logger.info("🛑 Kick chat bot stopped")
            return True
        return False
    
    async def _handle_kick_message(self, username: str, content: str, message_data: Dict):
        """Handle incoming message from Kick chat"""
        try:
            # Check if we should respond
            if not self.kick_chat_bot.should_respond(username, content):
                logger.debug(f"⏭️ Skipping response to {username} (rate limit or random chance)")
                return
            
            logger.info(f"🤖 Generating AI response for {username}...")
            
            # Get conversation context
            context = self.kick_chat_bot.get_conversation_context()
            
            # Generate response with context
            prompt = f"{context}\n{username}: {content}\nBot:"
            response = self.generate_response(prompt, session_id=f"kick_{username}", max_length=50)
            
            # Clean response (remove usernames, keep only bot response)
            response = response.strip()
            if ':' in response:
                response = response.split(':', 1)[-1].strip()
            
            # Limit length for chat
            if len(response) > 200:
                response = response[:197] + "..."
            
            # Send to Kick chat
            if self.kick_chat_bot.auth_tokens:
                await self.kick_chat_bot.send_message(response)
            else:
                logger.info(f"🤖 Would respond: {response} (No tokens provided)")
                
        except Exception as e:
            logger.error(f"Error handling Kick message: {e}")
    
    def get_kick_chat_status(self) -> Dict:
        """Get status of Kick chat bot"""
        if not self.kick_chat_enabled:
            return {"enabled": False, "status": "not_running"}
        
        return {
            "enabled": True,
            "status": "running",
            "channel": getattr(self.kick_chat_bot, 'channel_name', 'unknown')
        }


# Global instance
chat_service = ChatService()
