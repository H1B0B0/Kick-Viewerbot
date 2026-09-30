"use client";

import { useState } from "react";
import {
  buildAnnouncement,
  LIVE_PLATFORMS,
  type LivePlatform,
} from "../services/liveAnnouncement";
import { useLocale } from "../i18n/LocaleProvider";

export function LiveAnnouncement() {
  const { t } = useLocale();
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
        {t("announcementTitle")}
      </h4>
      <p className="text-xs text-zinc-500">{t("announcementBody")}</p>
      <label className="block text-xs text-zinc-400">
        {t("platform")}
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
        {t("topic")}
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
        {t("dateTime")}
        <input
          className={fieldClass}
          maxLength={120}
          placeholder={t("dateTimePlaceholder")}
          value={when}
          onChange={(event) => {
            setWhen(event.target.value);
            setDraft("");
            setFeedback("");
          }}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        {t("channelUrl")}
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
            setDraft(
              buildAnnouncement(platform, topic, when, link, {
                missingDetails: t("missingDetails"),
                invalidUrl: t("invalidUrl"),
                platformUrl: (target) => t("platformUrl", { platform: target }),
                liveLine: (target, scheduledAt) =>
                  t("liveLine", { platform: target, when: scheduledAt }),
                callToAction: t("callToAction"),
              }),
            );
            setFeedback("");
          } catch (error) {
            setDraft("");
            setFeedback(
              error instanceof Error ? error.message : t("prepareError"),
            );
          }
        }}
      >
        {t("prepareDraft")}
      </button>
      {draft && (
        <>
          <label className="block text-xs text-zinc-400">
            {t("reviewDraft")}
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
                setFeedback(t("copied"));
              } catch {
                setFeedback(t("copyUnavailable"));
              }
            }}
          >
            {t("copyDraft")}
          </button>
        </>
      )}
      <p role="status" className="text-xs text-zinc-400">
        {feedback}
      </p>
    </div>
  );
}
