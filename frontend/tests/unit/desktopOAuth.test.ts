import { isTauri } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { customAxios } from "../../app/functions/customFetch";
import { openExternal } from "../../app/functions/openExternal";
import {
  AuthCapabilities,
  handleOAuthCallback,
  startDesktopOAuth,
} from "../../auth/desktopOAuth";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppLocalData: 16 },
  readTextFile: vi.fn().mockRejectedValue(new Error("file not found")),
  remove: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../app/functions/customFetch", () => ({
  customAxios: vi.fn(),
}));

vi.mock("../../app/functions/openExternal", () => ({
  openExternal: vi.fn(),
}));

const capabilities: AuthCapabilities = {
  protocol_version: 1,
  patreon: {
    enabled: true,
    authorize_endpoint: "/auth/desktop/patreon/start",
    exchange_endpoint: "/auth/desktop/patreon/exchange",
  },
};

describe("desktop Patreon OAuth", () => {
  beforeEach(() => {
    const values = new Map<string, string>();

    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.clearAllMocks();
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it("explains that browser-only development cannot receive the desktop callback", async () => {
    vi.mocked(isTauri).mockReturnValue(false);

    await expect(startDesktopOAuth(capabilities)).rejects.toThrow(
      "npm run tauri dev",
    );
    expect(customAxios).not.toHaveBeenCalled();
  });

  it("keeps the PKCE verifier out of the OAuth state", async () => {
    vi.mocked(customAxios).mockResolvedValueOnce({
      data: { authorization_url: "https://www.patreon.com/oauth2/authorize" },
      status: 200,
      headers: new Headers(),
    });

    await startDesktopOAuth(capabilities);

    const authorizeRequest = vi.mocked(customAxios).mock.calls[0][0];
    const requestData = authorizeRequest.data as {
      state: string;
      code_challenge: string;
    };
    const storedTransaction = JSON.parse(
      localStorage.getItem("velbots.oauth.patreon.transaction.v1") || "{}",
    ) as { state: string; codeVerifier: string };

    expect(requestData.state).toBe(storedTransaction.state);
    expect(requestData.state).not.toContain(storedTransaction.codeVerifier);
    expect(requestData.code_challenge).not.toBe(storedTransaction.codeVerifier);
    expect(openExternal).toHaveBeenCalledWith(
      "https://www.patreon.com/oauth2/authorize",
      { preferChrome: true },
    );
  });

  it("exchanges a valid deep-link callback and clears the transaction", async () => {
    vi.mocked(customAxios)
      .mockResolvedValueOnce({
        data: { authorization_url: "https://www.patreon.com/oauth2/authorize" },
        status: 200,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: new Headers(),
      });

    await startDesktopOAuth(capabilities);

    const transaction = JSON.parse(
      localStorage.getItem("velbots.oauth.patreon.transaction.v1") || "{}",
    ) as { state: string; codeVerifier: string };
    const callback = new URL("velbots://oauth/callback");

    callback.searchParams.set("code", "single-use-code");
    callback.searchParams.set("state", transaction.state);

    await expect(
      handleOAuthCallback(callback.toString(), capabilities),
    ).resolves.toBe(true);

    const exchangeRequest = vi.mocked(customAxios).mock.calls[1][0];

    expect(exchangeRequest.data).toEqual({
      code: "single-use-code",
      code_verifier: transaction.codeVerifier,
      state: transaction.state,
    });
    expect(
      localStorage.getItem("velbots.oauth.patreon.transaction.v1"),
    ).toBeNull();
  });

  it("rejects a callback whose state does not match", async () => {
    vi.mocked(customAxios).mockResolvedValueOnce({
      data: { authorization_url: "https://www.patreon.com/oauth2/authorize" },
      status: 200,
      headers: new Headers(),
    });

    await startDesktopOAuth(capabilities);

    await expect(
      handleOAuthCallback(
        "velbots://oauth/callback?code=single-use-code&state=attacker-state",
        capabilities,
      ),
    ).rejects.toThrow("OAuth state mismatch");
    expect(customAxios).toHaveBeenCalledTimes(1);
  });
});
