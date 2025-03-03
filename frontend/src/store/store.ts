import { create } from "zustand";
import axios from "axios";

const API_URL = "http://localhost:3000";

interface AppState {
  botStatus: string;
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
  checkStatus: () => Promise<void>;
  error: string | null;
}

// Fonction pour mapper les statuts du backend aux statuts du frontend
const mapBackendStatus = (backendStatus: string): string => {
  const statusMap: Record<string, string> = {
    stopping: "STOPPING",
    stopped: "STOPPED",
    running: "RUNNING",
    starting: "STARTING",
    error: "ERROR",
  };
  return statusMap[backendStatus.toLowerCase()] || backendStatus.toUpperCase();
};

export const useStore = create<AppState>()((set, get) => ({
  botStatus: "STOPPED",
  error: null,

  startBot: async () => {
    try {
      set({ botStatus: "STARTING" });
      await axios.post(`${API_URL}/api/bot/start`);
      set({ botStatus: "RUNNING" });
    } catch (error) {
      console.error("Failed to start bot:", error);
      set({ botStatus: "ERROR", error: "Failed to start bot" });
    }
  },

  stopBot: async () => {
    try {
      set({ botStatus: "STOPPING" });
      await axios.post(`${API_URL}/api/bot/stop`);

      // Ajouter un délai pour s'assurer que le backend a eu le temps de traiter la demande
      setTimeout(() => {
        set({ botStatus: "STOPPED" });
      }, 2000); // Attendre 2 secondes avant de passer à STOPPED
    } catch (error) {
      console.error("Failed to stop bot:", error);
      set({ botStatus: "ERROR", error: "Failed to stop bot" });
    }
  },

  checkStatus: async () => {
    try {
      // Ne pas faire de requête si on est en état transitoire
      const currentStatus = get().botStatus;
      if (currentStatus === "STOPPING" || currentStatus === "STARTING") {
        return;
      }

      const response = await axios.get(`${API_URL}/api/bot/status`);

      // Utiliser la fonction de mappage pour convertir correctement le statut
      const backendState = response.data.status?.state || response.data.status;
      const mappedStatus = mapBackendStatus(backendState);

      console.log(
        "Statut du backend:",
        backendState,
        "-> Frontend:",
        mappedStatus
      );

      // Ne pas mettre à jour si on est déjà en état transitoire
      if (get().botStatus !== "STOPPING" && get().botStatus !== "STARTING") {
        set({ botStatus: mappedStatus });
      }
    } catch (error) {
      console.error("Failed to check bot status:", error);
      // Ne pas changer le statut à ERROR si on est déjà en état transitoire
      const currentStatus = get().botStatus;
      if (currentStatus !== "STOPPING" && currentStatus !== "STARTING") {
        set({ botStatus: "ERROR", error: "Failed to check bot status" });
      }
    }
  },
}));
