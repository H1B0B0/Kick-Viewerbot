import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn";

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const [animatedValue, setAnimatedValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== animatedValue) {
      setIsAnimating(true);
      const steps = 20;
      const increment = (value - animatedValue) / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        if (currentStep < steps) {
          setAnimatedValue((prev) => Math.round(prev + increment));
          currentStep++;
        } else {
          setAnimatedValue(value);
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [value, animatedValue]);

  return (
    <span
      className={cn(
        "transition-transform",
        isAnimating && "animate-bounce-once",
        className
      )}
    >
      {animatedValue.toLocaleString()}
    </span>
  );
}
