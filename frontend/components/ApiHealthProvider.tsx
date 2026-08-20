"use client";
import { useApiHealth } from "../hooks/useApiHealth";
import { ServerCrash } from "lucide-react";

export default function ApiHealthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isApiUp = useApiHealth();

  if (!isApiUp) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300 font-sans selection:bg-green-500/30 p-6">
        <div className="w-full max-w-md bg-black border border-zinc-900 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
          <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ServerCrash className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">System Offline</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            We are currently unable to reach the VelBots API. The system might be undergoing maintenance or experiencing an outage.
          </p>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">API_STATUS</span>
            <span className="text-red-400 font-bold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              DISCONNECTED
            </span>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm font-semibold transition-all hover:text-white"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
