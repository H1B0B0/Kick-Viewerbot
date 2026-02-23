import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { LuArrowUp, LuArrowDown, LuMinus, LuUsers } from "react-icons/lu";
import { useViewerCache } from "../hooks/useViewerCache";
import { cn } from "../utils/cn";
import { AnimatedCounter } from "./AnimatedCounter";

type ViewerStatCardProps = {
  value: number;
};

export function ViewerStatCard({ value }: ViewerStatCardProps) {
  const { previousValue, percentageChange } = useViewerCache(value);
  const difference = value - previousValue;
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (difference !== 0) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [value, difference]);

  const getTrendColor = () => {
    if (difference > 0) return "text-green-500";
    if (difference < 0) return "text-red-500";
    return "text-default-400";
  };

  const getTrendIcon = () => {
    if (difference > 0) return <LuArrowUp className="w-4 h-4" />;
    if (difference < 0) return <LuArrowDown className="w-4 h-4" />;
    return <LuMinus className="w-4 h-4" />;
  };

  return (
    <Card
      isBlurred
      shadow="sm"
      className={cn(
        "border-none transition-all duration-500 h-full w-full",
        isUpdating && difference > 0 && "ring-2 ring-primary/30 scale-[1.02]",
        isUpdating && difference < 0 && "ring-2 ring-danger/30 scale-[0.98]"
      )}
    >
      <CardBody className="p-8 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-default-400">
            <LuUsers className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Viewers</span>
          </div>
          {isUpdating && difference > 0 && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
        </div>

        <div className="space-y-1 mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter">
              <AnimatedCounter value={value} />
            </span>
            {isUpdating && difference !== 0 && (
              <span className={cn(
                "text-xs font-black animate-in fade-in slide-in-from-bottom-2",
                difference > 0 ? "text-success" : "text-danger"
              )}>
                {difference > 0 ? "+" : ""}{difference.toLocaleString()}
              </span>
            )}
          </div>

          <div className={cn("flex items-center gap-1.5 font-black transition-colors pt-2", getTrendColor())}>
            {getTrendIcon()}
            <span className="text-sm font-black">
              {Math.abs(percentageChange).toFixed(1)}%
            </span>
            <span className="text-[10px] text-default-400 uppercase ml-auto tracking-widest">
              Trend
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
