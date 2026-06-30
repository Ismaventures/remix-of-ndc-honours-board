import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Play, Pause, X, Shield, ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { CommandantHero } from "@/components/CommandantHero";
import { CommandantProfileOverlay } from "@/components/CommandantProfileOverlay";
import { PastCommandants } from "@/components/PastCommandants";
import { CategoryCards, ViewKey } from "@/components/CategoryCards";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
// import {
//   AboutNdcView,
//   GuidedToursView,
//   HallOfFameView,
//   MuseumCollectionsView,
//   MuseumExperienceSection,
// } from "@/components/MuseumExperience";
import { OrganogramView } from "@/components/OrganogramView";
import { DirectingStaffByCourseYear } from "@/components/DirectingStaffByCourseYear";
import { FellowsByCourse } from "@/components/FellowsByCourse";
import { VisitsSection } from "@/components/VisitsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminLogin } from "@/components/AdminLogin";
// import { ArtifactFrameGallery } from "@/components/ArtifactFrameGallery";
import { AutoRotationDisplay } from "@/components/AutoRotationDisplay";
import { BottomDock } from "@/components/BottomDock";
import { BootSequence } from "@/components/BootSequence";
import { AudioManager, playAudioTrack } from "@/components/AudioManager";
import { IdleStageOverlay } from "@/components/IdleStageOverlay";
import {
  usePersonnelStore,
  useVisitsStore,
  useCommandantsStore,
} from "@/hooks/useStore";
import { useThemeMode } from "@/hooks/useThemeMode";
import type { ThemeMode } from "@/hooks/useThemeMode";
import { useBootSequenceSettings } from "@/hooks/useBootSequenceSettings";
import { useAutoDisplaySettings } from "@/hooks/useAutoDisplaySettings";
import { AUTO_DISPLAY_CONTEXTS } from "@/hooks/useAutoDisplaySettings";
import type { AutoDisplayContextKey } from "@/hooks/useAutoDisplaySettings";
import { useIdleStageSettings } from "@/hooks/useIdleStageSettings";
import { useToast } from "@/hooks/use-toast";
import {
  DeviceControlCommandType,
  DeviceControlView,
  useDeviceControl,
} from "@/hooks/useDeviceControl";
import {
  clearDeviceOverrides,
  saveDeviceOverrides,
} from "@/lib/deviceOverrideSettings";
import { Category, Commandant } from "@/types/domain";
import { getSafeSupabaseSession, supabase } from "@/lib/supabaseClient";
import { prefetchMediaReferences } from "@/lib/persistentMedia";
import { prefetchAudioTrack, useAudioStore } from "@/hooks/useAudioStore";
import ndcCrest from "/images/ndc-crest.png";
import { getCommandantDisplayTitle } from "@/lib/utils";

const SECTION_TITLES: Record<string, string> = {
  fwc: "DISTINGUISHED FELLOWS OF WAR COLLEGE (fwc+)",
  fdc: "DISTINGUISHED FELLOWS OF DEFENCE COLLEGE (fdc+)",
  participants: "CHRONICLES OF DIRECTING STAFF",
  allied: "ALLIED OFFICERS",
};

const SECTION_CATEGORIES: Record<string, Category | Category[]> = {
  fwc: "FWC",
  fdc: "FDC",
  participants: "Directing Staff",
  allied: "Allied",
};

const AUTO_DISPLAY_PLAY_ALL_SEQUENCE: AutoDisplayContextKey[] = [
  "commandants",
  "FWC",
  "FDC",
  "Allied",
];

const SUPER_ADMIN_EMAILS = (
  import.meta.env.VITE_SUPER_ADMIN_EMAILS ||
  import.meta.env.VITE_QUICK_ADMIN_EMAIL ||
  ""
)
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

type GlobalSiteAction = "close-site" | "open-site";

interface GridCommandantCardProps {
  commandant: Commandant;
  onClick: () => void;
  isLightMode: boolean;
}

