"use client";

import { useEffect } from "react";
import {
  Archive,
  ArrowRight,
  LogOut,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { CreatorGrowthToolkit } from "../components/CreatorGrowthToolkit";
import { RuntimeDiagnostics } from "../components/RuntimeDiagnostics";
import { StatusBanner } from "../components/StatusBanner";
import { WebSocketStatus } from "../components/WebSocketStatus";
import { useWebSocketBot } from "../hooks/useWebSocketBot";
import { CLIP_CAPABILITIES } from "../services/clipCapabilities";
import { displayRuntimeStatus } from "../services/runtimeDiagnostics";

import { logout, useGetProfile } from "./functions/UserAPI";

export default function Dashboard() {
  const { data: profile, error: profileError } = useGetProfile();
  const router = useRouter();
  const { status: wsStatus, reconnect: wsReconnect } = useWebSocketBot();

  useEffect(() => {
    if (profileError) router.push("/login");
  }, [profileError, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-full bg-[#09090b] text-zinc-100">
      <header className="flex min-h-16 items-center justify-between border-b border-zinc-800 px-6 md:px-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <div>
            <h1 className="text-sm font-semibold">VelBots</h1>
            <p className="text-xs text-zinc-500">
              ViewerBot legacy · Creator Growth beta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <WebSocketStatus status={wsStatus} onRetry={wsReconnect} />
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm text-zinc-400">
            {profile?.user?.username || "Guest"}
          </span>
          <button
            className="text-zinc-400 transition-colors hover:text-white"
            title="Logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        <StatusBanner status={displayRuntimeStatus(wsStatus)} />

        <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Radio className="h-4 w-4 text-emerald-400" />
              What this beta tests
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A familiar ViewerBot workspace for orientation, plus live
              planning, creator-controlled highlight markers, CSV review
              exports, and announcement drafts. Publishing remains a deliberate
              action by the creator.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-950 bg-emerald-950/20 p-3 text-xs leading-5 text-emerald-200">
            <ShieldCheck className="mb-1 h-4 w-4" />
            Legacy synthetic-engagement controls are paused in this beta.
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-medium text-white">
                  ViewerBot Legacy
                </h2>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  Migration mode
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                The ViewerBot space remains part of V4 so your community has a
                clear bridge to the new product. The legacy workflow is visible
                here, but its synthetic-audience and proxy actions are paused.
              </p>
            </div>
            <div className="rounded-lg border border-amber-950 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-200">
              Legacy actions do not contact Kick, Twitch, or YouTube in this
              beta.
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Workspace
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-200">
                ViewerBot Legacy
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Keep the familiar product name and workflow context while the
                beta gathers feedback.
              </p>
            </article>
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Legacy automation
              </p>
              <p className="mt-2 text-sm font-medium text-amber-200">
                Paused for migration
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                No viewer, thread, or proxy operation can be started from this
                beta.
              </p>
            </article>
            <article className="rounded-lg border border-emerald-950 bg-emerald-950/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
                Next step
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-100">
                Move the live workflow forward{" "}
                <ArrowRight className="h-4 w-4" />
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-200/60">
                Plan the live, mark strong moments, review the CSV, then publish
                a real platform-native clip.
              </p>
            </article>
          </div>
        </section>

        <CreatorGrowthToolkit />

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <h2 className="text-sm font-medium text-white">
            Clip automation status
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This beta never claims to have created a clip until the connected
            platform confirms it.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {CLIP_CAPABILITIES.map((capability) => (
              <article
                key={capability.platform}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <h3 className="text-sm font-medium text-zinc-200">
                  {capability.platform}
                </h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <RuntimeDiagnostics />
      </main>
    </div>
  );
}
