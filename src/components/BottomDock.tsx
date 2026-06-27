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
  ];

  const isHome = currentView === "home";

  return (
    <div
      ref={dockRef}
      className={`fixed bottom-0 left-0 right-0 z-[90] flex flex-col items-center pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        visible ? "translate-y-0" : "translate-y-full"
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
              : "bg-[#0a0e1a]/90 border-white/10 shadow-black/50"
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
                      : "bg-[#002060]/30 text-white border-[#002060]/50"
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
                ? "bg-[#C0392B] text-white border-[#C0392B] shadow-md"
                : "bg-[#C0392B]/30 text-[#FF6B6B] border-[#C0392B]/40"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Admin
          </button>
        </div>
      </div>

      {/* Notched Dock Bar — tri-service curved lines */}
      <div className="pointer-events-auto relative w-full max-w-xl mx-auto mb-0">
        <svg
          viewBox="0 0 700 44"
          className="w-full h-[44px] block"
          preserveAspectRatio="none"
        >
          {/* Navy line */}
          <path
            d="M0,8 L240,8 C260,8 270,8 280,14 L290,22 C295,26 300,38 350,38 C400,38 405,26 410,22 L420,14 C430,8 440,8 460,8 L700,8"
            fill="none" stroke="#002060" strokeWidth="2.5"
          />
          {/* Red line */}
          <path
            d="M0,16 L240,16 C260,16 270,16 280,21 L290,28 C295,32 300,40 350,40 C400,40 405,32 410,28 L420,21 C430,16 440,16 460,16 L700,16"
            fill="none" stroke="#C0392B" strokeWidth="2.5"
          />
          {/* Sky blue line */}
          <path
            d="M0,24 L240,24 C260,24 270,24 280,28 L290,33 C295,36 300,42 350,42 C400,42 405,36 410,33 L420,28 C430,24 440,24 460,24 L700,24"
            fill="none" stroke="#00B0F0" strokeWidth="2.5"
          />
        </svg>

        {/* Buttons sitting in the notch — below the lines */}
        <div className="absolute left-0 right-0 bottom-[2px] flex items-center justify-center gap-1.5">
          {/* BACK */}
          <button
            onClick={onBack}
            disabled={isHome || !onBack}
            className={`relative flex items-center gap-1.5 px-3.5 h-[28px] rounded-full text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-300 active:scale-95 overflow-hidden ${
              isHome || !onBack
                ? isLightMode
                  ? "text-slate-300 cursor-not-allowed bg-slate-100/40"
                  : "text-white/20 cursor-not-allowed bg-white/5"
                : isLightMode
                  ? "text-white shadow-md hover:shadow-lg hover:scale-105"
                  : "text-white shadow-lg hover:shadow-xl hover:scale-105"
            }`}
            title="Back"
            style={
              !isHome && onBack
                ? { background: "linear-gradient(135deg, #002060, #00B0F0)" }
                : undefined
            }
          >
            <ArrowLeft className="h-3 w-3 relative z-10" strokeWidth={2.5} />
            <span className="relative z-10">Back</span>
          </button>

          {/* HOME */}
          <button
            onClick={() => { onNavigate("home"); setExpanded(false); }}
            className={`relative flex items-center gap-1.5 px-3.5 h-[28px] rounded-full text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-300 active:scale-95 overflow-hidden ${
              currentView === "home"
                ? "text-white shadow-md"
                : "text-white shadow-lg hover:shadow-xl hover:scale-105"
            }`}
            title="Home"
            style={{
              background:
                currentView === "home"
                  ? "linear-gradient(135deg, #C0392B, #E74C3C)"
                  : "linear-gradient(135deg, #002060, #00B0F0)",
            }}
          >
            <Home className="h-3 w-3 relative z-10" strokeWidth={2.5} />
            <span className="relative z-10">Home</span>
          </button>

          {/* MENU */}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className={`relative flex items-center gap-1.5 px-3.5 h-[28px] rounded-full text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-300 active:scale-95 overflow-hidden ${
              expanded
                ? "text-white shadow-lg"
                : "text-white shadow-lg hover:shadow-xl hover:scale-105"
            }`}
            title="Menu"
            style={{
              background: expanded
                ? "linear-gradient(135deg, #00B0F0, #002060)"
                : "linear-gradient(135deg, #C0392B, #002060)",
            }}
          >
            <LayoutGrid className="h-3 w-3 relative z-10" strokeWidth={2.5} />
            <span className="relative z-10">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
