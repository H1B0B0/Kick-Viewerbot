"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, RefreshCcw, ArrowLeft, ExternalLink } from "lucide-react";
import { openExternal } from "../functions/openExternal";
import { useDesktopOAuth } from "../../hooks/useDesktopOAuth";
import { startDesktopOAuth } from "../../auth/desktopOAuth";

export const dynamic = "force-dynamic";

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>}>
      <ErrorPageContent />
    </Suspense>
  );
}

function ErrorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "An error occurred during authentication";
  const { capabilities, isProcessing: isOAuthProcessing, error: oauthError } = useDesktopOAuth();
  const patreonEnabled = capabilities?.patreon?.enabled || false;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-300 font-sans selection:bg-red-500/30">
      <div className="w-full max-w-lg bg-black border border-zinc-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
        <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Authorization Failed</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">{errorMessage}</p>
        </div>

        <div className="space-y-2 mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Diagnostic Information</h3>
          <ul className="space-y-2 text-sm text-zinc-400 font-medium">
            <li className="flex items-center gap-2"><span className="text-red-400">✗</span> No active Patreon subscription</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✗</span> OAuth authorization denied</li>
            <li className="flex items-center gap-2"><span className="text-zinc-500">-</span> Account linking error</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            disabled={!patreonEnabled || isOAuthProcessing}
            onClick={() => void startDesktopOAuth(capabilities!)}
            className="w-full py-3 bg-[#FF424D]/10 hover:bg-[#FF424D]/20 border border-[#FF424D]/30 text-[#FF424D] font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={patreonEnabled ? "" : "Patreon OAuth is not currently supported by the API"}
          >
            <RefreshCcw className="w-4 h-4" /> {isOAuthProcessing ? "Connecting..." : "Try Again with Patreon"}
          </button>
          {oauthError && <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">{oauthError}</div>}
          
          <button 
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>

        <div className="mt-8 text-center border-t border-zinc-900 pt-6">
          <p className="text-xs text-zinc-600 mb-2">Need assistance with your clearance?</p>
          <a href="https://github.com/H1B0B0/Kick-Viewerbot/issues" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 font-semibold transition-colors">
            Contact Support <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
