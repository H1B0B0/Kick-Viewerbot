/**
 * BotAPI - WebSocket Version
 * Ces fonctions sont deprecated - utilisez useWebSocketBot hook à la place
 */

// Ces fonctions sont maintenant des wrappers pour compatibilité
// Elles ne font plus d'appels REST API
export const startBot = async (config: {
  channelName: string;
  threads: number;
  proxyFile?: File;
  timeout?: number;
  proxyType?: string;
  stabilityMode?: boolean;
}) => {
  console.warn('startBot via REST API est deprecated - utilisez useWebSocketBot hook');
  // Pour la compatibilité, retourne juste un succès
  return { success: true, message: 'Utilisez useWebSocketBot hook pour démarrer le bot' };
};

export const stopBot = async () => {
  console.warn('stopBot via REST API est deprecated - utilisez useWebSocketBot hook');
  return { success: true, message: 'Utilisez useWebSocketBot hook pour arrêter le bot' };
};

export const getBotStats = async () => {
  console.warn('getBotStats via REST API est deprecated - utilisez useWebSocketBot hook');
  // Retourne des stats vides pour la compatibilité
  return {
    active_threads: 0,
    total_proxies: 0,
    alive_proxies: 0,
    request_count: 0,
    is_running: false,
    config: {},
    status: { state: 'stopped', message: 'Utilisez useWebSocketBot hook' },
    system_metrics: { cpu: 0, memory: 0, network_up: 0, network_down: 0 }
  };
};
