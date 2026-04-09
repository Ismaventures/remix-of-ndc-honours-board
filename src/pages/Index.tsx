import { useState, useEffect, useMemo, useRef } from "react";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CommandantHero } from "@/components/CommandantHero";
import { PastCommandants } from "@/components/PastCommandants";
import { CategoryCards, ViewKey } from "@/components/CategoryCards";
import {
  AboutNdcView,
  GuidedToursView,
  HallOfFameView,
  MuseumCollectionsView,
  MuseumExperienceSection,
} from "@/components/MuseumExperience";
import { OrganogramView } from "@/components/OrganogramView";
import { VisitsSection } from "@/components/VisitsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminLogin } from "@/components/AdminLogin";
import { ArtifactFrameGallery } from "@/components/ArtifactFrameGallery";
import { AutoRotationDisplay } from "@/components/AutoRotationDisplay";
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
import { supabase } from "@/lib/supabaseClient";
import { prefetchMediaReferences } from "@/lib/persistentMedia";
import { prefetchAudioTrack, useAudioStore } from "@/hooks/useAudioStore";

const SECTION_TITLES: Record<string, string> = {
  fwc: "Distinguished Fellows of the War College (FWC)",
  fdc: "Distinguished Fellows of the Defence College (FDC)",
  directing: "Chronicles of Directing Staff (Directing Staff)",
  allied: "International Allied Officers (Allied)",
};

const SECTION_CATEGORIES: Record<string, Category> = {
  fwc: "FWC",
  fdc: "FDC",
  directing: "Directing Staff",
  allied: "Allied",
};

const SUPER_ADMIN_EMAILS = (
  import.meta.env.VITE_SUPER_ADMIN_EMAILS ||
  import.meta.env.VITE_QUICK_ADMIN_EMAIL ||
  ""
)
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

type GlobalSiteAction = "close-site" | "open-site";

