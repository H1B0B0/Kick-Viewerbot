"use client";
// Small helper around anime.js v4 to avoid SSR issues in Next.js
// Provides a unified animate function and a hook to create timelines safely.
import { useEffect, useRef } from "react";
import { animate, createTimeline } from "animejs";
import type { JSAnimation, Timeline, TargetsParam, AnimationParams } from "animejs";

export function useAnime() {
  // Keep a ref of created animations so we can clean up if component unmounts
  const animationsRef = useRef<JSAnimation[]>([]);
  const timelinesRef = useRef<Timeline[]>([]);

  useEffect(() => {
    return () => {
      // Pause all running animations on unmount to prevent memory leaks
      animationsRef.current.forEach((a) => a.pause());
      timelinesRef.current.forEach((t) => t.pause());
      animationsRef.current = [];
      timelinesRef.current = [];
    };
  }, []);

  const run = (targets: TargetsParam, params: AnimationParams) => {
    const inst = animate(targets, params);
    animationsRef.current.push(inst);
    return inst;
  };

  const timeline = (options?: Parameters<typeof createTimeline>[0]) => {
    const tl = createTimeline(options);
    timelinesRef.current.push(tl);
    return tl;
  };

  return { animate: run, createTimeline: timeline };
}
