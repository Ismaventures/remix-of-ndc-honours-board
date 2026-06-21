import { X } from "lucide-react";
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
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-backdrop-enter p-3 md:p-6 overflow-hidden overscroll-none ${
        isLightMode
          ? "bg-white/80"
          : "bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030]"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden ${
          isLightMode
            ? "bg-white border border-slate-200"
            : "bg-background border border-primary/20"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute right-6 top-6 z-50 inline-flex items-center justify-center p-2 rounded-full transition-all shadow-md focus:outline-none focus:ring-2 ${
            isLightMode
              ? "bg-white/80 hover:bg-white text-slate-800 border border-slate-200 focus:ring-slate-300"
              : "bg-muted hover:bg-muted/80 text-foreground border border-border focus:ring-primary/50"
          }`}
          aria-label="Close profile"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 overflow-y-auto w-full h-full">
          <FellowSplitHero
            person={person}
            category={category}
            courseDesignation={courseDesignation}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
