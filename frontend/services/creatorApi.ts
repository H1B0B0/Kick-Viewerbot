import { invoke, isTauri } from "@tauri-apps/api/core";

import { getBackendEndpoint } from "../config/ports";
import { customAxios } from "../app/functions/customFetch";

export interface Source {
  id: string;
  name: string;
  duration: number;
}
export interface Job {
  id: string;
  source_id: string;
  state: string;
  progress: number;
  error?: string;
  length: number;
  count: number;
  framing?: "blurred" | "crop";
  start?: number | null;
}
export interface Publication {
  state: string;
  error?: string;
  url?: string;
  privacy?: string;
  video_id?: string;
}
export interface Clip {
  captions_url?: string;
  id: string;
  title: string;
  description: string;
  start: number;
  duration: number;
  reason: string;
  media_url: string;
  publication: Publication;
}
export interface Account {
  provider: string;
  configured: boolean;
  state: string;
  name?: string;
  url?: string;
  error?: string;
}
export interface Workspace {
  sources: Source[];
  jobs: Job[];
  clips: Clip[];
  accounts: Account[];
  encoder_ready: boolean;
  live: {
    id: string;
    title: string;
    viewer_count: number;
    fetched_at: string;
  } | null;
  live_error?: string;
  auto_clips: boolean;
  recording_automation: {
    enabled: boolean;
    folder: string;
    count: number;
    length: number;
    error?: string;
    processing: boolean;
    last_import?: string;
    settle_seconds: number;
  };
  official_clips: {
    id: string;
    title?: string;
    url?: string;
    edit_url: string;
    confirmed: boolean;
  }[];
  metrics: {
    fetched_at: string;
    videos: {
      video_id: string;
      statistics: { viewCount?: string; likeCount?: string };
    }[];
  }[];
}

export class CreatorApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function creatorRequest<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const endpoint = await getBackendEndpoint();
  const headers: Record<string, string> = {
    "X-VelBots-Nonce": endpoint.instance_nonce,
  };
  const form = data instanceof FormData;

  if (data && !form) headers["Content-Type"] = "application/json";
  const response = await fetch(endpoint.base_url + "/creator" + path, {
    method,
    headers,
    body: data ? (form ? (data as FormData) : JSON.stringify(data)) : undefined,
    signal: AbortSignal.timeout(form ? 900_000 : 60_000),
  });
  const body = await response.json();

  if (!response.ok) throw new CreatorApiError(body.error || "request_failed");

  return body as T;
}

export async function creatorMediaUrl(path: string): Promise<string> {
  return (await getBackendEndpoint()).base_url + path;
}

export async function downloadInventory(): Promise<string | null> {
  if (isTauri())
    return invoke<string>("export_creator_asset", { clipId: null });
  const endpoint = await getBackendEndpoint();
  const response = await fetch(endpoint.base_url + "/creator/export", {
    headers: { "X-VelBots-Nonce": endpoint.instance_nonce },
  });

  if (!response.ok) throw new CreatorApiError("export_failed");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "velbots-clips.csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return null;
}

export async function downloadNativeClip(clipId: string): Promise<string> {
  return invoke<string>("export_creator_asset", { clipId });
}

export async function synchronizeProviderConfig(): Promise<void> {
  // Uses the existing authenticated session transport. Never put session/provider tokens in local API payloads.
  const api =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.velbots.shop";
  const response = await customAxios<{
    protocol_version: number;
    account_id: string;
    twitch: { kind: string; client_id: string };
    youtube: { kind: string; client_id: string; client_secret?: string };
  }>({ method: "GET", url: `${api}/creator/desktop-config` });
  const config = response.data;

  if (
    !config ||
    config.protocol_version !== 1 ||
    config.twitch?.kind !== "public" ||
    config.youtube?.kind !== "desktop"
  )
    throw new CreatorApiError("invalid_provider_configuration");
  await creatorRequest("/accounts/configure", "POST", {
    protocol_version: 1,
    account_id: config.account_id,
    twitch: { kind: "public", client_id: config.twitch.client_id },
    youtube: {
      kind: "desktop",
      client_id: config.youtube.client_id,
      client_secret: config.youtube.client_secret || "",
    },
  });
}

export async function selectRecordingFolder(): Promise<string | null> {
  return invoke<string | null>("select_recording_folder");
}
