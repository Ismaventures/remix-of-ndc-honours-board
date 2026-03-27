import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Shield,
  SkipForward,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Category,
  Personnel,
  DistinguishedVisit,
  Commandant,
} from "@/types/domain";
import { CommandantHero } from "./CommandantHero";
import { CommandantSplitHero } from "./CommandantSplitHero";
import { UnifiedAutoCard } from "./UnifiedAutoCard";
import { ProfileModal } from "./ProfileModal";
import ndcCrest from "/images/ndc-crest.png";
import { prefetchAudioTrack, useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import {
  AutoDisplayContextKey,
  AutoDisplaySettings,
  AutoDisplayTransitionType,
  DEFAULT_AUTO_DISPLAY_SETTINGS,
} from "@/hooks/useAutoDisplaySettings";
import { NdcScatteredTransition } from "./NdcScatteredTransition";
import { BarracksRevealTransition } from "./BarracksRevealTransition";
import { SaluteFlashTransition } from "./SaluteFlashTransition";
import { ParadeSweepTransition } from "./ParadeSweepTransition";
import { MissionBriefTransition } from "./MissionBriefTransition";
import { RunwaySweepTransition } from "./RunwaySweepTransition";
import { useSliderControl } from "@/hooks/useSliderControl";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  cinematicTransition,
  layeredSlideVariants,
  textStaggerContainer,
  textStaggerItem,
} from "@/lib/cinematicMotion";
import { playTransitionCue } from "@/lib/transitionCues";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useCinematicExperienceSettings } from "@/hooks/useCinematicExperienceSettings";

interface AutoRotationDisplayProps {
  personnel: Personnel[];
  visits: DistinguishedVisit[];
  commandants: Commandant[];
  activeCategory?: Category | null;
  activeView?: "home" | "visits" | "admin" | "category";
  settings?: AutoDisplaySettings;
  forcedControl?: { enabled: boolean; nonce: number };
  forcedStep?: { direction: "next" | "prev"; nonce: number };
  onActiveChange?: (active: boolean) => void;
}

type Slide =
  | { type: "commandant"; commandant: Commandant }
  | { type: "personnel"; person: Personnel }
  | { type: "visit"; visit: DistinguishedVisit };

const resolveDisplayContext = (
  activeCategory: Category | null,
  activeView: "home" | "visits" | "admin" | "category",
): AutoDisplayContextKey => {
  if (activeView === "visits") return "visits";
  if (activeCategory === "FWC") return "FWC";
  if (activeCategory === "FDC") return "FDC";
  if (activeCategory === "Directing Staff") return "Directing Staff";
  if (activeCategory === "Allied") return "Allied";
  return "commandants";
};

