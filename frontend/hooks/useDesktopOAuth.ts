import { useEffect, useState } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import {
  fetchCapabilities,
  handleOAuthCallback,
  AuthCapabilities,
} from "../auth/desktopOAuth";
import { useGetProfile } from "../app/functions/UserAPI";

export function useDesktopOAuth() {
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useGetProfile();

  useEffect(() => {
    fetchCapabilities().then(setCapabilities).catch(console.error);
  }, []);

  useEffect(() => {
    if (!capabilities?.patreon.enabled) return;

    let unlisten: (() => void) | undefined;

    const setupDeepLink = async () => {
      unlisten = await onOpenUrl(async (urls) => {
        setIsProcessing(true);
        setError(null);
        try {
          for (const url of urls) {
            const success = await handleOAuthCallback(url, capabilities);
            if (success) {
              await mutate(); // Refresh user profile
              window.location.href = "/"; // Force redirection to dashboard
              break;
            }
          }
        } catch (e: any) {
          setError(e.message || "Failed to authenticate");
        } finally {
          setIsProcessing(false);
        }
      });
    };

    setupDeepLink();

    return () => {
      if (unlisten) unlisten();
    };
  }, [capabilities, mutate]);

  return { capabilities, isProcessing, error };
}
