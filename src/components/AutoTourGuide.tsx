import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Bot,
  Download,
  ExternalLink,
  ListRestart,
  MapPinned,
  Pause,
  Play,
  Route,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { getAudioUrl, useAudioStore } from "@/hooks/useAudioStore";
import { useMuseumTours } from "@/hooks/useMuseumTours";
import { MuseumObjectViewer } from "./MuseumObjectViewer";
import { buildFallbackMuseumTours } from "@/lib/tourGuide";
import { cn } from "@/lib/utils";
import { useThemeMode } from "@/hooks/useThemeMode";
import type {
  Commandant,
  DistinguishedVisit,
  MuseumArtifact,
  MuseumTour,
  MuseumTourStep,
  Personnel,
} from "@/types/domain";
import type { ViewKey } from "./CategoryCards";

type NarrationStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";
type NarrationSource = "uploaded-audio" | "browser-tts" | "silent";

function ArtifactDisplayCard({
  artifact,
  isLightMode,
}: {
  artifact: MuseumArtifact | null;
  isLightMode: boolean;
}) {
  return (
    <article
      className={cn(
        "museum-grain museum-ledger museum-plaque-shadow rounded-[30px] border p-5 sm:p-6 transition-all duration-500",
        isLightMode
          ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(244,239,226,0.94)_100%)]"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]",
      )}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <MuseumObjectViewer
          title={artifact?.name ?? "Museum artifact"}
          mediaSources={artifact?.mediaUrls}
          isLightMode={isLightMode}
          topLabel="Highlighted Artefact"
          footerLabel={artifact?.era ?? "Museum Era"}
          topRightLabel={artifact?.mediaUrls && artifact.mediaUrls.length > 1 ? "360 Ready" : "Glass Case"}
          showControls={Boolean(artifact?.mediaUrls && artifact.mediaUrls.length > 1)}
          loading="eager"
          emptyLabel="Artefact imagery pending"
        />

        <div className="space-y-4">
          <div>
            <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
              Highlighted Artifact
            </p>
            <h3 className={cn("museum-display-title mt-4 text-3xl sm:text-4xl font-semibold leading-[1.08]", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
              {artifact?.name ?? "Tour step ready"}
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78 text-[#7f6112]" : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76]")}>
                {artifact?.era ?? "Museum Era"}
              </span>
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/70 text-[#435267]" : "border-white/10 bg-white/[0.04] text-white/72")}>
                {artifact?.origin ?? "NDC Museum"}
              </span>
              {artifact?.galleryCategory && (
                <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78 text-[#7f6112]" : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76]")}>
                  {artifact.galleryCategory}
                </span>
              )}
            </div>
          </div>

          <div className={cn("rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/16 bg-white/66" : "border-white/10 bg-white/[0.035]")}>
            <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
              Curatorial Summary
            </p>
            <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
              {artifact?.description ?? "Artifact description will appear here for the active tour step."}
            </p>
          </div>

          <div className={cn("rounded-[24px] border p-5", isLightMode ? "border-[#17253b]/10 bg-[#17253b]/[0.04]" : "border-[#d4af37]/10 bg-[#d4af37]/[0.04]")}>
            <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
              Strategic Significance
            </p>
            <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
              {artifact?.strategicSignificance ?? "Strategic significance will appear here when an artifact is linked to this tour step."}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProgressIndicator({
  tour,
  currentStepIndex,
  onSelectStep,
  isLightMode,
}: {
  tour: MuseumTour;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  isLightMode: boolean;
}) {
  return (
    <div className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]" : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
            Tour Progress
          </p>
          <p className={cn("mt-3 text-sm font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
            Step {currentStepIndex + 1} of {tour.steps.length}
          </p>
        </div>
        <div className={cn("rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b]" : "border-white/10 bg-black/24 text-white/72")}>
          {tour.durationEstimateMinutes ? `~${tour.durationEstimateMinutes} min` : "Tour route"}
        </div>
      </div>

      <div className={cn("mt-5 h-2 overflow-hidden rounded-full", isLightMode ? "bg-[#17253b]/10" : "bg-white/[0.08]")}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2f4f7a] via-[#7f6112] to-[#d4af37] transition-all duration-700"
          style={{ width: `${((currentStepIndex + 1) / Math.max(tour.steps.length, 1)) * 100}%` }}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tour.steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onSelectStep(index)}
            className={cn(
              "rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
              index === currentStepIndex
                ? "border-[#d4af37]/24 bg-[#d4af37]/10 text-[#d4af37]"
                : isLightMode
                  ? "border-[#17253b]/10 bg-white/80 text-[#435267] hover:bg-white"
                  : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]",
            )}
          >
            {index + 1}. {step.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function MapBriefingPanel({
  step,
  isLightMode,
}: {
  step: MuseumTourStep;
  isLightMode: boolean;
}) {
  const hasCoordinates =
    typeof step.mapLat === "number" && typeof step.mapLng === "number";
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${step.mapLat},${step.mapLng}`
    : null;

  return (
    <article className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/16 bg-white/66" : "border-white/10 bg-white/[0.035]")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
            Location Briefing
          </p>
          <h4 className={cn("mt-3 text-sm font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
            {hasCoordinates ? "Coordinates attached to this stop" : "Map-ready stop"}
          </h4>
        </div>
        <div className={cn("rounded-full border p-3", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78 text-[#7f6112]" : "border-white/10 bg-white/[0.04] text-white/76")}>
          <MapPinned className="h-5 w-5" />
        </div>
      </div>

      {hasCoordinates ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={cn("rounded-[20px] border p-4", isLightMode ? "border-[#17253b]/10 bg-white/76" : "border-white/10 bg-white/[0.04]")}>
              <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                Latitude
              </p>
              <p className={cn("mt-3 text-sm font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                {step.mapLat}
              </p>
            </div>
            <div className={cn("rounded-[20px] border p-4", isLightMode ? "border-[#17253b]/10 bg-white/76" : "border-white/10 bg-white/[0.04]")}>
              <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                Longitude
              </p>
              <p className={cn("mt-3 text-sm font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                {step.mapLng}
              </p>
            </div>
          </div>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className={cn("mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Google Maps
            </a>
          )}
        </>
      ) : (
        <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
          This tour stop is already structured for map focus, but no coordinates have been attached yet. Once map coordinates are added in the museum tour tables, this panel can drive smooth map pan and zoom without changing the tour player design.
        </p>
      )}
    </article>
  );
}

function TourControls({
  canGoPrev,
  canGoNext,
  isPlaying,
  isPaused,
  isAutoMode,
  onPlayPause,
  onPrev,
  onNext,
  onToggleMode,
  onRestart,
  onExit,
}: {
  canGoPrev: boolean;
  canGoNext: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isAutoMode: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleMode: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onPlayPause}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d4af37]/24 bg-[#d4af37]/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37] transition-colors hover:bg-[#d4af37]/16"
      >
        {isPlaying && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isPlaying && !isPaused ? "Pause" : isAutoMode ? "Play Tour" : "Play Narration"}
      </button>

      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SkipBack className="h-4 w-4" />
        Previous
      </button>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SkipForward className="h-4 w-4" />
        Next
      </button>

      <button
        onClick={onToggleMode}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
      >
        <Route className="h-4 w-4" />
        {isAutoMode ? "Switch to Manual" : "Switch to Auto"}
      </button>

      <button
        onClick={onRestart}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
      >
        <ListRestart className="h-4 w-4" />
        Restart
      </button>

      <button
        onClick={onExit}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#ff6b6b]/24 bg-[#ff6b6b]/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/16"
      >
        <Square className="h-4 w-4" />
        Exit Tour
      </button>
    </div>
  );
}

export function AutoTourGuide({
  commandants,
  personnel,
  visits,
  onOpenRelatedView,
}: {
  commandants: Commandant[];
  personnel: Personnel[];
  visits: DistinguishedVisit[];
  onOpenRelatedView: (view: ViewKey) => void;
}) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const fallbackTours = useMemo(
    () => buildFallbackMuseumTours({ commandants, personnel, visits }),
    [commandants, personnel, visits],
  );
  const { tours, isLoading } = useMuseumTours(fallbackTours);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [narrationStatus, setNarrationStatus] = useState<NarrationStatus>("idle");
  const [narrationSource, setNarrationSource] = useState<NarrationSource>("silent");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const bgAudioUrlRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const activeAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const tourBgTrackId = useAudioStore((s) => s.assignments.tourBackground);
  const masterVolume = useAudioStore((s) => s.assignments.tourBackground ? s.masterVolume : 0);

  // Background audio volume ducking constants
  const BG_VOLUME_NORMAL = 0.25;
  const BG_VOLUME_DUCKED = 0.08;

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [selectedTourId, tours],
  );
  const activeStep = selectedTour?.steps[currentStepIndex] ?? null;
  const activeArtifact = activeStep?.artifact ?? null;
  const relatedArtifacts = useMemo(() => {
    if (!selectedTour || !activeArtifact?.relatedArtifactIds?.length) return [];

    const artifactMap = new Map<string, MuseumArtifact>();
    selectedTour.steps.forEach((step) => {
      if (step.artifact) artifactMap.set(step.artifact.id, step.artifact);
    });

    return activeArtifact.relatedArtifactIds
      .map((id) => artifactMap.get(id) ?? null)
      .filter((entry): entry is MuseumArtifact => Boolean(entry));
  }, [activeArtifact, selectedTour]);

  // Background audio management — start/stop/duck
  useEffect(() => {
    const bgEl = bgAudioRef.current;
    if (!bgEl) return;

    let disposed = false;

    const setupBgAudio = async () => {
      if (!tourBgTrackId || !selectedTour) {
        bgEl.pause();
        bgEl.removeAttribute("src");
        if (bgAudioUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(bgAudioUrlRef.current);
        bgAudioUrlRef.current = null;
        return;
      }

      const url = await getAudioUrl(tourBgTrackId);
      if (disposed || !url) return;

      // Only re-assign src if it's a different track
      if (bgAudioUrlRef.current !== url) {
        if (bgAudioUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(bgAudioUrlRef.current);
        bgAudioUrlRef.current = url;
        bgEl.src = url;
        bgEl.loop = true;
      }

      if (isPlaying && !isPaused && !isCompleted) {
        bgEl.volume = BG_VOLUME_NORMAL * masterVolume;
        try { await bgEl.play(); } catch { /* user hasn't interacted yet */ }
      } else {
        bgEl.pause();
      }
    };

    void setupBgAudio();
    return () => { disposed = true; };
  }, [tourBgTrackId, selectedTour, isPlaying, isPaused, isCompleted, masterVolume]);

  // Duck background audio when narration is actively playing
  useEffect(() => {
    const bgEl = bgAudioRef.current;
    if (!bgEl || bgEl.paused) return;

    const isNarrating = narrationStatus === "playing";
    const targetVol = (isNarrating ? BG_VOLUME_DUCKED : BG_VOLUME_NORMAL) * masterVolume;
    bgEl.volume = Math.max(0, Math.min(1, targetVol));
  }, [narrationStatus, masterVolume]);

  const selectedVoice = useMemo(
    () => availableVoices.find((voice) => voice.voiceURI === selectedVoiceUri) ?? null,
    [availableVoices, selectedVoiceUri],
  );

  const stopNarration = useCallback(() => {
    if (activeAdvanceTimerRef.current) {
      clearTimeout(activeAdvanceTimerRef.current);
      activeAdvanceTimerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.onpause = null;
      audioRef.current.onplay = null;
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    if (objectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = null;

    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
  }, [speechSupported]);

  const goToStep = useCallback((index: number) => {
    if (!selectedTour) return;
    const boundedIndex = Math.max(0, Math.min(index, selectedTour.steps.length - 1));
    stopNarration();
    setCurrentStepIndex(boundedIndex);
    setIsCompleted(false);
    setNarrationStatus("idle");
  }, [selectedTour, stopNarration]);

  const handleRestart = useCallback(() => {
    if (!selectedTour) return;
    goToStep(0);
    setIsPlaying(isAutoMode);
    setIsPaused(false);
    setIsCompleted(false);
  }, [goToStep, isAutoMode, selectedTour]);

  const handleExitTour = useCallback(() => {
    stopNarration();
    // Stop background audio
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current.removeAttribute("src");
    }
    if (bgAudioUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(bgAudioUrlRef.current);
    bgAudioUrlRef.current = null;
    setSelectedTourId(null);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsPaused(false);
    setIsCompleted(false);
    setNarrationStatus("idle");
  }, [stopNarration]);

  const handleStepComplete = useCallback(() => {
    if (!selectedTour) return;

    if (!isAutoMode) {
      setNarrationStatus("ended");
      return;
    }

    if (currentStepIndex >= selectedTour.steps.length - 1) {
      setIsCompleted(true);
      setIsPlaying(false);
      setIsPaused(false);
      setNarrationStatus("ended");
      return;
    }

    activeAdvanceTimerRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, selectedTour.steps.length - 1));
      setNarrationStatus("idle");
    }, 550);
  }, [currentStepIndex, isAutoMode, selectedTour]);

  useEffect(() => {
    if (!speechSupported) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith("en"));
      setAvailableVoices(voices);
      setSelectedVoiceUri((current) => {
        if (current && voices.some((voice) => voice.voiceURI === current)) {
          return current;
        }

        const preferred =
          voices.find((voice) => /female|zira|aria|samantha|sonia|ava/i.test(voice.name)) ??
          voices[0];

        return preferred?.voiceURI ?? "";
      });
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === updateVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [speechSupported]);

  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, [stopNarration]);

  // Clean up background audio on unmount
  useEffect(() => {
    return () => {
      const bgEl = bgAudioRef.current;
      if (bgEl) { bgEl.pause(); bgEl.removeAttribute("src"); }
      if (bgAudioUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(bgAudioUrlRef.current);
      bgAudioUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedTour) return;
    if (!selectedTour.steps[currentStepIndex]) {
      setCurrentStepIndex(0);
    }
  }, [currentStepIndex, selectedTour]);

  useEffect(() => {
    if (!selectedTour || !activeStep) return;

    stopNarration();

    if (!isPlaying || isPaused || isCompleted) {
      setNarrationStatus(isPaused ? "paused" : "idle");
      return;
    }

    let disposed = false;

    const playNarration = async () => {
      const audioUrl = activeStep.audioTrackId
        ? await getAudioUrl(activeStep.audioTrackId)
        : activeStep.audioUrl ?? null;

      if (disposed) return;

      if (audioUrl && audioRef.current) {
        setNarrationSource("uploaded-audio");
        setNarrationStatus("loading");
        objectUrlRef.current = audioUrl;
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => setNarrationStatus("playing");
        audioRef.current.onpause = () => {
          if (!disposed) {
            setNarrationStatus(isPaused ? "paused" : "idle");
          }
        };
        audioRef.current.onerror = () => {
          if (!disposed) {
            setNarrationStatus("error");
            handleStepComplete();
          }
        };
        audioRef.current.onended = () => {
          if (!disposed) {
            setNarrationStatus("ended");
            handleStepComplete();
          }
        };

        try {
          await audioRef.current.play();
          return;
        } catch {
          setNarrationStatus("error");
        }
      }

      if (speechSupported && activeStep.narrationText.trim().length > 0) {
        setNarrationSource("browser-tts");
        setNarrationStatus("loading");
        const utterance = new SpeechSynthesisUtterance(activeStep.narrationText);
        utterance.lang =
          activeStep.languageCode ??
          selectedTour.languageCode ??
          selectedVoice?.lang ??
          "en-NG";
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = 0.93;
        utterance.pitch = 0.96;
        utterance.volume = 1;
        utterance.onstart = () => setNarrationStatus("playing");
        utterance.onend = () => {
          if (!disposed) {
            setNarrationStatus("ended");
            handleStepComplete();
          }
        };
        utterance.onerror = () => {
          if (!disposed) {
            setNarrationStatus("error");
            handleStepComplete();
          }
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
      }

      setNarrationSource("silent");
      setNarrationStatus("ended");
      if (isAutoMode) {
        activeAdvanceTimerRef.current = setTimeout(
          handleStepComplete,
          Math.max((activeStep.durationSec ?? 10) * 1000, 3200),
        );
      }
    };

    void playNarration();

    return () => {
      disposed = true;
      stopNarration();
    };
  }, [
    activeStep,
    handleStepComplete,
    isAutoMode,
    isCompleted,
    isPaused,
    isPlaying,
    selectedTour,
    selectedVoice,
    speechSupported,
    stopNarration,
  ]);

  const handlePlayPause = useCallback(() => {
    if (!selectedTour) return;

    if (isPlaying && !isPaused) {
      stopNarration();
      setIsPaused(true);
      setNarrationStatus("paused");
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    setIsCompleted(false);
    setNarrationStatus("idle");
  }, [isPaused, isPlaying, selectedTour, stopNarration]);

  const handlePrev = useCallback(() => {
    if (!selectedTour) return;
    goToStep(currentStepIndex - 1);
    if (!isAutoMode) {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [currentStepIndex, goToStep, isAutoMode, selectedTour]);

  const handleNext = useCallback(() => {
    if (!selectedTour) return;
    if (currentStepIndex >= selectedTour.steps.length - 1) {
      setIsCompleted(true);
      setIsPlaying(false);
      setIsPaused(false);
      setNarrationStatus("ended");
      stopNarration();
      return;
    }

    goToStep(currentStepIndex + 1);
    if (!isAutoMode) {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [currentStepIndex, goToStep, isAutoMode, selectedTour, stopNarration]);

  const startTour = useCallback((tourId: string, autoMode: boolean) => {
    stopNarration();
    setSelectedTourId(tourId);
    setCurrentStepIndex(0);
    setIsAutoMode(autoMode);
    setIsPlaying(autoMode);
    setIsPaused(false);
    setIsCompleted(false);
    setNarrationStatus(autoMode ? "loading" : "idle");
  }, [stopNarration]);

  const toggleMode = useCallback(() => {
    stopNarration();
    setIsAutoMode((prev) => !prev);
    setIsPlaying(false);
    setIsPaused(false);
    setNarrationStatus("idle");
  }, [stopNarration]);

  const downloadTranscript = useCallback(() => {
    if (!selectedTour) return;
    const transcript = selectedTour.steps
      .map((step, index) => {
        const artifactLine = step.artifact
          ? `Artifact: ${step.artifact.name}\nEra: ${step.artifact.era}\nOrigin: ${step.artifact.origin}\nStrategic Significance: ${step.artifact.strategicSignificance}\n`
          : "";
        return `Step ${index + 1}: ${step.title}\n${artifactLine}Narration:\n${step.narrationText}`;
      })
      .join("\n\n----------------------------------------\n\n");

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedTour.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-transcript.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [selectedTour]);

  return (
    <section className="space-y-4">
      {isLoading && !tours.length && (
        <article className={cn("museum-grain museum-ledger museum-plaque-shadow rounded-[30px] border p-6", isLightMode ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]" : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]")}>
          <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>Digital Docent</p>
          <h3 className={cn("mt-4 text-3xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>Preparing guided routes</h3>
          <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>Tour records and linked artefacts are being assembled for the exhibition floor.</p>
        </article>
      )}

      {!selectedTour && (
        <>
        <article className={cn("museum-grain museum-ledger museum-plaque-shadow rounded-[30px] border p-6 md:p-8", isLightMode ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(244,239,226,0.94)_100%)]" : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]")}>
          <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>Digital Docent Programme</p>
          <h3 className={cn("museum-display-title mt-4 text-3xl md:text-4xl font-semibold leading-[1.08]", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>Choose a route and let the museum guide the visitor journey.</h3>
          <div className="mt-5 museum-metal-rule max-w-sm" />
          <p className={cn("mt-5 max-w-3xl text-sm leading-8", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
            Each route is treated as a documented walk through the museum floor, combining artefact staging, narration, map cues, and transitions into related archival collections.
          </p>
        </article>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2 stagger-reveal">
          {tours.map((tour) => (
            <article
              key={tour.id}
              className={cn(
                "museum-grain museum-ledger museum-plaque-shadow rounded-[30px] border p-6 md:p-7",
                isLightMode ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(244,239,226,0.94)_100%)]" : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                    {tour.theme ?? "Museum Route"}
                  </p>
                  <h4 className={cn("museum-display-title mt-4 text-2xl md:text-3xl font-semibold leading-[1.08]", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                    {tour.name}
                  </h4>
                </div>
                <div className={cn("rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b]" : "border-white/10 bg-black/24 text-white/72")}>
                  {tour.durationEstimateMinutes ? `~${tour.durationEstimateMinutes} min` : `${tour.steps.length} steps`}
                </div>
              </div>

              <div className="mt-5 museum-metal-rule max-w-xs" />

              <p className={cn("mt-5 text-sm leading-8", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
                {tour.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {tour.steps.slice(0, 4).map((step) => (
                  <span
                    key={step.id}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      isLightMode
                        ? "border-[#17253b]/10 bg-white/80 text-[#435267]"
                        : "border-white/10 bg-white/[0.04] text-white/68",
                    )}
                  >
                    {step.title}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => startTour(tour.id, true)}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d4af37]/24 bg-[#d4af37]/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37] transition-colors hover:bg-[#d4af37]/16"
                >
                  <Play className="h-4 w-4" />
                  Start Auto Tour
                </button>
                <button
                  onClick={() => startTour(tour.id, false)}
                  className={cn("inline-flex min-h-12 items-center gap-2 rounded-full border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]")}
                >
                  <Route className="h-4 w-4" />
                  Explore Manually
                </button>
              </div>
            </article>
          ))}
        </div>
        </>
      )}

      {selectedTour && activeStep && (
        <div className="space-y-4">
          <article
            className={cn(
              "museum-grain museum-ledger museum-plaque-shadow rounded-[30px] border p-6 sm:p-7",
              isLightMode
                ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(244,239,226,0.94)_100%)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                  Active Tour
                </p>
                <h4 className={cn("museum-display-title mt-4 text-3xl md:text-4xl font-semibold leading-[1.08]", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                  {selectedTour.name}
                </h4>
                <p className={cn("mt-5 text-sm leading-8", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
                  {selectedTour.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b]" : "border-white/10 bg-black/24 text-white/72")}>
                  {isAutoMode ? "Auto Route" : "Manual Study"}
                </span>
                <span className={cn("rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b]" : "border-white/10 bg-black/24 text-white/72")}>
                  {narrationStatus}
                </span>
                <span className={cn("rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78 text-[#7f6112]" : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76]")}>
                  {narrationSource}
                </span>
              </div>
            </div>

            <div className="mt-5 museum-metal-rule" />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={downloadTranscript}
                className={cn("inline-flex min-h-12 items-center gap-2 rounded-full border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]")}
              >
                <Download className="h-4 w-4" />
                Download Transcript
              </button>

              {speechSupported && availableVoices.length > 0 && (
                <label className={cn("inline-flex min-h-12 items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b]" : "border-white/10 bg-white/[0.04] text-white/72")}>
                  <AudioLines className="h-4 w-4" />
                  <select
                    value={selectedVoiceUri}
                    onChange={(event) => setSelectedVoiceUri(event.target.value)}
                    className={cn("bg-transparent text-[10px] font-semibold uppercase tracking-[0.14em] outline-none", isLightMode ? "text-[#17253b]" : "text-white")}
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI} className="text-black">
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </article>

          <ProgressIndicator
            tour={selectedTour}
            currentStepIndex={currentStepIndex}
            onSelectStep={(index) => {
              goToStep(index);
              if (!isAutoMode) {
                setIsPlaying(false);
                setIsPaused(false);
              }
            }}
            isLightMode={isLightMode}
          />

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <ArtifactDisplayCard artifact={activeArtifact} isLightMode={isLightMode} />

            <div className="space-y-4">
              <article className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/16 bg-white/66" : "border-white/10 bg-white/[0.035]")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                      Current Step
                    </p>
                    <h4 className={cn("mt-4 text-xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                      {activeStep.title}
                    </h4>
                  </div>
                </div>

                <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
                  {activeStep.narrationText}
                </p>
              </article>

              <MapBriefingPanel step={activeStep} isLightMode={isLightMode} />

              {relatedArtifacts.length > 0 && (
                <article className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/16 bg-white/66" : "border-white/10 bg-white/[0.035]")}>
                  <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                    Related Artifacts
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relatedArtifacts.map((artifact) => (
                      <span
                        key={artifact.id}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                          isLightMode
                            ? "border-[#17253b]/10 bg-white/80 text-[#435267]"
                            : "border-white/10 bg-white/[0.04] text-white/68",
                        )}
                      >
                        {artifact.name}
                      </span>
                    ))}
                  </div>
                </article>
              )}

              <article className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#17253b]/10 bg-[#17253b]/[0.04]" : "border-white/10 bg-white/[0.035]")}>
                <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                  Step Actions
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(activeStep.linkedView || activeArtifact?.linkedView) && (
                    <button
                      onClick={() =>
                        onOpenRelatedView(
                          (activeStep.linkedView ?? activeArtifact?.linkedView ?? "home") as ViewKey,
                        )
                      }
                      className={cn("inline-flex min-h-12 items-center gap-2 rounded-full border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/80 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Related View
                    </button>
                  )}
                </div>
              </article>
            </div>
          </div>

          <TourControls
            canGoPrev={currentStepIndex > 0}
            canGoNext={currentStepIndex < selectedTour.steps.length - 1}
            isPlaying={isPlaying}
            isPaused={isPaused}
            isAutoMode={isAutoMode}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            onToggleMode={toggleMode}
            onRestart={handleRestart}
            onExit={handleExitTour}
          />

          {isCompleted && (
            <article className={cn("museum-grain museum-plaque-shadow rounded-[24px] border p-5", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78" : "border-[#d4af37]/12 bg-[#d4af37]/[0.05]")}>
              <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
                Tour Complete
              </p>
              <h4 className={cn("mt-4 text-2xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                {selectedTour.name} completed
              </h4>
              <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#4c5b70]" : "text-white/72")}>
                The guided route has reached its final stop. You can restart this tour, switch to another route, or open a related archive view to continue the visitor journey.
              </p>
            </article>
          )}
        </div>
      )}

      <audio ref={audioRef} preload="auto" className="hidden" />
      <audio ref={bgAudioRef} preload="auto" loop className="hidden" />
    </section>
  );
}
