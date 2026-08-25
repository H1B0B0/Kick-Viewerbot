"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../functions/UserAPI";
import { openExternal } from "../functions/openExternal";
import { useDesktopOAuth } from "../../hooks/useDesktopOAuth";
import { startDesktopOAuth } from "../../auth/desktopOAuth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { capabilities, isProcessing: isOAuthProcessing, error: oauthError } = useDesktopOAuth();
  const patreonEnabled = capabilities?.patreon?.enabled || false;

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const formData = new FormData(e.currentTarget);
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      await login({ username, password });
      router.push("/");
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred";
      if (err instanceof Error) {
        errorMessage = err.message.includes("401") ? "Invalid username or password" : err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Sign in</h2>
          <p className="text-zinc-400 mt-1 text-sm">Enter your credentials to access the engine</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          {error && <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">{error}</div>}
          {oauthError && <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">{oauthError}</div>}
          
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="text-sm font-medium text-zinc-300">Username</label>
            <input id="login-username" type="text" name="username" required className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-zinc-300">Password</label>
            <input id="login-password" type="password" name="password" required className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors" />
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-2 mt-2 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-md transition-colors disabled:opacity-50">
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
            <div className="relative flex justify-center"><span className="bg-[#09090b] px-2 text-xs text-zinc-500">Or continue with</span></div>
          </div>

          <button
            type="button"
            disabled={!patreonEnabled || isOAuthProcessing}
            onClick={() => void startDesktopOAuth(capabilities!)}
            className="w-full py-2 bg-[#FF424D] hover:bg-[#E8384C] text-white font-medium text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={patreonEnabled ? "" : "Patreon OAuth is not currently supported by the API"}
          >
            {isOAuthProcessing ? "Connecting..." : "Patreon"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account? <button onClick={() => router.push("/register")} className="text-white hover:underline">Sign up</button>
        </div>
      </div>
    </div>
  );
}
