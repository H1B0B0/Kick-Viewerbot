import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import axios, { AxiosRequestConfig } from "axios";

import { readSharedJson, writeSharedJson } from "./desktopStorage";

const COOKIE_STORE_KEY = "velbots.session.cookies.v1";
const COOKIE_STORE_FILE = "session-cookies-v1.json";

async function getCookieStore(): Promise<string[]> {
  const parsed = await readSharedJson<unknown>(
    COOKIE_STORE_FILE,
    COOKIE_STORE_KEY,
  );

  return Array.isArray(parsed)
    ? parsed.filter((cookie): cookie is string => typeof cookie === "string")
    : [];
}

async function saveCookieStore(store: string[]): Promise<void> {
  try {
    await writeSharedJson(COOKIE_STORE_FILE, COOKIE_STORE_KEY, store);
  } catch {
    // A failed persistence write will surface as an unauthenticated API call.
  }
}

async function parseSetCookie(
  setCookieHeader: string | null | string[],
): Promise<void> {
  if (!setCookieHeader) return;

  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  let store = await getCookieStore();
  let modified = false;

  for (const header of headers) {
    const match = header.match(/^([^;]+)/);

    if (match) {
      const cookie = match[1].trim();
      const name = cookie.split("=")[0].trim();

      store = store.filter((item) => !item.startsWith(`${name}=`));

      if (!header.toLowerCase().includes("max-age=0")) {
        store.push(cookie);
      }

      modified = true;
    }
  }

  if (modified) {
    await saveCookieStore(store);
  }
}

function getCookieValue(store: string[], name: string): string | null {
  const prefix = `${name}=`;
  const cookie = store.find((item) => item.startsWith(prefix));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return cookie.slice(prefix.length);
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function customAxios<T = unknown>(
  config: AxiosRequestConfig,
): Promise<{ data: T; status: number; headers: Headers | unknown }> {
  if (isTauri()) {
    const method = (config.method || "GET").toUpperCase();
    const headers = new Headers();

    if (config.headers) {
      Object.entries(config.headers).forEach(([k, v]) => {
        if (typeof v === "string") headers.set(k, v);
      });
    }

    const store = await getCookieStore();

    if (store.length > 0) {
      headers.set("Cookie", store.join("; "));
    }

    const csrfToken = getCookieValue(store, "csrf_access_token");

    if (csrfToken && !headers.has("X-CSRF-TOKEN")) {
      headers.set("X-CSRF-TOKEN", csrfToken);
    }

    headers.set("Accept", "application/json");

    if (config.data && typeof config.data === "object") {
      headers.set("Content-Type", "application/json");
    }

    const res = await tauriFetch(config.url!, {
      method,
      headers,
      body: config.data ? JSON.stringify(config.data) : undefined,
    });

    if (res.headers) {
      const cookieHeaders = res.headers as Headers & {
        getSetCookie?: () => string[];
      };
      const setCookies = (cookieHeaders.getSetCookie?.() ?? []).flatMap(
        (header) => header.split(/,(?=\s*[a-zA-Z0-9_-]+=)/),
      );

      if (setCookies.length > 0) {
        await parseSetCookie(setCookies);
      } else {
        const single = res.headers.get("set-cookie");

        if (single) {
          await parseSetCookie(single.split(/,(?=\s*[a-zA-Z0-9_-]+=)/));
        }
      }
    }

    const data = (await readResponseBody(res)) as T;

    if (!res.ok) {
      const requestError = new Error(`HTTP ${res.status}`) as Error & {
        response?: { status: number; data: T };
      };

      requestError.response = { status: res.status, data };
      throw requestError;
    }

    return { data, status: res.status, headers: res.headers };
  }

  return axios({
    ...config,
    withCredentials: true,
    xsrfCookieName: "csrf_access_token",
    xsrfHeaderName: "X-CSRF-TOKEN",
  });
}
