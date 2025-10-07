/**
 * WebSocket Service - Communication complète via WebSocket
 */
import { io, Socket } from "socket.io-client";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface BotConfig {
  channelName: string;
  threads: number;
  timeout?: number;
  proxyType?: string;
  stabilityMode?: boolean;
  proxyFile?: File;
  subscriptionStatus?: boolean;
}

export interface BotStats {
  is_running: boolean;
  channel_name?: string;
  active_threads: number;
  total_proxies: number;
  alive_proxies: number;
  request_count: number;
  config: any;
  status: any;
  system_metrics: {
    cpu: number;
    memory: number;
    network_up: number;
    network_down: number;
  };
}

interface Callbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onStatsUpdate?: (stats: BotStats) => void;
  onBotStarted?: (data: any) => void;
  onBotStopped?: (data: any) => void;
  onBotError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = "disconnected";
  private callbacks: Callbacks = {};

  // URLs possibles pour le service local
  private urls = [
    "http://localhost:8080",
    "http://localhost:3001",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3001",
  ];

  private currentUrl = "";

  constructor(callbacks: Callbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Se connecter au service WebSocket
   */
  async connect(): Promise<boolean> {
    this.updateStatus("connecting");

    for (const url of this.urls) {
      console.log(`Tentative de connexion à ${url}...`);

      const success = await this.tryConnect(url);
      if (success) {
        this.currentUrl = url;
        console.log(`✅ Connecté à ${url}`);
        return true;
      }
    }

    this.updateStatus("error");
    this.callbacks.onBotError?.("Impossible de se connecter au service local");
    return false;
  }

  /**
   * Essayer de se connecter à une URL spécifique
   */
  private tryConnect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: false,
        timeout: 3000,
      });

      const timeout = setTimeout(() => {
        socket.close();
        resolve(false);
      }, 3000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.setupEventHandlers();
        this.updateStatus("connected");
        this.callbacks.onConnect?.();
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
   * Configurer les gestionnaires d'événements
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connected", (data) => {
      console.log("Serveur connecté:", data);
    });

    this.socket.on("stats_update", (stats: BotStats) => {
      this.callbacks.onStatsUpdate?.(stats);
    });

    this.socket.on("bot_started", (data) => {
      console.log("Bot démarré:", data);
      this.callbacks.onBotStarted?.(data);
    });

    this.socket.on("bot_stopped", (data) => {
      console.log("Bot arrêté:", data);
      this.callbacks.onBotStopped?.(data);
    });

    this.socket.on("bot_status_changed", (data) => {
      console.log("Statut bot changé:", data);
    });

    this.socket.on("bot_error", (error) => {
      console.error("Erreur bot:", error);
      this.callbacks.onBotError?.(error.error || "Erreur inconnue");
    });

    this.socket.on("disconnect", () => {
      this.updateStatus("disconnected");
      this.callbacks.onDisconnect?.();
    });

    this.socket.on("pong", (data) => {
      console.log("Pong reçu:", data);
    });
  }

  /**
   * Démarrer le bot
   */
  async startBot(config: BotConfig): Promise<void> {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Service non connecté");
    }

    const data: Record<string, unknown> = {
      channelName: config.channelName,
      threads: config.threads,
      timeout: config.timeout || 10000,
      proxyType: config.proxyType || "http",
      stabilityMode: config.stabilityMode || false,
      subscriptionStatus: config.subscriptionStatus || "unknown",
    };

    // Si un fichier proxy est fourni, le convertir en base64
    if (config.proxyFile) {
      const base64 = await this.fileToBase64(config.proxyFile);
      data.proxyFileData = base64;
      data.proxyFileName = config.proxyFile.name;
    }

    this.socket.emit("start_bot", data);
  }

  /**
   * Arrêter le bot
   */
  stopBot(): void {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Service non connecté");
    }

    this.socket.emit("stop_bot");
  }

  /**
   * Demander les statistiques
   */
  getStats(): void {
    if (!this.socket || this.status !== "connected") {
      return;
    }

    this.socket.emit("get_stats");
  }

  /**
   * Ping le serveur
   */
  ping(): void {
    if (!this.socket || this.status !== "connected") {
      return;
    }

    this.socket.emit("ping");
  }

  /**
   * Se déconnecter
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus("disconnected");
  }

  /**
   * Obtenir le statut de connexion
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Obtenir l'URL actuelle
   */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Mettre à jour le statut
   */
  private updateStatus(status: ConnectionStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  /**
   * Convertir un fichier en base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export default WebSocketService;
