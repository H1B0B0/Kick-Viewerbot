export interface ClipCapability {
  platform: "Kick" | "Twitch" | "YouTube";
  description: string;
  supportedInBeta: boolean;
}

export const CLIP_CAPABILITIES: readonly ClipCapability[] = [
  {
    platform: "Kick",
    description:
      "Marker and review export only. This beta does not use a Kick clip-creation endpoint.",
    supportedInBeta: false,
  },
  {
    platform: "Twitch",
    description:
      "Official clip creation needs a connected account with the clips:edit scope. The OAuth integration is not enabled in this beta.",
    supportedInBeta: false,
  },
  {
    platform: "YouTube",
    description:
      "Marker and review export only. This beta does not create YouTube clips or uploads.",
    supportedInBeta: false,
  },
];
