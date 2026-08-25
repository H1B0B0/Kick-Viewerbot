import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export function shouldCheckForDesktopUpdate(
  isDesktopRuntime: boolean,
  environment: string | undefined,
): boolean {
  return isDesktopRuntime && environment === "production";
}

export async function checkForDesktopUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const update = await check();
    if (update) {
      return {
        version: update.version,
        date: update.date,
        body: update.body,
      };
    }
  } catch (e) {
    console.error("Failed to check for updates:", e);
  }
  return null;
}

export async function installDesktopUpdate(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!isTauri()) return;

  const update = await check();
  if (!update) return;

  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      contentLength = event.data.contentLength || 0;
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      if (contentLength && onProgress) {
        onProgress(downloaded / contentLength);
      }
    } else if (event.event === "Finished") {
      if (onProgress) onProgress(1);
    }
  });

  await relaunch();
}
