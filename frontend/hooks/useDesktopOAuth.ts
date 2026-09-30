import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

import {
  fetchCapabilities,
  handleOAuthCallback,
  AuthCapabilities,
} from "../auth/desktopOAuth";
import { useGetProfile } from "../app/functions/UserAPI";

export function useDesktopOAuth() {
  const isDesktop = isTauri();
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useGetProfile();

  useEffect(() => {
    void fetchCapabilities().then(setCapabilities);
  }, []);

  useEffect(() => {
    if (!isDesktop || !capabilities?.patreon.enabled) return;

    let unlisten: (() => void) | undefined;
    let active = true;
    const handledUrls = new Set<string>();

    const processUrls = async (urls: string[]) => {
      if (!active) return;

      setIsProcessing(true);
      setError(null);

      try {
        for (const url of urls) {
          if (handledUrls.has(url)) continue;
          handledUrls.add(url);

          const success = await handleOAuthCallback(url, capabilities);

          if (success) {
            await mutate();
            window.location.assign("/");

            return;
          }
        }
      } catch (oauthError) {
        if (active) {
          setError(
            oauthError instanceof Error
              ? oauthError.message
              : "Failed to authenticate with Patreon",
          );
        }
      } finally {
        if (active) setIsProcessing(false);
      }
    };

    const setupDeepLink = async () => {
      unlisten = await onOpenUrl(processUrls);

      const currentUrls = await getCurrent();

      if (currentUrls) await processUrls(currentUrls);
    };

    void setupDeepLink().catch((setupError) => {
      if (active) {
        setError(
          setupError instanceof Error
            ? setupError.message
            : "Unable to initialize Patreon login",
        );
      }
    });

    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, [capabilities, isDesktop, mutate]);

  return { capabilities, isDesktop, isProcessing, error };
}
