import { describe, expect, it } from "vitest";
import {
  analyzeRuntimeLogs,
  displayRuntimeStatus,
} from "../../services/runtimeDiagnostics";

describe("runtime diagnostics", () => {
  it("does not present disconnected cached metrics as healthy", () => {
    expect(displayRuntimeStatus("disconnected").code).toBe("error");
    expect(displayRuntimeStatus("connecting").code).toBe("starting");
  });
  it("does not equate process running with a successful connection", () => {
    expect(
      displayRuntimeStatus(
        "connected",
        {
          code: "running",
          message: "running",
          startup_progress: 100,
          proxy_loading_progress: 100,
        },
        0,
      ).code,
    ).toBe("warning");
  });
  it("identifies the secondary exception without exposing raw data", () => {
    const report = analyzeRuntimeLogs(
      "secret=abc123 https://private.example\nInvalidStatus object has no attribute status_code\nFailed to get WebSocket token\nBot is now running",
    ).join("\n");
    expect(report).toContain("secondary exception");
    expect(report).toContain("Running does not confirm");
    expect(report).not.toContain("abc123");
    expect(report).not.toContain("private.example");
  });
});
