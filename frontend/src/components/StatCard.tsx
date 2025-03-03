import React, { useEffect, useState, useRef } from "react";
import { Card, CardBody, Progress } from "@heroui/react";
import { cn } from "../utils/cn";
import { AnimatedCounter } from "./AnimatedCounter";

type StatCardProps = {
  title: string;
  value: number;
  total?: number;
  increment?: boolean;
};

export function StatCard({ title, value, total, increment }: StatCardProps) {
  const percentage = total ? (value / total) * 100 : 0;
  const [prevValue, setPrevValue] = useState<number>(value);
  const [isIncreasing, setIsIncreasing] = useState<boolean>(false);
  const [addedValue, setAddedValue] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== prevValue) {
      const difference = value - prevValue;
      if (difference > 0) {
        setAddedValue(difference);
        setIsIncreasing(true);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          setIsIncreasing(false);
          setAddedValue(0);
        }, 1000);
      }
    }
    setPrevValue(value);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, prevValue]);

  const isRequestCard = title.toLowerCase().includes("request");

  return (
    <Card
      className={cn(
        "border-none bg-background/90 backdrop-blur-xl transition-all duration-300 h-full w-full",
        isRequestCard && isIncreasing && "ring-2 ring-green-500/50"
      )}
      shadow="sm"
    >
      <CardBody className="space-y-4 p-6 flex flex-col justify-between h-full">
        <h3 className="text-sm font-semibold text-default-600 uppercase tracking-wider flex items-center justify-between">
          {title}
          {isRequestCard && isIncreasing && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
              <span className="rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </h3>
        <div className="flex justify-between items-baseline">
          <div className="flex items-baseline gap-2 relative">
            <span
              className={cn(
                "text-3xl font-bold bg-gradient-to-r from-green-600 to-lime-400 bg-clip-text text-transparent transition-all duration-300",
                isRequestCard && isIncreasing && "scale-105"
              )}
            >
              {title.toLowerCase().includes("thread") ||
              title.toLowerCase().includes("requests") ? (
                <AnimatedCounter value={value} />
              ) : (
                value.toLocaleString()
              )}
            </span>
            {isRequestCard && isIncreasing && addedValue > 0 && (
              <span className="absolute -right-12 top-0 text-xs font-medium text-green-500 animate-fade-up">
                +{addedValue.toLocaleString()}
              </span>
            )}
            {increment && (
              <span className="text-xs font-medium text-default-500">/sec</span>
            )}
          </div>
          {total && (
            <div className="text-sm font-medium text-default-400">
              of {total.toLocaleString()}
            </div>
          )}
        </div>
        {total && (
          <Progress
            value={percentage}
            classNames={{
              base: "h-2",
              indicator: "bg-gradient-to-r from-green-500 to-lime-400",
              track: "bg-default-100",
            }}
          />
        )}
      </CardBody>
    </Card>
  );
}
