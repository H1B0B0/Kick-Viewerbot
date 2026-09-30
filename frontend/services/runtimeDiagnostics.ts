import type { BotStatus, ConnectionStatus } from "./WebSocketService";

export interface RuntimeStatusCopy {
  launching: string;
  unavailable: string;
  waiting: string;
}

const ENGLISH_RUNTIME_COPY: RuntimeStatusCopy = {
  launching: "Launching local service…",
  unavailable: "Local service unavailable. Displayed metrics may be outdated.",
  waiting: "Local service connected. Waiting for status.",
};

export function displayRuntimeStatus(
  connection: ConnectionStatus,
  status?: BotStatus,
  activeConnections = 0,
  copy: RuntimeStatusCopy = ENGLISH_RUNTIME_COPY,
): Pick<BotStatus, "code" | "message" | "startup_progress"> {
  if (connection !== "connected") {
    return {
      code: connection === "connecting" ? "starting" : "error",
      message: connection === "connecting" ? copy.launching : copy.unavailable,
      startup_progress: 0,
    };
  }
  if (!status)
    return {
      code: "standby",
      message: copy.waiting,
      startup_progress: 0,
    };
  if (status.code === "running" && activeConnections <= 0) {
    return {
      code: "warning",
      message:
        "Process running, but no active connection is reported. This is not evidence of audience growth.",
      startup_progress: 0,
    };
  }
  return status;
}

// Deliberately export only known findings, never pasted lines, tokens or URLs.
export function analyzeRuntimeLogs(input: string): string[] {
  const findings: string[] = [];
  if (/Error getting stream URL/i.test(input))
    findings.push(
      "Stream lookup failed. The provided log does not establish the cause.",
    );
  if (/Failed to get WebSocket token/i.test(input))
    findings.push(
      "No WebSocket token was obtained. Authentication refusal, network failure and service changes cannot be distinguished from this message alone.",
    );
  if (/InvalidStatus.*has no attribute.*status_code/i.test(input))
    findings.push(
      "The error handler expects an attribute missing from InvalidStatus. This secondary exception masks the original handshake failure.",
    );
  if (
    /Bot is now running/i.test(input) &&
    /Failed to get WebSocket token|Error getting stream URL/i.test(input)
  )
    findings.push(
      "The process reports running alongside connection failures. Running does not confirm a successful connection.",
    );
  if (/Read-only file system/i.test(input))
    findings.push("The process attempted to write in a read-only directory.");
  if (!findings.length)
    findings.push(
      "No recognized diagnosis. These logs alone are insufficient; no cause has been inferred.",
    );
  return findings;
}
