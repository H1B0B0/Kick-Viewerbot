import React from "react";

interface MetricData {
  label: string;
  value: number;
  unit: string;
  maxValue: number;
}

export const SystemMetrics = ({ metrics }: { metrics: Record<string, MetricData> }) => {
  const renderBar = (metric: MetricData) => {
    const percentage = Math.min((metric.value / metric.maxValue) * 100, 100);
    return (
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400">{metric.label}</span>
          <span className="text-zinc-300 font-medium">{metric.value.toFixed(1)}{metric.unit}</span>
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div className="bg-zinc-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-6 h-full">
      <h3 className="text-sm font-medium text-zinc-400 mb-6">System Status</h3>
      {renderBar(metrics.cpu)}
      {renderBar(metrics.memory)}
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <span className="text-xs text-zinc-500 block mb-1">Upload</span>
          <span className="text-sm text-zinc-300">{metrics.network_up.value.toFixed(1)} <span className="text-xs text-zinc-500">{metrics.network_up.unit}</span></span>
        </div>
        <div>
          <span className="text-xs text-zinc-500 block mb-1">Download</span>
          <span className="text-sm text-zinc-300">{metrics.network_down.value.toFixed(1)} <span className="text-xs text-zinc-500">{metrics.network_down.unit}</span></span>
        </div>
      </div>
    </div>
  );
};
