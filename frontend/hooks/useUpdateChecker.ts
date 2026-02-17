"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const GITHUB_API =
  "https://api.github.com/repos/H1B0B0/Kick-Viewerbot/releases/latest";
const CURRENT_VERSION = process.env.NEXT_PUBLIC_REACT_APP_VERSION || "0.0.0";

interface GithubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  assets: {
    browser_download_url: string;
    name: string;
  }[];
}

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<GithubRelease | null>(
    null
  );
  const [showToast, setShowToast] = useState(false);

  const dismissUpdate = useCallback(() => {
    setShowToast(false);
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await axios.get<GithubRelease>(GITHUB_API);
        const latest = response.data;

        console.log("Update checker:", {
          currentVersion: CURRENT_VERSION,
          latestVersion: latest.tag_name,
          latestVersionClean: latest.tag_name.replace("v", ""),
        });

        const compareVersions = (v1: string, v2: string) => {
          const parts1 = v1.replace("v", "").split(".").map(Number);
          const parts2 = v2.replace("v", "").split(".").map(Number);

          for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
          }
          return 0;
        };

        const isNewer = compareVersions(latest.tag_name, CURRENT_VERSION) > 0;

        console.log("Update check result:", {
          isNewer,
          willShow: isNewer,
        });

        if (isNewer) {
          setUpdateAvailable(true);
          setLatestVersion(latest);
          setShowToast(true);
          console.log("Update notification should appear");
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { updateAvailable, latestVersion, showToast, dismissUpdate };
}
