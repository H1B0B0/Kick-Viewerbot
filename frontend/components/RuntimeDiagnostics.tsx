"use client";

import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { analyzeRuntimeLogs } from "../services/runtimeDiagnostics";

export function RuntimeDiagnostics() {
  const { t } = useLocale();
  const [logs, setLogs] = useState("");
  const [report, setReport] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  return (
    <details className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
      <summary className="cursor-pointer">{t("diagnostics")}</summary>
      <p className="my-3 text-zinc-500">{t("diagnosticsBody")}</p>
      <textarea
        aria-label={t("backendExcerpt")}
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
          {t("analyze")}
        </button>
        <button
          type="button"
          onClick={() => {
            setLogs("");
            setReport("");
            setCopyStatus("");
          }}
        >
          {t("clear")}
        </button>
        {report && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(report);
                setCopyStatus(t("reportCopied"));
              } catch {
                setCopyStatus(t("reportCopyUnavailable"));
              }
            }}
          >
            {t("copyReport")}
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
