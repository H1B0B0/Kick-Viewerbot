"use client";
import { useState, useEffect, useRef } from "react";
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
import { useWebSocketBot } from "@/hooks/useWebSocketBot";
import { WebSocketStatus } from "@/components/WebSocketStatus";
import { SystemMetrics } from "../components/SystemMetrics";
import { StatusBanner } from "../components/StatusBanner";
import { animate, stagger, createTimeline } from "animejs";
import { MotionCard } from "../components/MotionCard";

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

  // Hook WebSocket
  const {
    isConnected: wsConnected,
    status: wsStatus,
    error: wsError,
    currentUrl: wsUrl,
    stats: wsStats,
    isRunning: wsBotRunning,
    startBot: wsStartBot,
    stopBot: wsStopBot,
    reconnect: wsReconnect,
  } = useWebSocketBot();

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

  // DEBUG: Removed test animation that was causing the red square

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

  const animatedContainerRef = useRef<HTMLDivElement | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const statsCardsRef = useRef<HTMLDivElement | null>(null);
  const inputsRef = useRef<HTMLDivElement[]>([]);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Animate title with SVG path drawing effect
  useEffect(() => {
    if (!isMounted || !titleRef.current) return;

    const titleText = titleRef.current.textContent || "";
    if (!titleText) return;

    // Create SVG text with proper centering like before
    titleRef.current.innerHTML = `
      <svg viewBox="0 0 800 100" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#34d399;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#a3e635;stop-opacity:1" />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="70"
          font-size="56"
          font-weight="900"
          text-anchor="middle"
          fill="none"
          stroke="url(#titleGradient)"
          stroke-width="2"
          class="title-text"
          style="font-family: system-ui, -apple-system, sans-serif; stroke-linecap: round; stroke-linejoin: round;"
        >${titleText}</text>
      </svg>
    `;

    const textElement = titleRef.current.querySelector(".title-text");

    if (!textElement) {
      console.warn("SVG text element not found");
      titleRef.current.innerHTML = titleText;
      return;
    }

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        // Calculate approximate stroke length based on text
        // Each character is roughly 30-40 units in the font used
        const textLength = titleText.length * 40;

        // Set up stroke dasharray and offset for drawing animation
        (textElement as SVGTextElement).style.strokeDasharray = `${textLength}`;
        (
          textElement as SVGTextElement
        ).style.strokeDashoffset = `${textLength}`;

        // Animate stroke drawing
        animate(textElement, {
          strokeDashoffset: [textLength, 0],
          duration: 4000,
          ease: "linear",
          loop: true,
        });
      } catch (e) {
        console.error("❌ SVG animation failed:", e);
        // Fallback: show text with stroke
        if (titleRef.current) {
          titleRef.current.innerHTML = `<span style="-webkit-text-stroke: 2px #10b981; -webkit-text-fill-color: transparent; font-size: 3rem; font-weight: 900;">${titleText}</span>`;
        }
      }
    }, 500);
  }, [isMounted]);

  // Animate individual stat cards inside the monitoring section
  useEffect(() => {
    if (!isMounted || !statsCardsRef.current) return;

    // Add delay to ensure cards are fully rendered after MotionCard
    const timer = setTimeout(() => {
      if (!statsCardsRef.current) return;

      const statCards =
        statsCardsRef.current.querySelectorAll(".stat-card-item");
      if (statCards.length === 0) {
        console.warn("No stat cards found for animation");
        return;
      }

      try {
        // Animate with stagger
        animate(statCards, {
          translateY: [40, 0],
          opacity: [0, 1],
          scale: [0.9, 1],
          duration: 600,
          delay: stagger(100, { start: 400 }), // Start after MotionCard animation
          ease: "outQuad",
        });
      } catch (e) {
        console.warn("Stat cards animation failed:", e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isMounted]); // Only animate on mount

  // Animate configuration inputs with creative slide and fade
  useEffect(() => {
    if (!isMounted || !animatedContainerRef.current) return;

    // Wait a bit for DOM to be fully ready
    const timer = setTimeout(() => {
      if (!animatedContainerRef.current) return;

      const configInputs =
        animatedContainerRef.current.querySelectorAll(".config-input");

      if (configInputs.length === 0) {
        console.warn("No config inputs found");
        return;
      }

      try {
        // Set initial state with alternating directions
        configInputs.forEach((input, index) => {
          (input as HTMLElement).style.opacity = "0";
          const direction = index % 2 === 0 ? -40 : 40;
          (
            input as HTMLElement
          ).style.transform = `translateX(${direction}px) scale(0.9)`;
        });

        // Animate with alternating directions
        setTimeout(() => {
          animate(configInputs, {
            opacity: [0, 1],
            translateX: [(_: any, i: number) => (i % 2 === 0 ? -40 : 40), 0],
            scale: [0.9, 1],
            duration: 700,
            delay: (_: any, i: number) => {
              const delayAttr = (configInputs[i] as HTMLElement).getAttribute(
                "data-delay"
              );
              return delayAttr ? parseInt(delayAttr) : i * 60;
            },
            ease: "outBack(1.7)",
          });
        }, 100);
      } catch (e) {
        console.warn("Config inputs animation failed:", e);
        // Fallback
        configInputs.forEach((input) => {
          (input as HTMLElement).style.opacity = "1";
          (input as HTMLElement).style.transform = "translateX(0) scale(1)";
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isMounted]);

  // Creative entrance animations for main sections
  useEffect(() => {
    if (!isMounted || !animatedContainerRef.current) return;
    const cards =
      animatedContainerRef.current.querySelectorAll(".anim-section");
    if (cards.length === 0) return;

    try {
      // Set initial state with perspective
      cards.forEach((card, index) => {
        (card as HTMLElement).style.opacity = "0";
        (card as HTMLElement).style.transformOrigin = "center bottom";
        (card as HTMLElement).style.transform = `perspective(1000px) rotateY(${
          index % 2 === 0 ? -15 : 15
        }deg) translateY(50px)`;
      });

      // Animate with 3D rotation
      setTimeout(() => {
        animate(cards, {
          opacity: [0, 1],
          translateY: [50, 0],
          rotateY: [(_: any, i: number) => (i % 2 === 0 ? -15 : 15), 0],
          duration: 900,
          delay: stagger(120, { start: 300 }),
          ease: "outExpo",
        });
      }, 50);
    } catch (e) {
      console.warn("Animation initialization failed:", e);
      // Fallback
      cards.forEach((card) => {
        (card as HTMLElement).style.opacity = "1";
        (card as HTMLElement).style.transform = "translateY(0) rotateY(0)";
      });
    }
  }, [isMounted]);

  // Button animations removed for cleaner UX

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

  // Sync WebSocket stats avec les stats locales
  useEffect(() => {
    if (!wsStats) return;

    const system_metrics = wsStats.system_metrics || {
      cpu: 0,
      memory: 0,
      network_up: 0,
      network_down: 0,
    };

    // Update system metrics
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
      activeThreads: wsStats.active_threads || 0,
      totalProxies: wsStats.total_proxies || 0,
      aliveProxies: wsStats.alive_proxies || 0,
      request_count: wsStats.request_count || 0,
    }));

    // Update bot status
    if (wsStats.status) {
      setBotStatus(wsStats.status);
    }

    // Update isLoading based on bot state
    setIsLoading(wsStats.is_running || false);
  }, [wsStats]);

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

  // Sync config from WebSocket stats ONLY on first load
  useEffect(() => {
    if (wsStats && wsStats.config && wsStats.is_running) {
      const { threads, timeout, proxy_type } = wsStats.config;
      const parsedTimeout = parseInt(timeout, 10);
      setConfig((prevConfig) => ({
        ...prevConfig,
        threads: threads ?? prevConfig.threads,
        timeout: Number.isNaN(parsedTimeout) ? 10000 : parsedTimeout,
        proxyType: proxy_type ?? prevConfig.proxyType,
        channelName: wsStats.channel_name || prevConfig.channelName,
      }));
    }
  }, [wsStats?.is_running]); // Ne sync que quand le bot change d'état

  const handleStart = async () => {
    // Check WebSocket connection
    if (!wsConnected) {
      toast.error("Service local non connecté");
      return;
    }

    // Prevent starting during transitional states
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
      await wsStartBot({
        channelName: config.channelName,
        threads: config.threads,
        proxyFile: proxyFile || undefined,
        timeout: config.timeout,
        proxyType: config.proxyType,
        stabilityMode: config.stabilityMode,
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
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!wsConnected) {
      toast.error("Service local non connecté");
      return;
    }

    if (
      botStatus.state.toLowerCase() === "stopping" ||
      botStatus.state.toLowerCase() === "starting"
    ) {
      return;
    }
    try {
      wsStopBot();
      toast.success("Bot stopped successfully!");
      setIsLoading(false);
      setStats((prevStats) => ({
        ...prevStats,
        activeThreads: 0,
        request_count: 0,
      }));
    } catch (err) {
      toast.error("Failed to stop bot");
      console.error("Failed to stop bot:", err);
    }
  };

  const handleLogout = async () => {
    try {
      if (isLoading && wsConnected) {
        wsStopBot();
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
    <div className="min-h-screen p-4 md:p-6 lg:p-8" ref={animatedContainerRef}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <MotionCard
          index={0}
          className="relative text-center p-8 rounded-2xl border-none bg-background/90 backdrop-blur-xl shadow-xl"
        >
          <Button
            as="a"
            href="https://www.patreon.com/c/HIBO"
            target="_blank"
            rel="noopener noreferrer"
            variant="bordered"
            className="absolute left-4 top-4 bg-gradient-to-r from-green-500 to-lime-400 text-white border-none hover:scale-105 transition-transform"
            startContent={<span className="text-lg">❤️</span>}
          >
            Support Me
          </Button>
          {profile && (
            <Button
              variant="bordered"
              onPress={handleLogout}
              className="absolute right-4 top-4 hover:scale-105 transition-transform"
              color="danger"
            >
              Logout
            </Button>
          )}
          <h1
            ref={titleRef}
            className="text-5xl font-black mb-3 bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent"
          >
            Kick Viewer Bot
          </h1>
          <p className="text-xl font-medium">
            {profile
              ? `Welcome back, ${profile.user.username}`
              : "Monitor and control your viewer bot"}
          </p>
          <div className="mt-4">
            <WebSocketStatus
              status={wsStatus}
              currentUrl={wsUrl}
              onRetry={wsReconnect}
            />
          </div>
        </MotionCard>

        {/* Monitoring Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotionCard
            index={1}
            className="h-full border-none bg-background/90 backdrop-blur-xl shadow-xl"
          >
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
                Live Monitoring
              </h2>
            </CardHeader>
            <CardBody>
              <div
                ref={statsCardsRef}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full"
              >
                <div className="w-full stat-card-item">
                  <ViewerStatCard value={currentViewers} />
                </div>
                <div className="w-full stat-card-item">
                  <StatCard
                    title="Active Threads"
                    value={stats.activeThreads}
                    total={config.threads}
                  />
                </div>
                <div className="w-full stat-card-item">
                  <StatCard
                    title="Proxies"
                    value={botStatus.proxy_count || stats.totalProxies}
                    total={botStatus.proxy_count || stats.totalProxies}
                  />
                </div>
                <div className="w-full stat-card-item">
                  <StatCard title="Requests" value={stats.request_count} />
                </div>
              </div>
            </CardBody>
          </MotionCard>

          <MotionCard index={2} disableHoverTilt={true} className="border-none">
            <SystemMetrics metrics={systemMetrics} />
          </MotionCard>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotionCard
            index={3}
            className="border-none bg-background/90 backdrop-blur-xl shadow-xl"
          >
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent animate-gradient-x">
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
                className="config-input"
                data-delay="0"
              />
              <div
                className="flex items-center space-x-2 config-input"
                data-delay="100"
              >
                <Input
                  type="number"
                  label="Number of Threads"
                  value={config.threads === 0 ? "" : config.threads.toString()}
                  min={0}
                  max={10000}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      threads:
                        e.target.value === ""
                          ? 0
                          : Math.min(10000, parseInt(e.target.value) || 0),
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
              <div className="config-input" data-delay="200">
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
              <div className="space-y-2 config-input" data-delay="300">
                <div className="flex items-center gap-2 mb-2">
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
          </MotionCard>

          <MotionCard
            index={4}
            className="border-none bg-background/90 backdrop-blur-xl shadow-xl "
          >
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent animate-gradient-x">
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
          </MotionCard>
        </div>

        {/* Status Banner with new styling */}
        <div className="transform hover:scale-[1.02] transition-transform duration-300">
          <StatusBanner status={botStatus} />
        </div>
        {/* Information Panel */}
        <MotionCard
          index={5}
          className="border-none bg-background/90 backdrop-blur-xl shadow-xl gradient-border"
        >
          <CardBody className="text-center">
            <p className="text-lg font-medium bg-gradient-to-r from-blue-500 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Please note that it may take some time for the viewers to appear
              on your live stream. This is normal, so please be patient.
            </p>
          </CardBody>
        </MotionCard>

        <Button
          ref={actionButtonRef}
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
