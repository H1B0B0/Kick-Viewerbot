import React from "react";

export function WebSocketStatus({ status, onRetry }: any) {
  const isConnected = status === "connected";
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        {isConnected ? (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        )}
      </span>
      <span className={isConnected ? "text-zinc-300" : "text-zinc-500"}>
        {isConnected ? "Engine Connected" : "Disconnected"}
      </span>
      {!isConnected && (
        <button onClick={onRetry} className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}
