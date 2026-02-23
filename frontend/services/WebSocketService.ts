/**
 * WebSocket Service - Communication complète via WebSocket
 */
import { io, Socket } from "socket.io-client";
import { generateConnectionUrls } from "../config/ports";

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
  enableChat?: boolean;
  chatAuthToken?: string;
  messagesPerMinute?: number;
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
  onKickChatStatus?: (status: any) => void;
  onKickChatStarted?: (data: any) => void;
  onKickChatStopped?: (data: any) => void;
  onKickChatError?: (error: string) => void;
}

export default class WebSocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = "disconnected";
  private callbacks: Callbacks = {};

  // URLs possibles pour le service local
  private urls: string[] = [];
  private currentUrl = "";

  /**
   * Pinger une URL pour voir si un backend répond
   */
  static async ping(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io(url, {
        transports: ["websocket"],
        reconnection: false,
        timeout: 1000,
      });

      socket.on("connect", () => {
        socket.disconnect();
        resolve(true);
      });

      socket.on("connect_error", () => {
        socket.close();
        resolve(false);
      });

      // Force timeout
      setTimeout(() => {
        socket.close();
        resolve(false);
      }, 1500);
    });
  }

  /**
   * Découvrir tous les backends actifs sur les ports configurés
   */
  static async discover(): Promise<string[]> {
    const potentialUrls = generateConnectionUrls();
    const results = await Promise.all(
      potentialUrls.map(async (url) => {
        const active = await WebSocketService.ping(url);
        return active ? url : null;
      })
    );
    return results.filter((url): url is string => url !== null);
  }

  constructor(callbacks: Callbacks = {}, customUrls?: string[]) {
    this.callbacks = callbacks;
    this.urls = customUrls && customUrls.length > 0 ? customUrls : generateConnectionUrls();
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
      if (data.status === "error") {
        this.callbacks.onBotError?.(data.message);
      }
    });

    this.socket.on("kick_chat_status_response", (status) => {
      this.callbacks.onKickChatStatus?.(status);
    });

    this.socket.on("kick_chat_started", (data) => {
      this.callbacks.onKickChatStarted?.(data);
    });

    this.socket.on("kick_chat_stopped", (data) => {
      this.callbacks.onKickChatStopped?.(data);
    });

    this.socket.on("kick_chat_error", (error) => {
      this.callbacks.onKickChatError?.(error);
    });

    this.socket.on("disconnect", () => {
      this.updateStatus("disconnected");
      this.callbacks.onDisconnect?.();
    });
  }

  /**
   * Démarrer le bot
   */
  async startBot(config: BotConfig): Promise<void> {
    if (!this.socket) throw new Error("Non connecté");

    // Si on a un fichier de proxy, on doit le lire et l'envoyer
    if (config.proxyFile) {
      const content = await config.proxyFile.text();
      this.socket.emit("start_bot", {
        ...config,
        proxy_file_content: content,
        proxyFile: undefined, // Ne pas envoyer l'objet File
      });
    } else {
      this.socket.emit("start_bot", config);
    }
  }

  /**
   * Arrêter le bot
   */
  stopBot(): void {
    if (!this.socket) return;
    this.socket.emit("stop_bot");
  }

  /**
   * Démarrer le chat Kick
   */
  startKickChat(channelName: string, authTokens?: string[], responseChance?: number, minInterval?: number): void {
    if (!this.socket) return;
    this.socket.emit("kick_chat_start", {
      channel_name: channelName,
      auth_tokens: authTokens,
      response_chance: responseChance,
      min_interval: minInterval,
    });
  }


  /**
   * Arrêter le chat Kick
   */
  stopKickChat(): void {
    if (!this.socket) return;
    this.socket.emit("stop_kick_chat");
  }

  /**
   * Demander le statut du chat Kick
   */
  getKickChatStatus(): void {
    if (!this.socket) return;
    this.socket.emit("get_kick_chat_status");
  }

  /**
   * Demander les statistiques
   */
  getStats(): void {
    if (!this.socket) return;
    this.socket.emit("get_stats");
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
   * Mettre à jour le statut interne
   */
  private updateStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  /**
   * Obtenir le statut actuel
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
   * Est-il connecté ?
   */
  isConnected(): boolean {
    return this.status === "connected";
  }
}
