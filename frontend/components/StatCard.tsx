import React, { useEffect, useState, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { cn } from "../utils/cn";
import { AnimatedCounter } from "./AnimatedCounter";
import { useAnime } from "../hooks/useAnime";
import { flash, shockwave } from "../utils/animations";

type StatCardProps = {
  title: string;
  value: number;
  total?: number;
  increment?: boolean;
};

export function StatCard({ title, value, total, increment }: StatCardProps) {
  const percentage = total ? (value / total) * 100 : 0;
  const [prevValue, setPrevValue] = useState<number>(value);
  const [prevPercentage, setPrevPercentage] = useState<number>(percentage);
  const [isIncreasing, setIsIncreasing] = useState<boolean>(false);
  const [addedValue, setAddedValue] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const { animate } = useAnime();

  const isRequestCard = title.toLowerCase().includes("request");

  useEffect(() => {
    if (value !== prevValue) {
      const difference = value - prevValue;
      if (difference > 0 && cardRef.current) {
        setAddedValue(difference);
        setIsIncreasing(true);

        // Flash animation on value increase with shockwave for requests
        if (isRequestCard && difference >= 10) {
          shockwave(cardRef.current, "rgba(168,85,247,0.4)");
        }
        flash(cardRef.current);

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
  }, [value, prevValue, isRequestCard]);

  // Animate progress bar
  useEffect(() => {
    if (percentage !== prevPercentage && progressRef.current) {
      const progressBar = progressRef.current.querySelector(
        '[data-slot="indicator"]'
      );
      if (progressBar instanceof HTMLElement) {
        try {
          animate(progressBar, {
            scaleX: [0.95, 1],
            opacity: [0.7, 1],
            duration: 600,
            ease: "outQuad",
          });
        } catch (error) {
          console.warn("Progress animation failed:", error);
        }
      }
    }
    setPrevPercentage(percentage);
  }, [percentage, prevPercentage, animate]);

  // Determine appropriate icon for the stat card
  const getCardIcon = () => {
    if (title.toLowerCase().includes("thread")) {
      return (
        <svg
          className="w-4 h-4 text-green-500 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      );
    } else if (title.toLowerCase().includes("prox")) {
      return (
        <svg
          className="w-4 h-4 text-green-500 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      );
    } else if (title.toLowerCase().includes("request")) {
      return (
        <svg
          className="w-4 h-4 text-lime-500 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      );
    }
    return null;
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "border-none glass-card transition-all duration-300 h-full w-full",
        isRequestCard && isIncreasing && "ring-2 ring-green-500/50"
      )}
    >
      <CardBody className="space-y-4 p-6 flex flex-col justify-between h-full relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="microGrid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#microGrid)" />
          </svg>
        </div>

        <h3 className="text-sm font-semibold text-default-600 uppercase tracking-wider flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {getCardIcon()}
            {title}
          </div>
          {isRequestCard && isIncreasing && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
              <span className="rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </h3>
        <div className="flex justify-between items-baseline z-10">
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
          <div ref={progressRef} className="z-10">
            <Progress
              aria-label={`${title} progress`}
              value={percentage}
              classNames={{
                base: "h-2",
                indicator: "bg-gradient-to-r from-green-500 to-lime-400",
                track: "bg-default-100",
              }}
            />
            <div className="text-xs text-right mt-1 text-default-500">
              {Math.round(percentage)}%
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
