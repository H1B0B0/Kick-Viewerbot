import React from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  total?: number;
}

export function StatCard({ title, value, total }: StatCardProps) {
  const percentage = total && total > 0 ? (Number(value) / total) * 100 : 0;

  return (
    <div className="flex flex-col justify-between p-5 h-full bg-[#09090b] border border-zinc-800 rounded-xl">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">{title}</h3>
      <div className="space-y-3 mt-auto">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-white">
            {value}
          </span>
          {total !== undefined && (
            <span className="text-sm text-zinc-500">
              / {total}
            </span>
          )}
        </div>
        {total !== undefined && (
          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-white h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(percentage, 100)}%` }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
