import React from "react";
import { Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useViewerCache } from "../hooks/useViewerCache";
import { AnimatedCounter } from "./AnimatedCounter";

type ViewerStatCardProps = {
  value: number;
};

export function ViewerStatCard({ value }: ViewerStatCardProps) {
  const { previousValue, percentageChange } = useViewerCache(value);
  const difference = value - previousValue;
  const isIncreasing = difference > 0;
  const isDecreasing = difference < 0;

  return (
    <div className={`flex flex-col justify-between p-5 h-full bg-zinc-900/80 border rounded-xl relative overflow-hidden transition-all duration-300 ${isIncreasing ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-zinc-800'}`}>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Live Viewers
        </h3>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <Users className="w-4 h-4 text-green-500/80" />
        </div>
      </div>
      
      <div className="space-y-2 relative z-10 mt-auto">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-mono text-green-400 font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
            <AnimatedCounter value={value} />
          </span>
          {isIncreasing && (
            <span className="text-xs font-mono text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
              +{difference}
            </span>
          )}
        </div>
        
        <div className={`flex items-center gap-1 text-xs font-medium ${isIncreasing ? 'text-green-500' : isDecreasing ? 'text-red-500' : 'text-zinc-500'}`}>
          {isIncreasing ? <ArrowUpRight className="w-3 h-3" /> : isDecreasing ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          <span className="text-zinc-600 ml-1">since last update</span>
        </div>
      </div>
    </div>
  );
}
