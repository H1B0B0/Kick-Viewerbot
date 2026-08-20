import React from "react";
import { Activity, Server, Shield } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  total?: number;
}

export function StatCard({ title, value, total }: StatCardProps) {
  const percentage = total && total > 0 ? (Number(value) / total) * 100 : 0;
  
  let Icon = Activity;
  if (title.toLowerCase().includes("thread")) Icon = Server;
  if (title.toLowerCase().includes("prox")) Icon = Shield;

  return (
    <div className="flex flex-col justify-between p-5 h-full bg-zinc-900/80 border border-zinc-800 rounded-xl relative overflow-hidden group hover:border-green-500/30 transition-colors">
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center justify-between mb-2 relative z-10">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</h3>
        <div className="text-green-500/80">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="space-y-3 relative z-10 mt-auto">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono text-zinc-100">
            {value}
          </span>
          {total !== undefined && (
            <span className="text-xs font-medium text-zinc-600">
              / {total}
            </span>
          )}
        </div>
        
        {total !== undefined && (
          <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden border border-zinc-800">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" 
              style={{ width: `${Math.min(percentage, 100)}%` }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
