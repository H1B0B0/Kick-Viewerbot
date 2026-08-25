import { openExternal } from "../app/functions/openExternal";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.velbots.shop";

export interface AuthCapabilities {
  protocol_version: number;
  patreon: {
    enabled: boolean;
    authorize_endpoint: string;
    exchange_endpoint: string;
  };
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const digestArray = Array.from(new Uint8Array(digest));
  return btoa(String.fromCharCode.apply(null, digestArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function fetchCapabilities(): Promise<AuthCapabilities> {
  try {
    const res = await axios.get(`${API_BASE_URL}/auth/desktop/capabilities`);
    return res.data;
  } catch (e) {
    // Si l'endpoint n'existe pas encore, on retourne un état désactivé sécurisé
    return {
      protocol_version: 1,
      patreon: {
        enabled: false,
        authorize_endpoint: "",
        exchange_endpoint: "",
      },
    };
  }
}

export async function startDesktopOAuth(caps: AuthCapabilities): Promise<void> {
  if (!caps.patreon.enabled) {
    throw new Error(
      "Patreon OAuth is not currently supported by the remote API.",
    );
  }

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store for exchange phase
  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_verifier", codeVerifier);

  try {
    const res = await axios.post(
      `${API_BASE_URL}${caps.patreon.authorize_endpoint}`,
      {
        protocol_version: 1,
        redirect_uri: "velbots://oauth/callback",
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      },
    );

    const { authorization_url } = res.data;
    if (!authorization_url.startsWith("https://www.patreon.com/")) {
      throw new Error("Invalid authorization URL returned by server");
    }

    await openExternal(authorization_url);
  } catch (e) {
    console.error("Failed to start OAuth flow:", e);
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_verifier");
    throw e;
  }
}

export async function handleOAuthCallback(
  url: string,
  caps: AuthCapabilities,
): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "velbots:") return false;

    const code = parsedUrl.searchParams.get("code");
    const state = parsedUrl.searchParams.get("state");

    const savedState = sessionStorage.getItem("oauth_state");
    const savedVerifier = sessionStorage.getItem("oauth_verifier");

    if (!code || !state || !savedState || !savedVerifier) {
      throw new Error("Missing OAuth parameters or session expired");
    }

    if (state !== savedState) {
      throw new Error("OAuth state mismatch - possible CSRF attack");
    }

    // Exchange code for session
    await axios.post(
      `${API_BASE_URL}${caps.patreon.exchange_endpoint}`,
      {
        code,
        code_verifier: savedVerifier,
        state,
      },
      {
        withCredentials: true,
      },
    );

    return true;
  } finally {
    // Always clean up security parameters
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_verifier");
  }
}