function GridCommandantCard({ commandant, onClick, isLightMode }: GridCommandantCardProps) {
  const resolvedSrc = useResolvedMediaUrl(commandant.imageUrl);

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border text-left flex flex-col transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 w-full shadow-lg ${
        isLightMode
          ? "bg-white border-slate-200/80 hover:shadow-xl hover:border-slate-300"
          : "bg-slate-950 border-slate-800 hover:shadow-2xl hover:border-slate-700"
      }`}
      style={{ minHeight: "410px" }}
    >
      {/* Top tri-service strip */}
      <div className="absolute inset-x-0 top-0 h-[4px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      {/* Main card container with padding */}
      <div className="p-3.5 pb-2.5 flex-1 flex flex-col justify-between w-full">
        
        {/* Frame for the photo */}
        <div className="w-full aspect-[4/5] rounded border border-slate-200 bg-white flex items-center justify-center relative overflow-hidden shadow-inner">
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt={commandant.name}
              className="w-full h-full object-contain object-center"
            />
          ) : (
            <Shield className="h-10 w-10 text-slate-300 animate-pulse" />
          )}
        </div>

        {/* Plaque block (dark blue container) */}
        <div className="bg-[#002060] border border-[#FFD700] rounded p-2.5 text-center mt-3 flex flex-col justify-center min-h-[110px] w-full shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]">
          <h4 className="text-amber-400 text-xs font-serif font-extrabold tracking-wide leading-tight line-clamp-1">
            {commandant.name}
          </h4>
          
          {(() => {
            const displayTitle = getCommandantDisplayTitle(commandant, "");
            return displayTitle ? (
              <p className="text-[#FFD700] text-[8.5px] font-bold font-sans mt-1 leading-tight line-clamp-2 px-0.5">
                {displayTitle}
              </p>
            ) : null;
          })()}

          <p className="text-slate-300 text-[7.5px] font-mono tracking-widest uppercase mt-1">
            {commandant.isCurrent ? "CURRENT COMMANDANT" : "PAST COMMANDANT"}
          </p>

          <p className="text-slate-300 text-[8px] font-mono tracking-widest uppercase mt-0.5">
            YEAR: {commandant.tenureStart} – {commandant.tenureEnd ?? "PRESENT"}
          </p>
        </div>

        {/* Tap to open bar */}
        <div className="py-2.5 text-center text-[9px] sm:text-[10px] font-extrabold tracking-wider text-sky-600 uppercase w-full">
          TAP TO OPEN FULL DETAILS
        </div>
      </div>

      {/* Bottom tri-service strip */}
      <div className="absolute inset-x-0 bottom-0 h-[4px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </button>
  );
}

type CrestParticle = {
  id: number;
  left: number;
  top: number;
  size: number;
  rotate: number;
};

const randomInRange = (min: number, max: number) =>
  min + Math.random() * (max - min);

const createParticle = (id: number): CrestParticle => ({
  id,
  left: randomInRange(4, 96),
  top: randomInRange(6, 94),
  size: randomInRange(48, 128),
  rotate: randomInRange(-25, 25),
});

interface IndexProps {
  defaultView?: ViewKey;
}

const Index = ({ defaultView = "home" }: IndexProps) => {
  const [isBooting, setIsBooting] = useState(true);
  const [view, setView] = useState<ViewKey>(defaultView);
  const [idleStageActive, setIdleStageActive] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [playAllAutoDisplayActive, setPlayAllAutoDisplayActive] = useState(false);
  const [forcedAutoDisplay, setForcedAutoDisplay] = useState<{
    enabled: boolean;
    nonce: number;
  }>({ enabled: false, nonce: 0 });
  const [forcedProfileSelection, setForcedProfileSelection] = useState<{
    id: string | null;
    nonce: number;
  }>({ id: null, nonce: 0 });
  const [forcedSlideStep, setForcedSlideStep] = useState<{
    direction: "next" | "prev";
    nonce: number;
  }>({ direction: "next", nonce: 0 });
  const [siteClosed, setSiteClosed] = useState(false);
  const [siteClosedReason, setSiteClosedReason] = useState(
    "Temporarily closed by super admin.",
  );
  const [deviceClosed, setDeviceClosed] = useState(false);
  const [selectedPastCommandant, setSelectedPastCommandant] =
    useState<Commandant | null>(null);
  
  // Commandants auto-display state
  const [commandantsAutoDisplayActive, setCommandantsAutoDisplayActive] = useState(false);
  const [commandantsAutoDisplayIndex, setCommandantsAutoDisplayIndex] = useState(0);
  const [isCommandantsAutoPlaying, setIsCommandantsAutoPlaying] = useState(true);

  // Universal Back Button trigger
  const [backTriggerNonce, setBackTriggerNonce] = useState(0);

  const handleGlobalBack = () => {
    setBackTriggerNonce((prev) => prev + 1);
  };

  const lastProcessedBackNonce = useRef(backTriggerNonce);

  // Handle local backing logic for views managed directly in Index.tsx
  useEffect(() => {
    if (backTriggerNonce === 0 || backTriggerNonce === lastProcessedBackNonce.current) {
      lastProcessedBackNonce.current = backTriggerNonce;
      return;
    }
    lastProcessedBackNonce.current = backTriggerNonce;

    if (view === "commandants") {
      if (commandantsAutoDisplayActive) {
        setCommandantsAutoDisplayActive(false);
      } else if (selectedPastCommandant) {
        setSelectedPastCommandant(null);
      } else {
        setView("home");
      }
    } else if (view === "ndc-events") {
      setView("home");
    } else if (view === "admin" && !adminAuthenticated) {
      setView("home");
    }
  }, [backTriggerNonce, view, commandantsAutoDisplayActive, selectedPastCommandant, adminAuthenticated]);
  const globalCommandRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousViewBeforeCommandantProfileRef = useRef<ViewKey | null>(null);

  const [showStageConfig, setShowStageConfig] = useState(false);
  const [activeCourseNumber, setActiveCourseNumber] = useState<number | null>(null);

  const { themeMode, setThemeMode, resetThemeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const [scatteredCrests] = useState<CrestParticle[]>(() =>
    Array.from({ length: 16 }, (_, i) => createParticle(i)),
  );
  const {
    settings: bootSequenceSettings,
    setSettings: setBootSequenceSettings,
    resetSettings: resetBootSequenceSettings,
  } = useBootSequenceSettings();
  const {
    settings: autoDisplaySettings,
    setGlobalTiming: setAutoDisplayGlobalTiming,
    setContextTiming: setAutoDisplayContextTiming,
    setTransitionDuration: setAutoDisplayTransitionDuration,
    setTransitionSequence: setAutoDisplayTransitionSequence,
    setContextTransitionSequence: setAutoDisplayContextTransitionSequence,
    setNextContext: setAutoDisplayNextContext,
    setCommandantLayout: setAutoDisplayCommandantLayout,
    importSettings: importAutoDisplaySettings,
    resetSettings: resetAutoDisplaySettings,
  } = useAutoDisplaySettings();
  const {
    settings: idleStageSettings,
    setSettings: setIdleStageSettings,
  } = useIdleStageSettings();

  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } =
    usePersonnelStore();
  const { visits, addVisit, updateVisit, deleteVisit } = useVisitsStore();
  const {
    commandants,
    isCommandantsLoading,
    addCommandant,
    updateCommandant,
    deleteCommandant,
  } =
    useCommandantsStore();

  const { toast } = useToast();

  const handleAddPersonnel = useCallback((p: any) => {
    addPersonnel(p);
    toast({
      title: "Success",
      description: `Personnel "${p.name}" has been added successfully.`,
    });
  }, [addPersonnel, toast]);

  const handleUpdatePersonnel = useCallback((id: string, p: any) => {
    updatePersonnel(id, p);
    toast({
      title: "Success",
      description: "Personnel profile has been updated successfully.",
    });
  }, [updatePersonnel, toast]);

  const handleDeletePersonnel = useCallback((id: string) => {
    deletePersonnel(id);
    toast({
      title: "Success",
      description: "Personnel profile has been deleted.",
    });
  }, [deletePersonnel, toast]);

  const handleAddVisit = useCallback((v: any) => {
    addVisit(v);
    toast({
      title: "Success",
      description: `Visit from "${v.name}" has been added successfully.`,
    });
  }, [addVisit, toast]);

  const handleUpdateVisit = useCallback((id: string, v: any) => {
    updateVisit(id, v);
    toast({
      title: "Success",
      description: "Visit details have been updated successfully.",
    });
  }, [updateVisit, toast]);

  const handleDeleteVisit = useCallback((id: string) => {
    deleteVisit(id);
    toast({
      title: "Success",
      description: "Visit has been deleted.",
    });
  }, [deleteVisit, toast]);

  const handleAddCommandant = useCallback((c: any) => {
    addCommandant(c);
    toast({
      title: "Success",
      description: `Commandant "${c.name}" has been added successfully.`,
    });
  }, [addCommandant, toast]);

  const handleUpdateCommandant = useCallback((id: string, c: any) => {
    updateCommandant(id, c);
    toast({
      title: "Success",
      description: "Commandant details have been updated successfully.",
    });
  }, [updateCommandant, toast]);

  const handleDeleteCommandant = useCallback((id: string) => {
    deleteCommandant(id);
    toast({
      title: "Success",
      description: "Commandant record has been deleted.",
    });
  }, [deleteCommandant, toast]);
  const audioTracks = useAudioStore((state) => state.tracks);
  const audioAssignments = useAudioStore((state) => state.assignments);
  const currentCommandant =
    commandants.find((c) => c.isCurrent) ?? commandants[0] ?? null;

  const isMuseumFeatureView =
    view === "about-ndc" ||
    view === "museum-collections" ||
    view === "guided-tours" ||
    view === "hall-of-fame";

  const activeCategory = SECTION_CATEGORIES[view] ?? null;
  const activeView =
    view === "visits"
      ? "visits"
      : view === "home" || isMuseumFeatureView
        ? "home"
        : view === "admin"
          ? "admin"
          : "category";

  const stageConfigContext: AutoDisplayContextKey | null = useMemo(() => {
    if (view === "commandants") return "commandants";
    if (view === "fwc") return "FWC";
    if (view === "fdc") return "FDC";
    if (view === "participants") return "Directing Staff";
    if (view === "allied") return "Allied";
    return null;
  }, [view]);

  const canConfigureStage = stageConfigContext !== null;
  const currentStageTiming =
    stageConfigContext !== null
      ? autoDisplaySettings.byContext[stageConfigContext]
      : null;

  const updateStageTiming = (
    field: "slideDurationMs" | "transitionDurationMs",
    rawValue: number,
  ) => {
    if (!stageConfigContext || !Number.isFinite(rawValue)) return;

    const clamped =
      field === "slideDurationMs"
        ? Math.max(3000, Math.min(30000, Math.round(rawValue)))
        : Math.max(250, Math.min(2600, Math.round(rawValue)));

    setAutoDisplayContextTiming(stageConfigContext, { [field]: clamped });
  };

  const contextToView = (context: AutoDisplayContextKey): ViewKey => {
    if (context === "commandants") return "commandants";
    if (context === "visits") return "visits";
    if (context === "FWC") return "fwc";
    if (context === "FDC") return "fdc";
    if (context === "Directing Staff") return "participants";
    return "allied";
  };

  const triggerAutoDisplayForContext = (context: AutoDisplayContextKey) => {
    setView(contextToView(context));
    setForcedAutoDisplay((prev) => ({
      enabled: true,
      nonce: prev.nonce + 1,
    }));
  };

  const hasAutoDisplayItemsForContext = (context: AutoDisplayContextKey) => {
    if (context === "commandants") return commandants.length > 0;
    if (context === "visits") return visits.length > 0;
    return personnel.some((person) => person.category === context);
  };

  const getNextPlayableAutoDisplayContext = (
    context: AutoDisplayContextKey,
  ): AutoDisplayContextKey | null => {
    const currentSequenceIndex = AUTO_DISPLAY_PLAY_ALL_SEQUENCE.indexOf(context);
    const startIndex = currentSequenceIndex >= 0 ? currentSequenceIndex + 1 : 0;
    return (
      AUTO_DISPLAY_PLAY_ALL_SEQUENCE.slice(startIndex).find(
        hasAutoDisplayItemsForContext,
      ) ?? null
    );
  };

  const startPlayAllAutoDisplays = () => {
    const startContext = "commandants";
    const playableStart = hasAutoDisplayItemsForContext(startContext)
      ? startContext
      : getNextPlayableAutoDisplayContext(startContext);
    if (!playableStart) return;

    setPlayAllAutoDisplayActive(true);
    triggerAutoDisplayForContext(playableStart);
  };

  const handleAutoDisplayStageComplete = (context: AutoDisplayContextKey) => {
    if (playAllAutoDisplayActive) {
      const nextContext = getNextPlayableAutoDisplayContext(context);

      if (!nextContext) {
        setPlayAllAutoDisplayActive(false);
        setAutoDisplayActive(false);
        setForcedAutoDisplay({ enabled: false, nonce: 0 });
        return;
      }

      triggerAutoDisplayForContext(nextContext);
      return;
    }

    const nextContext = autoDisplaySettings.nextContextByContext?.[context] ?? null;
    if (!nextContext || nextContext === context) {
      setAutoDisplayActive(false);
      return;
    }

    const nextView = contextToView(nextContext);
    setView(nextView);
    setForcedAutoDisplay((prev) => ({
      enabled: true,
      nonce: prev.nonce + 1,
    }));
  };

  const handleAutoDisplayActiveChange = (active: boolean) => {
    setAutoDisplayActive(active);
    if (active) {
      setForcedAutoDisplay((prev) =>
        prev.enabled && prev.nonce > 0
          ? prev
          : { enabled: true, nonce: prev.nonce + 1 },
      );
    } else {
      setPlayAllAutoDisplayActive(false);
      setForcedAutoDisplay({ enabled: false, nonce: 0 });
    }
  };

  useEffect(() => {
    setShowStageConfig(false);
    setActiveCourseNumber(null);
  }, [view]);

  const isSuperAdmin = useMemo(() => {
    if (!adminEmail) return false;
    return SUPER_ADMIN_EMAILS.includes(adminEmail.toLowerCase());
  }, [adminEmail]);

  const showLockScreen = deviceClosed || (siteClosed && !isSuperAdmin);

  const idleTrackingEnabled =
    idleStageSettings.enabled &&
    !isBooting &&
    !showLockScreen &&
    !autoDisplayActive &&
    view !== "admin" &&
    !selectedPastCommandant;

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        setIdleStageActive(true);
      }, idleStageSettings.activationDelayMs);
    };

    const onActivity = () => {
      if (idleStageActive) {
        setIdleStageActive(false);
      }
      scheduleIdleTimer();
    };

    if (!idleTrackingEnabled) {
      clearIdleTimer();
      if (idleStageActive) {
        setIdleStageActive(false);
      }
      return;
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    scheduleIdleTimer();

    return () => {
      clearIdleTimer();
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, [idleTrackingEnabled, idleStageSettings.activationDelayMs, idleStageActive]);

  const openPastCommandantProfile = (commandant: Commandant) => {
    previousViewBeforeCommandantProfileRef.current = view;
    setSelectedPastCommandant(commandant);
  };

  const closePastCommandantProfile = () => {
    setSelectedPastCommandant(null);
    setForcedProfileSelection((prev) => ({
      id: null,
      nonce: prev.nonce + 1,
    }));

    const previousView = previousViewBeforeCommandantProfileRef.current;
    previousViewBeforeCommandantProfileRef.current = null;

    if (previousView) {
      setView(previousView);
    }
  };

  useEffect(() => {
    const mediaRefs = [
      ...personnel.map((entry) => entry.imageUrl),
      ...visits.map((entry) => entry.imageUrl),
      ...commandants.map((entry) => entry.imageUrl),
    ];

    if (mediaRefs.length === 0) return;
    void prefetchMediaReferences(mediaRefs);
  }, [personnel, visits, commandants]);

  useEffect(() => {
    if (audioTracks.length === 0) return;
    void Promise.allSettled(audioTracks.map((track) => prefetchAudioTrack(track.id)));
  }, [audioTracks]);

  useEffect(() => {
    if (!idleStageActive || !idleTrackingEnabled) return;

    const idleTrackId = audioAssignments.idleStage ?? null;
    if (!idleTrackId) return;

    playAudioTrack(idleTrackId, false, false, { fadeMs: 500 });

    return () => {
      playAudioTrack(null, false, false, { fadeMs: 260 });
    };
  }, [idleStageActive, idleTrackingEnabled, audioAssignments.idleStage]);

  useEffect(() => {
    let isCancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
      }).wakeLock;

      if (!wakeLockApi || document.visibilityState !== "visible") {
        return;
      }

      try {
        sentinel = await wakeLockApi.request("screen");
        sentinel.addEventListener("release", () => {
          if (!isCancelled && document.visibilityState === "visible") {
            void requestWakeLock();
          }
        });
      } catch {
        // Some browsers or device policies may block wake lock requests.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        return;
      }

      if (sentinel) {
        void sentinel.release();
        sentinel = null;
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (sentinel) {
        void sentinel.release();
      }
    };
  }, []);

  const applyGlobalSiteAction = (
    action: GlobalSiteAction,
    payload: Record<string, unknown>,
  ) => {
    if (action === "close-site") {
      const reason =
        typeof payload.reason === "string" && payload.reason.trim().length > 0
          ? payload.reason
          : "Temporarily closed by super admin.";
      setSiteClosedReason(reason);
      setSiteClosed(true);
      setForcedAutoDisplay((prev) => ({
        enabled: false,
        nonce: prev.nonce + 1,
      }));
      return;
    }

    setSiteClosed(false);
  };

  const mapCommandViewToAppView = (value: unknown): ViewKey | null => {
    if (value === "home") return "home";
    if (value === "faculty") return "faculty";
    if (value === "fwc") return "fwc";
    if (value === "fdc") return "fdc";
    if (value === "participants") return "participants";
    if (value === "directorate") return "directorate";
    if (value === "allied") return "allied";
    if (value === "visits") return "visits";
    if (value === "admin") return "admin";
    return null;
  };

  const handleDeviceCommand = (
    commandType: DeviceControlCommandType,
    payload: Record<string, unknown>,
  ) => {
    if (commandType === "set-view") {
      if (payload.action === "next-slide" || payload.action === "prev-slide") {
        setForcedSlideStep((prev) => ({
          direction: payload.action === "next-slide" ? "next" : "prev",
          nonce: prev.nonce + 1,
        }));
        return;
      }

      const nextView = mapCommandViewToAppView(payload.view);
      if (nextView) {
        setView(nextView);
        setForcedProfileSelection((prev) => ({
          ...prev,
          id: null,
          nonce: prev.nonce + 1,
        }));
      }
      return;
    }

    if (commandType === "set-auto-display") {
      const enabled = Boolean(payload.enabled);
      setForcedAutoDisplay((prev) => ({ enabled, nonce: prev.nonce + 1 }));
      return;
    }

    if (commandType === "apply-device-profile") {
      const remoteThemeMode: ThemeMode | null =
        typeof payload.themeMode === "string"
          ? (payload.themeMode as ThemeMode)
          : null;
      const bootPayload = payload.bootSequenceSettings;
      const autoDisplayPayload = payload.autoDisplaySettings;
      const idleStagePayload = payload.idleStageSettings;

      saveDeviceOverrides({
        themeMode: remoteThemeMode ?? undefined,
        bootSequenceSettings:
          bootPayload && typeof bootPayload === "object"
            ? (bootPayload as Record<string, unknown>)
            : undefined,
        autoDisplaySettings:
          autoDisplayPayload && typeof autoDisplayPayload === "object"
            ? (autoDisplayPayload as Record<string, unknown>)
            : undefined,
        idleStageSettings:
          idleStagePayload && typeof idleStagePayload === "object"
            ? (idleStagePayload as Record<string, unknown>)
            : undefined,
      });

      if (remoteThemeMode) {
        setThemeMode(remoteThemeMode);
      }

      if (bootPayload && typeof bootPayload === "object") {
        setBootSequenceSettings(
          bootPayload as Parameters<typeof setBootSequenceSettings>[0],
        );
      }

      if (autoDisplayPayload && typeof autoDisplayPayload === "object") {
        importAutoDisplaySettings(
          autoDisplayPayload as Parameters<typeof importAutoDisplaySettings>[0],
        );
      }

      if (idleStagePayload && typeof idleStagePayload === "object") {
        setIdleStageSettings(
          idleStagePayload as Parameters<typeof setIdleStageSettings>[0],
        );
      }
      return;
    }

    if (commandType === "clear-device-profile") {
      clearDeviceOverrides();
      window.location.reload();
      return;
    }

    if (commandType === "open-person-profile") {
      if (payload.profileType === "commandant") {
        const commandantId =
          typeof payload.commandantId === "string" ? payload.commandantId : null;
        const commandant =
          commandantId
            ? commandants.find((entry) => entry.id === commandantId) ?? null
            : null;

        if (commandant) {
          setView("home");
          setForcedAutoDisplay((prev) => ({
            enabled: false,
            nonce: prev.nonce + 1,
          }));
          openPastCommandantProfile(commandant);
        }
        return;
      }

      const targetView = payload.view;
      const personId =
        typeof payload.personId === "string" ? payload.personId : null;
      if (
        (targetView === "fwc" ||
          targetView === "fdc" ||
          targetView === "directing" ||
          targetView === "allied") &&
        personId
      ) {
        setView(targetView);
        setForcedAutoDisplay((prev) => ({
          enabled: false,
          nonce: prev.nonce + 1,
        }));
        setForcedProfileSelection((prev) => ({
          id: personId,
          nonce: prev.nonce + 1,
        }));
      }
      return;
    }

    if (commandType === "close-profile") {
      closePastCommandantProfile();
      return;
    }

    if (commandType === "close-app") {
      const reason =
        typeof payload.reason === "string" && payload.reason.trim().length > 0
          ? payload.reason
          : "This screen was remotely closed by super admin.";
      setSiteClosedReason(reason);
      setDeviceClosed(true);
      setIdleStageActive(false);
      setForcedAutoDisplay((prev) => ({
        enabled: false,
        nonce: prev.nonce + 1,
      }));
      return;
    }

    if (commandType === "reopen-app") {
      setDeviceClosed(false);
    }
  };

  const {
    devices,
    deviceId,
    deviceLabel,
    refreshDevices,
    renameCurrentDevice,
    sendCommandToDevices,
  } =
    useDeviceControl({
      currentView: view,
      autoDisplayEnabled: autoDisplayActive,
      onCommand: handleDeviceCommand,
    });

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const session = await getSafeSupabaseSession();
      if (!mounted) return;
      setAdminAuthenticated(Boolean(session));
      setAdminEmail(session?.user?.email ?? null);
      setAuthReady(true);
    };

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminAuthenticated(Boolean(session));
      setAdminEmail(session?.user?.email ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Listen for Dropbox sync reload requests from the main process
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onDropboxSyncReload) return;

    const cleanup = window.electronAPI.onDropboxSyncReload(() => {
      console.log('[Index] Received Dropbox sync reload request. Reloading window...');
      window.location.reload();
    });

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const pollGlobalControl = async () => {
      const { data } = await supabase
        .from("global_site_control")
        .select("id,action,payload")
        .order("id", { ascending: false })
        .limit(1);

      if (!mounted || !data || data.length === 0) return;

      const command = data[0] as {
        id: number;
        action: GlobalSiteAction;
        payload: Record<string, unknown>;
      };
      if (globalCommandRef.current === command.id) return;

      globalCommandRef.current = command.id;
      applyGlobalSiteAction(command.action, command.payload ?? {});
    };

    void pollGlobalControl();

    const interval = setInterval(() => {
      void pollGlobalControl();
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-cycling effect for commandants auto-display
  useEffect(() => {
    if (!commandantsAutoDisplayActive || commandants.length === 0 || !isCommandantsAutoPlaying) return;

    const interval = setInterval(() => {
      setCommandantsAutoDisplayIndex((prev) => (prev + 1) % commandants.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [commandantsAutoDisplayActive, commandants.length, isCommandantsAutoPlaying]);

  const currentAutoDisplayCommandant = commandantsAutoDisplayActive && commandants[commandantsAutoDisplayIndex] ? commandants[commandantsAutoDisplayIndex] : null;

  const renderContent = () => {
    if (view === "home") {
      const showCommandantShell = isCommandantsLoading || commandants.length > 0;

      return (
        <div className="space-y-8 md:space-y-10">
      
          <CategoryCards onSelect={setView} />

          {/* <MuseumExperienceSection onSelect={setView} /> */}
        </div>
      );
    }

    /*
    if (view === "about-ndc") {
      return (
        <AboutNdcView
          onBack={() => setView("home")}
          onOpenCommandants={() => setView("commandants")}
          onOpenHallOfFame={() => setView("hall-of-fame")}
          onOpenVisits={() => setView("visits")}
          currentCommandant={currentCommandant}
          commandants={commandants}
          visitsCount={visits.length}
        />
      );
    }

    if (view === "museum-collections") {
      return (
        <MuseumCollectionsView
          onBack={() => setView("home")}
          onOpenHallOfFame={() => setView("hall-of-fame")}
          onOpenRelatedView={setView}
          commandants={commandants}
          personnel={personnel}
          visits={visits}
        />
      );
    }

    if (view === "guided-tours") {
      return (
        <GuidedToursView
          onBack={() => setView("home")}
          onOpenHallOfFame={() => setView("hall-of-fame")}
          onOpenCollections={() => setView("museum-collections")}
          onOpenRelatedView={setView}
          commandants={commandants}
          personnel={personnel}
          visits={visits}
        />
      );
    }

    if (view === "hall-of-fame") {
      return (
        <HallOfFameView
          onBack={() => setView("home")}
          onSelect={setView}
          personnel={personnel}
          commandants={commandants}
          visits={visits}
        />
      );
    }

    if (view === "artifact-gallery") {
      return <ArtifactFrameGallery onBack={() => setView("home")} />;
    }
    */

    if (view === "commandants") {
      if (isCommandantsLoading) {
        return (
          <section className="rounded-xl border border-primary/20 bg-card/70 px-4 py-6 md:px-6 md:py-8 animate-pulse">
            <div className="mx-auto w-full max-w-5xl space-y-4">
              <div className="h-4 w-40 rounded bg-primary/20" />
              <div className="h-10 w-4/5 rounded bg-primary/20" />
              <div className="h-6 w-3/5 rounded bg-primary/15" />
              <div className="h-24 w-full rounded bg-primary/10" />
            </div>
          </section>
        );
      }

      if (commandants.length === 0) {
        return (
          <section className="rounded-xl border border-primary/25 bg-card/70 px-4 py-6 md:px-6 md:py-8 text-center">
            <p className="text-sm md:text-base font-semibold text-foreground">No commandant record is available yet.</p>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">Add a commandant record in Admin to populate this section.</p>
          </section>
        );
      }

      const sortedCommandants = [...commandants].sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        const startA = parseInt(a.tenureStart) || 0;
        const startB = parseInt(b.tenureStart) || 0;
        return startB - startA;
      });

      return (
        <section className="space-y-4">
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={() => {
                setCommandantsAutoDisplayActive(true);
                setCommandantsAutoDisplayIndex(0);
                setIsCommandantsAutoPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#002060] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#003080] transition-all duration-200 shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Auto Display
            </button>
          </div>

          {/* Centered page title matching the sample layout */}
          <div className="text-center mt-8 mb-6 relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-[#002060]/15 to-transparent" />
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold font-serif uppercase tracking-wider relative z-10">
              <span className="bg-gradient-to-r from-[#002060] via-[#003080] to-[#002060] bg-clip-text text-transparent">
                Chronicles of Directing Staff
              </span>
            </h2>
            <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mx-auto mt-2 mb-2" />
            <p className="text-sm sm:text-base lg:text-lg font-semibold font-serif uppercase tracking-[0.2em] text-[#C0392B]">
              National Defence College
            </p>
          </div>

          {/* Grid Layout for Commandants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5 sm:gap-6 mt-6 pb-8">
            {sortedCommandants.map((cmd) => (
              <GridCommandantCard
                key={cmd.id}
                commandant={cmd}
                onClick={() => openPastCommandantProfile(cmd)}
                isLightMode={isLightMode}
              />
            ))}
          </div>

          {/* Bottom Back Button Removed */}
        </section>
      );
    }

    if (view === "visits") {
      return <VisitsSection visits={visits} onBack={() => setView("home")} backTriggerNonce={backTriggerNonce} />;
    }

    if (view === "ndc-events") {
      return (
        <section className="min-h-screen bg-white p-6 md:p-12">
          <div className="max-w-6xl mx-auto">
            {/* Header Back Button Removed */}

            <div className="mb-6 flex flex-col items-start">
              <h1 className="text-4xl md:text-5xl font-bold font-serif text-slate-900 mb-2">NDC Facilitated Events</h1>
              <p className="text-slate-600 text-lg">Seminars, Conferences & Professional Development</p>
              <div className="mt-4 h-1 w-24 bg-gradient-to-r from-[#002060] via-[#C0392B] to-[#00B0F0]"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 text-center group transition-all duration-500 hover:-translate-y-2.5 hover:scale-[1.012] flex flex-col items-center justify-center p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30 bg-gradient-to-br from-[#1a4d1a] via-[#2d6b2d] to-[#408a40] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]">
                {/* Top tri-service accent */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[5px] flex z-20">
                  <div className="flex-1 bg-[#002060]" />
                  <div className="flex-1 bg-[#C0392B]" />
                  <div className="flex-1 bg-[#00B0F0]" />
                </div>

                {/* Gloss/Highlight Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-80" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center text-white">
                  <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
                  <p className="text-lg text-white/90">Event information will be available shortly.</p>
                </div>
              </div>
            </div>

            {/* Bottom Back Button Removed */}
          </div>
        </section>
      );
    }

    if (view === "admin") {
      if (!authReady) {
        return (
          <div className="text-sm text-muted-foreground">
            Checking admin session...
          </div>
        );
      }

      if (!adminAuthenticated) {
        return <AdminLogin onSuccess={() => setAdminAuthenticated(true)} onBack={() => setView("home")} />;
      }

      return (
        <AdminPanel
          personnel={personnel}
          visits={visits}
          commandants={commandants}
          onAddPersonnel={handleAddPersonnel}
          onUpdatePersonnel={handleUpdatePersonnel}
          onDeletePersonnel={handleDeletePersonnel}
          onAddVisit={handleAddVisit}
          onUpdateVisit={handleUpdateVisit}
          onDeleteVisit={handleDeleteVisit}
          onAddCommandant={handleAddCommandant}
          onUpdateCommandant={handleUpdateCommandant}
          onDeleteCommandant={handleDeleteCommandant}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onResetThemeMode={resetThemeMode}
          bootSequenceSettings={bootSequenceSettings}
          onBootSequenceSettingsChange={setBootSequenceSettings}
          onResetBootSequenceSettings={resetBootSequenceSettings}
          autoDisplaySettings={autoDisplaySettings}
          onAutoDisplayGlobalTimingChange={setAutoDisplayGlobalTiming}
          onAutoDisplayContextTimingChange={setAutoDisplayContextTiming}
          onAutoDisplayTransitionDurationChange={
            setAutoDisplayTransitionDuration
          }
          onAutoDisplayTransitionSequenceChange={
            setAutoDisplayTransitionSequence
          }
          onAutoDisplayContextTransitionSequenceChange={
            setAutoDisplayContextTransitionSequence
          }
          onAutoDisplayCommandantLayoutChange={setAutoDisplayCommandantLayout}
          onImportAutoDisplaySettings={importAutoDisplaySettings}
          onResetAutoDisplaySettings={resetAutoDisplaySettings}
          idleStageSettings={idleStageSettings}
          onIdleStageSettingsChange={setIdleStageSettings}
          devices={devices}
          currentDeviceId={deviceId}
          currentDeviceLabel={deviceLabel}
          isSuperAdmin={isSuperAdmin}
          onRefreshDevices={() => {
            void refreshDevices();
          }}
          onRenameCurrentDevice={renameCurrentDevice}
          onSendDeviceView={async (deviceIds, targetView) => {
            return sendCommandToDevices(deviceIds, "set-view", {
              view: targetView as DeviceControlView,
            });
          }}
          onSendDeviceAutoDisplay={async (deviceIds, enabled) => {
            return sendCommandToDevices(deviceIds, "set-auto-display", {
              enabled,
            });
          }}
          onSendDeviceCloseApp={async (deviceIds, reason) => {
            return sendCommandToDevices(deviceIds, "close-app", { reason });
          }}
          onSendDeviceReopenApp={async (deviceIds) => {
            return sendCommandToDevices(deviceIds, "reopen-app", {});
          }}
          onSendDeviceOpenPersonProfile={async (deviceIds, payload) => {
            return sendCommandToDevices(
              deviceIds,
              "open-person-profile",
              payload as unknown as Record<string, unknown>,
            );
          }}
          onSendDeviceOpenCommandantProfile={async (deviceIds, payload) => {
            return sendCommandToDevices(deviceIds, "open-person-profile", {
              profileType: "commandant",
              commandantId: payload.commandantId,
            });
          }}
          onSendDeviceSlideStep={async (deviceIds, direction) => {
            return sendCommandToDevices(deviceIds, "set-view", {
              action: direction === "next" ? "next-slide" : "prev-slide",
            });
          }}
          onSendDeviceCloseProfile={async (deviceIds) => {
            return sendCommandToDevices(deviceIds, "close-profile", {});
          }}
          onSendDeviceApplyProfile={async (deviceIds, payload) => {
            return sendCommandToDevices(
              deviceIds,
              "apply-device-profile",
              payload as unknown as Record<string, unknown>,
            );
          }}
          onSendDeviceClearProfile={async (deviceIds) => {
            return sendCommandToDevices(deviceIds, "clear-device-profile", {});
          }}
          onSendGlobalSiteClose={async (reason) => {
            if (!isSuperAdmin) return false;
            const session = await getSafeSupabaseSession();
            if (!session?.user) return false;
            const { error } = await supabase
              .from("global_site_control")
              .insert({
                action: "close-site",
                payload: { reason },
                issued_by: session.user.id,
              });
            if (!error) {
              applyGlobalSiteAction("close-site", { reason });
            }
            return !error;
          }}
          onSendGlobalSiteOpen={async () => {
            if (!isSuperAdmin) return false;
            const session = await getSafeSupabaseSession();
            if (!session?.user) return false;
            const { error } = await supabase
              .from("global_site_control")
              .insert({
                action: "open-site",
                payload: {},
                issued_by: session.user.id,
              });
            if (!error) {
              applyGlobalSiteAction("open-site", {});
            }
            return !error;
          }}
          onSignOut={() => {
            void supabase.auth.signOut();
            setAdminAuthenticated(false);
            setAdminEmail(null);
          }}
          onBack={() => setView("home")}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    // Special handling for Participants (formerly Directing Staff) with course year categorization
    if (view === "participants") {
      return (
        <DirectingStaffByCourseYear
          personnel={personnel}
          onBack={() => setView("home")}
          title="CHRONICLES OF DIRECTING STAFF"
          description="Distinguished participants who have guided courses and shaped the NDC academic framework, categorized by CSE course year."
          onCourseSelect={setActiveCourseNumber}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    // Special handling for Directing Staff (legacy route)
    if (view === "directing") {
      return (
        <DirectingStaffByCourseYear
          personnel={personnel}
          onBack={() => setView("home")}
          title="CHRONICLES OF DIRECTING STAFF"
          description="Directing staff who have guided courses and shaped the NDC academic framework, categorized by CSE course year."
          onCourseSelect={setActiveCourseNumber}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    // Special handling for FWC and FDC with course year categorization
    if (view === "fwc" || view === "fdc") {
      const category = view === "fwc" ? "FWC" : "FDC";
      return (
        <FellowsByCourse
          personnel={personnel}
          category={category}
          onBack={() => setView("home")}
          title={SECTION_TITLES[view]}
          description={view === "fwc" 
            ? "Distinguished Fellows of War College, categorized by CSE course year."
            : "Distinguished Fellows of Defence College, categorized by CSE course year."
          }
          onCourseSelect={setActiveCourseNumber}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    // Special handling for Participants
    if (view === "participants") {
      return (
        <DirectingStaffByCourseYear
          personnel={personnel}
          onBack={() => setView("home")}
          title="CHRONICLES OF DIRECTING STAFF"
          description="Participants who have shaped the NDC academic framework, categorized by CSE course year."
          onCourseSelect={setActiveCourseNumber}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    const category = SECTION_CATEGORIES[view];
    if (category) {
      return (
        <OrganogramView
          key={view}
          data={personnel}
          title={SECTION_TITLES[view]}
          category={category}
          forcedSelectedId={
            SECTION_CATEGORIES[view] === category
              ? forcedProfileSelection.id
              : null
          }
          forcedSelectionNonce={forcedProfileSelection.nonce}
          onBack={() => setView("home")}
          backTriggerNonce={backTriggerNonce}
        />
      );
    }

    return null;
  };

  return (
    <>
      <AudioManager />

      {/* NDC Campus — full-viewport background with crossfade */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/images/ndc-bg-1.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover ndc-bg-fade-1"
          style={{ filter: "brightness(0.75) contrast(1.05) saturate(0.9)" }}
        />
        <img
          src="/images/ndc-bg-2.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover ndc-bg-fade-2"
          style={{ filter: "brightness(0.75) contrast(1.05) saturate(0.9)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/25 via-transparent to-[#0a1628]/50" />
      </div>

      {isBooting && (
        <BootSequence
          settings={bootSequenceSettings}
          onComplete={() => setIsBooting(false)}
        />
      )}

      {showLockScreen && (
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-2xl border border-destructive/30 bg-card/95 p-8 md:p-10 text-center space-y-4 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-serif text-destructive">
              Site Temporarily Closed
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{siteClosedReason}</p>
            <div className="ornament-divider pt-2">
              <div className="ornament-divider-diamond !bg-destructive/30" />
            </div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
              Please contact an administrator for access restoration.
            </p>
          </div>
        </div>
      )}

      {idleStageActive && idleTrackingEnabled && (
        <IdleStageOverlay
          settings={idleStageSettings}
          commandants={commandants}
          onExit={() => setIdleStageActive(false)}
        />
      )}

      <div
        className={`command-center-bg h-screen max-h-screen overflow-hidden flex flex-col transition-opacity duration-1000 ${isBooting ? "opacity-0" : "opacity-100"}`}
      >
        {!autoDisplayActive && view !== "admin" && (
          <AppHeader
            onHomeClick={() => setView("home")}
          />
        )}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${autoDisplayActive ? "p-0" : "pb-20"}`}>
          <div className={`${autoDisplayActive || view === "admin" || view === "artifact-gallery" ? "w-screen h-screen max-w-none p-0" : "max-w-[1840px] px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8"} mx-auto relative z-10`}>
            <div className={`${autoDisplayActive || view === "admin" || view === "artifact-gallery" ? "bg-transparent border-none p-0 rounded-none shadow-none" : `app-shell-frame rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden${view === "home" ? " min-h-[calc(100vh-180px)] flex flex-col justify-center" : ""}`}`}>
              {view === "home" && (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(90deg,rgba(0,32,96,0.08)_1px,transparent_1px),linear-gradient(rgba(0,32,96,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
                  <img
                    src={ndcCrest}
                    alt=""
                    className="pointer-events-none absolute -left-20 top-8 h-56 w-56 object-contain opacity-[0.06]"
                  />
                  <img
                    src={ndcCrest}
                    alt=""
                    className="pointer-events-none absolute -right-20 bottom-6 h-56 w-56 object-contain opacity-[0.06]"
                  />

                  <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
                    {scatteredCrests.map((crest) => (
                      <img
                        key={crest.id}
                        src={ndcCrest}
                        alt=""
                        className={`absolute object-contain ${isLightMode ? "opacity-[0.05]" : "opacity-[0.08] invert"}`}
                        style={{
                          width: `${crest.size}px`,
                          height: `${crest.size}px`,
                          left: `${crest.left}%`,
                          top: `${crest.top}%`,
                          transform: `translate(-50%, -50%) rotate(${crest.rotate}deg)`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className={`${autoDisplayActive ? "fixed top-4 right-4 z-[100]" : "flex justify-end mb-3 sm:mb-4"} ${view === "home" ? "hidden" : ""}`}>
                <div className="relative flex items-center gap-2">

                <AutoRotationDisplay
                  key={view}
                  personnel={personnel}
                  visits={visits}
                  commandants={commandants}
                  activeCategory={activeCategory}
                  activeView={activeView}
                  settings={autoDisplaySettings}
                  forcedControl={forcedAutoDisplay}
                  forcedStep={forcedSlideStep}
                  onActiveChange={handleAutoDisplayActiveChange}
                  onStageComplete={handleAutoDisplayStageComplete}
                  onPlayAll={!autoDisplayActive && view !== "admin" ? startPlayAllAutoDisplays : undefined}
                  showSettings={canConfigureStage && !autoDisplayActive && !!currentStageTiming}
                  onToggleSettings={canConfigureStage && !autoDisplayActive && currentStageTiming ? () => setShowStageConfig((prev) => !prev) : undefined}
                  isAutoDisplayActive={autoDisplayActive}
                  isViewAdmin={view === "admin"}
                />
                </div>
              </div>

              {showStageConfig && canConfigureStage && !autoDisplayActive && currentStageTiming && (
                <div className="fixed top-16 right-4 z-[120] w-[280px] rounded-xl border border-primary/20 bg-card/95 p-3 shadow-xl backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/90 font-semibold">
                        Auto-Scroll Stage
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Tune this page timing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStageConfig(false)}
                      className="h-7 rounded-md border border-primary/20 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground">
                        Next Slide Delay (seconds)
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={3}
                          max={30}
                          step={1}
                          value={Math.round(currentStageTiming.slideDurationMs / 1000)}
                          onChange={(e) =>
                            updateStageTiming(
                              "slideDurationMs",
                              Number(e.target.value) * 1000,
                            )
                          }
                          className="w-full"
                        />
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {Math.round(currentStageTiming.slideDurationMs / 1000)}s
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground">
                        Transition Stage (milliseconds)
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={250}
                          max={2600}
                          step={50}
                          value={currentStageTiming.transitionDurationMs}
                          onChange={(e) =>
                            updateStageTiming(
                              "transitionDurationMs",
                              Number(e.target.value),
                            )
                          }
                          className="w-full"
                        />
                        <span className="w-14 text-right text-xs text-muted-foreground">
                          {currentStageTiming.transitionDurationMs}ms
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        Next Auto Display Stage
                      </label>
                      <select
                        value={
                          autoDisplaySettings.nextContextByContext?.[
                            stageConfigContext
                          ] ?? ""
                        }
                        onChange={(e) => {
                          const value = e.target.value as
                            | AutoDisplayContextKey
                            | "";
                          setAutoDisplayNextContext(
                            stageConfigContext,
                            value === "" ? null : value,
                          );
                        }}
                        className="mt-1 h-9 w-full rounded-md border border-primary/20 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Stop After This Stage</option>
                        {AUTO_DISPLAY_CONTEXTS.map((ctx) => (
                          <option
                            key={ctx.key}
                            value={ctx.key}
                            disabled={ctx.key === stageConfigContext}
                          >
                            {ctx.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {!autoDisplayActive && renderContent()}
            </div>
          </div>
        </main>

        {!autoDisplayActive && view !== "admin" && (
          <AppFooter activeCourseNumber={activeCourseNumber} />
        )}

        <BottomDock
          currentView={view}
          onNavigate={setView}
          hidden={autoDisplayActive}
          onBack={handleGlobalBack}
        />
      </div>

      {selectedPastCommandant && (
        <CommandantProfileOverlay
          commandant={selectedPastCommandant}
          commandants={commandants}
          onClose={closePastCommandantProfile}
          onSelectCommandant={setSelectedPastCommandant}
        />
      )}

      {/* Commandants Auto-Display Modal */}
      {false && commandantsAutoDisplayActive && currentAutoDisplayCommandant && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain" />
              <div>
                <p className="text-[#FFD700] font-serif text-sm uppercase tracking-widest font-bold">
                  Commandants
                </p>
                <p className="text-white/60 text-xs mt-1">
                  {commandantsAutoDisplayIndex + 1} of {commandants.length}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCommandantsAutoPlaying(!isCommandantsAutoPlaying)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title={isCommandantsAutoPlaying ? 'Pause' : 'Play'}
              >
                {isCommandantsAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setCommandantsAutoDisplayActive(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-white transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center justify-center gap-8 max-w-2xl">
            {/* Large NDC Crest */}
            <img
              src={ndcCrest}
              alt="NDC"
              className="h-40 w-40 object-contain opacity-90 drop-shadow-lg"
            />

            {/* Commandant Info */}
            <div className="text-center space-y-4 w-full">
              <h2 className="text-4xl font-bold text-white">
                {currentAutoDisplayCommandant.name}
              </h2>
              {currentAutoDisplayCommandant.rank && (
                <p className="text-xl text-[#FFD700] font-semibold">
                  {currentAutoDisplayCommandant.rank}
                </p>
              )}
              {currentAutoDisplayCommandant.title && (
                <p className="text-lg text-white/80">
                  {currentAutoDisplayCommandant.title}
                </p>
              )}
            </div>

            {/* Commandant Image */}
            {currentAutoDisplayCommandant.portraitUrl && (
              <div className="w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-[#FFD700]/30">
                <img
                  src={currentAutoDisplayCommandant.portraitUrl}
                  alt={currentAutoDisplayCommandant.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => setCommandantsAutoDisplayIndex((prev) => (prev - 1 + commandants.length) % commandants.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="text-white text-sm font-semibold">
                {commandantsAutoDisplayIndex + 1} / {commandants.length}
              </div>

              <button
                onClick={() => setCommandantsAutoDisplayIndex((prev) => (prev + 1) % commandants.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Index;
