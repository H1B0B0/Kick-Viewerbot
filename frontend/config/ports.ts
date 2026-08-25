import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";

export interface RuntimeEndpoint {
  base_url: string;
  port: number;
  instance_nonce: string;
  protocol_version: number;
}

export const getBackendEndpoint = async (): Promise<RuntimeEndpoint> => {
  if (isTauri()) {
    try {
      // Demande l'endpoint au superviseur Rust
      const endpoint: RuntimeEndpoint = await invoke("get_runtime_endpoint");
      return endpoint;
    } catch (e) {
      console.error("Failed to get runtime endpoint from Tauri:", e);
      throw e;
    }
  } else {
    // Mode développement navigateur
    const baseUrl = process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || "http://127.0.0.1:8765";
    const port = parseInt(baseUrl.split(":").pop() || "8765", 10);
    return {
      base_url: baseUrl,
      port: port,
      instance_nonce: "dev-nonce",
      protocol_version: 1,
    };
  }
};
