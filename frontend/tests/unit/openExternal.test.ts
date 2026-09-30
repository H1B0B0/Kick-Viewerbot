import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { openExternal } from "../../app/functions/openExternal";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

describe("openExternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTauri).mockReturnValue(true);
    vi.stubGlobal("navigator", { platform: "MacIntel" });
  });

  it("opens OAuth in Google Chrome on macOS when requested", async () => {
    vi.mocked(openUrl).mockResolvedValue(undefined);

    await openExternal("https://www.patreon.com/oauth2/authorize", {
      preferChrome: true,
    });

    expect(openUrl).toHaveBeenCalledWith(
      "https://www.patreon.com/oauth2/authorize",
      "Google Chrome",
    );
  });

  it("falls back to the default browser when Chrome is unavailable", async () => {
    vi.mocked(openUrl)
      .mockRejectedValueOnce(new Error("Chrome not found"))
      .mockResolvedValueOnce(undefined);

    await openExternal("https://www.patreon.com/oauth2/authorize", {
      preferChrome: true,
    });

    expect(openUrl).toHaveBeenNthCalledWith(
      1,
      "https://www.patreon.com/oauth2/authorize",
      "Google Chrome",
    );
    expect(openUrl).toHaveBeenNthCalledWith(
      2,
      "https://www.patreon.com/oauth2/authorize",
    );
  });
});
