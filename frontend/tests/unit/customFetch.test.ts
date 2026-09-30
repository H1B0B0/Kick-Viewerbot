import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { customAxios } from "../../app/functions/customFetch";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

describe("Tauri API transport", () => {
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

  it("persists session cookies and sends the CSRF token on later writes", async () => {
    vi.mocked(tauriFetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ loggedIn: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "set-cookie":
              "access_token_cookie=session-token; Path=/; HttpOnly, csrf_access_token=csrf-token; Path=/",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ refreshed: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await customAxios({
      method: "POST",
      url: "https://api.velbots.shop/auth/login",
      data: { username: "creator", password: "redacted" },
    });
    await customAxios({
      method: "POST",
      url: "https://api.velbots.shop/users/refresh-patreon",
      data: {},
    });

    const secondRequest = vi.mocked(tauriFetch).mock.calls[1][1];
    const headers = secondRequest?.headers as Headers;

    expect(headers.get("Cookie")).toContain(
      "access_token_cookie=session-token",
    );
    expect(headers.get("Cookie")).toContain("csrf_access_token=csrf-token");
    expect(headers.get("X-CSRF-TOKEN")).toBe("csrf-token");
  });
});
