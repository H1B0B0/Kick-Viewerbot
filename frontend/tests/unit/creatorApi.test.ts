import { afterEach, describe, expect, it, vi } from "vitest";
import { creatorRequest, CreatorApiError } from "../../services/creatorApi";
import {
  downloadNativeClip,
  synchronizeProviderConfig,
} from "../../services/creatorApi";
import { customAxios } from "../../app/functions/customFetch";
import { invoke } from "@tauri-apps/api/core";
import { creatorMessages } from "../../i18n/creatorMessages";

vi.mock("../../config/ports", () => ({
  getBackendEndpoint: vi.fn(async () => ({
    base_url: "http://127.0.0.1:8765",
    instance_nonce: "private-nonce",
  })),
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(async () => "/Downloads/VelBots-clip.mp4"),
}));
vi.mock("../../app/functions/customFetch", () => ({ customAxios: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe("creator API contract", () => {
  it("loads native OAuth clients using the authenticated VelBots transport and forwards only the contract", async () => {
    vi.mocked(customAxios).mockResolvedValueOnce({
      data: {
        protocol_version: 1,
        account_id: "owner",
        twitch: { kind: "public", client_id: "publicclient" },
        youtube: {
          kind: "desktop",
          client_id: "123-desktop.apps.googleusercontent.com",
          client_secret: "installed-test",
        },
        confidential_web_secret: "must-not-forward",
        access_token: "must-not-forward",
      },
      status: 200,
      headers: {},
    });
    const fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    await synchronizeProviderConfig();
    expect(customAxios).toHaveBeenCalledWith({
      method: "GET",
      url: "https://api.velbots.shop/creator/desktop-config",
    });
    const body = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(body[0]).toMatch(/\/creator\/accounts\/configure$/);
    expect(body[1].body).not.toContain("must-not-forward");
  });
  it("rejects a Web OAuth client or unsupported protocol before forwarding credentials", async () => {
    vi.mocked(customAxios).mockResolvedValueOnce({
      data: {
        protocol_version: 1,
        twitch: { kind: "public" },
        youtube: { kind: "web" },
      },
      status: 200,
      headers: {},
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(synchronizeProviderConfig()).rejects.toBeInstanceOf(
      CreatorApiError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("native exports send only a clip identifier, not arbitrary URLs or paths", async () => {
    expect(await downloadNativeClip("abcd")).toBe(
      "/Downloads/VelBots-clip.mp4",
    );
    expect(invoke).toHaveBeenCalledWith("export_creator_asset", {
      clipId: "abcd",
    });
  });
  it("authorizes JSON requests with the native instance nonce", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "job" }), { status: 202 }),
    );
    vi.stubGlobal("fetch", fetch);
    expect(
      await creatorRequest("/jobs", "POST", { source_id: "source" }),
    ).toEqual({ id: "job" });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/creator/jobs",
      expect.objectContaining({
        headers: {
          "X-VelBots-Nonce": "private-nonce",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_id: "source" }),
      }),
    );
  });
  it("does not override multipart boundaries", async () => {
    const fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    const data = new FormData();
    data.append("file", new Blob(["owned recording"]), "owned.mp4");
    await creatorRequest("/sources", "POST", data);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: data,
        headers: { "X-VelBots-Nonce": "private-nonce" },
      }),
    );
  });
  it("surfaces backend failure rather than claiming completion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "render_failed" }), {
            status: 400,
          }),
      ),
    );
    await expect(creatorRequest("/jobs", "POST", {})).rejects.toBeInstanceOf(
      CreatorApiError,
    );
  });
  it("has every creator label in all five languages", () => {
    for (const messages of Object.values(creatorMessages)) {
      expect(Object.keys(messages).sort()).toEqual(
        Object.keys(creatorMessages.en).sort(),
      );
      expect(
        Object.values(messages).every((value) => value.trim().length > 0),
      ).toBe(true);
    }
  });
});
