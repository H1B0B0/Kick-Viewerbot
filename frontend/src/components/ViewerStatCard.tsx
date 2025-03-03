import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { FaArrowUp, FaArrowDown, FaMinus } from "react-icons/fa";
import { useViewerCache } from "../hooks/useViewerCache";
import { cn } from "../utils/cn";

type ViewerStatCardProps = {
  value: number;
};

export function ViewerStatCard({ value }: ViewerStatCardProps) {
  const { previousValue, percentageChange } = useViewerCache(value);
  const difference = value - previousValue;
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    if (difference > 0) {
      setShowGlow(true);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [value, difference]);

  const getTrendColor = () => {
    if (difference > 0) return "text-green-500";
    if (difference < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getTrendIcon = () => {
    if (difference > 0) return <FaArrowUp className="w-4 h-4" />;
    if (difference < 0) return <FaArrowDown className="w-4 h-4" />;
    return <FaMinus className="w-4 h-4" />;
  };

  return (
    <div className="relative h-full">
      {showGlow && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-green-400/30 to-green-500/30 rounded-lg blur-xl animate-pulse" />
      )}
      <Card
        className={cn(
          "relative h-full border-none bg-background/90 backdrop-blur-xl transition-all duration-300",
          showGlow && "ring-2 ring-green-500/50"
        )}
        shadow="sm"
      >
        <CardBody className="space-y-4 p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-default-600 uppercase tracking-wider">
              Live Viewers
            </h3>
            {showGlow && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
                <span className="rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-4xl font-black bg-clip-text text-transparent transition-all duration-1000",
                  showGlow
                    ? "bg-gradient-to-r from-green-400 via-green-500 to-green-600 animate-gradient-x"
                    : "bg-gradient-to-r from-green-600 to-green-700"
                )}
              >
                {value.toLocaleString()}
              </span>
            </div>
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
              <span className="text-xs text-default-500 ml-1">
                since last update
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
