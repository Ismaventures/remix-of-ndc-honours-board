import {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Shield,
  SkipForward,
  X,
  Play,
  Settings,
} from "lucide-react";
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
import { CommandantProfileModal } from "./CommandantProfileModal";
import { PersonnelSplitHeroModal } from "./PersonnelSplitHeroModal";
import ndcCrest from "/images/ndc-crest.png";
import { prefetchAudioTrack, useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import { useSliderControl } from "@/hooks/useSliderControl";
import { useThemeMode } from "@/hooks/useThemeMode";
import { AnimatedPresence } from "@/lib/AnimatedPresence";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { slideDirectionStyle } from "@/lib/animation";
import { playTransitionCue } from "@/lib/transitionCues";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useCinematicExperienceSettings } from "@/hooks/useCinematicExperienceSettings";
import { getCommandantDisplayTitle } from "@/lib/utils";
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
  onStageComplete?: (context: AutoDisplayContextKey) => void;
  onPlayAll?: () => void;
  showSettings?: boolean;
  onToggleSettings?: () => void;
  isAutoDisplayActive?: boolean;
  isViewAdmin?: boolean;
}

type Slide =
  | { type: "commandant"; commandant: Commandant }
  | { type: "personnel"; person: Personnel }
  | { type: "visit"; visit: DistinguishedVisit };

type CourseMarker = {
  markerType: "course";
  id: string;
  label: string;
  count: number;
};

type ContinuousItem =
  | Personnel
  | DistinguishedVisit
  | Commandant
  | CourseMarker;

const getCourseDesignation = (person: Personnel): string => {
  const decoration = person.decoration?.trim() ?? "";
  const cseMatch = decoration.match(/CSE\s*(\d+)\s*\/\s*(\d{4})/i);
  if (cseMatch) return `CSE ${cseMatch[1]}/${cseMatch[2]}`;

  const nwcMatch = decoration.match(/NWC\s+Course\s+(\d+)/i);
  if (nwcMatch) {
    return person.periodStart
      ? `NWC Course ${nwcMatch[1]}/${person.periodStart}`
      : `NWC Course ${nwcMatch[1]}`;
  }

  return decoration || (person.periodStart ? `Course ${person.periodStart}` : "Course");
};

const isCourseMarker = (item: ContinuousItem): item is CourseMarker =>
  "markerType" in item && item.markerType === "course";

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

const getServiceColor = (serviceName?: string, rank?: string, title?: string, postNominals?: string): string => {
  if (serviceName) {
    const s = serviceName.toLowerCase();
    if (s.includes("army")) return "#FF0000";
    if (s.includes("navy")) return "#002060";
    if (s.includes("air force") || s.includes("airforce")) return "#00B0F0";
  }
  if (rank || title || postNominals) {
    const r = (rank || "").toLowerCase();
    const t = (title || "").toLowerCase();
    const p = (postNominals || "").toLowerCase();
    if (
      r.includes("admiral") ||
      r.includes("commodore") ||
      r.includes("cdre") ||
      t.includes("navy") ||
      p.includes("nn")
    ) {
      return "#002060";
    }
    if (
      r.includes("avm") ||
      r.includes("air vice marshal") ||
      r.includes("marshal") ||
      r.includes("air commodore") ||
      r.includes("air cdre") ||
      t.includes("air force") ||
      p.includes("naf")
    ) {
      return "#00B0F0";
    }
    if (
      r.includes("general") ||
      r.includes("gen") ||
      r.includes("colonel") ||
      r.includes("col") ||
      r.includes("brigadier") ||
      r.includes("brig") ||
      r.includes("major") ||
      r.includes("lieutenant") ||
      r.includes("lt")
    ) {
      return "#FF0000";
    }
  }
  return "tri-color";
};