function ContinuousSlideCard({
  item,
  type,
  onSelect,
  isLightMode,
}: {
  item: Personnel | DistinguishedVisit | Commandant;
  type: "personnel" | "visit" | "commandant";
  onSelect: (item: Personnel | DistinguishedVisit | Commandant) => void;
  isLightMode: boolean;
}) {
  const rawUrl = item.imageUrl;
  const imageUrl = useResolvedMediaUrl(rawUrl);

  const isVisit = type === "visit";
  const isCommandant = type === "commandant";
  
  const title = (
    isCommandant
      ? (item as Commandant).title
      : isVisit
        ? (item as DistinguishedVisit).title
        : (item as Personnel).rank
  )?.trim();
  const name = item.name?.trim();
  const subtitle = isCommandant
    ? ((item as Commandant).isCurrent ? "Current Commandant" : "Past Commandant")
    : isVisit
      ? (item as DistinguishedVisit).country
      : (item as Personnel).service;
  const decoration = item.decoration;
  const safeTitle = title || (isVisit ? "Honoured Guest" : isCommandant ? "Commandant" : "Officer");
  const safeName = name || "Name unavailable";
  const safeDecoration = decoration?.trim() || "";

  const yearLabel = useMemo(() => {
    if (isVisit) {
      const visitDate = ((item as DistinguishedVisit).date ?? "").trim();
      const yearMatch = visitDate.match(/(19|20)\d{2}/);
      return yearMatch?.[0] ?? (visitDate || "N/A");
    }

    if (isCommandant) {
      const cItem = item as Commandant;
      if (cItem.tenureStart && cItem.tenureEnd) return `${cItem.tenureStart} - ${cItem.tenureEnd}`;
      if (cItem.tenureStart) return `${cItem.tenureStart} - Present`;
      return "N/A";
    }

    const start = (item as Personnel).periodStart;
    const end = (item as Personnel).periodEnd;

    if (start && end) return `${start} - ${end}`;
    if (start) return String(start);
    if (end) return String(end);
    return "N/A";
  }, [isVisit, isCommandant, item]);

  return (
    <button
      type="button"
      onClick={() => onSelect(item as any)}
      className={`auto-scroll-card group relative ${isCommandant ? "w-[min(92vw,520px)] sm:w-[min(78vw,520px)] md:w-[min(64vw,520px)] lg:w-[520px] h-[clamp(420px,64dvh,700px)] sm:h-[clamp(440px,68dvh,740px)]" : "w-[min(88vw,430px)] sm:w-[min(72vw,430px)] md:w-[min(58vw,430px)] lg:w-[430px] h-[clamp(360px,58dvh,620px)] sm:h-[clamp(390px,62dvh,660px)]"} self-stretch shrink-0 overflow-hidden rounded-2xl p-2.5 sm:p-3 text-left backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 flex flex-col ${
        isLightMode
          ? "bg-white border border-[#002060]/20 shadow-[0_12px_36px_rgba(0,32,96,0.14)]"
          : "bg-slate-950/90 border border-[#FFD700]/25 shadow-[0_16px_46px_rgba(2,6,23,0.56)]"
      }`}
      aria-label={`${isCommandant ? "Commandant" : isVisit ? "Visit" : "Staff"} card for ${safeName}`}
    >
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[7px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[6px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div className={`absolute inset-0 ${isLightMode ? "bg-white" : "bg-slate-950"}`} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div
        className={`relative z-10 mb-1 sm:mb-1.5 flex min-h-0 items-center justify-center ${
          isCommandant ? "flex-[3.9]" : "flex-[1.6]"
        }`}
      >
        <div className="p-[2px] bg-[#FFD700] shadow-xl">
          <div className="p-[2px] bg-white">
            <div className="p-[1px] bg-[#FFD700]">
              <div
                className={`auto-scroll-image-frame relative h-full ${isVisit ? "max-h-[clamp(240px,44dvh,500px)]" : isCommandant ? "max-h-[clamp(560px,84dvh,980px)]" : "max-h-[clamp(300px,54dvh,620px)]"} aspect-[4/5] overflow-hidden ${
                  isLightMode ? "bg-slate-100" : "bg-slate-900"
                }`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`${safeTitle} ${safeName}`}
                    className={`h-full w-full ${isVisit ? "object-cover" : isCommandant ? "object-cover object-top" : "object-contain object-top"} transition-transform duration-500 group-hover:scale-[1.015]`}
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary/45">
                    <Shield className="h-10 w-10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="h-[2px] w-full bg-[#FF0000]" />
        <div
          className={`auto-scroll-plate bg-[#002060] ${
            isCommandant ? "px-2 py-1.5 sm:px-2.5 sm:py-2" : "px-2.5 py-2 sm:px-3 sm:py-2.5"
          } text-center shadow-xl`}
        >
          <p className="auto-scroll-title text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.13em] text-white/95 break-words leading-tight">
            {safeTitle}
          </p>
          <h3 className="auto-scroll-name mt-1 text-xs sm:text-sm font-bold leading-snug break-words text-[#FFD700]">
            {safeName}
          </h3>
          {safeDecoration && (
            <div className="mt-1.5 inline-flex max-w-full items-center justify-center rounded-md border border-[#FFD700]/70 bg-[linear-gradient(135deg,#FFF3B2_0%,#FFD700_40%,#C79A00_100%)] px-2 py-0.5 shadow-[0_0_16px_rgba(255,215,0,0.32)]">
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.07em] text-[#1f2937] break-words">
                {safeDecoration}
              </p>
            </div>
          )}
          <p className="auto-scroll-meta mt-1 text-[10px] uppercase tracking-[0.1em] text-white/95 break-words leading-tight">
            {subtitle}
          </p>
          <p className="auto-scroll-year mt-1 text-[10px] sm:text-[11px] text-[#FFD700] font-semibold tracking-[0.07em] uppercase leading-tight">
            Year: {yearLabel}
          </p>
        </div>
        <div className="h-[2px] w-full bg-[#FF0000]" />
      </div>

      <p className="relative z-10 mt-2 text-[9px] uppercase tracking-[0.16em] text-primary/80 font-semibold text-center">
        Tap to open full details
      </p>
    </button>
  );
}

export function AutoRotationDisplay({
  personnel,
  visits,
  commandants,
  activeCategory = null,
  activeView = "home",
  settings,
  forcedControl,
  forcedStep,
  onActiveChange,
}: AutoRotationDisplayProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [transitionType, setTransitionType] =
    useState<AutoDisplayTransitionType>("fade-zoom");
  const [showNavControls, setShowNavControls] = useState(true);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [selectedCommandant, setSelectedCommandant] =
    useState<Commandant | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<DistinguishedVisit | null>(
    null,
  );
  const prefersReducedMotion = useReducedMotion();
  const { settings: cinematicSettings } = useCinematicExperienceSettings();
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  const audioAssignments = useAudioStore((s) => s.assignments);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setMuted = useAudioStore((s) => s.setMuted);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activationAudioPrimedRef = useRef(false);
  const fdcScrollRef = useRef<HTMLDivElement | null>(null);
  const fdcAutoPauseUntilRef = useRef(0);
  const fdcNavRafRef = useRef<number | null>(null);
  const lastForcedStepNonceRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const transitionStepRef = useRef(0);
  const transitionDirectionRef = useRef<1 | -1>(1);
  const lastTransitionCueAtRef = useRef(0);
  const { isPaused, registerInteraction } = useSliderControl({
    resumeAfterMs: 4200,
  });

  const setDisplayActive = useCallback(
    (nextActive: boolean) => {
      setIsActive(nextActive);
      onActiveChange?.(nextActive);
    },
    [onActiveChange],
  );

  const effectiveSettings = settings ?? DEFAULT_AUTO_DISPLAY_SETTINGS;
  const displayContext = resolveDisplayContext(activeCategory, activeView);
  const contextTiming =
    effectiveSettings.byContext[displayContext] ?? effectiveSettings.global;
  const appliedTransition =
    effectiveSettings.appliedTransitionByContext?.[displayContext] ?? null;
  const contextSequence = useMemo(
    () => effectiveSettings.transitionSequenceByContext?.[displayContext] ?? [],
    [displayContext, effectiveSettings.transitionSequenceByContext],
  );
  const useAppliedTransitionOnly =
    Boolean(appliedTransition) && displayContext !== "commandants";
  const sequence = useMemo(
    () =>
      useAppliedTransitionOnly
        ? [appliedTransition]
        : contextSequence.length > 0
          ? contextSequence
          : effectiveSettings.transitionSequence.length > 0
            ? effectiveSettings.transitionSequence
            : DEFAULT_AUTO_DISPLAY_SETTINGS.transitionSequence,
    [
      appliedTransition,
      contextSequence,
      effectiveSettings.transitionSequence,
      useAppliedTransitionOnly,
    ],
  );

  const getTransitionDurationMs = useCallback(
    (transition: AutoDisplayTransitionType) => {
      const perType =
        effectiveSettings.transitionDurationByTypeMs[transition] ??
        effectiveSettings.global.transitionDurationMs;
      const blended = Math.round(
        (contextTiming.transitionDurationMs + perType) / 2,
      );
      return Math.max(250, Math.min(3200, blended));
    },
    [contextTiming.transitionDurationMs, effectiveSettings],
  );

  const slides: Slide[] = useMemo(() => {
    if (activeCategory) {
      const categoryPersonnel = personnel
        .filter((p) => p.category === activeCategory)
        .sort((a, b) => a.seniorityOrder - b.seniorityOrder)
        .slice(0, 12)
        .map((person) => ({ type: "personnel" as const, person }));
      return categoryPersonnel;
    }

    if (activeView === "visits") {
      const visitSlides = visits
        .slice(0, 12)
        .map((visit) => ({ type: "visit" as const, visit }));
      return visitSlides;
    }

    return commandants
      .slice()
      .sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.tenureStart ?? 0) - (a.tenureStart ?? 0);
      })
      .map((commandant) => ({ type: "commandant" as const, commandant }));
  }, [activeCategory, activeView, personnel, visits, commandants]);

  const isContinuousMode =
    isActive &&
    slides.length > 0 &&
    (
      (activeCategory !== null && displayContext !== "commandants" && !useAppliedTransitionOnly) ||
      appliedTransition === 'continuous-scroll' ||
      sequence[0] === 'continuous-scroll'
    );

  const personnelSlides = useMemo(
    () =>
      slides.filter(
        (entry): entry is Extract<Slide, { type: "personnel" }> =>
          entry.type === "personnel",
      ),
    [slides],
  );

  const visitSlides = useMemo(
    () =>
      slides.filter(
        (entry): entry is Extract<Slide, { type: "visit" }> =>
          entry.type === "visit",
      ),
    [slides],
  );

  const commandantSlides = useMemo(
    () =>
      slides.filter(
        (entry): entry is Extract<Slide, { type: "commandant" }> =>
          entry.type === "commandant",
      ),
    [slides],
  );

  const continuousItems = useMemo(() => {
    if (activeView === "visits") return visitSlides.map((s) => s.visit);
    if (commandantSlides.length > 0) return commandantSlides.map((s) => s.commandant);
    return personnelSlides.map((s) => s.person);
  }, [activeView, visitSlides, personnelSlides, commandantSlides]);

  const loopedContinuousItems = useMemo(() => {
    if (continuousItems.length === 0) return [];
    if (continuousItems.length <= 2)
      return [
        ...continuousItems,
        ...continuousItems,
        ...continuousItems,
        ...continuousItems,
      ]; // More clones for very few items
    return [...continuousItems, ...continuousItems, ...continuousItems];
  }, [continuousItems]);

  const normalizeFdcLoopPosition = useCallback(() => {
    const container = fdcScrollRef.current;
    if (!container || continuousItems.length <= 1) return;

    const segmentWidth = container.scrollWidth / 3;

    while (container.scrollLeft >= segmentWidth * 2) {
      container.scrollLeft -= segmentWidth;
    }

    while (container.scrollLeft < segmentWidth) {
      container.scrollLeft += segmentWidth;
    }
  }, [continuousItems.length]);

  const nudgeFdcTrack = useCallback(
    (dir: "left" | "right") => {
      const container = fdcScrollRef.current;
      if (!container) return;

      normalizeFdcLoopPosition();
      fdcAutoPauseUntilRef.current = performance.now() + 900;

      if (fdcNavRafRef.current) {
        window.cancelAnimationFrame(fdcNavRafRef.current);
        fdcNavRafRef.current = null;
      }

      const delta = dir === "left" ? -340 : 340;
      const start = container.scrollLeft;
      const end = start + delta;
      const durationMs = 420;
      const startAt = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const progress = Math.min(1, (now - startAt) / durationMs);
        const eased = easeOutCubic(progress);

        container.scrollLeft = start + (end - start) * eased;
        normalizeFdcLoopPosition();

        if (progress < 1) {
          fdcNavRafRef.current = window.requestAnimationFrame(step);
        } else {
          fdcNavRafRef.current = null;
        }
      };

      fdcNavRafRef.current = window.requestAnimationFrame(step);
    },
    [normalizeFdcLoopPosition],
  );

  const revealControls = useCallback(() => {
    setShowNavControls(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNavControls(false), 2200);
  }, []);

  const transitionTo = useCallback(
    (nextIndex: number, isManual = false) => {
      if (slides.length <= 1 || isTransitioningRef.current) return;
      const previousIndex = currentIndex;
      const forwardIndex = (previousIndex + 1) % slides.length;
      const backwardIndex = (previousIndex - 1 + slides.length) % slides.length;
      transitionDirectionRef.current =
        nextIndex === backwardIndex
          ? -1
          : nextIndex === forwardIndex
            ? 1
            : nextIndex > previousIndex
              ? 1
              : -1;
      isTransitioningRef.current = true;
      if (isManual) {
        registerInteraction();
      }

      const nextTransition =
        sequence[transitionStepRef.current % sequence.length] ?? "fade-zoom";

      const cue =
        effectiveSettings.transitionCueByType?.[nextTransition] ?? "none";
      const now = Date.now();
      if (
        cue !== "none" &&
        now - lastTransitionCueAtRef.current >= cinematicSettings.whooshCooldownMs
      ) {
        playTransitionCue(cue, !isMuted);
        lastTransitionCueAtRef.current = now;
      }

      const baseDurationMs = getTransitionDurationMs(nextTransition);
      const nextSlide = slides[nextIndex];
      const durationMs =
        nextSlide?.type === "commandant"
          ? Math.max(
              900,
              Math.min(
                1800,
                Math.round(
                  (baseDurationMs + cinematicSettings.commandantDurationMs) / 2,
                ),
              ),
            )
          : Math.max(
              650,
              Math.min(
                1400,
                Math.round(
                  (baseDurationMs + cinematicSettings.imageDurationMs) / 2,
                ),
              ),
            );

      if (nextTransition === "pro-slider") {
        setTransitionType(nextTransition);
        setCurrentIndex(nextIndex);
        transitionStepRef.current += 1;

        setTimeout(() => {
          isTransitioningRef.current = false;
        }, durationMs);
        return;
      }

      const outDurationMs = Math.max(140, Math.round(durationMs * 0.42));
      setTransitionType(nextTransition);
      setFadeState("out");

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      transitionTimerRef.current = setTimeout(() => {
        setCurrentIndex(nextIndex);

        setTimeout(() => {
          setFadeState("in");
          transitionStepRef.current += 1;
          isTransitioningRef.current = false;
        }, 22);
      }, outDurationMs);
    },
    [
      currentIndex,
      getTransitionDurationMs,
      registerInteraction,
      sequence,
      slides,
      cinematicSettings.commandantDurationMs,
      cinematicSettings.whooshCooldownMs,
      cinematicSettings.imageDurationMs,
      effectiveSettings.transitionCueByType,
      isMuted,
    ],
  );

  const advance = useCallback(() => {
    transitionTo((currentIndex + 1) % slides.length);
  }, [currentIndex, slides.length, transitionTo]);

  const retreat = useCallback(() => {
    transitionTo((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, slides.length, transitionTo]);

  const handleManualAdvance = useCallback(() => {
    revealControls();
    if (isContinuousMode) {
      registerInteraction();
      nudgeFdcTrack("right");
      return;
    }
    transitionTo((currentIndex + 1) % slides.length, true);
  }, [
    currentIndex,
    isContinuousMode,
    nudgeFdcTrack,
    registerInteraction,
    revealControls,
    slides.length,
    transitionTo,
  ]);

  const handleManualRetreat = useCallback(() => {
    revealControls();
    if (isContinuousMode) {
      registerInteraction();
      nudgeFdcTrack("left");
      return;
    }
    transitionTo((currentIndex - 1 + slides.length) % slides.length, true);
  }, [
    currentIndex,
    isContinuousMode,
    nudgeFdcTrack,
    registerInteraction,
    revealControls,
    slides.length,
    transitionTo,
  ]);

  useEffect(() => {
    if (!isActive || isPaused || isContinuousMode) return;
    const interval = setInterval(
      advance,
      Math.round(contextTiming.slideDurationMs * 1.2),
    );
    return () => clearInterval(interval);
  }, [
    isActive,
    isPaused,
    isContinuousMode,
    advance,
    contextTiming.slideDurationMs,
  ]);

  useEffect(() => {
    const container = fdcScrollRef.current;
    if (!container || !isContinuousMode || continuousItems.length === 0) return;

    // Use total scroll width to position in middle third
    const segmentWidth = container.scrollWidth / 3;
    // But this depends on items being rendered. We might need a small delay or use layoutEffect
    if (container.scrollLeft < 10) {
      container.scrollLeft = segmentWidth;
    }
  }, [continuousItems.length, isContinuousMode]);

  useEffect(() => {
    const container = fdcScrollRef.current;
    if (!container || !isContinuousMode || continuousItems.length === 0) return;

    if (prefersReducedMotion) return;

    let rafId = 0;
    let last = performance.now();
    const speedPxPerMs = 0.03;

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (!isPaused) {
        if (now < fdcAutoPauseUntilRef.current) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        container.scrollLeft += elapsed * speedPxPerMs;
        normalizeFdcLoopPosition();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (fdcNavRafRef.current) {
        window.cancelAnimationFrame(fdcNavRafRef.current);
        fdcNavRafRef.current = null;
      }
    };
  }, [
    continuousItems.length,
    isContinuousMode,
    isPaused,
    normalizeFdcLoopPosition,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    if (!forcedControl) return;

    if (forcedControl.enabled) {
      setTransitionType(sequence[0] ?? "fade-zoom");
      transitionStepRef.current = 0;
      setCurrentIndex(0);
      setDisplayActive(true);
      return;
    }

    setDisplayActive(false);
  }, [forcedControl, sequence, setDisplayActive]);

  useEffect(() => {
    if (!forcedStep || slides.length <= 1) return;
    if (forcedStep.nonce <= 0) return;
    if (forcedStep.nonce === lastForcedStepNonceRef.current) return;
    lastForcedStepNonceRef.current = forcedStep.nonce;

    const runStep = () => {
      if (forcedStep.direction === "next") {
        handleManualAdvance();
        return;
      }
      handleManualRetreat();
    };

    if (!isActive) {
      setTransitionType(sequence[0] ?? "fade-zoom");
      transitionStepRef.current = 0;
      setCurrentIndex(0);
      setDisplayActive(true);
      const stepTimer = setTimeout(runStep, 120);
      return () => clearTimeout(stepTimer);
    }

    runStep();
  }, [
    forcedStep,
    handleManualAdvance,
    handleManualRetreat,
    isActive,
    sequence,
    setDisplayActive,
    slides.length,
  ]);

  useEffect(() => {
    transitionStepRef.current = 0;
  }, [displayContext, sequence]);

  useEffect(() => {
    if (!isActive) return;
    revealControls();
  }, [isActive, revealControls, currentIndex]);

  useEffect(() => {
    if (!isActive) {
      setShowInteractionHint(false);
      if (interactionHintTimerRef.current) {
        clearTimeout(interactionHintTimerRef.current);
        interactionHintTimerRef.current = null;
      }
      return;
    }

    setShowInteractionHint(true);
    if (interactionHintTimerRef.current)
      clearTimeout(interactionHintTimerRef.current);
    interactionHintTimerRef.current = setTimeout(() => {
      setShowInteractionHint(false);
    }, 2200);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isActive]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  useEffect(() => {
    if (!isActive) return;
    if (slides.length > 0) return;
    setDisplayActive(false);
  }, [isActive, setDisplayActive, slides.length]);

  const resolveTrackIdForSlide = useCallback(
    (slideCandidate?: Slide) => {
      let trackId = audioAssignments.globalAuto;

      if (activeCategory === "FWC" && audioAssignments.distinguished_fellows_fwc) {
        trackId = audioAssignments.distinguished_fellows_fwc;
      } else if (
        activeCategory === "FDC" &&
        audioAssignments.distinguished_fellows_fdc
      ) {
        trackId = audioAssignments.distinguished_fellows_fdc;
      } else if (
        activeCategory === "Directing Staff" &&
        audioAssignments.directing_staff
      ) {
        trackId = audioAssignments.directing_staff;
      } else if (
        activeCategory === "Allied" &&
        audioAssignments.allied_officers
      ) {
        trackId = audioAssignments.allied_officers;
      } else if (slideCandidate?.type === "personnel" && slideCandidate.person.category) {
        const cat = slideCandidate.person.category.toLowerCase();
        if (cat.includes("fwc") && audioAssignments.distinguished_fellows_fwc) {
          trackId = audioAssignments.distinguished_fellows_fwc;
        } else if (cat.includes("fdc") && audioAssignments.distinguished_fellows_fdc) {
          trackId = audioAssignments.distinguished_fellows_fdc;
        } else if (cat.includes("directing") && audioAssignments.directing_staff) {
          trackId = audioAssignments.directing_staff;
        } else if (cat.includes("allied") && audioAssignments.allied_officers) {
          trackId = audioAssignments.allied_officers;
        }
      }

      return trackId;
    },
    [activeCategory, audioAssignments],
  );

  useEffect(() => {
    if (slides.length === 0) return;
    const initialTrackId = resolveTrackIdForSlide(slides[0]);
    if (initialTrackId) {
      void prefetchAudioTrack(initialTrackId);
    }

    const firstSlide = slides[0];
    if (!firstSlide) return;

    const imageUrl =
      firstSlide.type === "commandant"
        ? firstSlide.commandant.imageUrl
        : firstSlide.type === "personnel"
          ? firstSlide.person.imageUrl
          : firstSlide.visit.imageUrl;

    if (imageUrl) {
      const img = new Image();
      img.decoding = "async";
      img.src = imageUrl;
    }
  }, [resolveTrackIdForSlide, slides]);

  useEffect(() => {
    if (isActive) {
      const trackId = resolveTrackIdForSlide(slides[currentIndex]);
      if (activationAudioPrimedRef.current) {
        activationAudioPrimedRef.current = false;
        return;
      }
      playAudioTrack(trackId);
    } else {
      activationAudioPrimedRef.current = false;
      playAudioTrack(null); // Stop audio when exiting auto mode
    }
  }, [isActive, currentIndex, resolveTrackIdForSlide, slides]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (interactionHintTimerRef.current)
        clearTimeout(interactionHintTimerRef.current);
    };
  }, []);

  const onTouchStart = (x: number) => {
    touchStartXRef.current = x;
    revealControls();
    registerInteraction();
  };

  const onTouchEnd = (x: number) => {
    if (touchStartXRef.current === null) return;
    const delta = x - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(delta) < 50) return;
    if (delta < 0) {
      handleManualAdvance();
    } else {
      handleManualRetreat();
    }
  };

  const slide = slides[currentIndex] ?? slides[0];
  const isPortraitSlide =
    slide?.type === "commandant" || slide?.type === "personnel";
  const currentTransitionDuration = useMemo(() => {
    if (!slide) return getTransitionDurationMs(transitionType);
    const baseDuration = getTransitionDurationMs(transitionType);
    const targetDuration =
      slide.type === "commandant"
        ? cinematicSettings.commandantDurationMs
        : cinematicSettings.imageDurationMs;
    return Math.round((baseDuration + targetDuration) / 2);
  }, [
    cinematicSettings.commandantDurationMs,
    cinematicSettings.imageDurationMs,
    getTransitionDurationMs,
    slide,
    transitionType,
  ]);
  const slideImageUrl = useResolvedMediaUrl(
    slide
      ? slide.type === "commandant"
        ? slide.commandant.imageUrl
        : slide.type === "personnel"
          ? slide.person.imageUrl
          : slide.visit.imageUrl
      : undefined,
  );

  if (!isActive) {
    return (
      <button
        onClick={() => {
          if (slides.length === 0) {
            return;
          }
          const initialTrackId = resolveTrackIdForSlide(slides[0]);
          if (isMuted) {
            setMuted(false);
          }
          activationAudioPrimedRef.current = true;
          playAudioTrack(initialTrackId, false, true);
          setTransitionType(sequence[0] ?? "fade-zoom");
          transitionStepRef.current = 0;
          setCurrentIndex(0);
          setDisplayActive(true);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed ${
          isLightMode
            ? "border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            : "gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
        disabled={slides.length === 0}
      >
        <Monitor className="h-4 w-4 text-primary" />
        <span>
          {activeCategory
            ? `${activeCategory} Auto Display`
            : activeView === "visits"
              ? "Visits Auto Display"
              : "Commandants Auto Display"}
        </span>
      </button>
    );
  }

  if (!slide) return null;

  const getTransitionClasses = () => {
    if (prefersReducedMotion) {
      return fadeState === "in" ? "opacity-100" : "opacity-0";
    }

    switch (transitionType) {
      case "slide-up":
        return fadeState === "in"
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-16 blur-[4px]";
      case "slide-left":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 blur-0"
          : "opacity-0 -translate-x-16 blur-[4px]";
      case "slide-right":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 blur-0"
          : "opacity-0 translate-x-16 blur-[4px]";
      case "zoom-out":
        return fadeState === "in"
          ? "opacity-100 scale-100 blur-0"
          : "opacity-0 scale-[1.05] blur-[4px]";
      case "slide-down":
        return fadeState === "in"
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 -translate-y-16 blur-[4px]";
      case "flip-x":
        return fadeState === "in"
          ? "opacity-100 [transform:perspective(1200px)_rotateX(0deg)_scale(1)]"
          : "opacity-0 [transform:perspective(1200px)_rotateX(12deg)_scale(0.98)]";
      case "flip-y":
        return fadeState === "in"
          ? "opacity-100 [transform:perspective(1200px)_rotateY(0deg)_scale(1)]"
          : "opacity-0 [transform:perspective(1200px)_rotateY(12deg)_scale(0.98)]";
      case "rotate-in":
        return fadeState === "in"
          ? "opacity-100 rotate-0 scale-100"
          : "opacity-0 rotate-2 scale-[0.97]";
      case "blur-in":
        return fadeState === "in"
          ? "opacity-100 blur-0 scale-100"
          : "opacity-0 blur-[8px] scale-[1.01]";
      case "skew-lift":
        return fadeState === "in"
          ? "opacity-100 skew-y-0 translate-y-0"
          : "opacity-0 skew-y-1 translate-y-8";
      case "scale-rise":
        return fadeState === "in"
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-[0.92] translate-y-6";
      case "ndc-scatter":
        return fadeState === "in"
          ? "opacity-100 scale-100 blur-0"
          : "opacity-0 scale-[0.90] blur-[10px]";
      case "barracks-reveal":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100 blur-0"
          : "opacity-0 -translate-x-20 scale-[0.96] blur-[8px]";
      case "salute-flash":
        return fadeState === "in"
          ? "opacity-100 scale-100 blur-0"
          : "opacity-0 scale-[1.03] blur-[6px]";
      case "parade-sweep":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100 blur-0"
          : "opacity-0 translate-x-20 scale-[0.97] blur-[8px]";
      case "mission-brief":
        return fadeState === "in"
          ? "opacity-100 scale-100 blur-0"
          : "opacity-0 scale-[0.985] blur-[10px]";
      case "runway-sweep":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100 blur-0"
          : "opacity-0 -translate-x-14 scale-[0.98] blur-[7px]";
      case "pro-slider":
        return "opacity-100"; // Handled by framer-motion AnimatePresence
      case "fade-zoom":
      default:
        return fadeState === "in"
          ? "opacity-100 scale-100 blur-0"
          : "opacity-0 scale-[0.95] blur-[4px]";
    }
  };

  const renderSlideContent = () => (
    <>
      {slide.type === "commandant" && (
        <motion.button
          onClick={() => setSelectedCommandant(slide.commandant)}
          className="w-full h-full min-h-0 max-h-full flex flex-col text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-x-hidden overflow-y-auto"
          aria-label={`Open profile for ${slide.commandant.name}`}
          whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={cinematicTransition(0.24)}
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            animate={prefersReducedMotion ? undefined : { x: ["-10%", "360%"] }}
            transition={
              prefersReducedMotion
                ? undefined
                : cinematicTransition(2.8, {
                    repeat: Infinity,
                    repeatDelay: 2.4,
                  })
            }
          />
          {effectiveSettings.commandantLayout === "split" ? (
            <CommandantSplitHero commandant={slide.commandant} isAutoDisplay />
          ) : (
            <CommandantHero
              commandant={slide.commandant}
              compactDescription
              isAutoDisplay
            />
          )}
        </motion.button>
      )}

      {slide.type === "personnel" && (
        <motion.button
          onClick={() => setSelectedPerson(slide.person)}
          className="w-full text-left relative overflow-hidden focus-visible:outline-none"
          aria-label={`Open profile for ${slide.person.name}`}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          transition={cinematicTransition(0.24)}
        >
          <UnifiedAutoCard
            type="personnel"
            data={slide.person}
            id={`p-${slide.person.id}`}
          />
        </motion.button>
      )}

      {slide.type === "visit" && (
        <motion.button
          onClick={() => setSelectedVisit(slide.visit)}
          className="w-full text-center relative overflow-hidden focus-visible:outline-none"
          aria-label={`Open profile for ${slide.visit.name}`}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          transition={cinematicTransition(0.24)}
        >
          <UnifiedAutoCard
            type="visit"
            data={slide.visit}
            id={`v-${slide.visit.id}`}
          />
        </motion.button>
      )}
    </>
  );

  const getSectionTitle = () => {
    if (activeCategory || activeView === "visits") {
      return "";
    }
    return "Commandants' Chronicle";
  };

  const getSectionSubtitle = () => {
    if (activeView === "visits") return "Distinguished Visits and Honours";
    if (activeCategory === "FDC") return "Distinguished Fellows of the Defence College (FDC)";
    if (activeCategory === "FWC") return "Distinguished Fellows of the War College (FWC)";
    if (activeCategory === "Directing Staff") return "Chronicles of Directing Staff (Directing Staff)";
    if (activeCategory === "Allied") return "International Allied Officers (Allied)";
    return "Commandants' Honour Roll";
  };

  const getSectionDescriptor = () => {
    if (activeView === "visits") return "";
    if (activeCategory) return "";
    return "Leadership succession archive of commandants and institutional milestones.";
  };

  const sectionSubtitle = getSectionSubtitle();
  const sectionDescriptor = getSectionDescriptor();

  const renderedContinuousContent = (
    <motion.div
      className="relative mx-auto flex h-full min-h-0 w-full max-w-[1900px] flex-col justify-start"
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={cinematicTransition(0.6)}
    >
      <div className="auto-scroll-heading mb-1.5 sm:mb-2 px-1 sm:px-2 shrink-0">
        <div className="overflow-hidden rounded-xl border border-[#002060]/20 bg-card/90 backdrop-blur">
          <div className="h-[6px] flex">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#FF0000]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>
          <div className="h-[2px] w-full bg-[#FF0000]" />
          <div className="auto-scroll-heading-body bg-[#002060] px-3 py-2 sm:px-4 sm:py-2.5 text-center">
            {getSectionTitle() && (
              <p className="auto-scroll-heading-title text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                {getSectionTitle()}
              </p>
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={`subtitle-${sectionSubtitle}`}
                className="auto-scroll-heading-subtitle mt-1 text-base sm:text-xl md:text-2xl font-bold uppercase tracking-[0.03em] text-[#FFD700] leading-tight"
                initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
                transition={cinematicTransition(0.42)}
              >
                {sectionSubtitle}
              </motion.h2>
            </AnimatePresence>
            {sectionDescriptor && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`descriptor-${sectionDescriptor}`}
                  className="mt-1 text-[9px] sm:text-[10px] tracking-[0.08em] text-white/90"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={cinematicTransition(0.48, { delay: 0.08 })}
                >
                  {sectionDescriptor}
                </motion.p>
              </AnimatePresence>
            )}
          </div>
          <div className="h-[2px] w-full bg-[#FF0000]" />
        </div>
      </div>

      <div
        ref={fdcScrollRef}
        className="relative flex h-full min-h-0 items-stretch gap-3 sm:gap-5 overflow-x-auto pb-0.5 sm:pb-1 pr-1 scrollbar-hide [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
        onMouseEnter={() =>
          (fdcAutoPauseUntilRef.current = Number.POSITIVE_INFINITY)
        }
        onMouseLeave={() =>
          (fdcAutoPauseUntilRef.current = performance.now() + 180)
        }
        onFocus={() =>
          (fdcAutoPauseUntilRef.current = Number.POSITIVE_INFINITY)
        }
        onBlur={() => (fdcAutoPauseUntilRef.current = performance.now() + 180)}
      >
        {loopedContinuousItems.map((item, i) => {
          const isPersonnel = "category" in item;
          const isCommandant = "isCurrent" in item;
          const itemType = isCommandant ? "commandant" : isPersonnel ? "personnel" : "visit";
          return (
            <ContinuousSlideCard
              key={`${item.id}-${i}`}
              item={item as any}
              type={itemType}
              isLightMode={isLightMode}
              onSelect={(selected) => {
                if (isCommandant) setSelectedCommandant(selected as Commandant);
                else if (isPersonnel) setSelectedPerson(selected as Personnel);
                else setSelectedVisit(selected as DistinguishedVisit);
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div
      className="fixed inset-0 z-50 h-dvh overflow-hidden bg-background flex flex-col"
      onMouseMove={revealControls}
      onTouchStart={(e) => onTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
      onKeyDown={(e) => {
        registerInteraction();
        if (e.key === "ArrowRight") handleManualAdvance();
        if (e.key === "ArrowLeft") handleManualRetreat();
      }}
      tabIndex={0}
    >
      {/* Cinematic Transition Overlay: NDC scatter and new military/action transitions */}
      {fadeState === "out" && (
        {
          'ndc-scatter': <NdcScatteredTransition durationMs={currentTransitionDuration} />,
          'barracks-reveal': <BarracksRevealTransition durationMs={currentTransitionDuration} />,
          'salute-flash': <SaluteFlashTransition durationMs={currentTransitionDuration} />,
          'parade-sweep': <ParadeSweepTransition durationMs={currentTransitionDuration} />,
          'mission-brief': <MissionBriefTransition durationMs={currentTransitionDuration} />,
          'runway-sweep': <RunwaySweepTransition durationMs={currentTransitionDuration} />,
        }[transitionType] || null
      )}

      {/* Controls bar */}
      {!isActive && (
        <div className="flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur border-b border-primary/15">
          <span className="text-xs uppercase tracking-widest text-primary font-medium">
            {activeCategory
              ? `${activeCategory} Auto Display`
              : activeView === "visits"
                ? "Visits Auto Display"
                : "Commandants Auto Display"}{" "}
            · {currentIndex + 1}/{slides.length}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-primary/20 pr-4">
              {/* Audio controls are now handled globally via the AudioManager floating button */}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualAdvance}
                className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDisplayActive(false)}
                className="px-3 py-1.5 rounded text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit control row */}
      {isActive && (
        <header className="relative z-[100] flex shrink-0 items-center justify-end gap-2 border-b border-border/60 bg-background/90 px-3 py-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={() => setDisplayActive(false)}
            className="rounded-full border border-primary/25 bg-card/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-card"
          >
            Exit Display
          </button>
        </header>
      )}

      {/* Slide content */}
      <div
        className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 sm:px-4 md:px-6 ${isContinuousMode ? "py-1 sm:py-1.5 md:py-2" : isActive ? "py-2 sm:py-3 md:py-4" : "pt-2 sm:pt-4 md:pt-6 pb-8 sm:pb-10 md:pb-12"}`}
      >
        <div
          className={`absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${showInteractionHint ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
        >
          <div className="max-w-[85vw] px-3 py-2 rounded-md border border-primary/30 bg-slate-950/85 backdrop-blur text-[10px] md:text-xs uppercase tracking-[0.12em] text-primary/90 text-center">
            Swipe • Arrow Keys • Side Buttons
          </div>
        </div>

        <button
          onClick={handleManualRetreat}
          className={`absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full border border-primary/35 bg-background/70 backdrop-blur flex items-center justify-center text-primary transition-all duration-200 ${showNavControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={handleManualAdvance}
          className={`absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full border border-primary/35 bg-background/70 backdrop-blur flex items-center justify-center text-primary transition-all duration-200 ${showNavControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className={`${slide.type === "commandant" || isContinuousMode ? "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px] h-full min-h-0 flex flex-col" : "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px]"} relative w-full max-h-full transition-all ease-out will-change-transform ${slide.type === "commandant" || isContinuousMode ? "" : "-translate-y-1 sm:-translate-y-2 md:-translate-y-3"} ${getTransitionClasses()}`}
          style={{ transitionDuration: `${currentTransitionDuration}ms` }}
        >
          {isContinuousMode && continuousItems.length > 0 ? (
            renderedContinuousContent
          ) : (
            <>
              {slideImageUrl && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-xl overflow-hidden"
                  initial={{
                    opacity: 0.12,
                    scale: isPortraitSlide ? 1 : 1.03,
                    x: 0,
                    y: 0,
                  }}
                  animate={
                    prefersReducedMotion
                      ? { opacity: 0.24, scale: isPortraitSlide ? 1.01 : 1.03 }
                      : {
                          opacity: [0.2, 0.32, 0.22],
                          scale: isPortraitSlide
                            ? [1, 1.03, 1.01]
                            : [1.04, 1.08, 1.05],
                          x: isPortraitSlide ? [0, 10, -6, 0] : [0, 16, -10, 0],
                          y: isPortraitSlide ? [0, -6, 4, 0] : [0, -8, 6, 0],
                        }
                  }
                  transition={cinematicTransition(14, {
                    repeat: Infinity,
                    repeatType: "mirror",
                  })}
                  style={{ willChange: "transform" }}
                >
                  <img
                    src={slideImageUrl}
                    alt=""
                    className={`h-full w-full ${isPortraitSlide ? "object-contain object-top" : "object-cover"} blur-[2.5px]`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/76 via-slate-950/68 to-slate-950/82" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,hsl(var(--primary)/0.22)_0%,transparent_40%),radial-gradient(circle_at_85%_78%,hsl(var(--primary)/0.16)_0%,transparent_44%)]" />
                </motion.div>
              )}
              {transitionType === "pro-slider" ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${slide.type}-${currentIndex}`}
                    custom={transitionDirectionRef.current}
                    variants={layeredSlideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={cinematicTransition(
                      slide.type === "commandant"
                        ? Math.max(
                            0.9,
                            Math.min(
                              1.8,
                              cinematicSettings.commandantDurationMs / 1000,
                            ),
                          )
                        : Math.max(
                            0.65,
                            Math.min(
                              1.4,
                              cinematicSettings.imageDurationMs / 1000,
                            ),
                          ),
                    )}
                    className={
                      slide.type === "commandant"
                        ? "flex min-h-0 flex-1 flex-col"
                        : undefined
                    }
                    style={{ willChange: "transform" }}
                  >
                    {renderSlideContent()}
                  </motion.div>
                </AnimatePresence>
              ) : slide.type === "commandant" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {renderSlideContent()}
                </div>
              ) : (
                renderSlideContent()
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress dots */}
      {!isContinuousMode && (
        <div className="flex justify-center gap-1.5 pb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      {selectedCommandant && (
        <div className="fixed inset-0 z-[70] bg-[#020817] p-0 overflow-y-auto overflow-x-hidden">
          <div className="min-h-screen w-full flex flex-col items-center">
            {/* Close Button Header */}
            <div className="sticky top-0 z-[80] w-full bg-[#020817]/80 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-lg gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={ndcCrest}
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="text-white font-serif tracking-widest uppercase text-[11px] sm:text-sm font-semibold">
                  Officer Profile : {selectedCommandant.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedCommandant(null)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all duration-300"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-red-500/20 group-hover:text-red-400 transition-all">
                  <span className="text-xs">✕</span>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-white/70 font-bold group-hover:text-white transition-colors">
                  Close Profile
                </span>
              </button>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-[1400px] px-3 sm:px-6 py-6 sm:py-12">
              <CommandantHero
                commandant={selectedCommandant}
                compactDescription={false}
                isAutoDisplay={false}
              />

              <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-semibold mb-3">
                  Complete Commandant Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Name</p>
                    <p className="text-white mt-1">{selectedCommandant.name}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Title</p>
                    <p className="text-white mt-1">{selectedCommandant.title}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Tenure</p>
                    <p className="text-white mt-1">{selectedCommandant.tenureStart} - {selectedCommandant.tenureEnd ?? 'Present'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-white mt-1">{selectedCommandant.isCurrent ? 'Current Commandant' : 'Past Commandant'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Decoration</p>
                    <div className="mt-1 inline-flex max-w-full items-center rounded-md border border-[#FFD700]/80 bg-[linear-gradient(140deg,#FFF5BF_0%,#FFD700_45%,#C79600_100%)] px-2.5 py-1 shadow-[0_0_16px_rgba(255,215,0,0.33)]">
                      <p className="text-[#1f2937] font-bold tracking-[0.08em] break-words">{selectedCommandant.decoration || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Description</p>
                    <p className="text-white/90 mt-1 leading-relaxed">{selectedCommandant.description || 'No description available.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedVisit && (
        <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-sm p-3 sm:p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto rounded-xl border border-primary/35 bg-card p-4 sm:p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary/85 font-semibold">
                  Distinguished Visit
                </p>
                <h3 className="text-2xl md:text-3xl font-bold font-serif text-foreground mt-1">
                  {selectedVisit.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="px-3 py-1.5 rounded text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>

            <p className="text-sm md:text-base text-primary/90 font-semibold tracking-[0.12em] uppercase mb-3">
              {selectedVisit.title}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedVisit.country} · {selectedVisit.date}
            </p>

            {selectedVisit.imageUrl && (
              <div className="w-full max-w-xl mx-auto mb-6 rounded-lg overflow-hidden border border-primary/25">
                <img
                  src={selectedVisit.imageUrl}
                  alt={selectedVisit.name}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            <p className="text-base leading-relaxed text-foreground/90">
              {selectedVisit.description}
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</p>
                <p className="text-foreground mt-1">{selectedVisit.name}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</p>
                <p className="text-foreground mt-1">{selectedVisit.title}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Country</p>
                <p className="text-foreground mt-1">{selectedVisit.country}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
                <p className="text-foreground mt-1">{selectedVisit.date}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2 md:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Decoration</p>
                <div className="mt-1 inline-flex max-w-full items-center rounded-md border border-[#D4AF37]/80 bg-[linear-gradient(140deg,#FFF8CF_0%,#EBCB59_45%,#C49A2C_100%)] px-2.5 py-1 shadow-[0_0_14px_rgba(212,175,55,0.3)]">
                  <p className="text-[#1f2937] font-bold tracking-[0.08em] break-words">{selectedVisit.decoration || 'N/A'}</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-card/70 px-3 py-2 md:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="text-foreground/90 mt-1 leading-relaxed">{selectedVisit.description || 'No description available.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
