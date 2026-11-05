import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("real recording → vertical MP4 → preview → download, in five languages", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.VELBOTS_CREATOR_E2E !== "1",
    "Requires the real local creator backend and frontend servers.",
  );
  test.setTimeout(120_000);
  // Remote paid identity and absent publisher OAuth applications are stubbed.
  // Every local /creator request, job, preview and download uses the real backend.
  await page.route("https://api.velbots.shop/**", (route) => {
    const config =
      new URL(route.request().url()).pathname === "/creator/desktop-config";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        config
          ? {
              protocol_version: 1,
              account_id: "qa-owner",
              twitch: { kind: "public", client_id: "" },
              youtube: { kind: "desktop", client_id: "", client_secret: "" },
            }
          : {
              user: { username: "Creator QA", isSubscribed: true },
            },
      ),
    });
  });
  await page.goto(process.env.VELBOTS_E2E_URL || "http://localhost:3002");
  const language = page.getByRole("combobox", {
    name: /Language|Langue|Idioma|Sprache/,
  });
  await language.selectOption("en");
  await expect(
    page.getByRole("button", { name: "Import & create clips", exact: true }),
  ).toBeEnabled({ timeout: 60_000 });
  await expect(
    page.getByRole("heading", {
      name: "Automatic clips from recordings",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Automatic folder watching is available in the desktop app.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh connections", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }).first(),
  ).toBeDisabled();
  const directory = mkdtempSync(join(tmpdir(), "velbots-owned-recording-"));
  const source = join(directory, "owned-stream.mp4");
  const encoder =
    process.env.VELBOTS_E2E_FFMPEG ||
    execFileSync(
      process.env.VELBOTS_E2E_PYTHON ||
        (process.platform === "win32"
          ? "../.venv/Scripts/python.exe"
          : "../.venv/bin/python"),
      ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
      { encoding: "utf8" },
    ).trim();
  execFileSync(encoder, [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=640x360:rate=15",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=800:sample_rate=8000",
    "-t",
    "6",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    source,
  ]);
  await page
    .getByLabel("Import & create clips", { exact: true })
    .setInputFiles(source);
  const video = page.locator("video").first();
  await expect(video).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(() =>
      video.evaluate((element) => ({
        width: (element as HTMLVideoElement).videoWidth,
        height: (element as HTMLVideoElement).videoHeight,
      })),
    )
    .toEqual({ width: 720, height: 1280 });
  await video.evaluate((element) => (element as HTMLVideoElement).play());
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);
  await video.evaluate((element) => (element as HTMLVideoElement).pause());
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download MP4", exact: true })
    .first()
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.mp4$/);
  await download.saveAs(testInfo.outputPath("verified-vertical-clip.mp4"));
  for (const [locale, title] of [
    ["fr", "Transformez vos lives en clips verticaux"],
    ["pt-BR", "Transforme suas lives em clipes verticais"],
    ["es", "Convierte tus directos en clips verticales"],
    ["de", "Aus Streams werden vertikale Clips"],
    ["en", "Turn your streams into vertical clips"],
  ]) {
    await language.selectOption(locale);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await language.selectOption("fr");
  await page.screenshot({
    path: testInfo.outputPath("creator-studio-fr.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
