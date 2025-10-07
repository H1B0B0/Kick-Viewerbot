import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number; // allow custom duration
}

// AnimatedCounter now leverages anime.js v4 for smoother number transitions
// and avoids manual setInterval loops.
export function AnimatedCounter({
  value,
  className,
  duration = 600,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const lastValueRef = useRef<number>(value);
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (value === lastValueRef.current) return;

    const start = lastValueRef.current;
    const end = value;

    // Simple counter animation without blocking
    const steps = 20;
    const increment = (end - start) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps) {
        const newVal = start + increment * (currentStep + 1);
        setDisplayValue(Math.round(newVal));
        currentStep++;
      } else {
        setDisplayValue(end);
        lastValueRef.current = end;
        clearInterval(interval);
      }
    }, duration / steps);

    return () => {
      clearInterval(interval);
      setDisplayValue(end);
      lastValueRef.current = end;
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("transition-colors", className)}>
      {displayValue.toLocaleString()}
    </span>
  );
}
