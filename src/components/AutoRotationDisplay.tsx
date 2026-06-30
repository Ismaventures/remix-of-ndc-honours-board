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
  activeCategory?: Category | Category[] | null;
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
  | { type: "visit"; visit: DistinguishedVisit }
  | { type: "page"; items: ContinuousItem[] };

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
  let courseNum = person.course?.toString() || "";
  let endYear = "";

  // Priority 1: Use academicYear or periodEnd
  if (person.academicYear) {
    const parts = person.academicYear.split(/[-–]/);
    endYear = parts.length > 1 ? parts[1].trim() : parts[0].trim();
  } else if (person.periodEnd) {
    endYear = person.periodEnd.toString().trim();
  }

  const decoration = person.decoration?.trim() ?? "";

  // Priority 2: Extract from decoration if missing
  if (!courseNum) {
    const cseMatch = decoration.match(/CSE\s*(\d+)/i);
    if (cseMatch) courseNum = cseMatch[1];
    else {
      const nwcMatch = decoration.match(/NWC\s+Course\s+(\d+)/i);
      if (nwcMatch) courseNum = nwcMatch[1];
      else {
        const courseMatch = decoration.match(/Course\s+(\d+)/i);
        if (courseMatch) courseNum = courseMatch[1];
      }
    }
  }

  if (!endYear) {
    const yearMatch = decoration.match(/\/\s*(\d{4})/);
    if (yearMatch) endYear = yearMatch[1];
  }

  if (courseNum && endYear) return `Course ${courseNum}/${endYear}`;
  if (courseNum) return `Course ${courseNum}`;
  if (endYear) return `Course ${endYear}`;
  
  // Clean decoration to remove NWC
  let cleaned = decoration.replace(/NWC\s+/i, "");
  return cleaned || "Course";
};

const isCourseMarker = (item: ContinuousItem): item is CourseMarker =>
  "markerType" in item && item.markerType === "course";

