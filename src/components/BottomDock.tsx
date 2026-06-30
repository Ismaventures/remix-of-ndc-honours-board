import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Home,
  LayoutGrid,
  Shield,
  Award,
  Globe,
  Star,
  Settings,
  Users,
  Play,
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
  const [visible, setVisible] = useState(true);
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setExpanded(false), 5000);
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

  // Scroll-aware: hide on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (Math.abs(delta) > 8) {
          if (delta > 0) {
            setScrollDir("down");
            setVisible(false);
            setExpanded(false);
          } else {
            setScrollDir("up");
            setVisible(true);
          }
          lastScrollY.current = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const navItems: { key: ViewKey; label: string; icon: React.ElementType }[] = [
    { key: "commandants", label: "Commandants", icon: Shield },
    { key: "fwc", label: "FWC+", icon: Award },
    { key: "fdc", label: "FDC+", icon: Award },
    { key: "allied", label: "Allied", icon: Globe },
    { key: "visits", label: "Visits", icon: Star },
    { key: "combined", label: "Global Auto Display", icon: Play },
  ];

  const isHome = currentView === "home";

  return (
    <div
      ref={dockRef}
      className={`fixed bottom-3 left-0 right-0 z-[90] flex flex-col items-center pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        visible ? "translate-y-0" : "translate-y-32"
      }`}
      onTouchStart={(e) => handleTouchStart(e.touches[0].clientY)}
      onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientY)}
    >
      {/* Expanded Menu Popover */}
      <div
        className={`pointer-events-auto transition-all duration-400 ease-out overflow-hidden mb-3 ${
          expanded
            ? "opacity-100 translate-y-0 scale-100 max-h-48"
            : "opacity-0 translate-y-6 scale-90 max-h-0 pointer-events-none"
        }`}
      >
        <div
          className={`relative flex flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-2xl border shadow-2xl ${
            isLightMode
              ? "bg-white/90 border-slate-200/70 shadow-slate-400/20"
              : "bg-[#0a0e1a]/95 border-white/10 shadow-black/50"
          }`}
          style={{ backdropFilter: "blur(20px)" }}
        >
          {/* Top tri-service accent inside popover */}
          <div className="absolute -top-px inset-x-4 h-[2px] flex rounded-full overflow-hidden">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#C0392B]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setExpanded(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${
                  isActive
                    ? isLightMode
                      ? "bg-[#002060] text-white border-[#002060] shadow-md"
                      : "bg-[#00B0F0]/20 text-[#00B0F0] border-[#00B0F0]/30 shadow-[0_0_15px_rgba(0,176,240,0.15)]"
                    : isLightMode
                      ? "bg-white/80 border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}

          <div className={`w-px h-6 mx-1 ${isLightMode ? "bg-slate-200" : "bg-white/10"}`} />

          <button
            onClick={() => { onNavigate("admin"); setExpanded(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${
              isLightMode
                ? "bg-[#C0392B] text-white border-[#C0392B] shadow-md hover:bg-[#A93226]"
                : "bg-[#C0392B]/20 text-[#FF6B6B] border-[#C0392B]/30 hover:bg-[#C0392B]/30"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Admin
          </button>
        </div>
      </div>

      {/* Floating Island Dock Bar */}
      <div className="pointer-events-auto relative w-full max-w-[300px] px-2">
        <div
          className={`relative flex items-center justify-between gap-2 px-4 py-2 rounded-full border shadow-2xl transition-all duration-300 ${
            isLightMode
              ? "bg-white/85 border-slate-200/80 shadow-slate-300/30"
              : "bg-[#0a0e1a]/85 border-white/10 shadow-black/50"
          }`}
          style={{ backdropFilter: "blur(20px)" }}
        >
          {/* Sleek top tri-service accent bar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[3px] w-20 flex rounded-full overflow-hidden">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#C0392B]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>

          {/* BACK Button */}
          <button
            onClick={onBack}
            disabled={isHome || !onBack}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 border ${
              isHome || !onBack
                ? isLightMode
                  ? "border-transparent bg-transparent text-slate-300 cursor-not-allowed"
                  : "border-transparent bg-transparent text-white/20 cursor-not-allowed"
                : isLightMode
                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:scale-105 hover:shadow-sm"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-md"
            }`}
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Back</span>
          </button>

          {/* HOME Button */}
          <button
            onClick={() => { onNavigate("home"); setExpanded(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 border ${
              currentView === "home"
                ? isLightMode
                  ? "bg-[#002060] text-white border-[#002060] shadow-md shadow-slate-300/40"
                  : "bg-[#00B0F0]/20 text-[#00B0F0] border-[#00B0F0]/30 shadow-[0_0_15px_rgba(0,176,240,0.15)]"
                : isLightMode
                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:scale-105 hover:shadow-sm"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-md"
            }`}
            title="Home"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Home</span>
          </button>

          {/* MENU Button */}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 border ${
              expanded
                ? isLightMode
                  ? "bg-[#002060] text-white border-[#002060] shadow-md shadow-slate-300/40"
                  : "bg-[#00B0F0]/20 text-[#00B0F0] border-[#00B0F0]/30 shadow-[0_0_15px_rgba(0,176,240,0.15)]"
                : isLightMode
                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:scale-105 hover:shadow-sm"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-md"
            }`}
            title="Menu"
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
