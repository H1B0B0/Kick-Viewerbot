import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

interface OpenExternalOptions {
  preferChrome?: boolean;
}

function getChromeApplicationName(): string {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes("mac")) return "Google Chrome";
  if (platform.includes("win")) return "chrome";

  return "google-chrome";
}

/**
 * Opens an external URL.
 * - Inside the Tauri desktop app: opens in the system's default browser
 *   (needed because the bundled webview blocks popups/third-party OAuth
 *   flows like Patreon's "Continue with Google/Apple").
 * - In a plain web browser: falls back to same-tab navigation.
 */
export async function openExternal(
  url: string,
  options: OpenExternalOptions = {},
): Promise<void> {
  if (isTauri()) {
    if (options.preferChrome) {
      try {
        await openUrl(url, getChromeApplicationName());

        return;
      } catch {
        // Chrome is optional. Keep OAuth usable with the system browser.
      }
    }

    await openUrl(url);
  } else {
    window.location.href = url;
  }
}
