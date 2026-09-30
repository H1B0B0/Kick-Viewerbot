"use client";

import { useState } from "react";
import {
  buildAnnouncement,
  LIVE_PLATFORMS,
  type LivePlatform,
} from "../services/liveAnnouncement";

export function LiveAnnouncement() {
  const [platform, setPlatform] = useState<LivePlatform>("Kick");
  const [topic, setTopic] = useState("");
  const [when, setWhen] = useState("");
  const [link, setLink] = useState("");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const fieldClass =
    "w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100";

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <h4 className="text-sm font-medium text-white">
        Plan your next live announcement
      </h4>
      <p className="text-xs text-zinc-500">
        Prepare a draft for your community, then review and publish it yourself.
        Works without a connected platform account. This draft is not saved
        after closing the page.
      </p>
      <label className="block text-xs text-zinc-400">
        Platform
        <select
          className={fieldClass}
          value={platform}
          onChange={(event) => {
            setPlatform(event.target.value as LivePlatform);
            setDraft("");
            setFeedback("");
          }}
        >
          {LIVE_PLATFORMS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Topic / reason to watch
        <input
          className={fieldClass}
          maxLength={200}
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            setDraft("");
            setFeedback("");
          }}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Date, time and timezone
        <input
          className={fieldClass}
          maxLength={120}
          placeholder="25 September, 20:00 Europe/Paris"
          value={when}
          onChange={(event) => {
            setWhen(event.target.value);
            setDraft("");
            setFeedback("");
          }}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Channel or live URL
        <input
          className={fieldClass}
          type="url"
          maxLength={2000}
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setDraft("");
            setFeedback("");
          }}
        />
      </label>
      <button
        className="rounded bg-white px-3 py-2 text-sm text-black"
        type="button"
        onClick={() => {
          try {
            setDraft(buildAnnouncement(platform, topic, when, link));
            setFeedback("");
          } catch (error) {
            setDraft("");
            setFeedback(
              error instanceof Error
                ? error.message
                : "Unable to prepare draft.",
            );
          }
        }}
      >
        Prepare draft
      </button>
      {draft && (
        <>
          <label className="block text-xs text-zinc-400">
            Review and edit before sharing
            <textarea
              className={fieldClass}
              rows={6}
              maxLength={5000}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setFeedback("");
              }}
            />
          </label>
          <button
            className="text-sm text-emerald-400"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(draft);
                setFeedback(
                  "Copied. You can now publish it in your community.",
                );
              } catch {
                setFeedback(
                  "Copy unavailable. Select and copy the draft manually.",
                );
              }
            }}
          >
            Copy reviewed draft
          </button>
        </>
      )}
      <p role="status" className="text-xs text-zinc-400">
        {feedback}
      </p>
    </div>
  );
}
