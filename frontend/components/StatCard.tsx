import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { cn } from "../utils/cn";
import { LuActivity, LuTerminal, LuCpu } from "react-icons/lu";

type StatCardProps = {
  title: string;
  value: number;
  total?: number;
  increment?: boolean;
};

export function StatCard({ title, value, total, increment }: StatCardProps) {
  const percentage = total ? (value / total) * 100 : 0;
  const [prevValue, setPrevValue] = useState<number>(value);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const isRequestCard = title.toLowerCase().includes("request") || title.toLowerCase().includes("connection");

  useEffect(() => {
    if (value !== prevValue) {
      if (value > prevValue) {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 500);
        return () => clearTimeout(timer);
      }
      setPrevValue(value);
    }
  }, [value, prevValue]);

  // Determine appropriate icon using react-icons (standardized)
  const getCardIcon = () => {
    const t = title.toLowerCase();
    if (t.includes("thread")) return <LuTerminal className="w-4 h-4 text-primary" />;
    if (t.includes("prox")) return <LuCpu className="w-4 h-4 text-primary" />;
    if (t.includes("request") || t.includes("connection")) return <LuActivity className="w-4 h-4 text-primary" />;
    return null;
  };

  return (
    <Card
      isBlurred
      shadow="sm"
      className={cn(
        "border-none transition-all duration-500 h-full w-full",
        isAnimating && "ring-2 ring-primary/30 scale-[1.02]"
      )}
    >
      <CardBody className="p-8 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-default-400">
            {getCardIcon()}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</span>
          </div>
          {isAnimating && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
        </div>

        <div className="flex justify-between items-baseline mt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter">
              {value.toLocaleString()}
            </span>
            {increment && (
              <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">/sec</span>
            )}
          </div>
          {total && (
            <div className="text-[10px] font-black text-default-400 uppercase tracking-widest">
              OF {total.toLocaleString()}
            </div>
          )}
        </div>

        {total !== undefined && (
          <div className="mt-6">
            <Progress
              aria-label={`${title} progress`}
              value={percentage}
              size="sm"
              radius="full"
              color="primary"
              classNames={{
                base: "max-w-md",
                track: "bg-default-100",
                indicator: "bg-primary shadow-[0_0_20px_-5px] shadow-primary",
              }}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
