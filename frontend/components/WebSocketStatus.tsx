import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { ConnectionStatus } from "@/services/WebSocketService";
import { useState } from "react";
import { LuGlobe, LuInfo, LuDownload, LuRefreshCw } from "react-icons/lu";
import { cn } from "../utils/cn";

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

  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return { color: "success" as const, text: "Systems Normal", icon: <LuGlobe className="w-3.5 h-3.5" /> };
      case "connecting":
        return { color: "warning" as const, text: "Connecting...", icon: <LuRefreshCw className="w-3.5 h-3.5 animate-spin" /> };
      case "error":
      case "disconnected":
        return { color: "danger" as const, text: "Connection Error", icon: <LuInfo className="w-3.5 h-3.5" /> };
      default:
        return { color: "default" as const, text: "Unknown Status", icon: null };
    }
  };

  const config = getStatusConfig();
  const helperDownloadUrl = "https://github.com/H1B0B0/Kick-Viewerbot/releases/latest";
  const isError = status === "error" || status === "disconnected";

  const dotColorClass = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    default: "bg-default-400"
  }[config.color] || "bg-default-400";

  return (
    <Popover placement="bottom" showArrow isOpen={isOpen} onOpenChange={setIsOpen} backdrop="transparent">
      <PopoverTrigger>
        <button className="focus:outline-none active:scale-95 transition-transform">
          <Chip
            variant="flat"
            color={config.color}
            startContent={config.icon}
            className="h-8 pl-1 pr-2 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-opacity-80"
          >
            {config.text}
          </Chip>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-4 w-[280px]">
        <div className="space-y-4 w-full">
          <div className="flex items-center gap-3">
            <div className={cn("w-2.5 h-2.5 rounded-full", dotColorClass)}></div>
            <div className="flex-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-default-500">{config.text}</h4>
            </div>
          </div>

          {isError && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-default-500 font-medium leading-relaxed">
                The helper backend at this URL is unreachable. Please ensure the instance is active and accessible.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<LuDownload className="w-3.5 h-3.5" />}
                  className="font-black"
                  onPress={() => window.open(helperDownloadUrl, '_blank')}
                >
                  Download
                </Button>
                {onRetry && (
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<LuRefreshCw className="w-3.5 h-3.5" />}
                    className="font-black"
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
