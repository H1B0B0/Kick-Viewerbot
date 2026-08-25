import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Opens an external URL.
 * - Inside the Tauri desktop app: opens in the system's default browser
 *   (needed because the bundled webview blocks popups/third-party OAuth
 *   flows like Patreon's "Continue with Google/Apple").
 * - In a plain web browser: falls back to same-tab navigation.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    await openUrl(url);
  } else {
    window.location.href = url;
  }
}
