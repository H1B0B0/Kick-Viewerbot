"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import WebSocketService, {
  BotStats,
  BotConfig,
  ConnectionStatus,
} from "@/services/WebSocketService";

export function useWebSocketBot() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [stats, setStats] = useState<BotStats | null>(null);
  const [error, setError] = useState<string>("");
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    // Créer le service WebSocket
    const ws = new WebSocketService({
      onConnect: () => {
        setIsConnected(true);
        setError("");
        // Demander les stats immédiatement après connexion
        ws.getStats();
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onBotStarted: (data) => {
        ws.getStats();
      },
      onBotStopped: (data) => {
        ws.getStats();
      },
      onBotError: (errorMsg) => {
        setError(errorMsg);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    wsRef.current = ws;

    // Se connecter automatiquement
    ws.connect();

    // Demander les stats régulièrement
    const statsInterval = setInterval(() => {
      if (ws.isConnected()) {
        ws.getStats();
      }
    }, 2000);

    // Cleanup
    return () => {
      clearInterval(statsInterval);
      ws.disconnect();
    };
  }, []);

  const startBot = useCallback(async (config: BotConfig) => {
    if (!wsRef.current) {
      throw new Error("WebSocket service not initialized");
    }

    try {
      await wsRef.current.startBot(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start bot");
      throw err;
    }
  }, []);

  const stopBot = useCallback(() => {
    if (!wsRef.current) {
      throw new Error("WebSocket service not initialized");
    }

    try {
      wsRef.current.stopBot();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop bot");
      throw err;
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (wsRef.current) {
      await wsRef.current.connect();
    }
  }, []);

  const getCurrentUrl = useCallback(() => {
    return wsRef.current?.getCurrentUrl() || "";
  }, []);

  return {
    // Connection state
    isConnected,
    status,
    error,
    currentUrl: getCurrentUrl(),

    // Bot stats
    stats,
    isRunning: stats?.is_running || false,

    // Actions
    startBot,
    stopBot,
    reconnect,
  };
}
