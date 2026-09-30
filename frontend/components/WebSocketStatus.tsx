import React from "react";
import type { ConnectionStatus } from "@/services/WebSocketService";
import { useLocale } from "../i18n/LocaleProvider";

interface WebSocketStatusProps {
  status: ConnectionStatus;
  onRetry: () => void | Promise<void>;
}

export function WebSocketStatus({ status, onRetry }: WebSocketStatusProps) {
  const { t } = useLocale();
  const presentations: Record<
    ConnectionStatus,
    { label: string; dotClassName: string; textClassName: string }
  > = {
    connecting: {
      label: t("launching"),
      dotClassName: "bg-amber-400 animate-pulse",
      textClassName: "text-amber-200",
    },
    connected: {
      label: t("engineConnected"),
      dotClassName: "bg-emerald-500",
      textClassName: "text-zinc-300",
    },
    disconnected: {
      label: t("disconnected"),
      dotClassName: "bg-red-500",
      textClassName: "text-zinc-500",
    },
    error: {
      label: t("connectionFailed"),
      dotClassName: "bg-red-500",
      textClassName: "text-red-300",
    },
  };
  const presentation = presentations[status];
  const canRetry = status === "disconnected" || status === "error";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${presentation.dotClassName}`}
        />
      </span>
      <span className={presentation.textClassName}>{presentation.label}</span>
      {canRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}
