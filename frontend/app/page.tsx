"use client";
import { useState, useEffect, useRef } from "react";
import { CardHeader, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGetProfile, logout, useGetSubscription } from "./functions/UserAPI";
import { BotInstance } from "../components/BotInstance";
import { MotionCard } from "../components/MotionCard";
import { PatreonLinkButton } from "@/components/PatreonLinkButton";
import WebSocketService from "../services/WebSocketService";

interface Instance {
  id: string;
  name: string;
  url: string;
}

export default function ViewerBotInterface() {
  const { data: profile } = useGetProfile();
  const { data: subscription } = useGetSubscription();
  const [isMounted, setIsMounted] = useState(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  // Instances management
  const [instances, setInstances] = useState<Instance[]>([]);
  const [newUrl, setNewUrl] = useState("http://localhost:8765");
  const [newName, setNewName] = useState("Helper Instance");
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);

  // Load instances from localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("kick_viewer_bot_instances");
    if (saved) {
      try {
        setInstances(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse instances", e);
      }
    } else {
      // Default instance
      setInstances([{ id: "default", name: "Default Helper", url: "http://localhost:8765" }]);
    }
  }, []);

  // Save instances to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("kick_viewer_bot_instances", JSON.stringify(instances));
    }
  }, [instances, isMounted]);


  const addInstance = (url?: string, name?: string) => {
    // Tier Limit Check
    if (!hasActiveSubscription && instances.length >= 1) {
      toast.error("Non-subscriber limit reached: Maximum 1 helper instance allowed.");
      return;
    }

    const targetUrl = url || newUrl;
    const targetName = name || newName;

    if (!targetUrl || !targetName) {
      toast.error("Name and URL are required");
      return;
    }

    // Check if URL already exists
    if (instances.some(i => i.url === targetUrl)) {
      toast.warn("This helper is already added");
      return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    setInstances([...instances, { id, name: targetName, url: targetUrl }]);

    // Clear discovery if added from there
    if (url) {
      setDiscoveredUrls(prev => prev.filter(u => u !== url));
    }

    setNewName(`Helper ${instances.length + 2}`);
    toast.success("Instance added!");
  };

  const removeInstance = (id: string) => {
    setInstances(instances.filter((i) => i.id !== id));
    toast.info("Instance removed");
  };

  const handleScan = async () => {
    setIsScanning(true);
    setDiscoveredUrls([]);
    try {
      toast.info("Scanning for active helpers...");
      const activeUrls = await WebSocketService.discover();

      // Deduplicate: If multiple URLs point to the same port on localhost/127.0.0.1, keep only one
      const uniquePorts = new Set();
      const dedupedUrls = activeUrls.filter(url => {
        try {
          const u = new URL(url);
          const port = u.port || "80";
          if (uniquePorts.has(port)) return false;
          uniquePorts.add(port);
          return true;
        } catch {
          return true;
        }
      });

      // Filter out already added instances
      const addedUrls = instances.map(i => i.url);
      const newDiscovered = dedupedUrls.filter(url => !addedUrls.includes(url));

      setDiscoveredUrls(newDiscovered);

      if (newDiscovered.length > 0) {
        toast.success(`Found ${newDiscovered.length} active helpers!`);
      } else if (activeUrls.length > 0) {
        toast.info("Active helpers found, but they are already in your list.");
      } else {
        toast.warn("No active helpers found on common ports.");
      }
    } catch (err) {
      toast.error("Discovery failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully!");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  // Title Animation Logic
  useEffect(() => {
    if (!isMounted || !titleRef.current) return;
    const titleText = "KICKVIEWERBOT";
    titleRef.current.innerHTML = `
      <svg viewBox="0 0 1200 160" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; overflow: visible;">
      <defs>
        <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="50%" stop-color="#22c55e" />
        <stop offset="100%" stop-color="#a3e635" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" font-size="88" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="url(#titleGradient)" style={{ fontFamily: 'system-ui', letterSpacing: '-0.015em' }}>${titleText}</text>
      </svg>
    `;
  }, [isMounted]);

  const isDevMode = process.env.NODE_ENV === "development";
  const hasActiveSubscription = isDevMode || subscription?.isSubscribed || profile?.user?.subscription !== "none";
  const isStabilityLocked = !hasActiveSubscription;

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <MotionCard index={0} isBlurred shadow="sm" className="relative p-8 md:p-12 rounded-[2.5rem] border-none">
        <div className="flex flex-col items-center gap-6">
          <PatreonLinkButton />
          <div className="text-center space-y-4">
            <h1
              ref={titleRef}
              className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter"
            >
              KICKVIEWERBOT
            </h1>
            <p className="text-sm md:text-base font-bold text-default-500 max-w-2xl mx-auto uppercase tracking-[0.4em] opacity-60">
              {profile ? `Dashboard • ${profile.user.username}` : "Advanced Multi-Instance Bot Controller"}
            </p>
          </div>
        </div>
        {profile && (
          <Button
            variant="light"
            onPress={handleLogout}
            className="absolute right-8 top-8 font-bold"
            color="danger"
            size="sm"
          >
            Sign Out
          </Button>
        )}
      </MotionCard>

      {/* Management Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Helper Card */}
        <MotionCard index={1} isBlurred shadow="sm" className="lg:col-span-2 border-none rounded-[2.5rem]">
          <CardHeader className="pb-2 px-8 pt-8">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-2xl font-black flex items-center gap-3 tracking-tighter">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                FLEET EXPANSION
              </h2>
              <Button
                color="success"
                variant="flat"
                size="sm"
                onPress={handleScan}
                isLoading={isScanning}
                className="font-bold rounded-xl"
              >
                {isScanning ? "Scanning..." : "Auto-Scan"}
              </Button>
            </div>
          </CardHeader>
          <CardBody className="px-8 py-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full space-y-3">
                <p className="text-[10px] font-black text-default-400 uppercase tracking-widest px-1">Identity</p>
                <Input
                  placeholder="e.g. Primary PC"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  variant="flat"
                  size="lg"
                  radius="lg"
                  classNames={{
                    input: "font-bold",
                  }}
                />
              </div>
              <div className="flex-[1.5] w-full space-y-3">
                <p className="text-[10px] font-black text-default-400 uppercase tracking-widest px-1">Endpoint</p>
                <Input
                  placeholder="http://localhost:8765"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  variant="flat"
                  size="lg"
                  radius="lg"
                  classNames={{
                    input: "font-mono",
                  }}
                />
              </div>
              <Button
                color="primary"
                onPress={() => addInstance()}
                size="lg"
                radius="lg"
                className="h-[56px] px-10 font-black"
              >
                ADD HELPER
              </Button>
            </div>

            {/* Discovered Helpers */}
            {discoveredUrls.length > 0 && (
              <div className="pt-6 border-t border-divider animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-[10px] font-black text-success uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  ACTIVE BACKENDS DETECTED
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discoveredUrls.map((url, idx) => (
                    <div key={url} className="flex items-center justify-between p-4 bg-default-50 rounded-3xl hover:bg-default-100 transition-all border border-transparent hover:border-success/20 group/item">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-default-400 uppercase">Helper {idx + 1}</span>
                        <span className="font-mono text-sm text-success">{url}</span>
                      </div>
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={() => addInstance(url, `Auto-Found ${idx + 1}`)}
                        className="font-black rounded-xl h-8 px-4"
                      >
                        DEPLOY
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </MotionCard>

        {/* Quick Stats Card */}
        <MotionCard index={2} isBlurred shadow="sm" className="border-none rounded-[2.5rem]">
          <CardHeader className="px-8 pt-8 pb-0">
            <h2 className="text-xl font-black text-default-400 uppercase tracking-widest opacity-50">Active Fleet</h2>
          </CardHeader>
          <CardBody className="px-8 pb-8 flex flex-col justify-center items-center">
            <div className="text-8xl font-black tracking-tighter mb-2">{instances.length}</div>
            <p className="text-default-400 font-bold uppercase tracking-widest text-[10px] text-center mb-8">Node Connections</p>
            <div className="w-full h-2 bg-default-100 rounded-full overflow-hidden">
              <div className="h-full bg-success shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-1000" style={{ width: `${Math.min(100, (instances.length / 10) * 100)}%` }}></div>
            </div>
          </CardBody>
        </MotionCard>
      </div>

      {/* Instances Grid */}
      <div className="space-y-12 py-8">
        {instances.map((instance) => (
          <BotInstance
            key={instance.id}
            id={instance.id}
            name={instance.name}
            url={instance.url}
            onRemove={() => removeInstance(instance.id)}
            isStabilityLocked={isStabilityLocked}
          />
        ))}
      </div>

      {instances.length === 0 && !isScanning && (
        <div className="text-center py-32 bg-default-50 rounded-[3rem] border-2 border-dashed border-default-200 animate-pulse">
          <p className="text-default-400 font-bold uppercase tracking-[0.3em] text-xl">
            No active instances configured.
          </p>
          <Button
            color="primary"
            variant="flat"
            size="lg"
            radius="full"
            className="mt-6 font-black tracking-widest"
            onPress={handleScan}
          >
            SCAN FOR HELPERS
          </Button>
        </div>
      )}
    </div>
  );
}
