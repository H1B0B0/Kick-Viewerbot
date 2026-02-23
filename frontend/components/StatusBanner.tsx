import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { cn } from "../utils/cn";

interface StatusBannerProps {
  status: {
    state: string;
    message: string;
    proxy_loading_progress: number;
    startup_progress: number;
  };
}

export const StatusBanner = ({ status }: StatusBannerProps) => {
  const getStatusConfig = () => {
    switch (status.state) {
      case "error":
        return { color: "text-danger", dot: "bg-danger", label: "ERROR" };
      case "running":
        return { color: "text-success", dot: "bg-success", label: "RUNNING" };
      case "loading_proxies":
      case "starting":
        return { color: "text-primary", dot: "bg-primary", label: status.state.toUpperCase().replace("_", " ") };
      case "stopped":
        return { color: "text-default-400", dot: "bg-default-400", label: "IDLE" };
      case "stopping":
        return { color: "text-warning", dot: "bg-warning", label: "STOPPING" };
      case "connected":
        return { color: "text-success", dot: "bg-success", label: "CONNECTED" };
      case "connecting":
        return { color: "text-warning", dot: "bg-warning", label: "CONNECTING" };
      case "disconnected":
        return { color: "text-default-400", dot: "bg-default-400", label: "DISCONNECTED" };
      default:
        return { color: "text-default-500", dot: "bg-default-500", label: "UNKNOWN" };
    }
  };

  const config = getStatusConfig();

  return (
    <Card isBlurred shadow="sm" className="w-full border-none">
      <CardBody className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-2.5 w-2.5">
                {status.state !== "stopped" && (
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)}></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", config.dot)}></span>
              </span>
              <div className="flex flex-col">
                <span className={cn("text-[10px] font-black tracking-widest leading-none", config.color)}>
                  {config.label}
                </span>
                <span className="text-sm font-bold text-default-600 mt-1">
                  {status.message}
                </span>
              </div>
            </div>
          </div>

          {(status.state === "loading_proxies" || status.state === "starting") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-2">
              {status.proxy_loading_progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-default-400">
                    <span>Probing Proxies</span>
                    <span className="text-primary">{status.proxy_loading_progress}%</span>
                  </div>
                  <Progress
                    value={status.proxy_loading_progress}
                    color="primary"
                    size="sm"
                    radius="full"
                    classNames={{
                      track: "bg-default-100",
                    }}
                  />
                </div>
              )}
              {status.startup_progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-default-400">
                    <span>Bootstrapping Bot</span>
                    <span className="text-success">{status.startup_progress}%</span>
                  </div>
                  <Progress
                    value={status.startup_progress}
                    color="success"
                    size="sm"
                    radius="full"
                    classNames={{
                      track: "bg-default-100",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
