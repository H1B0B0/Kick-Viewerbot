/**
 * Local Service Connector
 * Connects to the local Python backend service from a hosted frontend
 */

import { io, Socket } from "socket.io-client";
import { generateConnectionUrls } from "../config/ports";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface ServiceConnectorCallbacks {
  onStatusChange?: (status: ConnectionStatus) => void;
  onStatsUpdate?: (stats: any) => void;
  onError?: (error: string) => void;
}

class LocalServiceConnector {
  private socket: Socket | null = null;
  private status: ConnectionStatus = "disconnected";
  private callbacks: ServiceConnectorCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Try multiple possible local addresses (from shared config)
  private possibleUrls = generateConnectionUrls();

  private currentUrlIndex = 0;

  constructor(callbacks: ServiceConnectorCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to the local service
   */
  async connect(): Promise<boolean> {
    this.updateStatus("connecting");

    // Try to connect to each URL
    for (let i = 0; i < this.possibleUrls.length; i++) {
      const url = this.possibleUrls[i];

      try {
        const success = await this.tryConnect(url);
        if (success) {
          this.currentUrlIndex = i;
          return true;
        }
      } catch (error) {
        console.warn(`Failed to connect to ${url}:`, error);
      }
    }

    this.updateStatus("error");
    this.callbacks.onError?.(
      "Could not connect to local service. Make sure the Python backend is running."
    );
    return false;
  }

  /**
   * Try to connect to a specific URL
   */
  private tryConnect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: false,
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        socket.close();
        resolve(false);
      }, 5000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.setupSocketHandlers();
        this.updateStatus("connected");
        resolve(true);
      });

      socket.on("connect_error", () => {
        clearTimeout(timeout);
        socket.close();
        resolve(false);
      });
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on("connected", (data) => {
      console.log("Server confirmed connection:", data);
    });

    this.socket.on("stats_update", (stats) => {
      this.callbacks.onStatsUpdate?.(stats);
    });

    this.socket.on("bot_started", (data) => {
      console.log("Bot started:", data);
    });

    this.socket.on("bot_stopped", (data) => {
      console.log("Bot stopped:", data);
    });

    this.socket.on("disconnect", () => {
      this.updateStatus("disconnected");
      this.attemptReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.callbacks.onError?.(error.message || "Socket error");
    });
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus("error");
      this.callbacks.onError?.("Failed to reconnect after multiple attempts");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.connect();
  }

  /**
   * Disconnect from the service
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus("disconnected");
  }

  /**
   * Request stats from the backend
   */
  requestStats() {
    if (this.socket && this.status === "connected") {
      this.socket.emit("request_stats");
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get base URL for REST API calls
   */
  getBaseUrl(): string {
    return this.possibleUrls[this.currentUrlIndex];
  }

  /**
   * Update connection status
   */
  private updateStatus(status: ConnectionStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  /**
   * Check if the service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/health`, {
        method: "GET",
        mode: "cors",
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default LocalServiceConnector;
