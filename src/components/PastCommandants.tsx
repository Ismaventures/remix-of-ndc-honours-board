import { useRef, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Commandant } from "@/types/domain";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  activeCardStates,
  CINEMATIC_EASE,
  MOTION_TIMINGS,
  textStaggerContainer,
  textStaggerItem,
} from "@/lib/cinematicMotion";

interface PastCommandantsProps {
  commandants: Commandant[];
  onSelectCommandant?: (commandant: Commandant) => void;
  includeCurrent?: boolean;
}

function CommandantAvatar({ src, alt }: { src?: string; alt: string }) {
  const resolvedSrc = useResolvedMediaUrl(src);

  if (!resolvedSrc) {
    return <Shield className="h-6 w-6 text-primary/40" />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="w-full h-full rounded object-cover"
    />
  );
}

export function PastCommandants({
  commandants,
  onSelectCommandant,
  includeCurrent = false,
}: PastCommandantsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPauseUntilRef = useRef(0);
  const navRafRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  const past = includeCurrent ? commandants : commandants.filter((c) => !c.isCurrent);
  const loopedPast = useMemo(() => {
    if (past.length <= 1) return past;
    return [...past, ...past, ...past];
  }, [past]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const normalizeLoopPosition = () => {
    const container = scrollRef.current;
    if (!container || past.length <= 1) return;

    const segmentWidth = container.scrollWidth / 3;

    while (container.scrollLeft >= segmentWidth * 2) {
      container.scrollLeft -= segmentWidth;
    }

    while (container.scrollLeft < segmentWidth) {
      container.scrollLeft += segmentWidth;
    }
  };

  const scroll = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    normalizeLoopPosition();

    autoPauseUntilRef.current = performance.now() + 900;

    if (navRafRef.current) {
      window.cancelAnimationFrame(navRafRef.current);
      navRafRef.current = null;
    }

    const delta = dir === "left" ? -320 : 320;
    const start = container.scrollLeft;
    const end = start + delta;
    const durationMs = 420;
    const startAt = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startAt) / durationMs);
      const eased = easeOutCubic(progress);

      container.scrollLeft = start + (end - start) * eased;
      normalizeLoopPosition();

      if (progress < 1) {
        navRafRef.current = window.requestAnimationFrame(step);
      } else {
        navRafRef.current = null;
      }
    };

    navRafRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || past.length <= 1) return;

    // Start from the middle copy to allow seamless wrap in both directions.
    const segmentWidth = container.scrollWidth / 3;
    container.scrollLeft = segmentWidth;
  }, [past.length, mounted]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || past.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let last = performance.now();
    const speedPxPerMs = 0.035;

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (!isPaused) {
        if (now < autoPauseUntilRef.current) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        container.scrollLeft += elapsed * speedPxPerMs;
        const segmentWidth = container.scrollWidth / 3;

        if (container.scrollLeft >= segmentWidth * 2) {
          container.scrollLeft -= segmentWidth;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (navRafRef.current) {
        window.cancelAnimationFrame(navRafRef.current);
        navRafRef.current = null;
      }
    };
  }, [isPaused, past.length]);

  if (past.length === 0) return null;

  return (
    <section
      className="mb-10"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
      }}
    >
      <div className="flex items-center justify-between mb-5 mt-10">
        <div>
          <h2 className={`text-xl font-bold font-serif ${isLightMode ? "text-slate-900" : "gold-text"}`}>
            Past Commandants
          </h2>
          <p className={`text-xs mt-1 tracking-wide ${isLightMode ? "text-slate-500 font-medium" : "text-muted-foreground"}`}>
            Legacy of Leadership
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            type="button"
            aria-label="Scroll to previous commandants"
            className={`p-2 rounded transition-all active:scale-95 ${
              isLightMode 
                ? "border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900" 
                : "gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            type="button"
            aria-label="Scroll to next commandants"
            className={`p-2 rounded transition-all active:scale-95 ${
              isLightMode 
                ? "border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900" 
                : "gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <motion.div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide px-1"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        variants={textStaggerContainer}
        initial={prefersReducedMotion ? undefined : "initial"}
        animate={prefersReducedMotion ? undefined : "animate"}
      >
        {loopedPast.map((cmd, i) => (
          <motion.button
            key={`${cmd.id}-${i}`}
            type="button"
            onClick={() => onSelectCommandant?.(cmd)}
            onMouseEnter={() => setActiveCardId(cmd.id)}
            onFocus={() => setActiveCardId(cmd.id)}
            onMouseLeave={() => setActiveCardId(null)}
            onBlur={() => setActiveCardId(null)}
            aria-label={`Open profile for ${cmd.name}`}
            className={`shrink-0 w-72 rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 transition-all duration-300 ${
              isLightMode
                ? "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                : "gold-border bg-card card-lift"
            }`}
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(30px)",
              transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + (i % Math.max(past.length, 1)) * 0.08}s`,
            }}
            variants={textStaggerItem}
            animate={
              !activeCardId || activeCardId === cmd.id
                ? activeCardStates.active
                : activeCardStates.inactive
            }
            whileHover={prefersReducedMotion ? undefined : { y: MOTION_TIMINGS.microHoverY, scale: MOTION_TIMINGS.microHoverScale }}
            whileTap={prefersReducedMotion ? undefined : { scale: MOTION_TIMINGS.microTapScale }}
            transition={{ duration: 0.28, ease: CINEMATIC_EASE }}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className={`w-14 h-14 rounded flex items-center justify-center shrink-0 overflow-hidden ${
                isLightMode ? "bg-slate-100 border border-slate-200" : "bg-muted gold-border"
              }`}>
                <CommandantAvatar src={cmd.imageUrl} alt={cmd.name} />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm font-bold font-serif leading-snug ${isLightMode ? "text-slate-900" : "text-foreground"}`}>
                  {cmd.name}
                </h3>
                <p className={`text-[10px] mt-0.5 ${isLightMode ? "text-blue-600 font-medium" : "text-primary"}`}>
                  {cmd.tenureStart} – {cmd.tenureEnd ?? "Present"}
                </p>
              </div>
            </div>
            <p className={`text-xs leading-relaxed line-clamp-3 ${isLightMode ? "text-slate-600" : "text-muted-foreground"}`}>
              {cmd.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}
