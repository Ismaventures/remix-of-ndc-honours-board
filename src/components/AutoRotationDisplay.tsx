import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Monitor, SkipForward } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Category,
  Personnel,
  DistinguishedVisit,
  Commandant,
} from "@/types/domain";
import { CommandantHero } from "./CommandantHero";
import { UnifiedAutoCard } from "./UnifiedAutoCard";
import { ProfileModal } from "./ProfileModal";
import ndcCrest from "/images/ndc-crest.png";
import { useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import {
  AutoDisplayContextKey,
  AutoDisplaySettings,
  AutoDisplayTransitionType,
  DEFAULT_AUTO_DISPLAY_SETTINGS,
} from "@/hooks/useAutoDisplaySettings";
import { NdcScatteredTransition } from "./NdcScatteredTransition";
import { useSliderControl } from "@/hooks/useSliderControl";
import {
  cinematicTransition,
  layeredSlideVariants,
  textStaggerContainer,
  textStaggerItem,
} from "@/lib/cinematicMotion";
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

  const audioAssignments = useAudioStore((s) => s.assignments);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastForcedStepNonceRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const transitionStepRef = useRef(0);
  const transitionDirectionRef = useRef<1 | -1>(1);
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

      return categoryPersonnel.length > 0
        ? categoryPersonnel
        : commandants
            .slice(0, 1)
            .map((commandant) => ({ type: "commandant" as const, commandant }));
    }

    if (activeView === "visits") {
      const visitSlides = visits
        .slice(0, 12)
        .map((visit) => ({ type: "visit" as const, visit }));
      return visitSlides.length > 0
        ? visitSlides
        : commandants
            .slice(0, 1)
            .map((commandant) => ({ type: "commandant" as const, commandant }));
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
      const backwardIndex =
        (previousIndex - 1 + slides.length) % slides.length;
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
      const baseDurationMs = getTransitionDurationMs(nextTransition);
      const nextSlide = slides[nextIndex];
      const durationMs =
        nextSlide?.type === "commandant"
          ? Math.max(900, Math.min(1800, Math.round((baseDurationMs + cinematicSettings.commandantDurationMs) / 2)))
          : Math.max(650, Math.min(1400, Math.round((baseDurationMs + cinematicSettings.imageDurationMs) / 2)));
      
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
      cinematicSettings.imageDurationMs,
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
    transitionTo((currentIndex + 1) % slides.length, true);
  }, [currentIndex, revealControls, slides.length, transitionTo]);

  const handleManualRetreat = useCallback(() => {
    revealControls();
    transitionTo((currentIndex - 1 + slides.length) % slides.length, true);
  }, [currentIndex, revealControls, slides.length, transitionTo]);

  useEffect(() => {
    if (!isActive || isPaused) return;
    const interval = setInterval(
      advance,
      Math.round(contextTiming.slideDurationMs * 1.2),
    );
    return () => clearInterval(interval);
  }, [isActive, isPaused, advance, contextTiming.slideDurationMs]);

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
    if (isActive) {
      const slide = slides[currentIndex];
      let trackId = audioAssignments.globalAuto;

      if (
        activeCategory === "FWC" &&
        audioAssignments.distinguished_fellows_fwc
      ) {
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
      } else if (slide?.type === "personnel" && slide.person.category) {
        const cat = slide.person.category.toLowerCase();
        if (cat.includes("fwc") && audioAssignments.distinguished_fellows_fwc) {
          trackId = audioAssignments.distinguished_fellows_fwc;
        } else if (
          cat.includes("fdc") &&
          audioAssignments.distinguished_fellows_fdc
        ) {
          trackId = audioAssignments.distinguished_fellows_fdc;
        } else if (
          cat.includes("directing") &&
          audioAssignments.directing_staff
        ) {
          trackId = audioAssignments.directing_staff;
        } else if (cat.includes("allied") && audioAssignments.allied_officers) {
          trackId = audioAssignments.allied_officers;
        }
      }
      playAudioTrack(trackId);
    } else {
      playAudioTrack(null); // Stop audio when exiting auto mode
    }
  }, [isActive, currentIndex, slides, audioAssignments, activeCategory]);

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
          setTransitionType(sequence[0] ?? "fade-zoom");
          transitionStepRef.current = 0;
          setCurrentIndex(0);
          setDisplayActive(true);
        }}
        className="flex items-center gap-2 px-4 py-2 gold-border rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 active:scale-[0.97]"
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
          className="w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-hidden"
          aria-label={`Open profile for ${slide.commandant.name}`}
          whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={cinematicTransition(0.24)}
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            animate={
              prefersReducedMotion
                ? undefined
                : { x: ["-10%", "360%"] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : cinematicTransition(2.8, { repeat: Infinity, repeatDelay: 2.4 })
            }
          />
          <CommandantHero 
            commandant={slide.commandant} 
            compactDescription 
            isAutoDisplay 
          />
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
      {/* Cinematic Transition Overlay */}
      {transitionType === "ndc-scatter" && fadeState === "out" && (
        <NdcScatteredTransition durationMs={currentTransitionDuration} />
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

      {/* Exit Button overlay for Auto Display */}
      {isActive && (
        <div className="fixed top-4 right-4 z-[100] flex gap-2">
          <button
            onClick={() => setDisplayActive(false)}
            className="px-4 py-2 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-slate-900 transition-all text-xs font-bold tracking-widest uppercase shadow-2xl"
          >
            Exit Display
          </button>
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-4 md:px-6 pt-2 sm:pt-4 md:pt-6 pb-8 sm:pb-10 md:pb-12 overflow-hidden">
        <div
          className={`absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${showInteractionHint ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
        >
          <div className="px-4 py-2 rounded-md border border-primary/30 bg-slate-950/85 backdrop-blur text-[10px] md:text-xs uppercase tracking-[0.16em] text-primary/90 text-center whitespace-nowrap">
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
          className={`${slide.type === "commandant" ? "max-w-5xl xl:max-w-6xl" : "max-w-5xl xl:max-w-6xl 2xl:max-w-7xl"} relative w-full max-h-full -translate-y-2 sm:-translate-y-3 md:-translate-y-4 transition-all ease-out will-change-transform ${getTransitionClasses()}`}
          style={{ transitionDuration: `${currentTransitionDuration}ms` }}
        >
          {slideImageUrl && (
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-xl overflow-hidden"
              initial={{ opacity: 0.12, scale: isPortraitSlide ? 1 : 1.03, x: 0, y: 0 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 0.24, scale: isPortraitSlide ? 1.01 : 1.03 }
                  : {
                      opacity: [0.2, 0.32, 0.22],
                      scale: isPortraitSlide
                        ? [1, 1.03, 1.01]
                        : [1.04, 1.08, 1.05],
                      x: isPortraitSlide
                        ? [0, 10, -6, 0]
                        : [0, 16, -10, 0],
                      y: isPortraitSlide
                        ? [0, -6, 4, 0]
                        : [0, -8, 6, 0],
                    }
              }
              transition={cinematicTransition(14, { repeat: Infinity, repeatType: "mirror" })}
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
                    ? Math.max(0.9, Math.min(1.8, cinematicSettings.commandantDurationMs / 1000))
                    : Math.max(0.65, Math.min(1.4, cinematicSettings.imageDurationMs / 1000)),
                )}
                style={{ willChange: "transform" }}
              >
                {renderSlideContent()}
              </motion.div>
            </AnimatePresence>
          ) : (
            renderSlideContent()
          )}
        </div>
      </div>

      {/* Progress dots */}
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
            <div className="sticky top-0 z-[80] w-full bg-[#020817]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-3">
                <img src={ndcCrest} alt="Logo" className="h-8 w-8 object-contain" />
                <span className="text-white font-serif tracking-widest uppercase text-sm font-semibold">
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
            <div className="w-full max-w-[1400px] px-6 py-12">
              <CommandantHero
                commandant={selectedCommandant}
                compactDescription={false}
                isAutoDisplay={false}
              />
            </div>
          </div>
        </div>
      )}

      {selectedVisit && (
        <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto rounded-xl border border-primary/35 bg-card p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
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
          </div>
        </div>
      )}
    </div>
  );
}
