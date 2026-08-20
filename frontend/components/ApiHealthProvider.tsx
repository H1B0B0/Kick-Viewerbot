"use client";
import { useApiHealth } from "../hooks/useApiHealth";

export default function ApiHealthProvider({ children }: { children: React.ReactNode }) {
  const isApiUp = useApiHealth();

  if (!isApiUp) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-300 font-sans p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-medium text-white">System Offline</h1>
          <p className="text-zinc-500 text-sm max-w-sm">The VelBots API is currently unreachable. Please check your connection or try again later.</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-white text-black rounded-md text-sm font-medium transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
