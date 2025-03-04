import { Card, CardBody, Progress } from "@heroui/react";

interface StatusBannerProps {
  status: {
    state: string;
    message: string;
    proxy_loading_progress: number;
    startup_progress: number;
  };
}

export const StatusBanner = ({ status }: StatusBannerProps) => {
  const getTextColor = () => {
    switch (status.state) {
      case "error":
        return "text-red-600";
      case "running":
        return "text-green-600";
      case "loading_proxies":
        return "text-blue-600";
      case "starting":
        return "text-blue-600";
      case "stopped":
        return "text-red-600";
      case "stopping":
        return "text-orange-600";
      default:
        return "";
    }
  };

  const getStatusIndicator = () => {
    switch (status.state) {
      case "error":
        return (
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        );
      case "running":
        return (
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        );
      case "loading_proxies":
      case "starting":
        return (
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        );
      case "stopped":
        return (
          <span className="relative flex h-3 w-3 mr-2">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
          </span>
        );
      case "stopping":
        return (
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full border-none glass-card shadow-xl hover:shadow-2xl transition-all duration-500">
      <CardBody className="p-4 relative overflow-hidden">
        {/* Background pulse effect based on status */}
        <div
          className={`absolute inset-0 opacity-10  ${
            status.state === "running" ? "animate-pulse-subtle" : ""
          }`}
        ></div>

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIndicator()}
              <span className={`${getTextColor()} font-medium`}>
                {status.state.toUpperCase()}
              </span>
              <span className="ml-3 text-gray-700 dark:text-gray-300">
                {status.message}
              </span>
            </div>
          </div>

          {(status.state === "loading_proxies" ||
            status.state === "starting") && (
            <div className="space-y-3 pt-2">
              {status.proxy_loading_progress > 0 && (
                <div className="animate-fade-in">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">Loading Proxies</span>
                    <span className="font-medium">
                      {status.proxy_loading_progress}%
                    </span>
                  </div>
                  <Progress
                    value={status.proxy_loading_progress}
                    color="primary"
                    className="h-2"
                  />
                </div>
              )}
              {status.startup_progress > 0 && (
                <div className="animate-fade-in">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">Starting Bot</span>
                    <span className="font-medium">
                      {status.startup_progress}%
                    </span>
                  </div>
                  <Progress
                    value={status.startup_progress}
                    color="success"
                    className="h-2"
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