const ContinuousSlideCard = memo(function ContinuousSlideCard({
  item,
  type,
  onSelect,
  isLightMode,
  imageLoading,
}: {
  item: Personnel | DistinguishedVisit | Commandant;
  type: "personnel" | "visit" | "commandant";
  onSelect: (item: Personnel | DistinguishedVisit | Commandant) => void;
  isLightMode: boolean;
  imageLoading: "eager" | "lazy";
}) {
  const rawUrl = item.imageUrl;
  const imageUrl = useResolvedMediaUrl(rawUrl);

  const isVisit = type === "visit";
  const isCommandant = type === "commandant";

  const title =
    (isCommandant
      ? getCommandantDisplayTitle(item as Commandant, "")
      : isVisit
        ? (item as DistinguishedVisit).title
        : ""
    )?.trim() || "";
  const name = item.name?.trim();
  const subtitle = isCommandant
    ? (item as Commandant).isCurrent
      ? "Current Commandant"
      : "Past Commandant"
    : isVisit
      ? (item as DistinguishedVisit).country
      : (item as Personnel).service;
  const decoration = item.decoration;
  const imageAltTitle =
    title ||
    (isVisit ? "Honoured Guest" : isCommandant ? "Commandant" : "Staff");
  const personnelRank =
    !isVisit && !isCommandant ? (item as Personnel).rank?.trim() : "";
  const hasRankPrefix = Boolean(
    personnelRank &&
    name &&
    name.toLowerCase().startsWith(personnelRank.toLowerCase()),
  );
  const displayName =
    !isVisit && !isCommandant && personnelRank && name && !hasRankPrefix
      ? `${personnelRank} ${name}`
      : name;
  const safeName = displayName || "Name unavailable";
  const safeDecoration = decoration?.trim() || "";
  const serviceColor = useMemo(() => {
    if (type === "visit") return "tri-color";
    if (type === "personnel") {
      const p = item as Personnel;
      return getServiceColor(p.service);
    }
    if (type === "commandant") {
      const c = item as Commandant;
      return getServiceColor(undefined, c.rank, c.title, c.postNominals);
    }
    return "tri-color";
  }, [item, type]);

  const yearLabel = useMemo(() => {
    if (isVisit) {
      const visitDate = ((item as DistinguishedVisit).date ?? "").trim();
      const yearMatch = visitDate.match(/(19|20)\d{2}/);
      return yearMatch?.[0] ?? (visitDate || "N/A");
    }

    if (isCommandant) {
      const cItem = item as Commandant;
      if (cItem.tenureStart && cItem.tenureEnd)
        return `${cItem.tenureStart} - ${cItem.tenureEnd}`;
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
      className={`auto-scroll-card group relative ${
        isCommandant
          ? "commandant-auto-card w-[75vw] sm:w-[42vw] md:w-[36vw] lg:w-[30vw] xl:w-[26vw] max-w-[420px] h-[clamp(440px,72vh,660px)]"
          : "w-[78vw] sm:w-[45vw] md:w-[38vw] lg:w-[31vw] xl:w-[28vw] max-w-[450px] h-[clamp(420px,68vh,620px)]"
      } self-center shrink-0 overflow-hidden rounded-2xl p-1.5 sm:p-2 text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 flex flex-col ${
        isLightMode
          ? "bg-white border border-[#002060]/20 shadow-[0_8px_22px_rgba(0,32,96,0.12)]"
          : "bg-slate-950 border border-slate-500/35 shadow-[0_10px_26px_rgba(2,6,23,0.42)]"
      }`}
      aria-label={`${isCommandant ? "Commandant" : isVisit ? "Visit" : "Staff"} card for ${safeName}`}
    >
      {serviceColor === "tri-color" ? (
        <>
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
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute top-0 inset-x-0 h-[7px] z-20"
            style={{ backgroundColor: serviceColor }}
          />
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-[6px] z-20"
            style={{ backgroundColor: serviceColor }}
          />
        </>
      )}

      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div
          className={`absolute inset-0 ${isLightMode ? "bg-white" : "bg-slate-950"}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 mb-1 sm:mb-1.5 flex flex-col flex-1 min-h-0 w-full">
        <div className="portrait-photo-mat rounded-sm p-[2px] shadow-xl flex flex-col flex-1 min-h-0 w-full items-center justify-center">
          <div className={`rounded-[2px] bg-white p-[2px] shadow-inner flex flex-col min-h-0 w-full`}>
            <div className="portrait-photo-mat-inner rounded-[1px] bg-neutral-100/90 p-px flex flex-col flex-1 min-h-0 w-full">
              <div
                className={`auto-scroll-image-frame relative flex-1 min-h-0 overflow-hidden w-full ${
                  isCommandant ? "commandant-portrait-frame commandant-portrait-reel" : isVisit ? "" : "staff-portrait-frame"
                } ${isLightMode ? "bg-slate-100" : "bg-slate-900"}`}
              >
                {isCommandant && (
                  <>
                    <div className="pointer-events-none absolute inset-0 z-[1] commandant-portrait-vignette" />
                    <div className="pointer-events-none absolute inset-0 z-[2] commandant-portrait-glass" />
                  </>
                )}
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={`${imageAltTitle} ${safeName}`}
                      className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      loading={imageLoading}
                      decoding="async"
                      draggable={false}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                    <Shield className="h-10 w-10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full" style={{ containerType: "inline-size" }}>
        <div className="h-[2px] w-full bg-[#FF0000]" />
        <div
          className={`auto-scroll-plate bg-[#002060] ${
            isVisit
              ? "px-3 py-2.5 sm:px-4 sm:py-3"
              : "px-2 py-1.5 sm:px-3 sm:py-2"
          } text-center shadow-xl flex flex-col items-center justify-center`}
        >
          <h3 
            className="auto-scroll-name font-extrabold leading-tight break-words [overflow-wrap:anywhere] text-[#FFD700] max-h-[2.8em] overflow-y-auto w-full"
            style={{ fontSize: "clamp(0.85rem, 5.5cqi, 1.25rem)" }}
          >
            {safeName}
          </h3>
          {title && (
            <p 
              className="auto-scroll-title mt-1 font-extrabold tracking-[0.06em] text-[#FF3B30] break-words [overflow-wrap:anywhere] leading-tight max-h-[3em] overflow-y-auto w-full"
              style={{ fontSize: "clamp(0.75rem, 4cqi, 1.1rem)" }}
            >
              {title}
            </p>
          )}
          {isCommandant && safeDecoration && (
            <div className="mt-1 inline-flex max-w-full items-center justify-center rounded-md border border-white/35 bg-gradient-to-br from-neutral-50 via-white to-neutral-200/90 px-2 py-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              <p 
                className="font-bold tracking-[0.07em] text-[#1f2937] break-words"
                style={{ fontSize: "clamp(9px, 2.8cqi, 12px)" }}
              >
                {safeDecoration}
              </p>
            </div>
          )}
          <p 
            className="auto-scroll-meta mt-1 uppercase tracking-[0.1em] text-white/95 break-words leading-tight w-full"
            style={{ fontSize: "clamp(9px, 2.5cqi, 11px)" }}
          >
            {subtitle}
          </p>
          <p 
            className="auto-scroll-year mt-1 text-[#f0ebe3] font-semibold tracking-[0.07em] uppercase leading-tight w-full"
            style={{ fontSize: "clamp(9px, 2.8cqi, 12px)" }}
          >
            Year: {yearLabel}
          </p>
        </div>
        <div className="h-[2px] w-full bg-[#FF0000]" />
      </div>

      <p className="relative z-10 mt-1.5 mb-0.5 sm:mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold text-center">
        Tap to open full details
      </p>
    </button>
  );
});

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
  onStageComplete,
  onPlayAll,
  showSettings = false,
  onToggleSettings,
  isAutoDisplayActive = false,
  isViewAdmin = false,
}: AutoRotationDisplayProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [transitionType, setTransitionType] =
    useState<AutoDisplayTransitionType>("fade-zoom");
  const [showNavControls, setShowNavControls] = useState(true);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [selectedCommandant, setSelectedCommandant] =
    useState<Commandant | null>(null);
  const commandantSlideDir = useRef<'left' | 'right' | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<DistinguishedVisit | null>(
    null,
  );
  const [activeCourseLabel, setActiveCourseLabel] = useState<string>("");
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
  const fdcTrackRef = useRef<HTMLDivElement | null>(null);
  const fdcAutoPauseUntilRef = useRef(0);
  const fdcNavRafRef = useRef<number | null>(null);
  const lastForcedStepNonceRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const stageCompleteFiredRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const transitionStepRef = useRef(0);
  const transitionDirectionRef = useRef<1 | -1>(1);
  const lastTransitionCueAtRef = useRef(0);
  const lastCourseDetectionAtRef = useRef(0);
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
        .sort((a, b) => {
          if (activeCategory === "FWC" || activeCategory === "FDC") {
            const courseCompare = getCourseDesignation(a).localeCompare(
              getCourseDesignation(b),
              undefined,
              { numeric: true },
            );
            if (courseCompare !== 0) return courseCompare;
          }
          return a.seniorityOrder - b.seniorityOrder;
        })
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
<<<<<<< HEAD
    ((displayContext !== "visits" &&
=======
    ((activeCategory !== null &&
      displayContext !== "commandants" &&
      displayContext !== "FWC" &&
      displayContext !== "FDC" &&
>>>>>>> 5cc24f1d0af20028457fa01c6adb27471328d852
      !useAppliedTransitionOnly) ||
      appliedTransition === "continuous-scroll" ||
      sequence[0] === "continuous-scroll");

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

  const navigateCommandantProfile = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedCommandant) return;
      const list = commandants;
      const idx = list.findIndex((c) => c.id === selectedCommandant.id);
      if (idx === -1) return;
      const nextIdx = direction === "next" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= list.length) return;
      commandantSlideDir.current = direction === "next" ? "left" : "right";
      setSelectedCommandant(list[nextIdx]);
    },
    [selectedCommandant, commandants],
  );

  const continuousItems = useMemo<ContinuousItem[]>(() => {
    if (activeView === "visits") return visitSlides.map((s) => s.visit);
    if (commandantSlides.length > 0)
      return commandantSlides.map((s) => s.commandant);
    if (activeCategory === "FWC" || activeCategory === "FDC") {
      return personnelSlides.map((s) => s.person);
    }
    return personnelSlides.map((s) => s.person);
  }, [activeCategory, activeView, visitSlides, personnelSlides, commandantSlides]);

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

  const segmentWidthRef = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);

  const updateCachedSegmentWidth = useCallback(() => {
    const container = fdcScrollRef.current;
    if (!container) return;
    segmentWidthRef.current = container.scrollWidth / 3;
  }, []);

  useEffect(() => {
    if (!isContinuousMode) return;
    updateCachedSegmentWidth();
    const t1 = setTimeout(updateCachedSegmentWidth, 100);
    const t2 = setTimeout(updateCachedSegmentWidth, 500);
    window.addEventListener("resize", updateCachedSegmentWidth);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateCachedSegmentWidth);
    };
  }, [isContinuousMode, continuousItems.length, updateCachedSegmentWidth]);

  const courseLabels = useMemo(() => {
    if (activeCategory !== "FWC" && activeCategory !== "FDC") return [];
    const labels: string[] = [];
    let lastLabel = "";
    for (const person of continuousItems) {
      if ("decoration" in person) {
        const label = getCourseDesignation(person as Personnel);
        if (label !== lastLabel) {
          labels.push(label);
          lastLabel = label;
        }
      }
    }
    return labels;
  }, [activeCategory, continuousItems]);

  const detectCurrentCourse = useCallback((currentScrollPos: number) => {
    const container = fdcScrollRef.current;
    const track = fdcTrackRef.current;
    if (!container || !track || courseLabels.length === 0) return;

    const cards = track.querySelectorAll<HTMLElement>(".auto-scroll-card");
    if (cards.length === 0) return;

    const containerCenter = currentScrollPos + container.clientWidth / 2;
    let closestCard: HTMLElement | null = null;
    let closestDist = Infinity;

    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestCard = card;
      }
    });

    if (!closestCard) return;

    const allItems = Array.from(track.querySelectorAll<HTMLElement>(".auto-scroll-card"));
    const idx = allItems.indexOf(closestCard);
    const itemCount = continuousItems.length;
    const segmentIdx = itemCount > 0 ? idx % itemCount : 0;
    const item = continuousItems[segmentIdx];

    if (item && "decoration" in item) {
      const label = getCourseDesignation(item as Personnel);
      setActiveCourseLabel((prev) => (prev !== label ? label : prev));
    }
  }, [courseLabels.length, continuousItems]);

  const handleContinuousSelect = useCallback(
    (selected: Personnel | DistinguishedVisit | Commandant) => {
      if ("isCurrent" in selected) {
        setSelectedCommandant(selected);
        return;
      }
      if ("category" in selected) {
        setSelectedPerson(selected);
        return;
      }
      setSelectedVisit(selected);
    },
    [],
  );

  const normalizeFdcLoopPosition = useCallback(() => {
    const container = fdcScrollRef.current;
    if (!container || continuousItems.length <= 1) return;

    const segmentWidth = segmentWidthRef.current || (container.scrollWidth / 3);
    if (segmentWidth <= 0) return;

    while (scrollPosRef.current >= segmentWidth * 2) {
      scrollPosRef.current -= segmentWidth;
    }

    while (scrollPosRef.current < segmentWidth) {
      scrollPosRef.current += segmentWidth;
    }

    if (fdcTrackRef.current) {
      fdcTrackRef.current.style.transform = `translate3d(-${scrollPosRef.current}px, 0, 0)`;
    }
  }, [continuousItems.length]);

  const nudgeFdcTrack = useCallback(
    (dir: "left" | "right") => {
      const container = fdcScrollRef.current;
      const track = fdcTrackRef.current;
      if (!container || !track) return;

      normalizeFdcLoopPosition();
      fdcAutoPauseUntilRef.current = performance.now() + 900;

      if (fdcNavRafRef.current) {
        window.cancelAnimationFrame(fdcNavRafRef.current);
        fdcNavRafRef.current = null;
      }

      const delta = dir === "left" ? -340 : 340;
      const start = scrollPosRef.current;
      const end = start + delta;
      const durationMs = 420;
      const startAt = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const progress = Math.min(1, (now - startAt) / durationMs);
        const eased = easeOutCubic(progress);

        scrollPosRef.current = start + (end - start) * eased;
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
        now - lastTransitionCueAtRef.current >=
          cinematicSettings.whooshCooldownMs
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
    if (slides.length === 0) return;
    if (currentIndex >= slides.length - 1) {
      if (!stageCompleteFiredRef.current) {
        stageCompleteFiredRef.current = true;
        onStageComplete?.(displayContext);
      }
      return;
    }
    transitionTo((currentIndex + 1) % slides.length);
  }, [
    currentIndex,
    displayContext,
    onStageComplete,
    slides.length,
    transitionTo,
  ]);

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

    // Small delay to allow container.scrollWidth to settle after mount
    const t = setTimeout(() => {
      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth > 0 && scrollPosRef.current < 10) {
        scrollPosRef.current = segmentWidth;
        if (fdcTrackRef.current) {
          fdcTrackRef.current.style.transform = `translate3d(-${segmentWidth}px, 0, 0)`;
        }
      }
    }, 100);
    return () => clearTimeout(t);
  }, [continuousItems.length, isContinuousMode]);

  useEffect(() => {
    const container = fdcScrollRef.current;
    const track = fdcTrackRef.current;
    if (!container || !track || !isContinuousMode || continuousItems.length === 0) return;

    if (prefersReducedMotion) return;

    let rafId = 0;
    let last = performance.now();
    const speedPxPerMs = 0.03;
    let lastDetectionAt = 0;

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (!isPaused) {
        if (now < fdcAutoPauseUntilRef.current) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        scrollPosRef.current += elapsed * speedPxPerMs;
        
        // Loop position normalization using cached width to avoid layout reflow overhead
        const segmentWidth = segmentWidthRef.current || (container.scrollWidth / 3);
        if (segmentWidth > 0) {
          if (scrollPosRef.current >= segmentWidth * 2) {
            scrollPosRef.current -= segmentWidth;
          } else if (scrollPosRef.current < segmentWidth) {
            scrollPosRef.current += segmentWidth;
          }
        }

        track.style.transform = `translate3d(-${scrollPosRef.current}px, 0, 0)`;
        
        // Throttled detection of the current course label (every 200ms)
        if (now - lastDetectionAt > 200) {
          lastDetectionAt = now;
          detectCurrentCourse(scrollPosRef.current);
        }
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
    prefersReducedMotion,
    detectCurrentCourse,
  ]);

  useEffect(() => {
    if (!forcedControl) return;

    if (forcedControl.enabled) {
      stageCompleteFiredRef.current = false;
      setTransitionType(sequence[0] ?? "fade-zoom");
      transitionStepRef.current = 0;
      setCurrentIndex(0);
      setDisplayActive(true);
      return;
    }

    if (isActive) {
      setDisplayActive(false);
    }
  }, [forcedControl, sequence, setDisplayActive, isActive]);

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
    stageCompleteFiredRef.current = false;
  }, [displayContext, sequence]);

  useEffect(() => {
    if (!isActive) {
      stageCompleteFiredRef.current = false;
      return;
    }

    if (slides.length === 0 || stageCompleteFiredRef.current) return;

    if (isContinuousMode) {
      const durationMs = Math.max(
        7000,
        Math.round(slides.length * contextTiming.slideDurationMs),
      );
      const timer = setTimeout(() => {
        if (stageCompleteFiredRef.current) return;
        stageCompleteFiredRef.current = true;
        onStageComplete?.(displayContext);
      }, durationMs);
      return () => clearTimeout(timer);
    }

    if (slides.length === 1) {
      const timer = setTimeout(
        () => {
          if (stageCompleteFiredRef.current) return;
          stageCompleteFiredRef.current = true;
          onStageComplete?.(displayContext);
        },
        Math.round(contextTiming.slideDurationMs * 1.2),
      );
      return () => clearTimeout(timer);
    }
  }, [
    contextTiming.slideDurationMs,
    displayContext,
    isActive,
    isContinuousMode,
    onStageComplete,
    slides.length,
  ]);

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
      } else if (
        slideCandidate?.type === "personnel" &&
        slideCandidate.person.category
      ) {
        const cat = slideCandidate.person.category.toLowerCase();
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

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

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
    const buttonLabel = activeCategory
      ? `${activeCategory} Auto Display`
      : activeView === "visits"
        ? "Visits Auto Display"
        : "Commandants Auto Display";

    const handleStartDisplay = () => {
      if (slides.length === 0) return;
      stageCompleteFiredRef.current = false;
      const initialTrackId = resolveTrackIdForSlide(slides[0]);
      if (isMuted) setMuted(false);
      activationAudioPrimedRef.current = true;
      playAudioTrack(initialTrackId, false, true);
      setTransitionType(sequence[0] ?? "fade-zoom");
      transitionStepRef.current = 0;
      setCurrentIndex(0);
      setDisplayActive(true);
    };

    const buttonBase = isLightMode
      ? "border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
      : "gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40";

    const hasMenuOptions = !isAutoDisplayActive && !isViewAdmin && (onPlayAll || onToggleSettings);

    return (
      <div className="relative flex items-stretch" ref={menuRef}>
        <button
          onClick={handleStartDisplay}
          className={`flex items-center gap-2 px-4 py-2 rounded-l-md text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed ${buttonBase} ${
            hasMenuOptions ? "rounded-r-none border-r-0" : "rounded-md"
          }`}
          disabled={slides.length === 0}
        >
          <Monitor className="h-4 w-4 text-primary" />
          <span>{buttonLabel}</span>
        </button>

        {hasMenuOptions && (
          <>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className={`flex items-center justify-center w-8 px-1 py-2 rounded-r-md text-sm transition-all duration-200 active:scale-[0.97] ${buttonBase}`}
            >
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
                {onPlayAll && (
                  <button
                    onClick={() => { setShowMenu(false); onPlayAll(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Play className="h-4 w-4 text-primary" />
                    <span>Play All Auto Displays</span>
                  </button>
                )}
                {onToggleSettings && (
                  <button
                    onClick={() => { setShowMenu(false); onToggleSettings(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
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
        return "opacity-100"; // Handled by AnimatedPresence + CSS slide
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
        <button
          onClick={() => setSelectedCommandant(slide.commandant)}
          className={`w-full h-full min-h-0 max-h-full flex flex-col text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-x-hidden overflow-y-auto ${prefersReducedMotion ? "" : "hover-primary"}`}
          aria-label={`Open profile for ${slide.commandant.name}`}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent ${prefersReducedMotion ? "" : "animate-scan-beam"}`}
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
        </button>
      )}

      {slide.type === "personnel" && (
        <button
          onClick={() => setSelectedPerson(slide.person)}
          className={`w-full h-full min-h-0 max-h-full flex flex-col text-left relative overflow-hidden focus-visible:outline-none ${prefersReducedMotion ? "" : "hover-scale-sm"}`}
          aria-label={`Open profile for ${slide.person.name}`}
        >
          <UnifiedAutoCard
            type="personnel"
            data={slide.person}
            id={`p-${slide.person.id}`}
          />
        </button>
      )}

      {slide.type === "visit" && (
        <button
          onClick={() => setSelectedVisit(slide.visit)}
          className={`w-full text-center relative overflow-hidden focus-visible:outline-none ${prefersReducedMotion ? "" : "hover-scale-sm"}`}
          aria-label={`Open profile for ${slide.visit.name}`}
        >
          <UnifiedAutoCard
            type="visit"
            data={slide.visit}
            id={`v-${slide.visit.id}`}
          />
        </button>
      )}
    </>
  );

  const getSectionTitle = () => {
    if (activeView !== "visits" && !activeCategory) return "Chronicles of Commandants";
    if (activeCategory === "FWC" && activeCourseLabel) return activeCourseLabel;
    if (activeCategory === "FDC" && activeCourseLabel) return activeCourseLabel;
    return "";
  };

  const getSectionSubtitle = () => {
    if (activeView === "visits") return "Distinguished Visits and Honours";
    if (activeCategory === "FDC")
      return "Distinguished Fellows of the Defence College (FDC)";
    if (activeCategory === "FWC")
      return "Distinguished Fellows of the War College (FWC)";
    if (activeCategory === "Directing Staff")
      return "Chronicles of Directing Staff (Directing Staff)";
    if (activeCategory === "Allied")
      return "International Allied Officers (Allied)";
    return "National Defence College";
  };

  const getSectionDescriptor = () => {
    return "";
  };

  const sectionTitle = getSectionTitle();
  const sectionSubtitle = getSectionSubtitle();
  const headingPrimary = sectionSubtitle;
  const headingSecondary = sectionTitle || getSectionDescriptor();

  const renderedContinuousContent = (
    <div
      className={`relative mx-auto flex flex-1 h-full min-h-0 w-full max-w-[1900px] flex-col justify-start ${prefersReducedMotion ? "" : "animate-fade-up"}`}
      style={{ animationDuration: "0.6s" }}
    >
      <div className="auto-scroll-heading mb-1 px-1 sm:px-2 shrink-0">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm md:px-4 md:py-2">
          <div className="h-1 flex shrink-0">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#FF0000]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>
          <div className="px-2 pb-0 pt-2 text-center">
            {headingPrimary && (
              <h2
                className="heading-accent mx-auto max-w-[96vw] break-words font-serif text-[clamp(1.45rem,2.75vw,3.25rem)] font-bold uppercase leading-[0.98] tracking-[0.15em] text-[#002060]"
              >
                {headingPrimary.replace(" (FWC)", "").replace(" (FDC)", "")}
              </h2>
            )}
            {headingSecondary && (
              <p
                className="mx-auto mt-1.5 max-w-[82vw] break-words text-[clamp(0.95rem,1.35vw,1.45rem)] font-bold uppercase leading-none tracking-[0.08em] text-[#d4af37]"
              >
                {headingSecondary}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        ref={fdcScrollRef}
        className="relative flex flex-1 min-h-0 items-stretch justify-start overflow-hidden pb-3 px-3 sm:px-6 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
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
        <div
          ref={fdcTrackRef}
          className="flex items-stretch justify-start gap-4 sm:gap-6 w-max h-full will-change-transform"
        >
          {loopedContinuousItems.map((item, i) => {
            const isPersonnel = "category" in item;
            const isCommandant = "isCurrent" in item;
            const itemType = isCommandant
              ? "commandant"
              : isPersonnel
                ? "personnel"
                : "visit";
            return (
              <ContinuousSlideCard
                key={`${item.id}-${i}`}
                item={item as any}
                type={itemType}
                isLightMode={isLightMode}
                imageLoading={i < continuousItems.length ? "eager" : "lazy"}
                onSelect={handleContinuousSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
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
      {fadeState === "out" &&
        ({
          "ndc-scatter": (
            <NdcScatteredTransition durationMs={currentTransitionDuration} />
          ),
          "barracks-reveal": (
            <BarracksRevealTransition durationMs={currentTransitionDuration} />
          ),
          "salute-flash": (
            <SaluteFlashTransition durationMs={currentTransitionDuration} />
          ),
          "parade-sweep": (
            <ParadeSweepTransition durationMs={currentTransitionDuration} />
          ),
          "mission-brief": (
            <MissionBriefTransition durationMs={currentTransitionDuration} />
          ),
          "runway-sweep": (
            <RunwaySweepTransition durationMs={currentTransitionDuration} />
          ),
        }[transitionType] ||
          null)}

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

      {/* Slide content */}
      <div
        className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 sm:px-4 md:px-6 ${isContinuousMode ? "py-0" : isActive ? "py-1 sm:py-2" : "pt-2 sm:pt-4 md:pt-6 pb-8 sm:pb-10 md:pb-12"}`}
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
          className={`${slide.type === "commandant" || slide.type === "personnel" || isContinuousMode ? "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px] h-full min-h-0 flex flex-col" : "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px]"} relative w-full max-h-full transition-all ease-out will-change-transform ${slide.type === "commandant" || slide.type === "personnel" || isContinuousMode ? "" : "-translate-y-1 sm:-translate-y-2 md:-translate-y-3"} ${getTransitionClasses()}`}
          style={{ transitionDuration: `${currentTransitionDuration}ms` }}
        >
          {isContinuousMode && continuousItems.length > 0 ? (
            renderedContinuousContent
          ) : (
            <>
              {slideImageUrl && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 -z-10 rounded-xl overflow-hidden ${prefersReducedMotion ? "" : "animate-parallax-bg"}`}
                >
                  <img
                    src={slideImageUrl}
                    alt=""
                    className={`h-full w-full ${isPortraitSlide ? "object-contain object-top" : "object-cover"} blur-[2.5px]`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/76 via-slate-950/68 to-slate-950/82" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,hsl(var(--primary)/0.22)_0%,transparent_40%),radial-gradient(circle_at_85%_78%,hsl(var(--primary)/0.16)_0%,transparent_44%)]" />
                </div>
              )}
              {transitionType === "pro-slider" ? (
                <AnimatedPresence mode="wait" initial={false}>
                  <div
                    key={`${slide.type}-${currentIndex}`}
                    className={`animate-slide-in ${slide.type === "commandant" ? "flex min-h-0 flex-1 flex-col" : ""}`}
                    style={slideDirectionStyle(transitionDirectionRef.current)}
                  >
                    {renderSlideContent()}
                  </div>
                </AnimatedPresence>
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
        <div className="flex justify-center gap-1.5 pb-2 shrink-0">
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

      {isActive && (
        <button
          type="button"
          onClick={() => setDisplayActive(false)}
          className="fixed bottom-4 right-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full border border-[#002060]/25 bg-white/90 text-[#002060] shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002060]/45"
          aria-label="Exit display"
          title="Exit display"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {selectedPerson && (
        (activeCategory === "FWC" || activeCategory === "FDC") ? (
          <PersonnelSplitHeroModal
            person={selectedPerson}
            category={activeCategory}
            courseDesignation={selectedPerson.decoration}
            onClose={() => setSelectedPerson(null)}
          />
        ) : (
          <ProfileModal
            person={selectedPerson}
            onClose={() => setSelectedPerson(null)}
          />
        )
      )}

      {selectedCommandant && (
        <CommandantProfileModal
          commandant={selectedCommandant}
          onClose={() => setSelectedCommandant(null)}
          onNavigate={navigateCommandantProfile}
        />
      )}

      {selectedVisit && (
        <ProfileModal
          person={selectedVisit as unknown as Personnel}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}
