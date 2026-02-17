"use client";
import { Chip } from "@heroui/chip";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";
import Link from "next/link";
import { ConnectionStatus } from "@/services/WebSocketService";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

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
        return "System Online";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown Status";
    }
  };

  const helperDownloadUrl = "https://github.com/H1B0B0/Kick-Viewerbot/releases/latest";
  const isError = status === "error" || status === "disconnected";
  const color = getStatusColor();

  return (
    <Popover placement="bottom" showArrow={true} isOpen={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <PopoverTrigger>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer focus:outline-none">
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <div className={`absolute w-full h-full rounded-full opacity-75 animate-ping bg-${color === 'success' ? 'green-500' : color === 'warning' ? 'yellow-500' : 'red-500'}`}></div>
            <div className={`relative w-2 h-2 rounded-full bg-${color === 'success' ? 'green-500' : color === 'warning' ? 'yellow-500' : 'red-500'}`}></div>
          </div>
          <span className={`text-xs font-medium ${color === 'success' ? 'text-green-600 dark:text-green-500' : 'text-zinc-500 dark:text-zinc-400'} group-hover:text-foreground transition-colors`}>
            {status === 'connected' ? 'Systems Normal' : getStatusText()}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-4 bg-popover border border-border rounded-xl max-w-xs shadow-2xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className={`w-2 h-2 rounded-full bg-${color === 'success' ? 'green-500' : color === 'warning' ? 'yellow-500' : 'red-500'}`}></div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground leading-none mb-1">{getStatusText()}</h4>
              <p className="text-xs text-muted-foreground">{currentUrl || "No connection"}</p>
            </div>
          </div>

          {isError && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Local service is not reachable. Ensure the helper is running.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onPress={() => window.open(helperDownloadUrl, '_blank')}
                >
                  Download
                </Button>
                {onRetry && (
                  <Button
                    size="sm"
                    color="primary"
                    onPress={() => {
                      onRetry();
                      setIsOpen(false);
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
