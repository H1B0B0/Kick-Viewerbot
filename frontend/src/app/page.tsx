"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Slider,
  Checkbox,
  ButtonGroup,
  Tooltip,
} from "@heroui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { StatCard } from "../components/StatCard";
import { useGetProfile, logout } from "./functions/UserAPI";
import { useViewerCount } from "../hooks/useViewerCount";
import { ViewerStatCard } from "../components/ViewerStatCard";
import { startBot, stopBot, getBotStats } from "./functions/BotAPI";
import { SystemMetrics } from "../components/SystemMetrics";
import { StatusBanner } from "../components/StatusBanner";

interface MetricData {
  label: string;
  value: number;
  color: string;
  unit: string;
  history: number[];
  maxValue: number;
}

export default function ViewerBotInterface() {
  const { data: profile } = useGetProfile();
  const [config, setConfig] = useState({
    threads: 0,
    channelName: "",
    gameName: "",
    messagesPerMinute: 1,
    enableChat: false,
    proxyType: "all",
    timeout: 10000,
    stabilityMode: false,
  });
  const { viewerCount: currentViewers } = useViewerCount(
    config?.channelName || profile?.user?.TwitchUsername
  );

  const [isLoading, setIsLoading] = useState(false);
  const [proxyFile, setProxyFile] = useState<File | null>(null);
  const [unactivated, setUnactivated] = useState(false);
  const [stats, setStats] = useState({
    totalProxies: 0,
    aliveProxies: 0,
    activeThreads: 0,
    request_count: 0,
    viewers: currentViewers, // Utilisé maintenant la valeur en direct
    targetViewers: 0,
  });

  const [channelNameModified, setChannelNameModified] = useState(false);

  // Add new state for bot status
  const [botStatus, setBotStatus] = useState({
    state: "initialized",
    message: "",
    proxy_count: 0,
    proxy_loading_progress: 0,
    startup_progress: 0,
  });

  useEffect(() => {
    if (botStatus.state.toLowerCase() === "stopping") {
      setUnactivated(true);
    } else {
      setUnactivated(false);
    }
  }, [botStatus]);

  const [systemMetrics, setSystemMetrics] = useState<{
    cpu: MetricData;
    memory: MetricData;
    network_up: MetricData;
    network_down: MetricData;
  }>({
    cpu: {
      label: "CPU Usage",
      value: 0,
      color: "#3b82f6",
      unit: "%",
      history: [],
      maxValue: 100,
    },
    memory: {
      label: "Memory Usage",
      value: 0,
      color: "#10b981",
      unit: "%",
      history: [],
      maxValue: 100,
    },
    network_up: {
      label: "Upload",
      value: 0,
      color: "#8b5cf6",
      unit: "MB/s",
      history: [],
      maxValue: 10, // Ajustez selon vos besoins
    },
    network_down: {
      label: "Download",
      value: 0,
      color: "#ef4444",
      unit: "MB/s",
      history: [],
      maxValue: 10, // Ajustez selon vos besoins
    },
  });

  const fetchStats = async () => {
    try {
      const stats = await getBotStats();

      // Ensure system_metrics exists with default values
      const system_metrics = stats.system_metrics || {
        cpu: 0,
        memory: 0,
        network_up: 0,
        network_down: 0,
      };

      // Update system metrics with safe values
      setSystemMetrics((prevMetrics) => {
        const updateMetric = (
          metric: MetricData,
          newValue: number | undefined
        ): MetricData => ({
          ...metric,
          value: typeof newValue === "number" ? newValue : 0,
          history: [
            ...metric.history.slice(-29),
            typeof newValue === "number" ? newValue : 0,
          ],
        });

        return {
          cpu: updateMetric(prevMetrics.cpu, system_metrics.cpu),
          memory: updateMetric(prevMetrics.memory, system_metrics.memory),
          network_up: updateMetric(
            prevMetrics.network_up,
            Number(Number(system_metrics.network_up).toFixed(2))
          ),
          network_down: updateMetric(
            prevMetrics.network_down,
            Number(Number(system_metrics.network_down).toFixed(2))
          ),
        };
      });

      // Update bot stats
      setStats((prevStats) => ({
        ...prevStats,
        activeThreads: stats.active_threads,
        totalProxies: stats.total_proxies,
        aliveProxies: stats.alive_proxies,
        request_count: stats.request_count,
      }));

      // Update bot status
      if (stats.status) {
        setBotStatus(stats.status);

        // Handle error states
        if (stats.status.state === "error" && isLoading) {
          setIsLoading(false);
          toast.error(stats.status.message);
        }
      }

      // Update isLoading based on bot state
      if (!stats.is_running && isLoading) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    // Fetch stats immediately and then every second
    const intervalId = setInterval(() => {
      fetchStats();
    }, 1000);

    // Initial fetch
    fetchStats();

    return () => {
      clearInterval(intervalId);
    };
  }, [isLoading]);

  useEffect(() => {
    // If profile loads and channel name is empty, set it ONLY ONCE
    if (
      profile?.user?.TwitchUsername &&
      !config.channelName &&
      !channelNameModified
    ) {
      setConfig((prev) => ({
        ...prev,
        channelName: profile.user.TwitchUsername,
      }));
    }
  }, [profile, channelNameModified, config.channelName]);

  useEffect(() => {
    const checkBotStatus = async () => {
      try {
        const stats = await getBotStats();
        if (stats.active_threads > 0 || stats.is_running) {
          setIsLoading(true);
          setStats((prevStats) => ({
            ...prevStats,
            activeThreads: stats.active_threads,
            totalProxies: stats.total_proxies,
            aliveProxies: stats.alive_proxies,
            request_count: stats.request_count,
          }));

          if (stats.config) {
            const { threads, timeout, proxy_type } = stats.config;
            const parsedTimeout = parseInt(timeout, 10);
            setConfig((prevConfig) => ({
              ...prevConfig,
              threads: threads ?? prevConfig.threads,
              timeout: Number.isNaN(parsedTimeout) ? 10000 : parsedTimeout,
              proxyType: proxy_type ?? prevConfig.proxyType,
              channelName: stats.channel_name || prevConfig.channelName,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to check bot status:", error);
      }
    };

    checkBotStatus();
  }, []);

  useEffect(() => {
    const checkBotStatusPeriodically = () => {
      if (
        botStatus.state.toLowerCase() !== "stopping" &&
        botStatus.state.toLowerCase() !== "starting"
      ) {
        fetchStats();
      }
    };

    const interval = setInterval(checkBotStatusPeriodically, 3000);
    return () => clearInterval(interval);
  }, [botStatus]);

  const handleStart = async () => {
    // Add protection to prevent starting during transitional states
    if (
      botStatus.state.toLowerCase() === "stopping" ||
      botStatus.state.toLowerCase() === "starting"
    ) {
      return;
    }

    if (!config.channelName) {
      toast.error("Channel name or url is required");
      return;
    } else if (config.threads === 0) {
      toast.error("Threads count must be greater than 0");
      return;
    }
    try {
      setIsLoading(true);
      await startBot({
        channelName: config.channelName,
        threads: config.threads,
        proxyFile: proxyFile || undefined,
        timeout: config.timeout,
        proxyType: config.proxyType,
        stabilityMode: config.stabilityMode, // Ensure stabilityMode is included
      });
      toast.success(
        "Bot started successfully!🚀 It may take a while before the viewers appear on the stream."
      );
    } catch (err) {
      toast.error(
        `Failed to start bot: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setIsLoading(false); // Reset loading on error
    }
  };

  const handleStop = async () => {
    // Add protection to prevent stopping during transitional states
    if (
      botStatus.state.toLowerCase() === "stopping" ||
      botStatus.state.toLowerCase() === "starting"
    ) {
      return;
    }

    try {
      setIsLoading(false); // Set loading to false immediately
      await stopBot();
      toast.success("Bot stopped successfully!");
      setStats((prevStats) => ({
        ...prevStats,
        activeThreads: 0,
        request_count: 0,
      }));
    } catch (err) {
      toast.error("Failed to stop bot");
      setIsLoading(true); // Revert loading state if stop fails
      console.error("Failed to stop bot:", err);
    }
  };

  const handleLogout = async () => {
    try {
      if (isLoading) {
        await stopBot();
        setIsLoading(false);
      }
      await logout();
      toast.success("Logged out successfully!");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  const handleChannelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelNameModified(true);
    setConfig((prev) => ({
      ...prev,
      channelName: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <Card className="relative text-center p-8 rounded-2xl border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
          <Button
            as="a"
            href="https://www.patreon.com/c/HIBO"
            target="_blank"
            rel="noopener noreferrer"
            variant="bordered"
            className="absolute left-4 top-4 bg-gradient-to-r from-green-500 to-lime-400 text-white border-none"
            startContent={<span className="text-lg">❤️</span>}
          >
            Support Me
          </Button>
          {profile && (
            <Button
              variant="bordered"
              onPress={handleLogout}
              className="absolute right-4 top-4"
              color="danger"
            >
              Logout
            </Button>
          )}
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
            Kick Viewer Bot
          </h1>
          <p className="text-xl font-medium">
            {profile
              ? `Welcome back, ${profile.user.username}`
              : "Monitor and control your viewer bot"}
          </p>
        </Card>

        {/* Monitoring Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-full border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
                Live Monitoring
              </h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="w-full transform hover:scale-[1.02] transition-all duration-300">
                  <ViewerStatCard value={currentViewers} />
                </div>
                <div className="w-full transform hover:scale-[1.02] transition-all duration-300">
                  <StatCard
                    title="Active Threads"
                    value={stats.activeThreads}
                    total={config.threads}
                  />
                </div>
                <div className="w-full transform hover:scale-[1.02] transition-all duration-300">
                  <StatCard
                    title="Proxies"
                    value={botStatus.proxy_count || stats.totalProxies}
                    total={botStatus.proxy_count || stats.totalProxies}
                  />
                </div>
                <div className="w-full transform hover:scale-[1.02] transition-all duration-300">
                  <StatCard title="Requests" value={stats.request_count} />
                </div>
              </div>
            </CardBody>
          </Card>

          <SystemMetrics metrics={systemMetrics} />
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
                Basic Configuration
              </h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <Input
                label="Channel Name or URL"
                value={config.channelName}
                placeholder={
                  profile?.user?.TwitchUsername || "Enter channel name or URL"
                }
                onChange={handleChannelNameChange}
              />
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  label="Number of Threads"
                  value={config.threads === 0 ? "" : config.threads.toString()}
                  min={0}
                  max={1000}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      threads:
                        e.target.value === ""
                          ? 0
                          : Math.min(1000, parseInt(e.target.value) || 0),
                    })
                  }
                />
                <Tooltip
                  content={
                    <div className="max-w-xs p-2">
                      <p>
                        Threads determine how many simultaneous connections the
                        bot will make.
                      </p>
                      <p className="mt-1">
                        More threads = more viewers, but requires more resources
                        and stable proxies.
                      </p>
                      <p className="mt-1">
                        Recommended: Start with 100-200 threads.
                      </p>
                    </div>
                  }
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-default-100 text-default-500 cursor-help">
                    ?
                  </div>
                </Tooltip>
              </div>
              <div>
                <Slider
                  value={[config.timeout]}
                  defaultValue={[10000]}
                  maxValue={20000}
                  onChange={(value) =>
                    setConfig({
                      ...config,
                      timeout: Number(Array.isArray(value) ? value[0] : value),
                    })
                  }
                  getValue={(timeout) => `${timeout}ms`}
                  label="Request Timeout"
                  step={100}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium block">
                    Proxy List (Optional)
                  </label>
                  <Tooltip
                    content={
                      <div className="max-w-xs p-2">
                        <p className="font-medium mb-1">
                          Supported proxy formats:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>IP:PORT</li>
                          <li>http://IP:PORT</li>
                          <li>socks4://IP:PORT</li>
                          <li>socks5://IP:PORT</li>
                          <li>USERNAME:PASSWORD@IP:PORT</li>
                        </ul>
                        <p className="mt-2 text-xs">
                          One proxy per line in your text file
                        </p>
                      </div>
                    }
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-default-100 text-default-500 cursor-help text-xs">
                      ?
                    </div>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Button
                    as="label"
                    className="w-full h-[40px] flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-600 hover:to-lime-500 text-white rounded-lg cursor-pointer transition-all duration-300 group"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span className="text-sm">
                      {proxyFile
                        ? proxyFile.name
                        : "Choose proxy file (Optional)"}
                    </span>
                    <Input
                      type="file"
                      accept=".txt"
                      onChange={(e) =>
                        setProxyFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  If no proxy file is uploaded, the bot will automatically fetch
                  fresh proxies from our servers. You can also upload your own
                  .txt file with proxies (one per line) for better performance
                  and control.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
                Advanced Settings
              </h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="relative">
                <Input
                  label="Game Name"
                  value={config.gameName}
                  onChange={(e) =>
                    setConfig({ ...config, gameName: e.target.value })
                  }
                  isDisabled={true}
                />
                <span className="absolute right-0 top-0 bg-gradient-to-r from-green-500 to-lime-400 text-white text-xs px-2 py-1 rounded">
                  Coming Soon Premium Feature
                </span>
              </div>
              <div className="relative">
                <Slider
                  value={[1]}
                  defaultValue={[1]}
                  maxValue={60}
                  isDisabled={true}
                  label="Messages Per Minute"
                  getValue={(value) => `${value} messages`}
                  step={1}
                />
                <span className="absolute right-0 top-0 bg-gradient-to-r from-green-500 to-lime-400 text-white text-xs px-2 py-1 rounded">
                  Coming Soon Premium Feature
                </span>
              </div>

              <div className="relative">
                <Checkbox checked={false} isDisabled={true}>
                  <span className="text-gray-400">Enable Chat Messages</span>
                </Checkbox>
                <span className="absolute right-0 top-0 bg-gradient-to-r from-green-500 to-lime-400 text-white text-xs px-2 py-1 rounded">
                  Coming Soon Premium Feature
                </span>
              </div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Stability Mode</label>
                  <Tooltip
                    content={
                      <div className="max-w-xs p-2">
                        <p>
                          Stability mode helps maintain a consistent viewer
                          count over time. Instead of experiencing large
                          fluctuations, such as dropping from 125 viewers to 25
                          viewers, stability mode aims to keep the viewer count
                          within a more stable range. This is particularly
                          useful for long streaming sessions, ensuring that the
                          viewer count remains steady. For example, if you have
                          an average of 40 viewers, stability mode might keep
                          the count between 30 and 50 viewers.
                        </p>
                      </div>
                    }
                    placement="right"
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-default-100 text-default-500 cursor-help text-xs">
                      ?
                    </div>
                  </Tooltip>
                </div>
                <ButtonGroup>
                  <Button
                    variant={config.stabilityMode ? "solid" : "bordered"}
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        stabilityMode: true,
                      }))
                    }
                    disabled={unactivated}
                  >
                    On
                  </Button>
                  <Button
                    variant={!config.stabilityMode ? "solid" : "bordered"}
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        stabilityMode: false,
                      }))
                    }
                    disabled={unactivated}
                  >
                    Off
                  </Button>
                </ButtonGroup>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Proxy Type
                </label>
                <ButtonGroup>
                  {["http", "socks4", "socks5", "all"].map((type) => (
                    <Button
                      key={type}
                      variant={config.proxyType === type ? "solid" : "bordered"}
                      onPress={() => setConfig({ ...config, proxyType: type })}
                      disabled={unactivated}
                    >
                      {type}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Status Banner with new styling */}
        <div className="transform hover:scale-[1.02] transition-transform duration-300">
          <StatusBanner status={botStatus} />
        </div>

        <Button
          variant="solid"
          color={isLoading ? "danger" : "primary"}
          size="lg"
          fullWidth
          onPress={isLoading ? handleStop : handleStart}
          isDisabled={
            botStatus.state.toLowerCase() === "stopping" ||
            botStatus.state.toLowerCase() === "starting" ||
            unactivated
          }
          className={`relative group overflow-hidden ${
            botStatus.state.toLowerCase() === "stopping" ||
            botStatus.state.toLowerCase() === "starting"
              ? "opacity-50 cursor-not-allowed pointer-events-none"
              : ""
          }`}
        >
          <span className="relative z-10">
            {botStatus.state.toLowerCase() === "stopping"
              ? "Stopping"
              : botStatus.state.toLowerCase() === "starting"
              ? "Starting"
              : isLoading
              ? "Stop Bot"
              : "Start Bot"}
            {(botStatus.state.toLowerCase() === "stopping" ||
              botStatus.state.toLowerCase() === "starting") &&
              " (Please wait...)"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-lime-400/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
        </Button>
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
