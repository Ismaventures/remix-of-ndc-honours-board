import { ArrowLeft } from "lucide-react";
import { Commandant } from "@/types/domain";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CommandantSplitHero } from "./CommandantSplitHero";
import { useThemeMode } from "@/hooks/useThemeMode";

interface CommandantProfileModalProps {
  commandant: Commandant;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

export function CommandantProfileModal({ commandant, onClose, onNavigate }: CommandantProfileModalProps) {
  const [portalReady, setPortalReady] = useState(false);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key === "ArrowRight") onNavigate("next");
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onNavigate]);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md modal-backdrop-enter overflow-hidden overscroll-none"
      onClick={onClose}
    >
      <div
        className={`w-full h-full overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.4)] modal-enter relative flex flex-col transition-all duration-500 border-0 ${isLightMode ? "bg-white" : "bg-card"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-6 left-6 z-50">
            <button
                onClick={onClose}
                className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md ${
                  isLightMode
                    ? 'border-[#002060]/20 text-[#002060] bg-white/80 hover:bg-[#002060]/10 hover:border-[#002060]/35 backdrop-blur-sm'
                    : 'border-white/10 text-white/80 bg-slate-950/40 hover:bg-white/[0.08] hover:border-white/20 backdrop-blur-sm'
                }`}
                aria-label="Back to Honours Board"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back
            </button>
        </div>
        <div className="flex-1 overflow-y-auto w-full h-full">
            <CommandantSplitHero commandant={commandant} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
