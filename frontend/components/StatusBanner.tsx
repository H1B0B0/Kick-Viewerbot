import React from "react";

export function StatusBanner({ status }: { status: any }) {
  const stateColor = 
    status.state === "running" ? "text-emerald-500" :
    status.state === "stopping" ? "text-amber-500" :
    status.state === "starting" ? "text-blue-500" :
    status.state === "error" ? "text-red-500" : "text-zinc-400";

  return (
    <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold uppercase ${stateColor}`}>
          {status.state}
        </span>
        <span className="text-sm text-zinc-400">
          {status.message || "Awaiting instructions"}
        </span>
      </div>
      
      {status.startup_progress > 0 && status.startup_progress < 100 && (
        <div className="w-32 bg-zinc-800 rounded-full h-1 overflow-hidden">
          <div className="bg-white h-1 transition-all duration-300" style={{ width: `${status.startup_progress}%` }} />
        </div>
      )}
    </div>
  );
}