const Index = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [idleStageActive, setIdleStageActive] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
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
  const commandantSlideDir = useRef<'left' | 'right' | null>(null);
  const globalCommandRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousViewBeforeCommandantProfileRef = useRef<ViewKey | null>(null);

  const [view, setView] = useState<ViewKey>("home");
  const [showStageConfig, setShowStageConfig] = useState(false);

  const { themeMode, setThemeMode, resetThemeMode } = useThemeMode();
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
    if (activeCategory === "FWC") return "FWC";
    if (activeCategory === "FDC") return "FDC";
    if (activeCategory === "Directing Staff") return "Directing Staff";
    if (activeCategory === "Allied") return "Allied";
    return null;
  }, [view, activeCategory]);

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
    if (context === "Directing Staff") return "directing";
    return "allied";
  };

  const handleAutoDisplayStageComplete = (context: AutoDisplayContextKey) => {
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

  useEffect(() => {
    setShowStageConfig(false);
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

  const navigateCommandantProfile = (direction: "prev" | "next") => {
    if (!selectedPastCommandant) return;
    const idx = commandants.findIndex((c) => c.id === selectedPastCommandant.id);
    if (idx === -1) return;
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= commandants.length) return;
    commandantSlideDir.current = direction === "next" ? "left" : "right";
    setSelectedPastCommandant(commandants[nextIdx]);
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
    if (value === "fwc") return "fwc";
    if (value === "fdc") return "fdc";
    if (value === "directing") return "directing";
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
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setAdminAuthenticated(Boolean(data.session));
      setAdminEmail(data.session?.user?.email ?? null);
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

  const renderContent = () => {
    if (view === "home") {
      const showCommandantShell = isCommandantsLoading || commandants.length > 0;

      return (
        <div className="space-y-8 md:space-y-10">
          {showCommandantShell && (
            <section className="relative space-y-0 rounded-2xl md:rounded-3xl bg-white/95 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
              {/* Top defense strip */}
              <div className="h-[7px] flex">
                <div className="flex-1 bg-[#002060]" />
                <div className="flex-1 bg-[#FF0000]" />
                <div className="flex-1 bg-[#00B0F0]" />
              </div>

              <div className="px-4 sm:px-5 md:px-6 py-5 sm:py-6 md:py-7 space-y-5">

              {isCommandantsLoading && (
                <section className="rounded-xl border border-primary/20 bg-card/70 px-4 py-6 md:px-6 md:py-8 animate-pulse">
                  <div className="mx-auto w-full max-w-5xl space-y-4">
                    <div className="h-4 w-40 rounded bg-primary/20" />
                    <div className="h-10 w-4/5 rounded bg-primary/20" />
                    <div className="h-6 w-3/5 rounded bg-primary/15" />
                    <div className="h-24 w-full rounded bg-primary/10" />
                  </div>
                </section>
              )}

              {!isCommandantsLoading && currentCommandant && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openPastCommandantProfile(currentCommandant)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPastCommandantProfile(currentCommandant);
                    }
                  }}
                  className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-2xl group transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,32,96,0.08)]"
                  aria-label={`Open full biography for ${currentCommandant.name}`}
                >
                  <CommandantHero
                    commandant={currentCommandant}
                    compactDescription
                  />
                  <div className="flex items-center justify-end px-4 pb-2 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary/70 group-hover:text-primary transition-colors duration-300">
                      Read full biography
                      <svg className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              )}

              {!isCommandantsLoading && commandants.length > 0 && (
                <div className="rounded-xl md:rounded-2xl border border-[#d8e1ee]/80 bg-[#f8fafc] p-3 sm:p-4 md:p-5">
                  <PastCommandants
                    commandants={commandants}
                    includeCurrent
                    onSelectCommandant={(commandant) =>
                      openPastCommandantProfile(commandant)
                    }
                  />
                </div>
              )}
              </div>

              {/* Bottom defense strip */}
              <div className="h-[5px] flex">
                <div className="flex-1 bg-[#002060]" />
                <div className="flex-1 bg-[#FF0000]" />
                <div className="flex-1 bg-[#00B0F0]" />
              </div>
            </section>
          )}

          <CategoryCards onSelect={setView} />

          {/* Artifact Frame Gallery entry */}
          <button
            type="button"
            onClick={() => setView("artifact-gallery")}
            className="group mb-8 w-full rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 p-5 text-left transition-all hover:border-primary/25 hover:shadow-lg sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Curated Exhibit</p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-foreground sm:text-xl">Artifact Collection Frame</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  View the curated display of all artefacts arranged in the museum glass case.
                </p>
              </div>
              <div className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/10 p-3 transition-colors group-hover:bg-primary/15">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </div>
            </div>
          </button>

          <MuseumExperienceSection onSelect={setView} />
        </div>
      );
    }

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

      return (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setView("home")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary/25 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all duration-200 hover:border-primary/40"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Previous
            </button>
          </div>

          {currentCommandant && (
            <CommandantHero
              commandant={currentCommandant}
              compactDescription={false}
            />
          )}

          <PastCommandants
            commandants={commandants}
            includeCurrent
            onSelectCommandant={(commandant) =>
              openPastCommandantProfile(commandant)
            }
          />
        </section>
      );
    }

    if (view === "visits") {
      return <VisitsSection visits={visits} onBack={() => setView("home")} />;
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
        return <AdminLogin onSuccess={() => setAdminAuthenticated(true)} />;
      }

      return (
        <AdminPanel
          personnel={personnel}
          visits={visits}
          commandants={commandants}
          onAddPersonnel={addPersonnel}
          onUpdatePersonnel={updatePersonnel}
          onDeletePersonnel={deletePersonnel}
          onAddVisit={addVisit}
          onUpdateVisit={updateVisit}
          onDeleteVisit={deleteVisit}
          onAddCommandant={addCommandant}
          onUpdateCommandant={updateCommandant}
          onDeleteCommandant={deleteCommandant}
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
            const {
              data: { session },
            } = await supabase.auth.getSession();
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
            const {
              data: { session },
            } = await supabase.auth.getSession();
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
        />
      );
    }

    return null;
  };

  return (
    <>
      <AudioManager />
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
        className={`command-center-bg min-h-screen flex flex-col transition-opacity duration-1000 ${isBooting ? "opacity-0" : "opacity-100"}`}
      >
        {!autoDisplayActive && view !== "admin" && <AppHeader onHomeClick={() => setView("home")} />}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${autoDisplayActive ? "p-0" : ""}`}>
          <div className={`${autoDisplayActive || view === "admin" || view === "artifact-gallery" ? "w-screen h-screen max-w-none p-0" : "max-w-[1840px] px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8"} mx-auto relative z-10`}>
            <div className={`${autoDisplayActive || view === "admin" || view === "artifact-gallery" ? "bg-transparent border-none p-0 rounded-none shadow-none" : "app-shell-frame rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8"}`}>
              <div className={`${autoDisplayActive ? "fixed top-4 right-4 z-[100]" : "flex justify-end mb-3 sm:mb-4"}`}>
                <div className="relative flex items-center gap-2">
                  {canConfigureStage && !autoDisplayActive && currentStageTiming && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowStageConfig((prev) => !prev)}
                        aria-label="Configure auto-scroll stage"
                        title="Configure auto-scroll stage"
                        className="h-9 w-9 rounded-md border border-primary/25 bg-card/80 text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>

                      {showStageConfig && (
                        <div className="absolute right-0 top-11 z-[120] w-[280px] rounded-xl border border-primary/20 bg-card/95 p-3 shadow-xl backdrop-blur-sm">
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
                    </>
                  )}

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
                  onActiveChange={setAutoDisplayActive}
                  onStageComplete={handleAutoDisplayStageComplete}
                />
                </div>
              </div>

              {!autoDisplayActive && renderContent()}
            </div>
          </div>
        </main>
      </div>

      {selectedPastCommandant && (
        <div className="fixed inset-0 z-[70] bg-gradient-to-br from-[#000a1a] via-[#001030] to-[#000a1a] p-0 overflow-y-auto modal-backdrop-enter">
          {/* Subtle diagonal texture */}
          <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_40px,rgba(255,255,255,0.08)_40px,rgba(255,255,255,0.08)_41px)]" />
          </div>
          <div className="max-w-5xl mx-auto modal-enter relative z-10 px-4 md:px-8 py-6 md:py-10">
            <div className="flex justify-end mb-4">
              <button
                onClick={closePastCommandantProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-200 border border-white/10"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                Close
              </button>
            </div>

            {/* Profile container with prev/next navigation */}
            <div className="relative">
              {/* Prev / Next arrows */}
              {(() => {
                const idx = commandants.findIndex((c) => c.id === selectedPastCommandant.id);
                const hasPrev = idx > 0;
                const hasNext = idx >= 0 && idx < commandants.length - 1;
                return (
                  <>
                    {hasPrev && (
                      <button
                        onClick={() => navigateCommandantProfile("prev")}
                        aria-label="Previous commandant"
                        className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-[#FFD700]/20 hover:border-[#FFD700]/40 backdrop-blur-sm transition-all duration-300 group/nav"
                      >
                        <ChevronLeft className="h-5 w-5 text-[#FFD700]/60 group-hover/nav:text-[#FFD700] transition-colors" />
                      </button>
                    )}
                    {hasNext && (
                      <button
                        onClick={() => navigateCommandantProfile("next")}
                        aria-label="Next commandant"
                        className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-[#FFD700]/20 hover:border-[#FFD700]/40 backdrop-blur-sm transition-all duration-300 group/nav"
                      >
                        <ChevronRight className="h-5 w-5 text-[#FFD700]/60 group-hover/nav:text-[#FFD700] transition-colors" />
                      </button>
                    )}
                  </>
                );
              })()}

              <div
                key={selectedPastCommandant.id}
                className={commandantSlideDir.current === 'left' ? 'profile-slide-left' : commandantSlideDir.current === 'right' ? 'profile-slide-right' : ''}
              >
                <CommandantHero
                  commandant={selectedPastCommandant}
                  compactDescription={false}
                />
              </div>

              {/* Dot indicators */}
              {(() => {
                const idx = commandants.findIndex((c) => c.id === selectedPastCommandant.id);
                if (idx === -1 || commandants.length <= 1) return null;
                return (
                  <div className="flex justify-center mt-6 gap-1.5">
                    {commandants.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          commandantSlideDir.current = i > idx ? 'left' : 'right';
                          setSelectedPastCommandant(c);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === idx
                            ? 'w-8 bg-[#FFD700]/80'
                            : 'w-1.5 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`View ${c.name}`}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Index;
