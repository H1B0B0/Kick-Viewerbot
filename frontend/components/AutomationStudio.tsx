"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  Clapperboard,
  Megaphone,
  Play,
  RotateCcw,
  Timer,
  Workflow,
} from "lucide-react";

import { useLocale } from "../i18n/LocaleProvider";
import {
  advanceWorkflow,
  CREATOR_PLATFORMS,
  createWorkflow,
  type CreatorPlatform,
  type CreatorWorkflow,
  type WorkflowTaskId,
  type WorkflowTaskState,
  workflowProgress,
} from "../services/creatorWorkflow";

const STORAGE_KEY = "velbots.creator-workflow.v1";

const taskIcons = {
  announcement: Megaphone,
  live: Play,
  markers: Timer,
  clips: Clapperboard,
  analytics: BarChart3,
} satisfies Record<WorkflowTaskId, typeof Megaphone>;

const taskLabels = {
  announcement: "automationAnnouncement",
  live: "automationLive",
  markers: "automationMarkers",
  clips: "automationClips",
  analytics: "automationAnalytics",
} as const;

const stateLabels = {
  ready: "automationReady",
  waiting: "automationWaiting",
  active: "automationActive",
  review: "automationReview",
  complete: "automationComplete",
} as const;

const stageLabels = {
  scheduled: "automationScheduled",
  live: "automationLiveNow",
  review: "automationInReview",
  complete: "automationFinished",
} as const;

const advanceLabels = {
  scheduled: "automationStartLive",
  live: "automationFinishLive",
  review: "automationCloseReview",
  complete: "automationFinished",
} as const;

function localDateTimeValue(): string {
  const now = new Date();

  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return now.toISOString().slice(0, 16);
}

function taskStateClass(state: WorkflowTaskState): string {
  if (state === "complete")
    return "border-emerald-900/70 bg-emerald-950/30 text-emerald-300";
  if (state === "active") return "border-sky-900/70 bg-sky-950/30 text-sky-300";
  if (state === "review")
    return "border-amber-900/70 bg-amber-950/30 text-amber-200";
  if (state === "ready") return "border-zinc-700 bg-zinc-900 text-zinc-300";

  return "border-zinc-800 bg-zinc-950 text-zinc-600";
}

export function AutomationStudio() {
  const { t } = useLocale();
  const [workflow, setWorkflow] = useState<CreatorWorkflow | null>(null);
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState(localDateTimeValue);
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>(["Twitch"]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) setWorkflow(JSON.parse(stored) as CreatorWorkflow);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (workflow) localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
    else localStorage.removeItem(STORAGE_KEY);
  }, [hydrated, workflow]);

  const progress = useMemo(
    () => (workflow ? workflowProgress(workflow) : 0),
    [workflow],
  );

  const togglePlatform = (platform: CreatorPlatform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const createRun = () => {
    if (!title.trim() || !scheduledFor || platforms.length === 0) {
      setError(t("automationMissingDetails"));

      return;
    }

    setWorkflow(createWorkflow({ title, scheduledFor, platforms }));
    setError("");
  };

  return (
    <section className="rounded-xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-950 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              {t("automationStudio")}
            </h2>
            <span className="rounded-full border border-emerald-800/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
              {t("automationLocalRun")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {t("automationStudioBody")}
          </p>
        </div>
        {workflow && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              {t("automationStage")}
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {t(stageLabels[workflow.stage])}
            </p>
          </div>
        )}
      </div>

      {!workflow ? (
        <div className="mt-6 grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-[1.35fr_1fr]">
          <label className="text-xs font-medium text-zinc-400">
            {t("automationLiveTitle")}
            <input
              className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-600"
              maxLength={160}
              placeholder={t("automationLiveTitlePlaceholder")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            {t("automationSchedule")}
            <input
              className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-600"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </label>
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-zinc-400">
              {t("automationPlatforms")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CREATOR_PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);

                return (
                  <button
                    key={platform}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "rounded-md border border-emerald-700 bg-emerald-950/60 px-3 py-2 text-sm font-medium text-emerald-200"
                        : "rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                    }
                    type="button"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300"
              type="button"
              onClick={createRun}
            >
              <CalendarClock className="h-4 w-4" />
              {t("automationCreateRun")}
            </button>
            <p className="text-xs text-red-300" role="status">
              {error}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-medium text-white">
                  {workflow.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(workflow.scheduledFor))}
                  <span className="mx-2 text-zinc-700">•</span>
                  {workflow.platforms.join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={workflow.stage === "complete"}
                  type="button"
                  onClick={() =>
                    setWorkflow(
                      (current) => current && advanceWorkflow(current),
                    )
                  }
                >
                  <Play className="h-4 w-4" />
                  {t(advanceLabels[workflow.stage])}
                </button>
                <button
                  className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
                  title={t("automationReset")}
                  type="button"
                  onClick={() => setWorkflow(null)}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-zinc-400">
                {progress}%
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {workflow.tasks.map((task) => {
              const Icon = taskIcons[task.id];

              return (
                <article
                  key={task.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  <h4 className="mt-4 text-sm font-medium text-zinc-200">
                    {t(taskLabels[task.id])}
                  </h4>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${taskStateClass(task.state)}`}
                  >
                    {t(stateLabels[task.state])}
                  </span>
                </article>
              );
            })}
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            {t("automationProviderNote")}
          </p>
        </div>
      )}
    </section>
  );
}
