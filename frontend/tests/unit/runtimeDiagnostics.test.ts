import { describe, expect, it } from "vitest";
import {
  analyzeRuntimeLogs,
  displayRuntimeStatus,
} from "../../services/runtimeDiagnostics";

describe("creator studio runtime diagnostics", () => {
  it("does not present disconnected cached state as healthy", () => {
    expect(displayRuntimeStatus("disconnected").code).toBe("error");
    expect(displayRuntimeStatus("connecting").code).toBe("starting");
  });

  it("warns when the local sidecar is connected but the FFmpeg encoder is unavailable", () => {
    expect(
      displayRuntimeStatus(
        "connected",
        {
          code: "ready",
          message: "ready",
          encoder_ready: false,
        },
        false,
      ).code,
    ).toBe("warning");
  });

  it("identifies creator studio issues without exposing raw secrets or URLs", () => {
    const report = analyzeRuntimeLogs(
      "token=secret_abc123 https://private.example\nencoder_unavailable\noauth_state_invalid\nRead-only file system",
    ).join("\n");
    expect(report).toContain("FFmpeg video encoder");
    expect(report).toContain("OAuth authorization");
    expect(report).toContain("recording or workspace directory");
    expect(report).not.toContain("secret_abc123");
    expect(report).not.toContain("private.example");
  });
});
