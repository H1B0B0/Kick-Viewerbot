export const LIVE_PLATFORMS = ["Kick", "Twitch", "YouTube"] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export function buildAnnouncement(
  platform: LivePlatform,
  topic: string,
  when: string,
  link: string,
): string {
  if (!topic.trim() || !when.trim())
    throw new Error("Add a topic and a date/time with timezone.");
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new Error("Enter a full HTTPS channel or live URL.");
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
    throw new Error(`Use a channel or live URL on ${platform}.`);
  }
  return `${topic.trim()}\nLive on ${platform} — ${when.trim()}\n${url.href}\nCome chat and bring your questions!`;
}
