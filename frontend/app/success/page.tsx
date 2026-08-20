"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Fire confetti on load
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#84cc16', '#10b981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#84cc16', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-300 font-sans selection:bg-green-500/30">
      <div className="w-full max-w-md bg-black border border-zinc-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50" />
        <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] bg-green-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Authorization Complete</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Your account has been successfully verified. You now have full clearance to access the Engine Dashboard.
        </p>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-between text-xs font-mono mb-8">
          <span className="text-zinc-500">STATUS</span>
          <span className="text-green-400 font-bold">VERIFIED</span>
        </div>

        <button 
          onClick={() => router.push("/")}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] flex items-center justify-center gap-2"
        >
          ENTER DASHBOARD <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
