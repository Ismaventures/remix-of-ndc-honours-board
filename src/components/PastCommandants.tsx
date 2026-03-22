import { useRef, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Commandant } from "@/types/domain";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

interface PastCommandantsProps {
  commandants: Commandant[];
  onSelectCommandant?: (commandant: Commandant) => void;
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
}: PastCommandantsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPauseUntilRef = useRef(0);
  const navRafRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const past = commandants.filter((c) => !c.isCurrent);
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
          <h2 className="text-xl font-bold font-serif gold-text">
            Past Commandants
          </h2>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            Legacy of Leadership
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            type="button"
            aria-label="Scroll to previous commandants"
            className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            type="button"
            aria-label="Scroll to next commandants"
            className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {loopedPast.map((cmd, i) => (
          <button
            key={`${cmd.id}-${i}`}
            type="button"
            onClick={() => onSelectCommandant?.(cmd)}
            aria-label={`Open profile for ${cmd.name}`}
            className="shrink-0 w-72 gold-border rounded-lg bg-card p-5 card-lift text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(30px)",
              transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + (i % Math.max(past.length, 1)) * 0.08}s`,
            }}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded bg-muted gold-border flex items-center justify-center shrink-0">
                <CommandantAvatar src={cmd.imageUrl} alt={cmd.name} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold font-serif leading-snug">
                  {cmd.name}
                </h3>
                <p className="text-[10px] text-primary mt-0.5">
                  {cmd.tenureStart} – {cmd.tenureEnd ?? "Present"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {cmd.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
