import { shouldCheckForDesktopUpdate } from "../../services/desktopUpdater";
import { describe, expect, it } from "vitest";

describe("desktop updater policy", () => {
  it("disables remote update checks during Tauri development", () => {
    // Given: the UI runs inside Tauri with a development Next build.
    // When: the updater policy is evaluated.
    const enabled = shouldCheckForDesktopUpdate(true, "development");

    // Then: no release manifest request should be made.
    expect(enabled).toBe(false);
  });

  it("enables remote update checks for packaged desktop builds", () => {
    // Given: the UI runs inside a packaged production Tauri build.
    // When: the updater policy is evaluated.
    const enabled = shouldCheckForDesktopUpdate(true, "production");

    // Then: the signed updater channel may be queried.
    expect(enabled).toBe(true);
  });

  it("disables desktop updates in a regular browser", () => {
    // Given: the frontend runs outside Tauri.
    // When: the updater policy is evaluated.
    const enabled = shouldCheckForDesktopUpdate(false, "production");

    // Then: native updater APIs remain unused.
    expect(enabled).toBe(false);
  });
});
