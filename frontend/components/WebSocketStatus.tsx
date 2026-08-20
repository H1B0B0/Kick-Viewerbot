import React from "react";
import { Activity, WifiOff, RefreshCcw } from "lucide-react";

export function WebSocketStatus({ status, currentUrl, onRetry }: any) {
  const isConnected = status === "connected";
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium border ${
      isConnected 
        ? "bg-green-500/10 text-green-400 border-green-500/20" 
        : "bg-red-500/10 text-red-400 border-red-500/20"
    }`}>
      {isConnected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Connected to Engine
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Disconnected
          <button onClick={onRetry} className="ml-2 hover:text-white transition-colors" title="Retry connection">
            <RefreshCcw className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}
