import React from "react";
import { useViewerCache } from "../hooks/useViewerCache";

export function ViewerStatCard({ value }: { value: number }) {
  const { previousValue, percentageChange } = useViewerCache(value);
  const difference = value - previousValue;
  const isIncreasing = difference > 0;
  const isDecreasing = difference < 0;

  return (
    <div className="flex flex-col justify-between p-5 h-full bg-[#09090b] border border-zinc-800 rounded-xl">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">Live Viewers</h3>
      <div className="space-y-2 mt-auto">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold text-white">
            {value.toLocaleString()}
          </span>
          {isIncreasing && (
            <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +{difference}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm ${isIncreasing ? 'text-emerald-500' : isDecreasing ? 'text-red-500' : 'text-zinc-500'}`}>
          <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          <span className="text-zinc-500 ml-1">since last update</span>
        </div>
      </div>
    </div>
  );
}
