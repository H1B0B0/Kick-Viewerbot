import threading
import uuid
from typing import Optional, Tuple, Callable
from .models import BotState, ErrorPayload, RuntimeConfig

class GenerationRecord:
    def __init__(self, generation_id: str, bot: any):
        self.generation_id = generation_id
        self.bot = bot
        self.stop_event = threading.Event()
        self.generation_thread: Optional[threading.Thread] = None

class BotManager:
    def __init__(self, bot_factory: Callable):
        self._lock = threading.Lock()
        self._state = BotState.STOPPED
        self._error: Optional[ErrorPayload] = None
        self._generation: Optional[GenerationRecord] = None
        self._bot_factory = bot_factory

    def get_state(self) -> BotState:
        with self._lock:
            return self._state

    def get_error(self) -> Optional[ErrorPayload]:
        with self._lock:
            return self._error

    def start(self, config: RuntimeConfig) -> Tuple[bool, Optional[ErrorPayload]]:
        with self._lock:
            if self._state not in (BotState.STOPPED, BotState.ERROR):
                return False, ErrorPayload("INVALID_STATE", f"Cannot start in state {self._state.value}", False, True)
            if self._state == BotState.ERROR and self._error and self._error.generation_alive:
                return False, ErrorPayload("ZOMBIE_PROCESS", "Previous bot generation is still alive", False, True)

            # Atomically claim starting
            self._state = BotState.STARTING
            self._error = None
            gen_id = str(uuid.uuid4())

            try:
                bot = self._bot_factory(
                    nb_of_threads=config.threads,
                    channel_name=config.channel_name,
                    timeout=config.timeout_ms,
                    type_of_proxy=config.proxy_type,
                    proxy_imported=False,
                    proxy_file=None
                )
            except Exception as e:
                self._state = BotState.ERROR
                self._error = ErrorPayload("INIT_FAILED", str(e), True, False)
                return False, self._error

            self._generation = GenerationRecord(gen_id, bot)

            t = threading.Thread(target=self._worker_loop, args=(self._generation,), daemon=True)
            self._generation.generation_thread = t
            t.start()

            return True, None

    def _worker_loop(self, gen: GenerationRecord):
        try:
            gen.bot.main()
        except Exception as e:
            with self._lock:
                if self._generation is gen:
                    self._state = BotState.ERROR
                    self._error = ErrorPayload("CRASH", str(e), True, False)
        finally:
            with self._lock:
                if self._generation is gen and self._state not in (BotState.ERROR, BotState.STOPPING):
                    self._state = BotState.STOPPED
                    self._generation = None

    def report_ready(self, gen_id: str):
        with self._lock:
            if self._generation and self._generation.generation_id == gen_id and self._state == BotState.STARTING:
                self._state = BotState.RUNNING

    def stop(self, timeout: float = 5.0) -> Tuple[bool, Optional[ErrorPayload]]:
        with self._lock:
            if self._state == BotState.STOPPED:
                return True, None

            self._state = BotState.STOPPING
            gen = self._generation

        if gen:
            gen.stop_event.set()
            if hasattr(gen.bot, 'stop'):
                gen.bot.stop()

            if gen.generation_thread and gen.generation_thread.is_alive():
                gen.generation_thread.join(timeout=timeout)

        with self._lock:
            if gen and gen.generation_thread and gen.generation_thread.is_alive():
                self._state = BotState.ERROR
                self._error = ErrorPayload("STOP_TIMEOUT", "Bot did not shut down in time", False, True)
                threading.Thread(target=self._watcher_loop, args=(gen,), daemon=True).start()
                return False, self._error
            else:
                self._state = BotState.STOPPED
                if self._generation is gen:
                    self._generation = None
                return True, None

    def _watcher_loop(self, gen: GenerationRecord):
        if gen.generation_thread:
            gen.generation_thread.join()
        with self._lock:
            if self._generation is gen:
                self._state = BotState.STOPPED
                self._error = None
                self._generation = None
