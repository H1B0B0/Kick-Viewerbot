import { useState, useEffect } from "react";
import { getViewerCount } from "../app/functions/KickAPI";

export function useViewerCount(username: string | undefined) {
  const [viewerCount, setViewerCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>();

  useEffect(() => {
    if (!username) return;

    const fetchViewerCount = async () => {
      const count = await getViewerCount(username);
      setPreviousCount(viewerCount);
      setViewerCount(count);
      setLastUpdate(new Date());
    };

    fetchViewerCount();
    const interval = setInterval(fetchViewerCount, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [username, viewerCount]);

  return { viewerCount, previousCount, lastUpdate };
}
