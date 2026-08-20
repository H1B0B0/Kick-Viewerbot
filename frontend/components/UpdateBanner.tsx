"use client";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import { ArrowRight } from "lucide-react";

export default function UpdateBanner() {
  const { updateAvailable, latestVersion, showToast, dismissUpdate } = useUpdateChecker();

  if (!updateAvailable || !showToast || !latestVersion) return null;

  return (
    <div className="w-full bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span className="text-zinc-200">
          A new update is available ({latestVersion.tag_name})
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a 
          href={latestVersion.html_url} 
          target="_blank" 
          rel="noreferrer"
          className="text-white font-medium flex items-center gap-1 hover:underline"
        >
          View Release <ArrowRight className="w-3 h-3" />
        </a>
        <button onClick={dismissUpdate} className="text-zinc-500 hover:text-zinc-300">
          Dismiss
        </button>
      </div>
    </div>
  );
}
