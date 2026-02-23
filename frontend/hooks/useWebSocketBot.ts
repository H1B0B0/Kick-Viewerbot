"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import WebSocketService, {
  BotStats,
  BotConfig,
  ConnectionStatus,
} from "@/services/WebSocketService";

export function useWebSocketBot(backendUrl?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [stats, setStats] = useState<BotStats | null>(null);
  const [error, setError] = useState<string>("");
  const [chatStatus, setChatStatus] = useState<any>(null);
  const [isChatRunning, setIsChatRunning] = useState(false);
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
      onStatsUpdate: (newStats: BotStats) => {
        setStats(newStats);
      },
      onBotStarted: (data: any) => {
        ws.getStats();
      },
      onBotStopped: (data: any) => {
        ws.getStats();
      },
      onBotError: (errorMsg: string) => {
        setError(errorMsg);
      },
      onStatusChange: (newStatus: ConnectionStatus) => {
        setStatus(newStatus);
      },
      onKickChatStatus: (status: any) => {
        setChatStatus(status);
        setIsChatRunning(status.enabled || false);
      },
      onKickChatStarted: (data: any) => {
        setIsChatRunning(true);
        ws.getKickChatStatus();
      },
      onKickChatStopped: (data: any) => {
        setIsChatRunning(false);
        ws.getKickChatStatus();
      },
      onKickChatError: (errorMsg: string) => {
        setError(errorMsg);
      },
    }, backendUrl ? [backendUrl] : undefined);

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
  }, [backendUrl]);

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

  const startKickChat = useCallback((channelName: string, authTokens?: string[], responseChance?: number, minInterval?: number) => {
    if (!wsRef.current) {
      throw new Error("WebSocket service not initialized");
    }
    wsRef.current.startKickChat(channelName, authTokens, responseChance, minInterval);
  }, []);

  const stopKickChat = useCallback(() => {
    if (!wsRef.current) {
      throw new Error("WebSocket service not initialized");
    }
    wsRef.current.stopKickChat();
  }, []);

  const getKickChatStatus = useCallback(() => {
    if (!wsRef.current) {
      throw new Error("WebSocket service not initialized");
    }
    wsRef.current.getKickChatStatus();
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
    wsConnected: isConnected,
    status,
    error,
    currentUrl: getCurrentUrl(),

    // Bot stats
    stats,
    isRunning: stats?.is_running || false,

    // Chat state
    chatStatus,
    isChatRunning,

    // Actions
    startBot,
    stopBot,
    reconnect,
    startKickChat,
    stopKickChat,
    getKickChatStatus,
  };
}
