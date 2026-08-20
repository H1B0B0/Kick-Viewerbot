"use client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../functions/UserAPI";
import { LayoutDashboard, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const formData = new FormData(e.currentTarget);
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      await login({ username, password });

      toast.success("Successfully logged in!", { theme: "dark" });
      router.push("/");
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred";
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          errorMessage = "Invalid username or password";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      toast.error(errorMessage, { theme: "dark" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-300 font-sans selection:bg-green-500/30">
      <ToastContainer position="bottom-right" />
      
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
            <LayoutDashboard className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Access Terminal</h2>
          <p className="text-zinc-500 mt-2 text-sm">Sign in to your KickViewerBOT engine</p>
        </div>

        <div className="bg-black border border-zinc-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50" />
          
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-zinc-600" />
                </div>
                <input 
                  type="text" name="username" required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 text-white placeholder-zinc-700 transition-all"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-600" />
                </div>
                <input 
                  type="password" name="password" required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 text-white placeholder-zinc-700 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full py-3 mt-4 bg-green-500 hover:bg-green-400 text-black font-bold text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
              ) : "AUTHENTICATE"}
            </button>
            
            <div className="relative py-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <span className="relative px-3 bg-black text-xs text-zinc-600 uppercase tracking-widest font-semibold">Or use</span>
            </div>

            <button 
              type="button" 
              onClick={() => window.location.href = "https://api.velbots.shop/payments/patreon/redirect"}
              className="w-full py-2.5 bg-[#FF424D]/10 hover:bg-[#FF424D]/20 border border-[#FF424D]/30 text-[#FF424D] font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
              </svg>
              Patreon Login
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-600">No clearance? </span>
          <button onClick={() => router.push("/register")} className="text-green-500 hover:text-green-400 font-semibold transition-colors">
            Register new agent
          </button>
        </div>
      </div>
    </div>
  );
}
