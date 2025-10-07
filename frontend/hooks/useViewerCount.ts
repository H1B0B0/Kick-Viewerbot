import { useState, useEffect, useRef } from "react";
import { getViewerCount } from "../app/functions/KickAPI";

// NOTE: To prevent hydration mismatches, the initial value is deterministic (0) and
// we avoid including viewerCount in dependency array (which caused redefinition of interval).
// Fetch starts only on client after mount and username presence.
export function useViewerCount(username: string | undefined) {
  const [viewerCount, setViewerCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!username) return;
    let interval: any;

    const fetchViewerCount = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const count = await getViewerCount(username);
        if (!mountedRef.current) return;
        setPreviousCount((prev) => (prev !== count ? viewerCount : prev));
        setViewerCount(count);
        setLastUpdate(Date.now());
      } catch (e) {
        // swallow errors silently or add logging if desired
      } finally {
        fetchingRef.current = false;
      }
    };

    // Defer first fetch to next tick (ensure client only)
    const timeout = setTimeout(fetchViewerCount, 0);
    interval = setInterval(fetchViewerCount, 2500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [username]);

  return { viewerCount, previousCount, lastUpdate };
}
