import React from "react";
import { Cpu, MemoryStick, ArrowUp, ArrowDown } from "lucide-react";

interface MetricData {
  label: string;
  value: number;
  unit: string;
  maxValue: number;
}

interface SystemMetricsProps {
  metrics: {
    cpu: MetricData;
    memory: MetricData;
    network_up: MetricData;
    network_down: MetricData;
  };
}

export const SystemMetrics = ({ metrics }: SystemMetricsProps) => {
  const renderMetric = (metric: MetricData, icon: React.ReactNode, colorClass: string, bgClass: string) => {
    const percentage = Math.min((metric.value / metric.maxValue) * 100, 100);
    return (
      <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium tracking-wide">
            {icon}
            <span>{metric.label.toUpperCase()}</span>
          </div>
          <span className={`text-xs font-mono font-bold ${colorClass}`}>
            {metric.value.toFixed(1)}{metric.unit}
          </span>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden border border-zinc-800/50">
          <div 
            className={`h-1 rounded-full transition-all duration-500 ${bgClass}`}
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 h-full flex flex-col justify-between">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-green-500" /> System Resources
      </h3>
      
      <div className="space-y-3">
        {renderMetric(metrics.cpu, <Cpu className="w-3 h-3" />, "text-blue-400", "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]")}
        {renderMetric(metrics.memory, <MemoryStick className="w-3 h-3" />, "text-purple-400", "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]")}
        
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 flex flex-col justify-between">
             <div className="flex items-center gap-1 text-zinc-500 text-[10px] uppercase font-semibold mb-1">
               <ArrowUp className="w-3 h-3 text-cyan-500" /> Upload
             </div>
             <span className="text-sm font-mono text-cyan-400">{metrics.network_up.value.toFixed(1)} <span className="text-[10px] text-zinc-500">{metrics.network_up.unit}</span></span>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 flex flex-col justify-between">
             <div className="flex items-center gap-1 text-zinc-500 text-[10px] uppercase font-semibold mb-1">
               <ArrowDown className="w-3 h-3 text-rose-500" /> Download
             </div>
             <span className="text-sm font-mono text-rose-400">{metrics.network_down.value.toFixed(1)} <span className="text-[10px] text-zinc-500">{metrics.network_down.unit}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