const resolveDisplayContext = (
  activeCategory: Category | Category[] | null,
  activeView: "home" | "visits" | "admin" | "category",
): AutoDisplayContextKey => {
  if (activeView === "visits") return "visits";
  if (Array.isArray(activeCategory)) return "FWC"; // Combined timing fallback
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
  onHover,
}: {
  item: Personnel | DistinguishedVisit | Commandant;
  type: "personnel" | "visit" | "commandant";
  onSelect: (item: Personnel | DistinguishedVisit | Commandant) => void;
  isLightMode: boolean;
  imageLoading: "eager" | "lazy";
  onHover?: (hovering: boolean) => void;
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
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={`auto-scroll-card group relative w-full ${
        isCommandant
          ? "commandant-auto-card max-w-[420px] h-[clamp(440px,72vh,660px)]"
          : "max-w-[450px] h-[clamp(420px,68vh,620px)]"
      } self-center shrink-0 overflow-hidden rounded-2xl p-1.5 sm:p-2 text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 flex flex-col ${
        isLightMode
          ? "bg-white border border-[#002060]/20 shadow-[0_8px_22px_rgba(0,32,96,0.12)]"
          : "bg-slate-950 border border-slate-500/35 shadow-[0_10px_26px_rgba(2,6,23,0.42)]"
      }`}
      aria-label={`${isCommandant ? "Commandant" : isVisit ? "Visit" : "Staff"} card for ${safeName}`}
    >
      {/* Top tricolor strip - always tricolor for all cards */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[7px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      {/* Bottom strip - tricolor or single service color */}
      {serviceColor === "tri-color" ? (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[6px] flex z-20">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-[6px] z-20"
          style={{ backgroundColor: serviceColor }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div
          className={`absolute inset-0 ${isLightMode ? "bg-white" : "bg-slate-950"}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 mt-1.5 sm:mt-2.5 mb-1 sm:mb-1.5 flex flex-col flex-1 min-h-0 w-full">
        {/* Simplified Photo Frame */}
        <div className={`relative flex flex-col flex-1 min-h-0 w-full rounded-lg overflow-hidden shadow-xl border ${
          isLightMode ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900"
        }`}>
          <div
            className={`auto-scroll-image-frame relative flex-1 min-h-0 overflow-hidden w-full ${
              isCommandant ? "commandant-portrait-frame commandant-portrait-reel" : isVisit ? "" : "staff-portrait-frame"
            }`}
          >
            {isCommandant && (
              <>
                <div className="pointer-events-none absolute inset-0 z-[1] commandant-portrait-vignette" />
                <div className="pointer-events-none absolute inset-0 z-[2] commandant-portrait-glass" />
              </>
            )}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${imageAltTitle} ${safeName}`}
                className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03]"
                loading={imageLoading}
                decoding="async"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary/45">
                <Shield className="h-10 w-10" />
              </div>
            )}
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
  const lastForcedStepNonceRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const stageCompleteFiredRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const transitionStepRef = useRef(0);
  const transitionDirectionRef = useRef<1 | -1>(1);
  const lastTransitionCueAtRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const nextPauseTargetRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number>(0);
  const { isPaused, registerInteraction, setHovering } = useSliderControl({
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
    let rawItems: (Personnel | DistinguishedVisit | Commandant)[] = [];
    if (activeCategory) {
      const isCombined = Array.isArray(activeCategory);
      rawItems = personnel
        .filter((p) => {
          const categoryMatches = isCombined ? activeCategory.includes(p.category) : p.category === activeCategory;
          return categoryMatches && p.imageUrl && p.imageUrl.trim() !== "";
        })
        .sort((a, b) => {
          if (isCombined && a.category !== b.category) {
            const priority: Record<string, number> = {
              FWC: 1,
              FDC: 2,
              Allied: 3,
            };
            const pA = priority[a.category] ?? 4;
            const pB = priority[b.category] ?? 4;
            return pA - pB;
          }
          const isFwcOrFdcOrAllied =
            a.category === "FWC" ||
            a.category === "FDC" ||
            a.category === "Allied";
          if (isFwcOrFdcOrAllied) {
            const courseCompare = getCourseDesignation(b).localeCompare(
              getCourseDesignation(a),
              undefined,
              { numeric: true },
            );
            if (courseCompare !== 0) return courseCompare;
          }
          return b.seniorityOrder - a.seniorityOrder;
        });
    } else if (activeView === "visits") {
      rawItems = visits.filter(v => v.imageUrl && v.imageUrl.trim() !== "").slice(0, 12);
    } else {
      rawItems = commandants
        .filter(c => c.imageUrl && c.imageUrl.trim() !== "")
        .sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1;
          if (!a.isCurrent && b.isCurrent) return 1;
          return (b.tenureStart ?? 0) - (a.tenureStart ?? 0);
        });
    }

    const is3ItemSlideshow =
      displayContext !== "commandants" &&
      (displayContext !== "visits" ||
        appliedTransition === "continuous-scroll" ||
        sequence[0] === "continuous-scroll");

    if (is3ItemSlideshow) {
      const pages: Slide[] = [];
      for (let i = 0; i < rawItems.length; i += 3) {
        pages.push({
          type: "page",
          items: rawItems.slice(i, i + 3) as ContinuousItem[],
        });
      }
      return pages;
    }

    return rawItems.map((item) => {
      if (activeView === "visits") {
        return { type: "visit" as const, visit: item as DistinguishedVisit };
      }
      if (activeCategory) {
        return { type: "personnel" as const, person: item as Personnel };
      }
      return { type: "commandant" as const, commandant: item as Commandant };
    });
  }, [
    activeCategory,
    activeView,
    personnel,
    visits,
    commandants,
    displayContext,
    appliedTransition,
    sequence,
  ]);

  const isContinuousMode = slides.length > 0 && slides[0]?.type === "page";

  const loopedSlides = useMemo(() => {
    if (slides.length === 0) return [];
    return [
      ...slides,
      ...slides,
      ...slides,
    ];
  }, [slides]);

  const slide = slides[currentIndex] ?? slides[0];
  const isPortraitSlide =
    slide?.type === "commandant" || slide?.type === "personnel" || slide?.type === "page";
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
          : slide.type === "visit"
            ? slide.visit.imageUrl
            : slide.type === "page"
              ? slide.items[0]?.imageUrl
              : undefined
      : undefined,
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

      // Bypass overlays for page slideshow transitions
      if (slides[nextIndex]?.type === "page" && slides[currentIndex]?.type === "page") {
        setTransitionType(nextTransition);
        setCurrentIndex(nextIndex);
        transitionStepRef.current += 1;
        isTransitioningRef.current = false;
        return;
      }

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

  // Helper for snapping loop scroll bounds
  const normalizePosition = useCallback((container: HTMLDivElement) => {
    const segmentWidth = container.scrollWidth / 3;
    if (segmentWidth <= 0) return;
    if (container.scrollLeft >= segmentWidth * 2) {
      container.scrollLeft -= segmentWidth;
    } else if (container.scrollLeft < segmentWidth) {
      container.scrollLeft += segmentWidth;
    }
  }, []);

  // Helper to trigger manual transition animations
  const animateTo = useCallback((targetScrollLeft: number, duration: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    const start = container.scrollLeft;
    const change = targetScrollLeft - start;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      container.scrollLeft = start + change * eased;
      normalizePosition(container);

      if (progress < 1) {
        scrollRafRef.current = requestAnimationFrame(step);
      } else {
        scrollRafRef.current = null;
      }
    };
    scrollRafRef.current = requestAnimationFrame(step);
  }, [normalizePosition]);

  // Align to center on initial mount/load of continuous view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || slide?.type !== "page" || slides.length === 0) return;

    const timer = setTimeout(() => {
      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth <= 0) return;
      if (container.scrollLeft < segmentWidth) {
        container.scrollLeft = segmentWidth;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [slides.length, slide?.type]);

  // Keep scroll position aligned on resize
  useEffect(() => {
    if (slide?.type !== "page") return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth <= 0) return;
      const pageWidth = segmentWidth / slides.length;
      container.scrollLeft = currentIndex * pageWidth + segmentWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentIndex, slides.length, slide?.type]);

  // Continuous smooth scroll loop
  useEffect(() => {
    if (slide?.type !== "page" || isPaused || !isActive || slides.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const elapsed = now - lastTime;
      lastTime = now;

      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth <= 0) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      // If a manual animation is running, yield to it
      if (scrollRafRef.current) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      // continuous smooth scroll speed (e.g. 0.06px per millisecond)
      const speed = 0.07; 
      container.scrollLeft += elapsed * speed;

      // Update progress indicators/currentIndex based on current scroll position
      const pageWidth = segmentWidth / slides.length;
      const pageIndex = Math.round((container.scrollLeft - segmentWidth) / pageWidth) % slides.length;
      if (pageIndex !== currentIndex && pageIndex >= 0 && pageIndex < slides.length) {
        setCurrentIndex(pageIndex);
      }

      normalizePosition(container);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [slide?.type, isPaused, isActive, slides.length, currentIndex, normalizePosition]);

  const handleManualAdvance = useCallback(() => {
    revealControls();

    // Non-continuous (commandants, personnel single-card, visits): use standard advance
    // which already handles end-of-slides + stageComplete firing
    if (!isContinuousMode) {
      advance();
      return;
    }

    // Continuous mode (FWC/FDC/Allied page scrolling)
    const container = scrollContainerRef.current;
    if (!container) return;
    const segmentWidth = container.scrollWidth / 3;
    if (segmentWidth <= 0 || slides.length === 0) return;
    const pageWidth = segmentWidth / slides.length;

    const currentLeft = container.scrollLeft;
    // In the looped track we have 3× copies of slides. Detect which real page we're on.
    const realPage = Math.round((currentLeft - segmentWidth) / pageWidth) % slides.length;

    // If we are on the very last real page, fire stageComplete to trigger category transition
    if (realPage === slides.length - 1) {
      if (!stageCompleteFiredRef.current) {
        stageCompleteFiredRef.current = true;
        onStageComplete?.(displayContext);
      }
      return;
    }

    const nextPage = Math.floor((currentLeft - segmentWidth) / pageWidth) + 1;
    const target = nextPage * pageWidth + segmentWidth;
    animateTo(target, 650);
    setCurrentIndex(nextPage % slides.length);
  }, [revealControls, isContinuousMode, slides.length, animateTo, advance, displayContext, onStageComplete]);

  const handleManualRetreat = useCallback(() => {
    revealControls();
    const container = scrollContainerRef.current;
    if (!container) return;
    const segmentWidth = container.scrollWidth / 3;
    if (segmentWidth <= 0 || slides.length === 0) return;
    const pageWidth = segmentWidth / slides.length;

    const currentLeft = container.scrollLeft;
    const prevPage = Math.ceil((currentLeft - segmentWidth) / pageWidth) - 1;
    const target = prevPage * pageWidth + segmentWidth;

    animateTo(target, 650);
    setCurrentIndex((prevPage + slides.length) % slides.length);
  }, [revealControls, slides.length, animateTo]);

  // Standard slide timer
  useEffect(() => {
    if (!isActive || isPaused || isContinuousMode) return;
    const duration = slide?.type === "commandant" ? 8000 : 5000;
    const interval = setInterval(advance, duration);
    return () => clearInterval(interval);
  }, [
    isActive,
    isPaused,
    isContinuousMode,
    advance,
    slide?.type,
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
    if (slide && slide.type === "page" && slide.items.length > 0) {
      const firstItem = slide.items[0];
      if (firstItem && "decoration" in firstItem) {
        const label = getCourseDesignation(firstItem as Personnel);
        setActiveCourseLabel(label);
      }
    }
  }, [slide]);


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
      } else if (
        slideCandidate?.type === "page" &&
        slideCandidate.items[0] &&
        "category" in slideCandidate.items[0]
      ) {
        const firstItem = slideCandidate.items[0] as Personnel;
        if (firstItem.category) {
          const cat = firstItem.category.toLowerCase();
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
          : firstSlide.type === "visit"
            ? firstSlide.visit.imageUrl
            : firstSlide.type === "page"
              ? firstSlide.items[0]?.imageUrl
              : undefined;

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



  if (!isActive) {
    const buttonLabel = activeCategory
      ? (Array.isArray(activeCategory) ? "Global Auto Display" : `${activeCategory} Auto Display`)
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

    // All transitions use only opacity + transform (no blur/filter)
    // for smooth performance on low refresh rate displays
    switch (transitionType) {
      case "slide-up":
        return fadeState === "in"
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8";
      case "slide-left":
        return fadeState === "in"
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-10";
      case "slide-right":
        return fadeState === "in"
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-10";
      case "zoom-out":
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[1.03]";
      case "slide-down":
        return fadeState === "in"
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-8";
      case "flip-x":
        return fadeState === "in"
          ? "opacity-100 [transform:perspective(1200px)_rotateX(0deg)_scale(1)]"
          : "opacity-0 [transform:perspective(1200px)_rotateX(8deg)_scale(0.99)]";
      case "flip-y":
        return fadeState === "in"
          ? "opacity-100 [transform:perspective(1200px)_rotateY(0deg)_scale(1)]"
          : "opacity-0 [transform:perspective(1200px)_rotateY(8deg)_scale(0.99)]";
      case "rotate-in":
        return fadeState === "in"
          ? "opacity-100 rotate-0 scale-100"
          : "opacity-0 rotate-1 scale-[0.98]";
      case "blur-in":
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[0.97]";
      case "skew-lift":
        return fadeState === "in"
          ? "opacity-100 skew-y-0 translate-y-0"
          : "opacity-0 skew-y-[0.5deg] translate-y-4";
      case "scale-rise":
        return fadeState === "in"
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-[0.95] translate-y-4";
      case "ndc-scatter":
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[0.93]";
      case "barracks-reveal":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 -translate-x-12 scale-[0.97]";
      case "salute-flash":
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[1.02]";
      case "parade-sweep":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-12 scale-[0.98]";
      case "mission-brief":
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[0.985]";
      case "runway-sweep":
        return fadeState === "in"
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 -translate-x-8 scale-[0.99]";
      case "pro-slider":
        return "opacity-100"; // Handled by AnimatedPresence + CSS slide
      case "fade-zoom":
      default:
        return fadeState === "in"
          ? "opacity-100 scale-100"
          : "opacity-0 scale-[0.97]";
    }
  };

  const getSectionTitle = () => {
    if (activeView === "visits") return "";
    if (!activeCategory) return "Chronicles of Commandants";
    return "";
  };

  const getSectionSubtitle = () => {
    if (activeView === "visits") return "Distinguished Visits and Honours";
    if (Array.isArray(activeCategory)) {
      if (slide && slide.type === "page" && slide.items && slide.items.length > 0) {
        const categories = slide.items
          .filter((item): item is Personnel => "category" in item)
          .map((item) => item.category);
        const uniqueCategories = [...new Set(categories)];
        if (uniqueCategories.length === 1) {
          const cat = uniqueCategories[0];
          if (cat === "FWC") return "DISTINGUISHED FELLOWS OF WAR COLLEGE (FWC)";
          if (cat === "FDC") return "DISTINGUISHED FELLOWS OF DEFENCE COLLEGE (FDC)";
          if (cat === "Allied") return "INTERNATIONAL ALLIED OFFICERS";
        }
        return "COMBINED FELLOWS & ALLIED OFFICERS";
      }
      return "GLOBAL AUTO DISPLAY";
    }
    if (activeCategory === "FDC")
      return "Distinguished Fellows of Defence College (FDC)";
    if (activeCategory === "FWC")
      return "Distinguished Fellows of War College (FWC)";
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

      {slide.type === "page" && (
        <div
          className="relative flex flex-1 min-h-0 items-center justify-center gap-4 sm:gap-6 pb-3 px-3 sm:px-6 w-full h-full"
        >
          {slide.items.map((item) => {
            const isPersonnel = "category" in item;
            const isCommandant = "isCurrent" in item;
            const itemType = isCommandant
              ? "commandant"
              : isPersonnel
                ? "personnel"
                : "visit";
            return (
              <div key={item.id} className="flex justify-center items-center h-full w-full max-w-[420px]">
                <ContinuousSlideCard
                  item={item as any}
                  type={itemType}
                  isLightMode={isLightMode}
                  imageLoading="eager"
                  onSelect={handleContinuousSelect}
                  onHover={setHovering}
                />
              </div>
            );
          })}
        </div>
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
      {/* Top Tri-service stripes */}
      <div className="w-full flex flex-col h-[30px] shrink-0 z-40 select-none">
        <div className="h-[10px] bg-[#FF0000]" />
        <div className="h-[10px] bg-[#002060]" />
        <div className="h-[10px] bg-[#00B0F0]" />
      </div>

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

      {/* Category Header (Fixed at the top, does not transition) */}
      {slide.type === "page" && (
        <div className="auto-scroll-heading mt-4 mb-2 px-6 sm:px-12 w-full max-w-[1900px] mx-auto shrink-0 z-10">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm md:px-4 md:py-2">

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
          className={`${slide.type === "commandant" || slide.type === "personnel" || slide.type === "page" ? "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px] h-full min-h-0 flex flex-col" : "max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px]"} relative w-full max-h-full ease-out will-change-[opacity,transform] ${slide.type === "commandant" || slide.type === "personnel" || slide.type === "page" ? "" : "-translate-y-1 sm:-translate-y-2 md:-translate-y-3"} ${getTransitionClasses()}`}
          style={{ transitionDuration: `${currentTransitionDuration}ms`, transitionProperty: 'opacity, transform' }}
        >

          {isContinuousMode ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full h-full relative [mask-image:linear-gradient(to_right,transparent_0%,black_5%,black_95%,transparent_100%)] py-4 sm:py-6">
              {/* Horizontal Scroll Track */}
              <div
                ref={scrollContainerRef}
                className="w-full h-full flex flex-row items-center overflow-x-hidden select-none gap-6 sm:gap-8 pb-3 px-6 sm:px-12"
              >
                {loopedSlides.flatMap((pSlide) => pSlide.type === "page" ? pSlide.items : []).map((item, idx) => {
                  const isPersonnel = "category" in item;
                  const isCommandant = "isCurrent" in item;
                  const itemType = isCommandant
                    ? "commandant"
                    : isPersonnel
                      ? "personnel"
                      : "visit";
                  return (
                    <div key={`${item.id}-${idx}`} className="flex justify-center items-center h-full w-[280px] sm:w-[320px] md:w-[360px] xl:w-[390px] shrink-0">
                      <ContinuousSlideCard
                        item={item as any}
                        type={itemType}
                        isLightMode={isLightMode}
                        imageLoading="eager"
                        onSelect={handleContinuousSelect}
                        onHover={setHovering}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : transitionType === "pro-slider" ? (
            <AnimatedPresence mode="wait" initial={false}>
              <div
                key={`${slide.type}-${currentIndex}`}
                className={`animate-slide-in ${slide.type === "commandant" || slide.type === "page" ? "flex min-h-0 flex-1 flex-col" : ""}`}
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
        </div>
      </div>

      {/* Progress dots */}
      {slides.length > 1 && (
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

      {/* Bottom Tri-service stripes */}
      <div className="w-full flex flex-col h-[30px] shrink-0 z-40 select-none relative">
        <div className="h-[10px] bg-[#FF0000]" />
        <div className="h-[10px] bg-[#002060]" />
        <div className="h-[10px] bg-[#00B0F0]" />

        {/* Powered by Xenolink badge on the left */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2.5 bg-white/95 border-y border-r border-[#002060]/20 shadow-md pl-4 pr-3.5 py-1.5 rounded-none z-50 transition-all duration-300 hover:shadow-lg hover:border-[#002060]/40 backdrop-blur-sm">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">
            Powered by
          </span>
          <div className="flex items-center border-r border-slate-200 pr-2.5">
            <img
              src="/images/xenonlink.png"
              alt="Xenolink"
              className="h-4 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <a
            href="tel:+2348108405421"
            className="text-xs font-semibold text-[#00B0F0] hover:text-[#002060] transition-colors flex items-center gap-1"
          >
            <span className="text-[9px] text-slate-400 font-normal">Tel:</span>
            +234 810 840 5421
          </a>
        </div>
      </div>

      {isActive && (
        <button
          type="button"
          onClick={() => setDisplayActive(false)}
          className="fixed bottom-12 right-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full border border-[#002060]/25 bg-white/90 text-[#002060] shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002060]/45"
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
