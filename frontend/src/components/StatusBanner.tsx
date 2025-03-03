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
        return "text-gray-600";
    }
  };

  return (
    <Card className="w-full border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardBody className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`${getTextColor()} font-medium`}>
                {status.state.toUpperCase()}
              </span>
              <span className="text-gray-700">{status.message}</span>
            </div>
          </div>

          {(status.state === "loading_proxies" ||
            status.state === "starting") && (
            <div className="space-y-2">
              {status.proxy_loading_progress > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Loading Proxies</span>
                    <span>{status.proxy_loading_progress}%</span>
                  </div>
                  <Progress
                    value={status.proxy_loading_progress}
                    color="primary"
                    className="h-2"
                  />
                </div>
              )}
              {status.startup_progress > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Starting Bot</span>
                    <span>{status.startup_progress}%</span>
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
