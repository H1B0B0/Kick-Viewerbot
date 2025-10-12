"use client";
import { useState } from "react";
import Spline from "@splinetool/react-spline";

interface SplineWithLoaderProps {
  scene: string;
  className?: string;
}

export default function SplineWithLoader({
  scene,
  className,
}: SplineWithLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {/* Loader - visible until Spline is loaded */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-[100]">
          <div className="flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-green-400/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-green-400 rounded-full animate-spin"></div>
            </div>

            {/* Loading text */}
            <div className="text-foreground/50 text-xs font-medium animate-pulse">
              Loading 3D...
            </div>
          </div>
        </div>
      )}

      {/* Spline component */}
      <Spline
        scene={scene}
        onLoad={() => setIsLoading(false)}
        className={className}
      />
    </>
  );
}
