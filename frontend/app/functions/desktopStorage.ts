import { isTauri } from "@tauri-apps/api/core";
import {
  BaseDirectory,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

export async function readSharedJson<T>(
  fileName: string,
  localStorageKey: string,
): Promise<T | null> {
  if (isTauri()) {
    try {
      const value = await readTextFile(fileName, {
        baseDir: BaseDirectory.AppLocalData,
      });

      return JSON.parse(value) as T;
    } catch {
      // Fall back to the WebView store for migration and browser tests.
    }
  }

  try {
    const value = localStorage.getItem(localStorageKey);

    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function writeSharedJson(
  fileName: string,
  localStorageKey: string,
  value: unknown,
): Promise<void> {
  const serialized = JSON.stringify(value);

  localStorage.setItem(localStorageKey, serialized);

  if (isTauri()) {
    await writeTextFile(fileName, serialized, {
      baseDir: BaseDirectory.AppLocalData,
    });
  }
}

export async function removeSharedJson(
  fileName: string,
  localStorageKey: string,
): Promise<void> {
  localStorage.removeItem(localStorageKey);

  if (isTauri()) {
    try {
      await remove(fileName, { baseDir: BaseDirectory.AppLocalData });
    } catch {
      // Removing a file that does not exist is already the desired state.
    }
  }
}
