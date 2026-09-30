import { describe, expect, it } from "vitest";

import { CLIP_CAPABILITIES } from "../../services/clipCapabilities";

describe("clip capabilities", () => {
  it("does not advertise automatic clip creation before an official integration exists", () => {
    expect(CLIP_CAPABILITIES).toHaveLength(3);
    expect(
      CLIP_CAPABILITIES.every((capability) => !capability.supportedInBeta),
    ).toBe(true);
  });

  it("states the required Twitch permission accurately", () => {
    expect(
      CLIP_CAPABILITIES.find((item) => item.platform === "Twitch")?.description,
    ).toContain("clips:edit");
  });
});
