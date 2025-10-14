/**
 * Shared port configuration
 * Must match the backend shared_config.py
 */

// Ports peu utilisés par défaut, dans l'ordre de préférence
export const AVAILABLE_PORTS = [
  8765, // Port peu commun
  9876, // Rarement utilisé
  7890, // Peu utilisé
  6543, // Rarement occupé
  5432, // Peut être occupé par PostgreSQL
  8081, // Alternative à 8080
  8082, // Alternative à 8080
  8083, // Alternative à 8080
];

// Générer toutes les URLs possibles (localhost + 127.0.0.1)
export const generateConnectionUrls = (): string[] => {
  const urls: string[] = [];

  for (const port of AVAILABLE_PORTS) {
    urls.push(`http://localhost:${port}`);
    urls.push(`http://127.0.0.1:${port}`);
  }

  return urls;
};
