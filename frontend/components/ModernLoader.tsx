"use client";
import React, { useEffect, useState } from "react";
import { animate } from "animejs";

interface ModernLoaderProps {
  onLoadComplete?: () => void;
}

export default function ModernLoader({ onLoadComplete }: ModernLoaderProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulated loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment for realistic feel
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    // Fade out and complete
    const completeTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onLoadComplete?.();
      }, 800); // Wait for exit animation
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [onLoadComplete]);

  if (!isExiting && progress === 100) {
    // Ensure we trigger exit if progress completes early
    setTimeout(() => setIsExiting(true), 500);
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background with subtle grid/mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
      </div>

      {/* Main Loader Container */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        
        {/* Animated Logo/Icon */}
        <div className="relative w-24 h-24 mb-4">
            {/* Pulsing Glow */}
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            
            {/* Rotating Rings */}
            <div className="absolute inset-0 border-2 border-green-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
            <div className="absolute inset-2 border-2 border-t-green-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
            
            {/* Center Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
                 <svg 
                    className="w-10 h-10 text-green-500 fill-current drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                    viewBox="0 0 24 24"
                 >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                 </svg>
            </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter text-white">
                KICK<span className="text-green-500">VIEWER</span>BOT
            </h1>
            <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase">
                Initializing System
            </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden mt-4">
            <div 
                className="h-full bg-green-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                style={{ width: `${progress}%` }}
            />
        </div>

      </div>
    </div>
  );
}
