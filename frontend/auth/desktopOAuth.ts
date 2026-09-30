import { isTauri } from "@tauri-apps/api/core";

import { openExternal } from "../app/functions/openExternal";
import { customAxios } from "../app/functions/customFetch";
import {
  readSharedJson,
  removeSharedJson,
  writeSharedJson,
} from "../app/functions/desktopStorage";

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

interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  expiresAt: number;
}

const OAUTH_TRANSACTION_KEY = "velbots.oauth.patreon.transaction.v1";
const OAUTH_TRANSACTION_FILE = "oauth-patreon-transaction-v1.json";
const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);

  window.crypto.getRandomValues(array);

  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function clearOAuthTransaction(): Promise<void> {
  await removeSharedJson(OAUTH_TRANSACTION_FILE, OAUTH_TRANSACTION_KEY);
}

async function saveOAuthTransaction(
  transaction: OAuthTransaction,
): Promise<void> {
  await writeSharedJson(
    OAUTH_TRANSACTION_FILE,
    OAUTH_TRANSACTION_KEY,
    transaction,
  );
}

async function loadOAuthTransaction(): Promise<OAuthTransaction | null> {
  try {
    const transaction = await readSharedJson<Partial<OAuthTransaction>>(
      OAUTH_TRANSACTION_FILE,
      OAUTH_TRANSACTION_KEY,
    );

    if (
      !transaction ||
      typeof transaction.state !== "string" ||
      typeof transaction.codeVerifier !== "string" ||
      typeof transaction.expiresAt !== "number" ||
      transaction.expiresAt <= Date.now()
    ) {
      await clearOAuthTransaction();

      return null;
    }

    return transaction as OAuthTransaction;
  } catch {
    await clearOAuthTransaction();

    return null;
  }
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Secure context required for OAuth. Launch the desktop app with `npm run tauri dev`.",
    );
  }

  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const digestArray = Array.from(new Uint8Array(digest));

  return btoa(String.fromCharCode.apply(null, digestArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function fetchCapabilities(): Promise<AuthCapabilities> {
  try {
    const res = await customAxios<AuthCapabilities>({
      method: "GET",
      url: `${API_BASE_URL}/auth/desktop/capabilities`,
    });

    return res.data;
  } catch {
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
  if (!isTauri()) {
    throw new Error(
      "Patreon desktop login requires the Tauri app. In development, run `npm run tauri dev` instead of `npm run dev`.",
    );
  }

  if (!caps.patreon.enabled) {
    throw new Error(
      "Patreon OAuth is not currently supported by the remote API.",
    );
  }

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  await saveOAuthTransaction({
    state,
    codeVerifier,
    expiresAt: Date.now() + OAUTH_TRANSACTION_TTL_MS,
  });

  try {
    const res = await customAxios<{ authorization_url: string }>({
      method: "POST",
      url: `${API_BASE_URL}${caps.patreon.authorize_endpoint}`,
      data: {
        protocol_version: 1,
        redirect_uri: "velbots://oauth/callback",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      },
    });

    const { authorization_url } = res.data;

    if (!authorization_url.startsWith("https://www.patreon.com/")) {
      throw new Error("Invalid authorization URL returned by server");
    }

    await openExternal(authorization_url, { preferChrome: true });
  } catch (error) {
    await clearOAuthTransaction();
    throw error;
  }
}

export async function handleOAuthCallback(
  url: string,
  caps: AuthCapabilities,
): Promise<boolean> {
  const parsedUrl = new URL(url);

  if (
    parsedUrl.protocol !== "velbots:" ||
    parsedUrl.hostname !== "oauth" ||
    parsedUrl.pathname !== "/callback"
  ) {
    return false;
  }

  const oauthError = parsedUrl.searchParams.get("error");

  if (oauthError) {
    await clearOAuthTransaction();
    throw new Error(
      parsedUrl.searchParams.get("error_description") ||
        "Patreon authorization was cancelled.",
    );
  }

  const code = parsedUrl.searchParams.get("code");
  const state = parsedUrl.searchParams.get("state");
  const transaction = await loadOAuthTransaction();

  if (!code || !state || !transaction) {
    throw new Error("The Patreon login request expired. Please start again.");
  }

  if (state !== transaction.state) {
    await clearOAuthTransaction();
    throw new Error("OAuth state mismatch. Please start the login again.");
  }

  await customAxios({
    method: "POST",
    url: `${API_BASE_URL}${caps.patreon.exchange_endpoint}`,
    data: {
      code,
      code_verifier: transaction.codeVerifier,
      state,
    },
  });

  await clearOAuthTransaction();

  return true;
}
