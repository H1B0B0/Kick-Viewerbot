"use client";

import { useState } from "react";
import { analyzeRuntimeLogs } from "../services/runtimeDiagnostics";

export function RuntimeDiagnostics() {
  const [logs, setLogs] = useState("");
  const [report, setReport] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  return (
    <details className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
      <summary className="cursor-pointer">Local diagnostics</summary>
      <p className="my-3 text-zinc-500">
        Paste an error excerpt. Analysis stays on this device and is not saved.
        The report contains known findings only, without raw logs or
        credentials.
      </p>
      <textarea
        aria-label="Backend error excerpt"
        className="w-full rounded bg-zinc-900 p-3"
        maxLength={50000}
        rows={5}
        value={logs}
        onChange={(event) => {
          setLogs(event.target.value);
          setReport("");
          setCopyStatus("");
        }}
      />
      <div className="my-3 flex gap-4">
        <button
          type="button"
          disabled={!logs.trim()}
          onClick={() => setReport(analyzeRuntimeLogs(logs).join("\n\n"))}
        >
          Analyze logs
        </button>
        <button
          type="button"
          onClick={() => {
            setLogs("");
            setReport("");
            setCopyStatus("");
          }}
        >
          Clear excerpt
        </button>
        {report && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(report);
                setCopyStatus("Report copied.");
              } catch {
                setCopyStatus(
                  "Copy unavailable. Select the report text below.",
                );
              }
            }}
          >
            Copy safe report
          </button>
        )}
      </div>
      <p role="status">{copyStatus}</p>
      <p className="whitespace-pre-wrap" aria-live="polite">
        {report}
      </p>
    </details>
  );
}
