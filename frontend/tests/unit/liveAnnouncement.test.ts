import { describe, expect, it } from "vitest";
import { buildAnnouncement } from "../../services/liveAnnouncement";

describe("live announcement", () => {
  it.each([
    ["Kick", "https://kick.com/creator"],
    ["Twitch", "https://www.twitch.tv/creator"],
    ["YouTube", "https://youtube.com/watch?v=video"],
  ] as const)("prepares a manual %s draft", (platform, url) => {
    expect(
      buildAnnouncement(platform, "Live coding", "20:00 Europe/Paris", url),
    ).toContain(url);
  });
  it.each([
    "https://kick.com.attacker.example/creator",
    "javascript:alert(1)",
    "https://user:secret@kick.com/creator",
    "https://twitch.tv/creator",
  ])("rejects wrong or unsafe links: %s", (url) => {
    expect(() => buildAnnouncement("Kick", "Topic", "Tomorrow", url)).toThrow();
  });
});
