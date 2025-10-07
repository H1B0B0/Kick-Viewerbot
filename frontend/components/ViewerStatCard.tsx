import React, { useEffect, useState, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { FaArrowUp, FaArrowDown, FaMinus } from "react-icons/fa";
import { useViewerCache } from "../hooks/useViewerCache";
import { cn } from "../utils/cn";
import { AnimatedCounter } from "./AnimatedCounter";
import { useAnime } from "../hooks/useAnime";
import {
  flash,
  confetti,
  numberPop,
  shockwave,
  milestonePulse,
} from "../utils/animations";

type ViewerStatCardProps = {
  value: number;
};

export function ViewerStatCard({ value }: ViewerStatCardProps) {
  const { previousValue, percentageChange } = useViewerCache(value);
  const difference = value - previousValue;
  const [showGlow, setShowGlow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [addedValue, setAddedValue] = useState<number>(0);
  const [isIncreasing, setIsIncreasing] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const { animate, createTimeline } = useAnime();

  // Radial pulse animation on increase
  useEffect(() => {
    if (difference > 0 && pulseRef.current) {
      try {
        const tl = createTimeline();
        tl.add(pulseRef.current, {
          scale: [1, 1.5],
          opacity: [0.4, 0],
          duration: 1200,
          ease: "outQuad",
        });
      } catch (error) {
        console.warn("Pulse animation failed:", error);
      }
    }
  }, [value, difference, createTimeline]);

  useEffect(() => {
    if (difference > 0 && cardRef.current) {
      setShowGlow(true);
      setIsIncreasing(true);
      setAddedValue(difference);

      const card = cardRef.current;

      // Different effects based on viewer increase
      if (difference >= 50) {
        // BIG increase - confetti explosion!
        confetti(card, 25);
        milestonePulse(card);
        numberPop(card, difference, "#10b981");
      } else if (difference >= 20) {
        // Medium increase - shockwave + number
        shockwave(card, "rgba(16,185,129,0.5)");
        numberPop(card, difference, "#34d399");
        flash(card, "rgba(34,197,94,0.6)");
      } else if (difference >= 5) {
        // Small increase - flash + number
        flash(card, "rgba(34,197,94,0.6)");
        numberPop(card, difference, "#6ee7b7");
      } else {
        // Tiny increase - just flash
        flash(card, "rgba(34,197,94,0.4)");
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setShowGlow(false);
        setIsIncreasing(false);
        setAddedValue(0);
      }, 1000);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => {
        clearTimeout(timer);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
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
    <Card
      ref={cardRef}
      className={cn(
        "border-none glass-card transition-all duration-300 h-full w-full",
        showGlow && "ring-2 ring-green-500/50"
      )}
      shadow="sm"
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
              <AnimatedCounter value={value} />
            </span>
            {isIncreasing && addedValue > 0 && (
              <span className="absolute -right-12 top-0 text-xs font-medium text-green-500 animate-fade-up">
                +{addedValue.toLocaleString()}
              </span>
            )}
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
  );
}
