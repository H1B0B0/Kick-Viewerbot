"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card, CardProps } from "@heroui/react";
import { enterStagger, attachHoverTilt } from "../utils/animations";

interface MotionCardProps extends CardProps {
  index?: number;
  disableHoverTilt?: boolean;
}

// Wrapper adding automatic entrance + optional hover tilt
export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = "",
  index = 0,
  disableHoverTilt = false,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side hydration before running animations
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !ref.current) return;

    try {
      // Subtle entrance animation for this card
      enterStagger([ref.current], {
        delay: 80 * index,
        translateY: [20, 0],
        duration: 500,
        ease: "outQuad"
      });

      if (!disableHoverTilt) {
        const cleanup = attachHoverTilt(ref.current, 6);
        return () => cleanup();
      }
    } catch (error) {
      console.warn("MotionCard animation failed:", error);
    }
  }, [isMounted, index, disableHoverTilt]);

  return (
    <Card
      ref={ref as any}
      className={`relative transition-all duration-300 will-change-transform ${className}`}
      {...rest}
    >
      {children}
    </Card>
  );
};
