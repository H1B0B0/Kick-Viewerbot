"use client";
import { useState, useEffect } from "react";

interface AppLoaderProps {
  onLoadComplete?: () => void;
}

export default function AppLoader({ onLoadComplete }: AppLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Start fade out animation
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1800);

    // Hide loader after fade out
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onLoadComplete?.();
    }, 2300);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onLoadComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.1),transparent_50%)]"></div>
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Logo with glow effect */}
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-green-400 to-blue-500 opacity-30 animate-pulse"></div>
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent animate-gradient-x">
                KickViewerBOT
              </span>
            </h1>
          </div>
        </div>

        {/* Futuristic loader ring */}
        <div className="relative w-32 h-32">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-green-400/10"></div>

          {/* Spinning rings */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-400 border-r-green-400 animate-spin"></div>
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-400 border-l-blue-400 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
          <div
            className="absolute inset-4 rounded-full border-2 border-transparent border-b-purple-400 border-r-purple-400 animate-spin"
            style={{ animationDuration: "2s" }}
          ></div>

          {/* Center glow */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-green-400/20 to-blue-500/20 blur-xl animate-pulse"></div>
        </div>

        {/* Progress bar */}
        <div className="w-64 md:w-80">
          <div className="relative h-2 bg-foreground/5 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-emerald-400 to-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>

          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-foreground/50 font-medium">Loading...</span>
            <span className="text-xs text-foreground/70 font-bold tabular-nums">{progress}%</span>
          </div>
        </div>

        {/* Animated status text */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-sm text-foreground/60 font-medium">
            Initializing application
          </span>
        </div>
      </div>
    </div>
  );
}
