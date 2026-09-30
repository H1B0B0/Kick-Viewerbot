export const LIVE_PLATFORMS = ["Kick", "Twitch", "YouTube"] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export interface AnnouncementCopy {
  missingDetails: string;
  invalidUrl: string;
  platformUrl: (platform: LivePlatform) => string;
  liveLine: (platform: LivePlatform, when: string) => string;
  callToAction: string;
}

const ENGLISH_COPY: AnnouncementCopy = {
  missingDetails: "Add a topic and a date/time with timezone.",
  invalidUrl: "Enter a full HTTPS channel or live URL.",
  platformUrl: (platform) => `Use a channel or live URL on ${platform}.`,
  liveLine: (platform, when) => `Live on ${platform} — ${when}`,
  callToAction: "Come chat and bring your questions!",
};

export function buildAnnouncement(
  platform: LivePlatform,
  topic: string,
  when: string,
  link: string,
  copy: AnnouncementCopy = ENGLISH_COPY,
): string {
  if (!topic.trim() || !when.trim()) throw new Error(copy.missingDetails);
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new Error(copy.invalidUrl);
  }
  const domains = {
    Kick: ["kick.com"],
    Twitch: ["twitch.tv"],
    YouTube: ["youtube.com", "youtu.be"],
  };
  const host = url.hostname.replace(/^www\./, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !domains[platform].includes(host) ||
    url.pathname === "/"
  ) {
    throw new Error(copy.platformUrl(platform));
  }
  return `${topic.trim()}\n${copy.liveLine(platform, when.trim())}\n${url.href}\n${copy.callToAction}`;
}
