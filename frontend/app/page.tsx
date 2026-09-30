"use client";

import { useEffect } from "react";
import { Archive, ArrowRight, LogOut, Radio, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { CreatorGrowthToolkit } from "../components/CreatorGrowthToolkit";
import { RuntimeDiagnostics } from "../components/RuntimeDiagnostics";
import { StatusBanner } from "../components/StatusBanner";
import { WebSocketStatus } from "../components/WebSocketStatus";
import { useWebSocketBot } from "../hooks/useWebSocketBot";
import { useLocale } from "../i18n/LocaleProvider";
import { CLIP_CAPABILITIES } from "../services/clipCapabilities";
import { displayRuntimeStatus } from "../services/runtimeDiagnostics";

import { logout, useGetProfile } from "./functions/UserAPI";

export default function Dashboard() {
  const { data: profile, error: profileError } = useGetProfile();
  const router = useRouter();
  const { status: wsStatus, reconnect: wsReconnect } = useWebSocketBot();
  const { t } = useLocale();

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
            <p className="text-xs text-zinc-500">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <WebSocketStatus status={wsStatus} onRetry={wsReconnect} />
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm text-zinc-400">
            {profile?.user?.username || t("guest")}
          </span>
          <button
            className="text-zinc-400 transition-colors hover:text-white"
            title={t("logout")}
            type="button"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        <StatusBanner
          status={displayRuntimeStatus(wsStatus, undefined, 0, {
            launching: t("localServiceLaunching"),
            unavailable: t("localServiceUnavailable"),
            waiting: t("localServiceWaiting"),
          })}
        />

        <section className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <Radio className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <div className="text-sm font-medium text-white">
              {t("betaTitle")}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {t("betaBody")}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-medium text-white">
                  {t("legacyTitle")}
                </h2>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  {t("migrationMode")}
                </span>
              </div>
            </div>
            <span className="rounded-full border border-amber-900/70 bg-amber-950/20 px-3 py-1 text-xs font-medium text-amber-200">
              {t("pausedForMigration")}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                {t("workspace")}
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-200">
                {t("workspaceBody")}
              </p>
            </article>
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                {t("legacyAutomation")}
              </p>
              <p className="mt-2 text-sm font-medium text-amber-200">
                {t("legacyAutomationBody")}
              </p>
            </article>
            <article className="rounded-lg border border-emerald-950 bg-emerald-950/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
                {t("nextStep")}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-100">
                {t("nextStepTitle")} <ArrowRight className="h-4 w-4" />
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-200/60">
                {t("nextStepBody")}
              </p>
            </article>
          </div>
        </section>

        <CreatorGrowthToolkit />

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <h2 className="text-sm font-medium text-white">{t("clipsTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("clipsBody")}</p>
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
                  {t(capability.descriptionKey)}
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
