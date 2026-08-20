"use client";
import { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import { Download, X } from "lucide-react";

export default function UpdateProvider() {
  const { latestVersion, showToast, dismissUpdate } = useUpdateChecker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (showToast && latestVersion && !toastIdRef.current) {
      toastIdRef.current = toast(
        <div className="flex flex-col gap-2">
          <div className="font-bold text-green-400">Update Available!</div>
          <div className="text-xs text-zinc-300">Version {latestVersion.tag_name} is ready to download.</div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-3 py-1.5 hover:bg-green-500/30 transition-colors w-fit"
          >
            View Details
          </button>
        </div>,
        {
          position: "bottom-right",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          theme: "dark",
          className: "!bg-zinc-900 !border !border-green-500/30 !rounded-xl !shadow-2xl",
          onClose: () => {
            dismissUpdate();
            toastIdRef.current = null;
          },
        }
      );
    }

    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, [showToast, latestVersion, dismissUpdate]);

  const handleDownload = () => {
    if (latestVersion?.html_url) {
      window.open(latestVersion.html_url, "_blank");
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <ToastContainer position="bottom-right" theme="dark" />

      {latestVersion && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-up">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-green-500" /> System Update
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] text-sm text-zinc-300">
              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-mono border border-green-500/20">
                  {latestVersion.tag_name}
                </span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-400">
                  {latestVersion.body || "No release notes provided."}
                </pre>
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Later
              </button>
              <button 
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
