export interface ClipCapability {
  platform: "Kick" | "Twitch" | "YouTube";
  descriptionKey: "kickClip" | "twitchClip" | "youtubeClip";
  requiredScope?: "clips:edit";
  supportedInBeta: boolean;
}

export const CLIP_CAPABILITIES: readonly ClipCapability[] = [
  {
    platform: "Kick",
    descriptionKey: "kickClip",
    supportedInBeta: false,
  },
  {
    platform: "Twitch",
    descriptionKey: "twitchClip",
    requiredScope: "clips:edit",
    supportedInBeta: false,
  },
  {
    platform: "YouTube",
    descriptionKey: "youtubeClip",
    supportedInBeta: false,
  },
];
