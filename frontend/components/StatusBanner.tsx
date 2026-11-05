import type { StudioRuntimeStatus } from "../services/runtimeDiagnostics";

import React from "react";

export function StatusBanner({
  status,
}: {
  status: Pick<StudioRuntimeStatus, "code" | "message">;
}) {
  const stateColor =
    status.code === "ready"
      ? "text-emerald-500"
      : status.code === "warning"
        ? "text-amber-500"
        : status.code === "starting"
          ? "text-blue-500"
          : status.code === "error"
            ? "text-red-500"
            : "text-zinc-400";

  return (
    <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold uppercase ${stateColor}`}>
          {status.code}
        </span>
        <span className="text-sm text-zinc-400">
          {status.message || "Awaiting workspace status"}
        </span>
      </div>
    </div>
  );
}
