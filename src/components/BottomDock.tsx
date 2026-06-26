import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  Award,
  Globe,
  Star,
  ArrowLeft,
  Settings,
  ChevronUp,
  Home,
  LayoutGrid,
} from "lucide-react";
import { useThemeMode } from "@/hooks/useThemeMode";
import type { ViewKey } from "./CategoryCards";

interface BottomDockProps {
  currentView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  hidden?: boolean;
  onBack?: () => void;
}

export function BottomDock({ currentView, onNavigate, hidden, onBack }: BottomDockProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setExpanded(false), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (expanded) scheduleHide();
  }, [expanded, scheduleHide]);

  useEffect(() => {
    if (!expanded) return;
    const handle = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [expanded]);

  const handleTouchStart = (y: number) => {
    touchStartY.current = y;
  };

  const handleTouchEnd = (y: number) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - y;
    touchStartY.current = null;
    if (delta > 40) setExpanded(true);
    else if (delta < -40) setExpanded(false);
  };

  if (hidden) return null;

  const pillBase = isLightMode
    ? "bg-white/95 border-slate-200 text-slate-700 shadow-lg hover:bg-slate-50"
    : "bg-navy-deep/95 border-white/15 text-white/90 shadow-lg shadow-black/30 hover:bg-white/[0.06]";

  const activePill = isLightMode
    ? "bg-[#002060] text-white border-[#002060] shadow-md"
    : "bg-primary/25 text-primary border-primary/40";

  const navItems: { key: ViewKey; label: string; icon: React.ElementType }[] = [
    { key: "commandants", label: "Commandants", icon: Shield },
    { key: "fwc", label: "FWC", icon: Award },
    { key: "fdc", label: "FDC", icon: Award },
    { key: "allied", label: "Allied", icon: Globe },
    { key: "visits", label: "Visits", icon: Star },
  ];

  const isHome = currentView === "home";

  return (
    <div
      ref={dockRef}
      className="fixed bottom-0 left-0 right-0 z-[90] flex flex-col items-center pointer-events-none"
      onTouchStart={(e) => handleTouchStart(e.touches[0].clientY)}
      onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientY)}
    >
      {/* Expanded nav row popover */}
      <div
        className={`pointer-events-auto transition-all duration-300 ease-out overflow-hidden mb-3 ${
          expanded
            ? "opacity-100 translate-y-0 scale-100 max-h-20"
            : "opacity-0 translate-y-4 scale-95 max-h-0 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
            isLightMode
              ? "bg-white/90 border-slate-200/80 shadow-slate-400/20"
              : "bg-slate-900/90 border-white/10 shadow-black/50"
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setExpanded(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 border ${
                  isActive ? activePill : pillBase
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}

          <div className={`w-px h-5 mx-0.5 ${isLightMode ? "bg-slate-200" : "bg-white/10"}`} />

          <button
            onClick={() => { onNavigate("admin"); setExpanded(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 border ${
              isLightMode
                ? "bg-[#002060] text-white border-[#002060]"
                : "bg-primary/20 text-primary border-primary/35"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>

      {/* Unified Navigation Pill (One UI Style) */}
      <div
        className={`pointer-events-auto flex items-center h-12 px-3 mb-5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
          isLightMode
            ? "bg-white/70 border-slate-200/50 shadow-slate-400/20"
            : "bg-slate-900/75 border-white/10 shadow-black/40"
        }`}
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isHome || !onBack}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full transition-all duration-200 ${
            isHome || !onBack
              ? "text-slate-400/40 dark:text-slate-600/40 cursor-not-allowed"
              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90"
          }`}
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Back</span>
        </button>

        {/* Separator */}
        <div className={`w-px h-5 mx-1.5 ${isLightMode ? "bg-slate-200" : "bg-white/10"}`} />

        {/* Home Button */}
        <button
          onClick={() => {
            onNavigate("home");
            setExpanded(false);
          }}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full transition-all duration-200 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90`}
          title="Home"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Home</span>
        </button>

        {/* Separator */}
        <div className={`w-px h-5 mx-1.5 ${isLightMode ? "bg-slate-200" : "bg-white/10"}`} />

        {/* Menu Toggle Button */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full transition-all duration-200 ${
            expanded
              ? "bg-[#002060] dark:bg-primary/25 text-white dark:text-primary"
              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90"
          }`}
          title="Menu"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Menu</span>
        </button>
      </div>
    </div>
  );
}
