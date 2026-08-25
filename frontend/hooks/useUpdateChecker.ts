"use client";
import { useState, useEffect, useCallback } from "react";
import { checkForDesktopUpdate, installDesktopUpdate, UpdateInfo } from "../services/desktopUpdater";
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from "@tauri-apps/api/core";

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<UpdateInfo | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  const dismissUpdate = useCallback(() => {
    setShowToast(false);
  }, []);

  const installUpdate = useCallback(async () => {
    setIsInstalling(true);
    try {
      await installDesktopUpdate((p) => setInstallProgress(p));
    } catch (e) {
      console.error("Update failed:", e);
      setIsInstalling(false);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!isTauri()) return;

      try {
        const currentVersion = await getVersion();
        console.log(`Current app version: ${currentVersion}`);

        const update = await checkForDesktopUpdate();
        if (update) {
          setUpdateAvailable(true);
          setLatestVersion(update);
          setShowToast(true);
        }
      } catch (error) {
        console.error("Failed to check for updates via Tauri:", error);
      }
    };

    check();
    const interval = setInterval(check, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    updateAvailable,
    latestVersion,
    showToast,
    dismissUpdate,
    installUpdate,
    isInstalling,
    installProgress
  };
}
