"use client";

import { LogIn, LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { AutomationStudio } from "../components/AutomationStudio";
import { CreatorGrowthToolkit } from "../components/CreatorGrowthToolkit";
import { CreatorStudio } from "../components/CreatorStudio";
import { RuntimeDiagnostics } from "../components/RuntimeDiagnostics";
import { useLocale } from "../i18n/LocaleProvider";
import { creatorMessages } from "../i18n/creatorMessages";
import { creatorRequest } from "../services/creatorApi";

import { logout, useGetProfile } from "./functions/UserAPI";

export default function Dashboard() {
  const { data: profile } = useGetProfile();
  const router = useRouter();
  const { t, locale } = useLocale();

  const handleLogout = async () => {
    await creatorRequest("/accounts/lock", "POST").catch(() => undefined);
    await logout().catch(() => undefined);
    router.push("/login");
  };

  return (
    <div className="min-h-full bg-[#09090b] text-zinc-100">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-3 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <h1 className="text-sm font-semibold">VelBots Creator Studio</h1>
            <p className="text-xs text-zinc-500">{t("multiPlatformBadge")}</p>
          </div>
          <span className="hidden rounded-full border border-emerald-800/80 bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 sm:inline-block">
            {t("multiPlatformBadge")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {profile?.user?.username ? (
            <>
              <span className="text-sm text-zinc-300">
                {profile.user.username}
              </span>
              <button
                className="text-zinc-400 transition-colors hover:text-white"
                title={t("logout")}
                type="button"
                onClick={() => void handleLogout()}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300">
                {t("localStudioBadge")}
              </span>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                type="button"
                onClick={() => router.push("/login")}
              >
                <LogIn className="h-3.5 w-3.5" />
                {t("signIn")}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        <CreatorStudio />

        <AutomationStudio />

        <details open className="rounded-xl border border-zinc-800 p-5">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            {creatorMessages[locale].supplementary}
          </summary>
          <div className="mt-4">
            <CreatorGrowthToolkit />
          </div>
        </details>

        <RuntimeDiagnostics />
      </main>
    </div>
  );
}
