import React from "react";
import { Terminal } from "lucide-react";

export function StatusBanner({ status }: { status: any }) {
  const stateColor = 
    status.state === "running" ? "text-green-400" :
    status.state === "stopping" ? "text-yellow-400" :
    status.state === "starting" ? "text-cyan-400" :
    status.state === "error" ? "text-red-400" : "text-zinc-500";

  return (
    <div className="w-full bg-black border border-zinc-800 rounded-xl p-4 font-mono text-sm overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-green-500 transition-colors" />
      <div className="flex items-center gap-3">
        <Terminal className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-500">system_status:</span>
        <span className={`${stateColor} font-bold`}>[{status.state.toUpperCase()}]</span>
        <span className="text-zinc-300 border-l border-zinc-800 pl-3 ml-1 truncate">
          {status.message || "Awaiting commands..."}
        </span>
      </div>
      
      {status.startup_progress > 0 && status.startup_progress < 100 && (
        <div className="mt-3 w-full bg-zinc-900 rounded-full h-0.5 overflow-hidden">
          <div 
            className="bg-cyan-500 h-0.5 transition-all duration-300" 
            style={{ width: `${status.startup_progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}
