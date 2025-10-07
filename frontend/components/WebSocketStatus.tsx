"use client";
import { Chip } from "@heroui/chip";
import Link from "next/link";
import { ConnectionStatus } from "@/services/WebSocketService";

interface WebSocketStatusProps {
  status: ConnectionStatus;
  currentUrl?: string;
  onRetry?: () => void;
}

export function WebSocketStatus({
  status,
  currentUrl,
  onRetry,
}: WebSocketStatusProps) {
  const getStatusColor = (): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case "connected":
        return "success";
      case "connecting":
        return "warning";
      case "error":
      case "disconnected":
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection error";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const helperDownloadUrl =
    "https://github.com/H1B0B0/Kick-Viewerbot/releases/latest";
  const showRecoveryActions = status === "error" || status === "disconnected";

  const baseChip = (
    <div className="flex items-center gap-3">
      <Chip color={getStatusColor()} variant="dot" size="sm">
        {getStatusText()}
      </Chip>

      {status === "connected" && currentUrl && (
        <span className="text-xs text-default-500">{currentUrl}</span>
      )}
    </div>
  );

  if (!showRecoveryActions) {
    return <div className="flex items-center gap-3">{baseChip}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
      {baseChip}

      <div className="flex flex-col items-center gap-3 text-xs text-default-500 sm:text-sm sm:max-w-2xl">
        <span className="leading-snug">
          Can’t reach the local bot service. Download the helper from GitHub or
          launch the Python backend on your machine, then try again.
        </span>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href={helperDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-default-200 px-3 py-1 text-xs font-medium text-default-700 transition-colors hover:bg-default-300"
          >
            Download helper
          </Link>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/80"
            >
              Retry connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
