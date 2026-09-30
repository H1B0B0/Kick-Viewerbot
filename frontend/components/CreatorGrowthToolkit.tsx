"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";

import { openExternal } from "../app/functions/openExternal";
import { useLocale } from "../i18n/LocaleProvider";
import { LiveAnnouncement } from "./LiveAnnouncement";

const STORAGE_KEY = "velbots.creator-growth-toolkit.v1";

const CHECKLIST = [
  {
    id: "goal",
    labelKey: "checkGoal",
    phaseKey: "before",
  },
  {
    id: "announce",
    labelKey: "checkAnnounce",
    phaseKey: "before",
  },
  { id: "segment", labelKey: "checkSegment", phaseKey: "before" },
  {
    id: "clips",
    labelKey: "checkClips",
    phaseKey: "after",
  },
  {
    id: "publish",
    labelKey: "checkPublish",
    phaseKey: "after",
  },
  { id: "review", labelKey: "checkReview", phaseKey: "after" },
] as const;

interface Moment {
  id: string;
  elapsedSeconds: number;
  createdAt: string;
  note: string;
}

interface ToolkitState {
  goal: string;
  completed: string[];
  sessionStartedAt: number | null;
  moments: Moment[];
}

const EMPTY_STATE: ToolkitState = {
  goal: "",
  completed: [],
  sessionStartedAt: null,
  moments: [],
};

const PLATFORM_DASHBOARDS = [
  { label: "Kick", url: "https://kick.com/dashboard" },
  { label: "Twitch", url: "https://dashboard.twitch.tv" },
  { label: "YouTube", url: "https://studio.youtube.com" },
] as const;

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function CreatorGrowthToolkit() {
  const { t } = useLocale();
  const [toolkit, setToolkit] = useState<ToolkitState>(EMPTY_STATE);
  const [momentNote, setMomentNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        setToolkit({ ...EMPTY_STATE, ...(JSON.parse(stored) as ToolkitState) });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toolkit));
  }, [hydrated, toolkit]);

  const progress = useMemo(
    () => Math.round((toolkit.completed.length / CHECKLIST.length) * 100),
    [toolkit.completed.length],
  );

  const toggleChecklistItem = (id: string) => {
    setToolkit((current) => ({
      ...current,
      completed: current.completed.includes(id)
        ? current.completed.filter((item) => item !== id)
        : [...current.completed, id],
    }));
  };

  const markMoment = () => {
    const now = Date.now();
    const startedAt = toolkit.sessionStartedAt ?? now;
    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));

    setToolkit((current) => ({
      ...current,
      sessionStartedAt: startedAt,
      moments: [
        ...current.moments,
        {
          id: window.crypto.randomUUID(),
          elapsedSeconds,
          createdAt: new Date(now).toISOString(),
          note: momentNote.trim() || t("defaultMoment"),
        },
      ],
    }));
    setMomentNote("");
  };

  const resetSession = () => {
    if (toolkit.moments.length > 0 && !window.confirm(t("resetMarkers"))) {
      return;
    }

    setToolkit((current) => ({
      ...current,
      sessionStartedAt: Date.now(),
      moments: [],
    }));
  };

  const exportMoments = () => {
    const rows = [
      ["elapsed", "created_at", "note"],
      ...toolkit.moments.map((moment) => [
        formatElapsed(moment.elapsedSeconds),
        moment.createdAt,
        moment.note,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `stream-moments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              {t("creatorTitle")}
            </h3>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {t("localOnly")}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">{t("creatorBody")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORM_DASHBOARDS.map((platform) => (
            <button
              key={platform.label}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              type="button"
              onClick={() => void openExternal(platform.url)}
            >
              {platform.label}
              <ExternalLink className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>

      <LiveAnnouncement />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              htmlFor="growth-goal"
            >
              {t("objective")}
            </label>
            <input
              className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
              id="growth-goal"
              maxLength={160}
              placeholder={t("objectivePlaceholder")}
              value={toolkit.goal}
              onChange={(event) =>
                setToolkit((current) => ({
                  ...current,
                  goal: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-zinc-500">
                {t("growthLoop")}
              </span>
              <span className="text-zinc-400">{progress}%</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="space-y-2">
              {CHECKLIST.map((item) => {
                const checked = toolkit.completed.includes(item.id);

                return (
                  <button
                    key={item.id}
                    className="flex w-full items-center gap-3 rounded-md border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-left transition-colors hover:border-zinc-700"
                    type="button"
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 shrink-0 text-zinc-600" />
                    )}
                    <span
                      className={
                        checked
                          ? "text-sm text-zinc-500 line-through"
                          : "text-sm text-zinc-300"
                      }
                    >
                      {t(item.labelKey)}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-600">
                      {t(item.phaseKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-white">
                {t("highlights")}
              </h4>
              <p className="mt-1 text-xs text-zinc-500">
                {t("highlightsBody")}
              </p>
            </div>
            <button
              className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
              title={t("newMarkerSession")}
              type="button"
              onClick={resetSession}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              maxLength={120}
              placeholder={t("momentPlaceholder")}
              value={momentNote}
              onChange={(event) => setMomentNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") markMoment();
              }}
            />
            <button
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              type="button"
              onClick={markMoment}
            >
              <BookmarkPlus className="w-4 h-4" />
              {t("mark")}
            </button>
          </div>

          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {toolkit.moments.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-600">
                {t("noMoments")}
              </div>
            ) : (
              toolkit.moments.map((moment) => (
                <div
                  key={moment.id}
                  className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <span className="font-mono text-xs text-emerald-400">
                    {formatElapsed(moment.elapsedSeconds)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                    {moment.note}
                  </span>
                  <button
                    className="text-zinc-600 transition-colors hover:text-red-400"
                    title="Delete marker"
                    type="button"
                    onClick={() =>
                      setToolkit((current) => ({
                        ...current,
                        moments: current.moments.filter(
                          (item) => item.id !== moment.id,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-800 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={toolkit.moments.length === 0}
            type="button"
            onClick={exportMoments}
          >
            <Download className="w-3.5 h-3.5" />
            {t("exportCsv")}
          </button>
        </div>
      </div>
    </section>
  );
}
