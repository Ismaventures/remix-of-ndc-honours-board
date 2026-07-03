import { X, ArrowLeft } from "lucide-react";
import { Personnel, Category } from "@/types/domain";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FellowSplitHero } from "./FellowSplitHero";
import { useThemeMode } from "@/hooks/useThemeMode";

interface PersonnelSplitHeroModalProps {
  person: Personnel;
  category: Category;
  courseDesignation?: string;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export function PersonnelSplitHeroModal({
  person,
  category,
  courseDesignation,
  onClose,
  onNavigate,
}: PersonnelSplitHeroModalProps) {
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
      if (e.key === "ArrowLeft" && onNavigate) onNavigate("prev");
      if (e.key === "ArrowRight" && onNavigate) onNavigate("next");
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
        className={`w-full h-full overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.4)] modal-enter relative flex flex-col transition-all duration-500 border-0 ${
          isLightMode ? "bg-white" : "bg-card"
        }`}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex-1 overflow-y-auto w-full h-full">
          <FellowSplitHero
            person={person}
            category={category}
            courseDesignation={courseDesignation}
          />
        </div>
        <button
          onClick={onClose}
          className="absolute right-6 bottom-6 z-50 inline-flex items-center justify-center p-3 rounded-full bg-white/90 hover:bg-white text-slate-800 transition-all shadow-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-95"
          aria-label="Close profile"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>,
    document.body
  );
}
