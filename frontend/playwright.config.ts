import { defineConfig, devices } from "@playwright/test";

process.env.VELBOTS_CREATOR_E2E ??= "1";

const pythonExecutable =
  process.env.VELBOTS_E2E_PYTHON ||
  (process.platform === "win32"
    ? ".venv\\Scripts\\python.exe"
    : ".venv/bin/python");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `${pythonExecutable} -m backend.main --dev --port 8765`,
      url: "http://127.0.0.1:8765/health",
      cwd: "..",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npx next dev -p 3002",
      url: "http://localhost:3002",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
