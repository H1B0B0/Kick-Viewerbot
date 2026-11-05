export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface StudioRuntimeStatus {
  code: "starting" | "standby" | "ready" | "warning" | "error";
  message: string;
  encoder_ready?: boolean;
}

export interface RuntimeStatusCopy {
  launching: string;
  unavailable: string;
  waiting: string;
}

const ENGLISH_RUNTIME_COPY: RuntimeStatusCopy = {
  launching: "Launching local Creator Studio service…",
  unavailable:
    "Local Creator Studio service unavailable. Displayed state may be outdated.",
  waiting: "Local Creator Studio connected. Waiting for workspace status.",
};

export function displayRuntimeStatus(
  connection: ConnectionStatus,
  status?: StudioRuntimeStatus,
  encoderReady = true,
  copy: RuntimeStatusCopy = ENGLISH_RUNTIME_COPY,
): Pick<StudioRuntimeStatus, "code" | "message"> {
  if (connection !== "connected") {
    return {
      code: connection === "connecting" ? "starting" : "error",
      message: connection === "connecting" ? copy.launching : copy.unavailable,
    };
  }
  if (!status) {
    return {
      code: "standby",
      message: copy.waiting,
    };
  }
  if (status.code === "ready" && !encoderReady) {
    return {
      code: "warning",
      message:
        "Local sidecar connected, but FFmpeg encoder is not ready. Vertical clip rendering is unavailable.",
    };
  }

  return {
    code: status.code,
    message: status.message,
  };
}

// Deliberately export only known findings, never pasted lines, tokens or URLs.
export function analyzeRuntimeLogs(input: string): string[] {
  const findings: string[] = [];

  if (/encoder_unavailable|ffmpeg.*not found|No such file.*ffmpeg/i.test(input))
    findings.push(
      "FFmpeg video encoder is unavailable or could not be launched by the local sidecar.",
    );
  if (
    /invalid_folder|recording_folder|PermissionError|Read-only file system/i.test(
      input,
    )
  )
    findings.push(
      "The local process could not read or write to the selected recording or workspace directory.",
    );
  if (
    /oauth_state_invalid|oauth_denied|provider_not_configured|provider_token_unavailable/i.test(
      input,
    )
  )
    findings.push(
      "OAuth authorization or platform credentials could not be verified for Twitch or YouTube.",
    );
  if (/invalid_instance_nonce|unauthorized/i.test(input))
    findings.push(
      "The local sidecar rejected a request due to an instance nonce mismatch. Restart the desktop app to resynchronize.",
    );
  if (/render_failed|unreadable_media|unsupported_format/i.test(input))
    findings.push(
      "Media analysis or vertical 9:16 clip rendering failed on the imported recording.",
    );
  if (!findings.length)
    findings.push(
      "No recognized diagnosis. These logs alone are insufficient; no cause has been inferred.",
    );

  return findings;
}
