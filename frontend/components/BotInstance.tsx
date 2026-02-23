"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Tabs, Tab } from "@heroui/tabs";
import { Slider } from "@heroui/slider";
import { Tooltip } from "@heroui/tooltip";
import { toast } from "react-toastify";
import { StatCard } from "./StatCard";
import { ViewerStatCard } from "./ViewerStatCard";
import { useWebSocketBot } from "@/hooks/useWebSocketBot";
import { WebSocketStatus } from "@/components/WebSocketStatus";
import { SystemMetrics } from "./SystemMetrics";
import { StatusBanner } from "./StatusBanner";
import { MotionCard } from "./MotionCard";
import { useViewerCount } from "@/hooks/useViewerCount";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { LuActivity, LuRefreshCw } from "react-icons/lu";
import { FiHelpCircle } from "react-icons/fi";
import { cn } from "@/utils/cn";

interface BotInstanceProps {
    id: string;
    name: string;
    url: string;
    onRemove?: () => void;
    isStabilityLocked?: boolean;
}

export function BotInstance({ id, name, url, onRemove, isStabilityLocked }: BotInstanceProps) {
    // Hook WebSocket spécifique à cette URL
    const {
        wsConnected,
        status: wsStatus,
        error: wsError,
        stats: wsStats,
        isRunning: wsBotRunning,
        startBot: wsStartBot,
        stopBot: wsStopBot,
        isChatRunning: wsChatRunning,
        startKickChat: wsStartKickChat,
        stopKickChat: wsStopKickChat,
        reconnect: wsReconnect,
    } = useWebSocketBot(url);

    const [config, setConfig] = useState({
        threads: 0,
        channelName: "",
        gameName: "",
        messagesPerMinute: 1,
        enableChat: false,
        proxyType: "all",
        timeout: 10000,
        stabilityMode: false,
        chatAuthToken: "",
    });

    const [chatTokens, setChatTokens] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [proxyFile, setProxyFile] = useState<File | null>(null);
    const [proxyCount, setProxyCount] = useState(0);
    const hasSyncedRef = useRef(false);

    const { viewerCount: currentViewers } = useViewerCount(config?.channelName);

    const handleStart = async () => {
        if (!wsConnected) {
            toast.error("Not connected to this backend helper.");
            return;
        }

        if (!config.channelName) {
            toast.error("Channel name is required");
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

            if (config.enableChat) {
                // Combine custom uploaded tokens with the single input token if present
                const allTokens = [...chatTokens];
                if (config.chatAuthToken && !allTokens.includes(config.chatAuthToken)) {
                    allTokens.push(config.chatAuthToken);
                }

                wsStartKickChat(
                    config.channelName,
                    allTokens.length > 0 ? allTokens : undefined,
                    0.2,
                    60 / config.messagesPerMinute
                );
            }

            toast.success(`${name}: Bot started successfully!`);
            setIsLoading(false);
        } catch (err) {
            toast.error(`${name}: Failed to start bot`);
            setIsLoading(false);
        }
    };

    const handleStop = async () => {
        try {
            wsStopBot();
            if (wsChatRunning) {
                wsStopKickChat();
            }
            toast.success(`${name}: Bot stopped successfully!`);
            setIsLoading(false);
        } catch (err) {
            toast.error(`${name}: Failed to stop bot`);
            setIsLoading(false);
        }
    };

    const handleAccountUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const tokens: string[] = [];
            const tokenRegex = /acc token-\s*([^\s\r\n]+)/g;
            let match;
            while ((match = tokenRegex.exec(content)) !== null) {
                tokens.push(match[1]);
            }

            if (tokens.length > 0) {
                setChatTokens(tokens);
                toast.success(`${tokens.length} accounts loaded!`);
            } else {
                toast.error("No valid account tokens found in file");
            }
        };
        reader.readAsText(file);
    };

    const handleProxyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setProxyFile(null);
            setProxyCount(0);
            return;
        }
        setProxyFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            setProxyCount(lines.length);
            toast.success(`${lines.length} proxies loaded!`);
        };
        reader.readAsText(file);
    };

    // Synchroniser config avec stats uniquement au début ou si le bot tourne
    useEffect(() => {
        if (wsStats?.config && !isLoading) {
            // On ne synchronise que si le bot tourne OU si c'est le tout premier chargement
            if (wsBotRunning || !hasSyncedRef.current) {
                setConfig(prev => ({
                    ...prev,
                    channelName: wsStats.config.channel_name || prev.channelName,
                    threads: wsStats.config.threads || prev.threads,
                    stabilityMode: wsStats.config.stability_mode || prev.stabilityMode,
                }));
                hasSyncedRef.current = true;
            }
        }
    }, [wsStats, isLoading, wsBotRunning]);

    return (
        <Card isBlurred shadow="sm" className="space-y-8 p-10 border-none anim-section overflow-visible">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h3 className="text-3xl font-black tracking-tighter">{name}</h3>
                    <p className="text-[10px] text-default-400 font-bold tracking-[0.4em] uppercase opacity-70 font-mono">{url}</p>
                </div>
                <div className="flex items-center gap-4">
                    <WebSocketStatus status={wsStatus} onRetry={wsReconnect} />
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => wsReconnect()}
                        className="bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
                        title="Force Reconnect WS"
                    >
                        <LuRefreshCw className={cn("w-4 h-4", wsStatus === 'connecting' && "animate-spin")} />
                    </Button>
                    {onRemove && (
                        <Button
                            size="sm"
                            variant="light"
                            onPress={onRemove}
                            color="danger"
                            className="font-bold"
                        >
                            Decommission Node
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Threads"
                    value={wsStats?.active_threads || 0}
                    total={wsStats?.config?.threads}
                />
                <ViewerStatCard
                    value={currentViewers}
                />
                <StatCard
                    title="Proxies"
                    value={wsStats?.alive_proxies || 0}
                    total={wsStats?.total_proxies}
                />
                <StatCard
                    title={wsStats?.config?.stability_mode ? "Active Connections" : "Requests"}
                    value={wsStats?.request_count || 0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MotionCard index={0} className="border-none bg-default-50/50">
                    <CardHeader className="pb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            Configuration
                        </h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <Input
                            label="Target Channel"
                            placeholder="e.g. xqc"
                            value={config.channelName}
                            onChange={(e) => setConfig({ ...config, channelName: e.target.value })}
                            variant="flat"
                            radius="lg"
                            classNames={{
                                label: "text-[10px] font-black uppercase tracking-[0.2em] text-default-500",
                            }}
                        />

                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-default-500">Proxy Configuration</p>
                            <Tooltip content="Format: IP:PORT or IP:PORT:USER:PASS (one per line)">
                                <FiHelpCircle className="w-3.5 h-3.5 text-default-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id={`proxy-upload-${id}`}
                                className="hidden"
                                onChange={handleProxyUpload}
                                accept=".txt"
                            />
                            <Button
                                as="label"
                                htmlFor={`proxy-upload-${id}`}
                                variant="flat"
                                color={proxyCount > 0 ? "success" : "default"}
                                className="font-bold flex-1 cursor-pointer"
                                size="sm"
                            >
                                {proxyCount > 0 ? `${proxyCount} Proxies Loaded` : "Upload Proxy List (.txt)"}
                            </Button>
                            {proxyCount > 0 && (
                                <Button
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onPress={() => {
                                        setProxyFile(null);
                                        setProxyCount(0);
                                    }}
                                    isIconOnly
                                >
                                    ✕
                                </Button>
                            )}
                        </div>

                        <Slider
                            label="Deployment Strength"
                            value={[config.threads]}
                            onChange={(v) => setConfig({ ...config, threads: Number(Array.isArray(v) ? v[0] : v) })}
                            minValue={1}
                            maxValue={1000}
                            step={1}
                            color="success"
                            classNames={{
                                label: "text-[10px] font-black uppercase tracking-[0.2em] text-default-500",
                                value: "font-black"
                            }}
                        />
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium">Proxy Type</p>
                                <Tabs
                                    fullWidth
                                    aria-label="Proxy Type"
                                    selectedKey={config.proxyType}
                                    onSelectionChange={(key) => setConfig({ ...config, proxyType: key as string })}
                                    variant="solid"
                                    radius="lg"
                                >
                                    <Tab key="http" title="HTTP" />
                                    <Tab key="socks4" title="SOCKS4" />
                                    <Tab key="socks5" title="SOCKS5" />
                                    <Tab key="all" title="ALL" />
                                </Tabs>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    isSelected={config.stabilityMode}
                                    onValueChange={(selected) => setConfig({ ...config, stabilityMode: !!selected })}
                                    isDisabled={isStabilityLocked}
                                >
                                    <span className="font-medium">Stability Mode</span>
                                </Checkbox>
                                {isStabilityLocked && (
                                    <Tooltip content="Requires an active subscription">
                                        <div className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] text-amber-500 font-black tracking-tighter uppercase cursor-help">PRO</div>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </MotionCard>

                <MotionCard index={1} className="border-none bg-default-50/50">
                    <CardHeader className="pb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            AI Chat Bot
                        </h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <div className="flex items-center justify-between min-h-[40px]">
                            <Checkbox
                                isSelected={config.enableChat}
                                onValueChange={(selected) => {
                                    if (isStabilityLocked) {
                                        toast.info("AI Chat feature requires a Patreon subscription or Dev Mode.");
                                        return;
                                    }
                                    setConfig({ ...config, enableChat: !!selected });
                                }}
                                isDisabled={isStabilityLocked}
                                classNames={{
                                    label: "text-sm font-medium",
                                }}
                            >
                                <span className={isStabilityLocked ? "text-default-400" : ""}>
                                    Enable AI Interactions
                                </span>
                            </Checkbox>
                            {isStabilityLocked && (
                                <Tooltip content="Requires a Patreon subscription">
                                    <div className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] text-amber-500 font-black tracking-tighter uppercase cursor-help">PRO / PATREON</div>
                                </Tooltip>
                            )}
                        </div>
                        {config.enableChat && !isStabilityLocked && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <Slider
                                    label="Messages Per Minute"
                                    value={[config.messagesPerMinute]}
                                    onChange={(v) => setConfig({ ...config, messagesPerMinute: Number(Array.isArray(v) ? v[0] : v) })}
                                    minValue={1}
                                    maxValue={60}
                                    step={1}
                                    color="primary"
                                />

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black text-default-400 uppercase tracking-widest">Multi-Account Upload</p>
                                        <Tooltip content="Syntax: acc token- YOUR_TOKEN (one per line)">
                                            <FiHelpCircle className="w-4 h-4 text-default-500 cursor-help" />
                                        </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            id={`acc-upload-${id}`}
                                            className="hidden"
                                            onChange={handleAccountUpload}
                                            accept=".txt"
                                        />
                                        <Button
                                            as="label"
                                            htmlFor={`acc-upload-${id}`}
                                            variant="flat"
                                            color={chatTokens.length > 0 ? "success" : "default"}
                                            className="font-bold flex-1 cursor-pointer"
                                            size="sm"
                                        >
                                            {chatTokens.length > 0 ? `${chatTokens.length} Accounts Loaded` : "Upload Accounts File"}
                                        </Button>
                                        {chatTokens.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="light"
                                                color="danger"
                                                onPress={() => setChatTokens([])}
                                                isIconOnly
                                            >
                                                ✕
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-default-400">Upload .txt with format: acc token- TOKEN</p>
                                </div>

                                <div className="relative pt-2">
                                    <div className="absolute inset-x-0 top-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-divider"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-default-400 font-bold tracking-widest">OR SINGLE TOKEN</span>
                                    </div>
                                </div>

                                <Input
                                    label="Manual Auth Token"
                                    type="password"
                                    value={config.chatAuthToken}
                                    onChange={(e) => setConfig({ ...config, chatAuthToken: e.target.value })}
                                    placeholder="Enter kick_session cookie"
                                    size="sm"
                                    variant="flat"
                                />
                            </div>
                        )}
                    </CardBody>
                </MotionCard>
            </div>

            <Button
                variant="solid"
                color={wsBotRunning || isLoading ? "danger" : "primary"}
                fullWidth
                size="lg"
                onPress={wsBotRunning || isLoading ? handleStop : handleStart}
                className="h-14 rounded-2xl font-black text-xl shadow-lg"
                isDisabled={wsStats?.status?.state === 'stopping'}
                isLoading={isLoading || wsStats?.status?.state === 'stopping'}
            >
                {wsStats?.status?.state === 'stopping'
                    ? "STOPPING BOT..."
                    : (wsBotRunning || isLoading ? "STOP BOT INSTANCE" : "START BOT INSTANCE")}
            </Button>

            {wsStats?.system_metrics && (
                <div className="pt-6 border-t border-divider">
                    {url.includes("localhost") || url.includes("127.0.0.1") ? (
                        <div className="flex justify-center">
                            <Popover placement="top" showArrow backdrop="opaque">
                                <PopoverTrigger>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        color="default"
                                        className="text-[10px] font-black tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity"
                                        startContent={<LuActivity className="w-3 h-3" />}
                                    >
                                        Show Node Performance
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-4 text-foreground">
                                    <div className="space-y-4 w-full">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-1 h-3 bg-primary rounded-full"></span>
                                            <h4 className="text-[10px] font-black text-default-500 uppercase tracking-widest">Localhost Metrics</h4>
                                        </div>
                                        <SystemMetrics metrics={{
                                            cpu: { label: "CPU", value: wsStats.system_metrics.cpu, color: "primary", unit: "%", history: [], maxValue: 100 },
                                            memory: { label: "RAM", value: wsStats.system_metrics.memory, color: "primary", unit: "%", history: [], maxValue: 100 },
                                            network_up: { label: "UP", value: wsStats.system_metrics.network_up, color: "success", unit: "MB/s", history: [], maxValue: 100 },
                                            network_down: { label: "DOWN", value: wsStats.system_metrics.network_down, color: "success", unit: "MB/s", history: [], maxValue: 100 },
                                        }} />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                <h4 className="text-xs font-black text-default-500 uppercase tracking-widest">Helper Node Performance</h4>
                            </div>
                            <SystemMetrics metrics={{
                                cpu: { label: "CPU", value: wsStats.system_metrics.cpu, color: "primary", unit: "%", history: [], maxValue: 100 },
                                memory: { label: "RAM", value: wsStats.system_metrics.memory, color: "primary", unit: "%", history: [], maxValue: 100 },
                                network_up: { label: "UP", value: wsStats.system_metrics.network_up, color: "success", unit: "MB/s", history: [], maxValue: 100 },
                                network_down: { label: "DOWN", value: wsStats.system_metrics.network_down, color: "success", unit: "MB/s", history: [], maxValue: 100 },
                            }} />
                        </div>
                    )}
                </div>
            )}

            <StatusBanner status={{
                state: wsStatus,
                message: (typeof wsError === 'string' ? wsError : (wsError as any)?.message || JSON.stringify(wsError)) || (wsConnected ? "System operational" : "Connection lost"),
                proxy_loading_progress: wsStats?.status?.proxy_loading_progress || 0,
                startup_progress: wsStats?.status?.startup_progress || 0
            }} />
        </Card>
    );
}
