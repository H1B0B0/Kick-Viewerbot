"use client";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Play, Square, Settings, Shield, FileText, Monitor, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// Hooks and APIs
import { useGetProfile, logout } from "./functions/UserAPI";
import { useWebSocketBot } from "@/hooks/useWebSocketBot";

// Custom Components
import { StatCard } from "../components/StatCard";
import { ViewerStatCard } from "../components/ViewerStatCard";
import { SystemMetrics } from "../components/SystemMetrics";
import { StatusBanner } from "../components/StatusBanner";
import { WebSocketStatus } from "@/components/WebSocketStatus";

export default function Dashboard() {
  const { data: profile, error: profileError } = useGetProfile();
  const router = useRouter();

  useEffect(() => {
    if (profileError) {
      router.push("/login");
    }
  }, [profileError, router]);

  const {
    isConnected: wsConnected,
    status: wsStatus,
    currentUrl: wsUrl,
    stats: wsStats,
    startBot: wsStartBot,
    stopBot: wsStopBot,
    reconnect: wsReconnect,
  } = useWebSocketBot();

  const [config, setConfig] = useState({
    channelName: "",
    threads: 100,
    timeout: 10000,
    proxyType: "all",
    stabilityMode: false,
  });

  const [proxyFile, setProxyFile] = useState<File | null>(null);
  const [channelNameModified, setChannelNameModified] = useState(false);

  useEffect(() => {
    if (profile?.user?.TwitchUsername && !config.channelName && !channelNameModified) {
      setConfig((prev) => ({ ...prev, channelName: profile.user.TwitchUsername as string }));
    }
  }, [profile, channelNameModified, config.channelName]);

  useEffect(() => {
    if (wsStats?.config && wsStats.is_running) {
      const { threads, timeout, proxy_type, stability_mode } = wsStats.config;
      setConfig((prev) => ({
        ...prev,
        threads: threads ?? prev.threads,
        timeout: parseInt(`${timeout}`) || 10000,
        proxyType: proxy_type ?? prev.proxyType,
        channelName: wsStats.channel_name || prev.channelName,
        stabilityMode: typeof stability_mode === "boolean" ? stability_mode : prev.stabilityMode,
      }));
    }
  }, [wsStats?.is_running]); // eslint-disable-line

  const botState = wsStats?.status?.state?.toLowerCase() || "stopped";
  const isRunningOrStarting = botState === "running" || botState === "starting";
  const isStopping = botState === "stopping";
  const isLocked = isRunningOrStarting || isStopping;

  const handleStart = async () => {
    if (!wsConnected) return toast.error("Disconnected from background service.");
    if (!config.channelName) return toast.error("Channel name is required.");
    if (config.threads <= 0) return toast.error("Threads must be greater than 0.");

    try {
      await wsStartBot({
        channelName: config.channelName,
        threads: config.threads,
        proxyFile: proxyFile || undefined,
        timeout: config.timeout,
        proxyType: config.proxyType,
        stabilityMode: config.stabilityMode,
        subscriptionStatus: "active"
      });
    } catch (err: any) {
      toast.error(`Failed to start: ${err.message}`);
    }
  };

  const handleStop = async () => {
    if (!wsConnected) return;
    try {
      wsStopBot();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    if (isRunningOrStarting) wsStopBot();
    await logout();
    router.push("/login");
  };

  const systemMetrics = {
    cpu: { label: "CPU", value: wsStats?.system_metrics?.cpu || 0, unit: "%", maxValue: 100 },
    memory: { label: "Memory", value: wsStats?.system_metrics?.memory || 0, unit: "%", maxValue: 100 },
    network_up: { label: "Up", value: wsStats?.system_metrics?.network_up || 0, unit: "MB/s", maxValue: 10 },
    network_down: { label: "Down", value: wsStats?.system_metrics?.network_down || 0, unit: "MB/s", maxValue: 10 }
  };

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-100">
      <aside className="w-72 border-r border-zinc-800 bg-[#09090b] flex flex-col h-full flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-white" />
            <h1 className="font-semibold text-sm">Kick ViewerBot</h1>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <section className="space-y-4">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> General
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Channel</label>
              <input 
                type="text" 
                value={config.channelName}
                onChange={(e) => { setConfig({ ...config, channelName: e.target.value }); setChannelNameModified(true); }}
                disabled={isLocked}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-colors"
                placeholder="Channel name or URL"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Threads</label>
                <span className="text-xs text-zinc-500">{config.threads}</span>
              </div>
              <input 
                type="range" 
                min="1" max="1000" step="10"
                value={config.threads}
                onChange={(e) => setConfig({ ...config, threads: parseInt(e.target.value) })}
                disabled={isLocked}
                className="w-full accent-white disabled:opacity-50"
              />
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-zinc-800/50">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Network & Proxy
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Protocol</label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-md">
                {["http", "socks4", "socks5", "all"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setConfig({ ...config, proxyType: type })}
                    disabled={isLocked}
                    className={`text-xs py-1.5 rounded transition-colors ${config.proxyType === type ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'} disabled:opacity-50`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Custom Proxies</label>
              <label className={`flex items-center justify-center gap-2 w-full border border-dashed rounded-md py-2.5 text-sm cursor-pointer transition-colors ${proxyFile ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 hover:border-zinc-700 text-zinc-400 bg-zinc-900/30'} ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <FileText className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{proxyFile ? proxyFile.name : "Select .txt file"}</span>
                <input 
                  type="file" accept=".txt" className="hidden" disabled={isLocked}
                  onChange={(e) => setProxyFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-[#09090b]">
          <button
            onClick={isRunningOrStarting ? handleStop : handleStart}
            disabled={isStopping || (!wsConnected && !isRunningOrStarting)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
              isStopping ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" :
              isRunningOrStarting 
                ? "bg-zinc-100 text-black hover:bg-white" 
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {isStopping ? <Square className="w-4 h-4 fill-current" /> : isRunningOrStarting ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isStopping ? "Stopping..." : isRunningOrStarting ? "Stop Bot" : "Start Bot"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        <header className="h-16 px-8 flex items-center justify-between border-b border-zinc-800 bg-[#09090b] sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <WebSocketStatus status={wsStatus} currentUrl={wsUrl} onRetry={wsReconnect} />
            <div className="h-4 w-px bg-zinc-800"></div>
            <span className="text-sm text-zinc-400">{profile?.user?.username || "Guest"}</span>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-8 max-w-5xl space-y-6">
          <StatusBanner status={wsStats?.status || { state: "standby", message: "Ready", startup_progress: 0 }} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <ViewerStatCard value={wsStats?.viewers || 0} />
            </div>
            <StatCard title="Active Threads" value={wsStats?.active_threads || 0} total={config.threads} />
            <StatCard title="Proxy Pool" value={wsStats?.alive_proxies || 0} total={wsStats?.total_proxies || 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#09090b] border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-1">Total Requests</h3>
                <p className="text-zinc-500 text-sm mb-6 max-w-md">
                  Payloads sent to the target server during the current session.
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-white tracking-tight">
                  {(wsStats?.request_count || 0).toLocaleString()}
                </span>
                <span className="text-zinc-500 text-sm">reqs</span>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <SystemMetrics metrics={systemMetrics} />
            </div>
          </div>
        </main>
      </div>
      <ToastContainer position="bottom-right" theme="dark" toastClassName="bg-zinc-900 border border-zinc-800 text-sm" />
    </div>
  );
}
