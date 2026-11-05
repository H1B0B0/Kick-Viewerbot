"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Film,
  Upload,
  Download,
  RefreshCw,
  Scissors,
  ExternalLink,
  Hash,
  Bookmark,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import { useLocale } from "../i18n/LocaleProvider";
import { creatorMessages, type CreatorMessages } from "../i18n/creatorMessages";
import {
  creatorRequest,
  creatorMediaUrl,
  downloadInventory,
  downloadNativeClip,
  selectRecordingFolder,
  synchronizeProviderConfig,
  CreatorApiError,
  type Clip,
  type Workspace,
} from "../services/creatorApi";

const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40";
const input =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none";
const panel = "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6";
const activeStates = ["queued", "analyzing", "rendering"];
const TOOLKIT_STORAGE_KEY = "velbots.creator-growth-toolkit.v1";
const MULTI_PLATFORM_HASHTAGS = "#Shorts #Twitch #Kick #YouTubeLive";

interface SavedMoment {
  id: string;
  elapsedSeconds: number;
  note: string;
}

function stateLabel(messages: CreatorMessages, state: string) {
  return messages[state as keyof CreatorMessages] || state;
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

async function external(url: string) {
  const parsed = new URL(url);

  if (
    parsed.protocol !== "https:" ||
    ![
      "www.twitch.tv",
      "twitch.tv",
      "clips.twitch.tv",
      "dashboard.twitch.tv",
      "kick.com",
      "www.kick.com",
      "accounts.google.com",
      "www.youtube.com",
      "youtube.com",
      "studio.youtube.com",
      "youtu.be",
    ].includes(parsed.hostname)
  )
    throw new Error("invalid_platform_url");
  if (isTauri()) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

function ClipCard({
  clip,
  youtube,
  baseUrl,
  m,
  action,
}: {
  clip: Clip;
  youtube: boolean;
  baseUrl: string;
  m: CreatorMessages;
  action: (task: () => Promise<unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(clip.title);
  const [description, setDescription] = useState(clip.description);
  const [privacy, setPrivacy] = useState("private");
  const [audience, setAudience] = useState("");
  const [schedule, setSchedule] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const uploading = ["uploading", "uploaded", "unknown"].includes(
    clip.publication.state,
  );
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    await action(task);
    setBusy(false);
  };

  const appendHashtags = () => {
    setDescription((current) => {
      if (current.includes("#Shorts")) return current;
      const trimmed = current.trim();

      return trimmed
        ? `${trimmed}\n\n${MULTI_PLATFORM_HASHTAGS}`
        : MULTI_PLATFORM_HASHTAGS;
    });
    setApproved(false);
  };

  return (
    <article className={panel}>
      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        <video
          controls
          aria-label={clip.title}
          className="aspect-[9/16] w-full max-w-[240px] rounded-xl bg-black object-contain"
          crossOrigin="anonymous"
          preload="metadata"
          src={baseUrl + clip.media_url}
        >
          <track
            kind="captions"
            label="WebVTT"
            src={clip.captions_url ? baseUrl + clip.captions_url : undefined}
          />
        </video>
        <div className="min-w-0 space-y-3">
          <label className="block text-xs text-zinc-400">
            {m.captions}
            <input
              accept=".vtt"
              className="mt-1 block w-full text-xs text-zinc-500"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file)
                  void run(() => {
                    const form = new FormData();

                    form.append("file", file);

                    return creatorRequest(
                      `/clips/${clip.id}/captions`,
                      "POST",
                      form,
                    );
                  });
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span>
              {formatTime(clip.start)} · {Math.round(clip.duration)} {m.seconds}
            </span>
            <span>· {stateLabel(m, clip.reason)}</span>
          </div>
          <label className="block text-xs text-zinc-400">
            {m.titleLabel}
            <input
              className={`${input} mt-1`}
              maxLength={100}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setApproved(false);
              }}
            />
          </label>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                className="block text-xs text-zinc-400"
                htmlFor={`desc-${clip.id}`}
              >
                {m.description}
              </label>
              <button
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-emerald-300 transition-colors hover:border-emerald-600 hover:bg-zinc-800"
                type="button"
                onClick={appendHashtags}
              >
                <Hash size={12} />
                {m.addHashtags}
              </button>
            </div>
            <textarea
              className={`${input} mt-1`}
              id={`desc-${clip.id}`}
              maxLength={5000}
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setApproved(false);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy || !title.trim()}
              onClick={() =>
                void run(async () => {
                  await creatorRequest(`/clips/${clip.id}`, "PATCH", {
                    title,
                    description,
                  });
                  setFeedback(m.saved);
                })
              }
            >
              {m.save}
            </button>
            <a
              download
              className={button}
              href={baseUrl + clip.media_url + "&download=1"}
              onClick={(event) => {
                if (isTauri()) {
                  event.preventDefault();
                  void run(async () => {
                    const path = await downloadNativeClip(clip.id);

                    setFeedback(`${m.saved}: ${path}`);
                  });
                }
              }}
            >
              <Download size={15} />
              {m.download}
            </a>
            <button
              className={`${button} text-red-300`}
              disabled={busy || clip.publication.state === "uploading"}
              onClick={() => {
                if (window.confirm(m.removeConfirm))
                  void run(() => creatorRequest(`/clips/${clip.id}`, "DELETE"));
              }}
            >
              {m.remove}
            </button>
          </div>
          {feedback && (
            <p className="text-xs text-emerald-300" role="status">
              {feedback}
            </p>
          )}
          <p className="text-xs text-zinc-400">
            YouTube · {stateLabel(m, clip.publication.state)}
            {clip.publication.privacy &&
              ` · ${stateLabel(m, clip.publication.privacy)}`}
          </p>
          {clip.publication.error && (
            <p className="break-words text-xs text-red-300">
              {m.error} ({clip.publication.error})
            </p>
          )}
          {clip.publication.url && (
            <button
              className={button}
              onClick={() => void run(() => external(clip.publication.url!))}
            >
              <ExternalLink size={15} />
              YouTube
            </button>
          )}
          {!uploading && (
            <details className="border-t border-zinc-800 pt-3">
              <summary className="cursor-pointer text-sm text-zinc-300">
                {m.publish}
                {!youtube && ` · ${m.disconnected}`}
              </summary>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-zinc-400">
                    {m.privacy}
                    <select
                      className={`${input} mt-1`}
                      value={privacy}
                      onChange={(e) => {
                        setPrivacy(e.target.value);
                        setApproved(false);
                      }}
                    >
                      {["private", "unlisted", "public"].map((p) => (
                        <option key={p} value={p}>
                          {stateLabel(m, p)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    {m.audience}
                    <select
                      className={`${input} mt-1`}
                      value={audience}
                      onChange={(e) => {
                        setAudience(e.target.value);
                        setApproved(false);
                      }}
                    >
                      <option value="">{m.choose}</option>
                      <option value="kids">{m.kids}</option>
                      <option value="notKids">{m.notKids}</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs text-zinc-400">
                  {m.schedule}
                  <input
                    className={`${input} mt-1`}
                    type="datetime-local"
                    value={schedule}
                    onChange={(e) => {
                      setSchedule(e.target.value);
                      setApproved(false);
                    }}
                  />
                </label>
                <label className="flex items-start gap-2 text-xs leading-5 text-zinc-300">
                  <input
                    checked={approved}
                    className="mt-1"
                    type="checkbox"
                    onChange={(e) => setApproved(e.target.checked)}
                  />
                  {m.approve}
                </label>
                <button
                  className={`${button} border-emerald-700 text-emerald-300`}
                  disabled={
                    !youtube || busy || !approved || !audience || !title.trim()
                  }
                  onClick={() =>
                    void run(() =>
                      creatorRequest(`/clips/${clip.id}/publish`, "POST", {
                        title,
                        description,
                        privacy,
                        made_for_kids: audience === "kids",
                        publish_at: schedule
                          ? new Date(schedule).toISOString()
                          : null,
                        confirmed: approved,
                      }),
                    )
                  }
                >
                  <Upload size={15} />
                  {m.publish}
                </button>
                <p className="text-xs leading-5 text-zinc-500">
                  {m.uploadNote}
                </p>
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}

export function CreatorStudio() {
  const { locale } = useLocale();
  const m = creatorMessages[locale];
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [connection, setConnection] = useState("launching");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(3);
  const [length, setLength] = useState(30);
  const [framing, setFraming] = useState<"blurred" | "crop">("blurred");
  const [startOffset, setStartOffset] = useState("");
  const [kickChannel, setKickChannel] = useState("");
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [folder, setFolder] = useState("");
  const [providerConfigState, setProviderConfigState] = useState("idle");
  const providerSyncAttempted = useRef(false);
  const [auth, setAuth] = useState<{
    provider: string;
    url: string;
    code?: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const loading = useRef(false);
  const failures = useRef(0);

  const loadLocalMoments = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(TOOLKIT_STORAGE_KEY);

      if (!raw) {
        setSavedMoments([]);

        return;
      }
      const parsed = JSON.parse(raw) as { moments?: SavedMoment[] };

      if (Array.isArray(parsed.moments)) {
        setSavedMoments(parsed.moments);
      }
    } catch {
      setSavedMoments([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    loadLocalMoments();
    if (loading.current) return;
    loading.current = true;
    try {
      const [data, url] = await Promise.all([
        creatorRequest<Workspace>("/workspace"),
        creatorMediaUrl(""),
      ]);

      setWorkspace(data);
      setBaseUrl(url);
      setConnection("ready");
      failures.current = 0;
    } catch {
      failures.current += 1;
      if (failures.current > 20) setConnection("unavailable");
    } finally {
      loading.current = false;
    }
  }, [loadLocalMoments]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);

    return () => clearInterval(timer);
  }, [refresh]);

  const syncConnections = useCallback(
    async (manual = false) => {
      if (manual) setProviderConfigState("loading");
      try {
        await synchronizeProviderConfig();
        setProviderConfigState("ready");
        await refresh();
      } catch {
        setProviderConfigState(manual ? "unavailable" : "idle");
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (connection !== "ready" || providerSyncAttempted.current) return;
    providerSyncAttempted.current = true;
    void syncConnections(false);
  }, [connection, syncConnections]);

  const recordingFolder = workspace?.recording_automation?.folder;

  useEffect(() => {
    setFolder(recordingFolder || "");
  }, [recordingFolder]);

  const twitch = workspace?.accounts.find((a) => a.provider === "twitch");
  const youtube = workspace?.accounts.find((a) => a.provider === "youtube");
  const kick = workspace?.accounts.find((a) => a.provider === "kick");
  const twitchConnected = twitch?.state === "connected";

  useEffect(() => {
    if (!twitchConnected) return;
    const tick = () => {
      void creatorRequest("/live/refresh", "POST").catch(() => undefined);
    };

    tick();
    const timer = setInterval(tick, 30_000);

    return () => clearInterval(timer);
  }, [twitchConnected]);

  useEffect(() => {
    if (
      auth &&
      workspace?.accounts.some(
        (a) => a.provider === auth.provider && a.state === "connected",
      )
    )
      setAuth(null);
  }, [auth, workspace]);

  const action = async (task: () => Promise<unknown>) => {
    setError("");
    try {
      await task();
      await refresh();
    } catch (err) {
      setError(
        `${m.error}${err instanceof CreatorApiError ? ` (${err.code})` : ""}`,
      );
    }
  };

  const buildJobPayload = (sourceId: string, customStart?: number) => {
    const parsedStart =
      customStart !== undefined
        ? customStart
        : startOffset.trim() !== "" && !Number.isNaN(Number(startOffset))
          ? Math.max(0, Number(startOffset))
          : undefined;

    return {
      source_id: sourceId,
      count: customStart !== undefined ? 1 : count,
      length,
      framing,
      ...(parsedStart !== undefined ? { start: parsedStart } : {}),
    };
  };

  const importVideo = async (file: File) => {
    setBusy(true);
    await action(async () => {
      const data = new FormData();

      data.append("file", file);
      const source = await creatorRequest<{ id: string }>(
        "/sources",
        "POST",
        data,
      );

      await creatorRequest("/jobs", "POST", buildJobPayload(source.id));
    });
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const connect = (provider: string) =>
    action(async () => {
      const result = await creatorRequest<{ url: string; user_code?: string }>(
        `/accounts/${provider}/connect`,
        "POST",
      );

      setAuth({ provider, url: result.url, code: result.user_code });
      // Display a user-activated link; browsers cannot block an asynchronous popup.
    });

  return (
    <div className="space-y-6">
      <section
        className={`${panel} border-emerald-900/60 bg-gradient-to-br from-emerald-950/30 to-zinc-950`}
      >
        {connection === "ready" && (
          <p
            className="mb-4 flex items-center gap-2 text-xs text-emerald-300"
            role="status"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {m.ready}
          </p>
        )}
        <div className="mb-5 flex items-start gap-3">
          <Film className="mt-1 shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              {m.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{m.intro}</p>
            <p className="mt-1 text-xs text-emerald-300/90">
              {m.multiPlatformHint}
            </p>
          </div>
        </div>
        {connection !== "ready" && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-zinc-900 p-3 text-sm text-amber-200"
            role="status"
          >
            {stateLabel(m, connection)}
            <button
              className={button}
              onClick={() => {
                failures.current = 0;
                setConnection("launching");
                void refresh();
              }}
            >
              {m.retry}
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-zinc-400">
            {m.count}
            <select
              className={`${input} mt-1`}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            {m.duration}
            <select
              className={`${input} mt-1`}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            >
              {[15, 30, 45, 60].map((n) => (
                <option key={n} value={n}>
                  {n} {m.seconds}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            {m.framingLabel}
            <select
              className={`${input} mt-1`}
              value={framing}
              onChange={(e) => setFraming(e.target.value as "blurred" | "crop")}
            >
              <option value="blurred">{m.framingBlurred}</option>
              <option value="crop">{m.framingCrop}</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            {m.startSecondsLabel}
            <input
              className={`${input} mt-1 w-36`}
              min={0}
              placeholder="Auto"
              type="number"
              value={startOffset}
              onChange={(e) => setStartOffset(e.target.value)}
            />
          </label>
          <input
            ref={fileInput}
            accept=".mp4,.mov,.mkv,.webm"
            aria-label={m.import}
            className="hidden"
            disabled={busy || !workspace?.encoder_ready}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) void importVideo(file);
            }}
          />
          <button
            className={`${button} min-h-10 border-emerald-400 bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300`}
            disabled={busy || !workspace?.encoder_ready}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={17} />
            {busy ? m.importing : m.import}
          </button>
        </div>

        {savedMoments.length > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Bookmark size={13} />
              {m.markersBridgeTitle}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {savedMoments.map((moment) => {
                const latestSource = workspace?.sources[0];

                return (
                  <button
                    key={moment.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 transition-colors hover:border-emerald-500 hover:text-white"
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      setStartOffset(String(moment.elapsedSeconds));
                      if (latestSource) {
                        void action(() =>
                          creatorRequest(
                            "/jobs",
                            "POST",
                            buildJobPayload(
                              latestSource.id,
                              moment.elapsedSeconds,
                            ),
                          ),
                        );
                      }
                    }}
                  >
                    <span className="font-mono text-emerald-400">
                      {formatTime(moment.elapsedSeconds)}
                    </span>
                    <span className="max-w-[160px] truncate">
                      {moment.note}
                    </span>
                    {latestSource && (
                      <span className="text-[10px] text-zinc-400">
                        · {m.clipFromMarker}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          {m.rights} MP4 · MOV · MKV · WEBM · 4 GB
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{m.method}</p>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Scissors size={19} />
            {m.recordingAuto}
          </h2>
          <span
            className={`text-xs ${workspace?.recording_automation?.enabled ? "text-emerald-300" : "text-zinc-500"}`}
            role="status"
          >
            {workspace?.recording_automation?.enabled
              ? m.watching
              : m.notWatching}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {m.recordingAutoNote}
        </p>
        {isTauri() ? (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-sm text-zinc-400">
                {m.recordingFolder}
                <input
                  className={`${input} mt-2`}
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                />
              </label>
              <button
                className={button}
                onClick={() =>
                  void action(async () => {
                    const selected = await selectRecordingFolder();

                    if (selected) setFolder(selected);
                  })
                }
              >
                {m.pickFolder}
              </button>
            </div>
            <button
              className={`${button} mt-4`}
              disabled={
                connection !== "ready" ||
                (!folder && !workspace?.recording_automation?.enabled)
              }
              onClick={() =>
                void action(() =>
                  creatorRequest("/automation/recordings", "POST", {
                    folder,
                    enabled: !workspace?.recording_automation?.enabled,
                    count,
                    length,
                  }),
                )
              }
            >
              {workspace?.recording_automation?.enabled
                ? m.autoDisable
                : m.autoEnable}
            </button>
            {workspace?.recording_automation?.processing && (
              <p className="mt-3 text-sm text-emerald-300">{m.importing}</p>
            )}
            {workspace?.recording_automation?.last_import && (
              <p className="mt-3 text-xs text-zinc-400">
                {m.lastRecording}: {workspace.recording_automation.last_import}
              </p>
            )}
            {workspace?.recording_automation?.error && (
              <p className="mt-3 text-xs text-red-300">
                {m.error} ({workspace.recording_automation.error})
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-amber-200/80">{m.nativeFolderNote}</p>
        )}
      </section>
      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200"
          role="alert"
        >
          {error}
          <button className="ml-3 underline" onClick={() => setError("")}>
            {m.cancel}
          </button>
        </div>
      )}
      {!!workspace?.jobs.length && (
        <section aria-label={m.working} className="space-y-3">
          {workspace.jobs.slice(0, 6).map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-zinc-300">
                  {workspace.sources.find((s) => s.id === job.source_id)?.name}{" "}
                  · {stateLabel(m, job.state)}
                </span>
                {activeStates.includes(job.state) ? (
                  <button
                    className={button}
                    onClick={() =>
                      void action(() =>
                        creatorRequest(`/jobs/${job.id}/cancel`, "POST"),
                      )
                    }
                  >
                    {m.cancel}
                  </button>
                ) : (
                  ["failed", "interrupted", "cancelled"].includes(
                    job.state,
                  ) && (
                    <button
                      className={button}
                      onClick={() =>
                        void action(() =>
                          creatorRequest("/jobs", "POST", {
                            source_id: job.source_id,
                            count: job.count,
                            length: job.length,
                            framing: job.framing || framing,
                            ...(job.start !== undefined && job.start !== null
                              ? { start: job.start }
                              : {}),
                          }),
                        )
                      }
                    >
                      {m.retry}
                    </button>
                  )
                )}
              </div>
              <progress
                aria-label={stateLabel(m, job.state)}
                className="mt-3 h-1.5 w-full accent-emerald-400"
                max={100}
                value={job.progress}
              />
              {job.error && job.state !== "cancelled" && (
                <p className="mt-2 text-xs text-red-300">
                  {m.error} ({job.error})
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Scissors size={19} />
            {m.library}{" "}
            <span className="text-sm text-zinc-500">
              {workspace?.clips.length || 0}
            </span>
          </h2>
          <button
            className={button}
            disabled={!workspace?.clips.length}
            onClick={() => void action(downloadInventory)}
          >
            {m.export}
          </button>
        </div>
        {!workspace?.clips.length && (
          <div className={`${panel} text-sm text-zinc-500`}>{m.empty}</div>
        )}
        {workspace?.clips.map((clip) => (
          <ClipCard
            key={clip.id}
            action={action}
            baseUrl={baseUrl}
            clip={clip}
            m={m}
            youtube={youtube?.state === "connected"}
          />
        ))}
      </section>
      {!!workspace?.sources.length && (
        <details className={panel}>
          <summary className="cursor-pointer text-sm text-zinc-300">
            {m.source} · {workspace.sources.length}
          </summary>
          <div className="mt-3 space-y-2">
            {workspace.sources.map((source) => (
              <div
                key={source.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="min-w-0 truncate text-sm text-zinc-400">
                  {source.name} · {formatTime(source.duration)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void action(() =>
                        creatorRequest(
                          "/jobs",
                          "POST",
                          buildJobPayload(source.id),
                        ),
                      )
                    }
                  >
                    {m.generate}
                  </button>
                  <button
                    className={`${button} text-red-300`}
                    disabled={workspace.jobs.some(
                      (job) =>
                        job.source_id === source.id &&
                        activeStates.includes(job.state),
                    )}
                    onClick={() => {
                      if (window.confirm(m.removeSourceConfirm))
                        void action(() =>
                          creatorRequest(`/sources/${source.id}`, "DELETE"),
                        );
                    }}
                  >
                    {m.removeSource}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{m.connections}</h2>
          <button
            className={button}
            disabled={
              providerConfigState === "loading" || connection !== "ready"
            }
            onClick={() => void syncConnections(true)}
          >
            <RefreshCw size={15} />
            {m.syncConnections}
          </button>
        </div>
        {providerConfigState === "loading" && (
          <p className="mt-3 text-sm text-zinc-400" role="status">
            {m.syncingConnections}
          </p>
        )}
        {providerConfigState === "unavailable" && (
          <p className="mt-3 text-xs text-amber-200/80" role="status">
            {m.connectionSettingsUnavailable}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {workspace?.accounts
            .filter((a) => a.provider !== "kick")
            .map((account) => (
              <div
                key={account.provider}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {account.provider === "youtube" ? "YouTube" : "Twitch"}
                  </h3>
                  <span
                    className={`text-xs ${account.state === "connected" ? "text-emerald-300" : "text-zinc-500"}`}
                  >
                    {account.configured
                      ? stateLabel(m, account.state)
                      : m.unconfigured}
                  </span>
                </div>
                {account.name && (
                  <p className="mt-2 text-sm text-zinc-400">{account.name}</p>
                )}
                <button
                  className={`${button} mt-3`}
                  disabled={
                    !account.configured || account.state === "authorizing"
                  }
                  onClick={() =>
                    void (account.state === "connected"
                      ? action(() =>
                          creatorRequest(
                            `/accounts/${account.provider}/disconnect`,
                            "POST",
                          ),
                        )
                      : connect(account.provider))
                  }
                >
                  {account.state === "connected" ? m.disconnect : m.connect}
                </button>
                {account.error && (
                  <p className="mt-2 text-xs text-red-300">
                    {m.error} ({account.error})
                  </p>
                )}
              </div>
            ))}

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Kick</h3>
              <span
                className={`text-xs ${kick?.state === "connected" ? "text-emerald-300" : "text-zinc-500"}`}
              >
                {stateLabel(
                  m,
                  kick?.state === "connected" ? "connected" : "disconnected",
                )}
              </span>
            </div>
            {kick?.state === "connected" ? (
              <>
                {kick.name && (
                  <p className="mt-2 text-sm text-zinc-400">{kick.name}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() =>
                      void action(() =>
                        creatorRequest("/accounts/kick/disconnect", "POST"),
                      )
                    }
                  >
                    {m.disconnect}
                  </button>
                  {kick.url && (
                    <button
                      className={button}
                      onClick={() => void action(() => external(kick.url!))}
                    >
                      <ExternalLink size={15} />
                      {m.open}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  aria-label="Kick"
                  className={input}
                  maxLength={50}
                  placeholder={m.kickChannelPlaceholder}
                  value={kickChannel}
                  onChange={(e) => setKickChannel(e.target.value)}
                />
                <button
                  className={button}
                  disabled={!kickChannel.trim()}
                  onClick={() =>
                    void action(async () => {
                      await creatorRequest("/accounts/kick/connect", "POST", {
                        channel: kickChannel.trim(),
                      });
                      setKickChannel("");
                    })
                  }
                >
                  {m.connect}
                </button>
              </div>
            )}
          </div>
        </div>
        {workspace &&
          !workspace.accounts
            .filter((a) => a.provider !== "kick")
            .some((a) => a.configured) && (
            <p className="mt-3 text-xs leading-5 text-amber-200/80">
              {m.setup}
            </p>
          )}
        <p className="mt-3 text-xs leading-5 text-zinc-500">{m.kick}</p>
        {auth && (
          <div className="mt-4 rounded-xl border border-emerald-800 p-4">
            {auth.code && (
              <p className="mb-3 text-sm">
                {m.code}{" "}
                <strong className="font-mono text-emerald-300">
                  {auth.code}
                </strong>
              </p>
            )}
            <button
              className={button}
              onClick={() => void action(() => external(auth.url))}
            >
              <ExternalLink size={15} />
              {m.openAuth}
            </button>
          </div>
        )}
      </section>
      {twitchConnected && (
        <section className={panel}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{m.live}</h2>
            <button
              className={button}
              onClick={() =>
                void action(() => creatorRequest("/live/refresh", "POST"))
              }
            >
              <RefreshCw size={15} />
              {m.refresh}
            </button>
          </div>
          <p className="mt-4 text-sm text-zinc-300">
            {workspace?.live
              ? `${workspace.live.title} · ${workspace.live.viewer_count} ${m.viewers}`
              : m.offline}
          </p>
          {workspace?.live && (
            <button
              className={`${button} mt-3`}
              onClick={() =>
                void action(() => creatorRequest("/live/clip", "POST"))
              }
            >
              <Scissors size={15} />
              {m.clipLive}
            </button>
          )}
          <label className="mt-5 flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={workspace?.auto_clips || false}
              type="checkbox"
              onChange={(e) =>
                void action(() =>
                  creatorRequest("/live/auto-clips", "POST", {
                    enabled: e.target.checked,
                  }),
                )
              }
            />
            {m.auto}
          </label>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{m.autoNote}</p>
          {workspace?.live_error && (
            <p className="mt-2 text-xs text-red-300">
              {m.error} ({workspace.live_error})
            </p>
          )}
        </section>
      )}
      {!!workspace?.official_clips.length && (
        <section className={panel}>
          <h2 className="text-lg font-semibold">{m.official}</h2>
          {workspace.official_clips.map((clip) => (
            <div
              key={clip.id}
              className="mt-3 flex items-center justify-between gap-3 text-sm"
            >
              <span>{clip.confirmed ? clip.title || "Twitch" : m.pending}</span>
              <button
                className={button}
                onClick={() =>
                  void action(() => external(clip.url || clip.edit_url))
                }
              >
                {m.open}
              </button>
            </div>
          ))}
        </section>
      )}
      {youtube?.state === "connected" && (
        <section className={panel}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{m.metrics}</h2>
            <button
              className={button}
              onClick={() =>
                void action(() => creatorRequest("/metrics/refresh", "POST"))
              }
            >
              {m.refresh}
            </button>
          </div>
          {workspace?.metrics[0]?.videos.length ? (
            <>
              <p className="mt-3 text-xs text-zinc-500">
                YouTube Data API ·{" "}
                {new Date(workspace.metrics[0].fetched_at).toLocaleString(
                  locale,
                )}
              </p>
              {workspace.metrics[0].videos.map((video) => (
                <p key={video.video_id} className="mt-2 text-sm text-zinc-300">
                  {workspace.clips.find(
                    (c) => c.publication.video_id === video.video_id,
                  )?.title || video.video_id}{" "}
                  · {video.statistics.viewCount || 0} {m.views} ·{" "}
                  {video.statistics.likeCount || 0} {m.likes}
                </p>
              ))}
            </>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">{m.metricsEmpty}</p>
          )}
        </section>
      )}
    </div>
  );
}
