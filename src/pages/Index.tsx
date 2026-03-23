import { useState, useEffect, useMemo, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CommandantHero } from "@/components/CommandantHero";
import { PastCommandants } from "@/components/PastCommandants";
import { CategoryCards, ViewKey } from "@/components/CategoryCards";
import { OrganogramView } from "@/components/OrganogramView";
import { VisitsSection } from "@/components/VisitsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminLogin } from "@/components/AdminLogin";
import { AutoRotationDisplay } from "@/components/AutoRotationDisplay";
import { BootSequence } from "@/components/BootSequence";
import { AudioManager } from "@/components/AudioManager";
import {
  usePersonnelStore,
  useVisitsStore,
  useCommandantsStore,
} from "@/hooks/useStore";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useBootSequenceSettings } from "@/hooks/useBootSequenceSettings";
import { useAutoDisplaySettings } from "@/hooks/useAutoDisplaySettings";
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

const SECTION_TITLES: Record<string, string> = {
  fwc: "Distinguished Fellows of the War College (FWC)",
  fdc: "Distinguished Fellows of the Defence College (FDC)",
  directing: "Chronicle of Directing Staff",
  allied: "Allied Officers",
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
  const [siteClosed, setSiteClosed] = useState(false);
  const [siteClosedReason, setSiteClosedReason] = useState(
    "Temporarily closed by super admin.",
  );
  const [deviceClosed, setDeviceClosed] = useState(false);
  const [selectedPastCommandant, setSelectedPastCommandant] =
    useState<Commandant | null>(null);
  const globalCommandRef = useRef<number | null>(null);

  const [view, setView] = useState<ViewKey>("home");
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
    importSettings: importAutoDisplaySettings,
    resetSettings: resetAutoDisplaySettings,
  } = useAutoDisplaySettings();
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } =
    usePersonnelStore();
  const { visits, addVisit, updateVisit, deleteVisit } = useVisitsStore();
  const { commandants, addCommandant, updateCommandant, deleteCommandant } =
    useCommandantsStore();

  const currentCommandant = commandants.find((c) => c.isCurrent);
  const activeCategory = SECTION_CATEGORIES[view] ?? null;
  const activeView =
    view === "visits"
      ? "visits"
      : view === "home"
        ? "home"
        : view === "admin"
          ? "admin"
          : "category";
  const isSuperAdmin = useMemo(() => {
    if (!adminEmail) return false;
    return SUPER_ADMIN_EMAILS.includes(adminEmail.toLowerCase());
  }, [adminEmail]);
  const showLockScreen = deviceClosed || (siteClosed && !isSuperAdmin);

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
      const themeMode =
        typeof payload.themeMode === "string" ? payload.themeMode : null;
      const bootSequenceSettings = payload.bootSequenceSettings;
      const autoDisplaySettingsPayload = payload.autoDisplaySettings;

      saveDeviceOverrides({
        themeMode: themeMode ?? undefined,
        bootSequenceSettings:
          bootSequenceSettings && typeof bootSequenceSettings === "object"
            ? (bootSequenceSettings as Record<string, unknown>)
            : undefined,
        autoDisplaySettings:
          autoDisplaySettingsPayload &&
          typeof autoDisplaySettingsPayload === "object"
            ? (autoDisplaySettingsPayload as Record<string, unknown>)
            : undefined,
      });

      if (themeMode) {
        setThemeMode(themeMode as Parameters<typeof setThemeMode>[0]);
      }
      if (bootSequenceSettings && typeof bootSequenceSettings === "object") {
        setBootSequenceSettings(
          bootSequenceSettings as Parameters<typeof setBootSequenceSettings>[0],
        );
      }
      if (
        autoDisplaySettingsPayload &&
        typeof autoDisplaySettingsPayload === "object"
      ) {
        importAutoDisplaySettings(
          autoDisplaySettingsPayload as Parameters<
            typeof importAutoDisplaySettings
          >[0],
        );
      }
      return;
    }

    if (commandType === "clear-device-profile") {
      clearDeviceOverrides();
      window.location.reload();
      return;
    }

    if (commandType === "close-app") {
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
      setForcedProfileSelection((prev) => ({
        id: null,
        nonce: prev.nonce + 1,
      }));
      return;
    }

    if (commandType === "close-app") {
      const reason =
        typeof payload.reason === "string" && payload.reason.trim().length > 0
          ? payload.reason
          : "This screen was remotely closed by super admin.";
      setSiteClosedReason(reason);
      setDeviceClosed(true);
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

  const { devices, deviceId, refreshDevices, sendCommandToDevices } =
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
      return (
        <>
          <CommandantHero commandant={currentCommandant} />
          <PastCommandants
            commandants={commandants}
            onSelectCommandant={(commandant) =>
              setSelectedPastCommandant(commandant)
            }
          />
          <CategoryCards onSelect={setView} />
        </>
      );
    }

    if (view === "visits") {
      return (
        <>
          <VisitsSection visits={visits} onBack={() => setView("home")} />
        </>
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
          onImportAutoDisplaySettings={importAutoDisplaySettings}
          onResetAutoDisplaySettings={resetAutoDisplaySettings}
          devices={devices}
          currentDeviceId={deviceId}
          isSuperAdmin={isSuperAdmin}
          onRefreshDevices={() => {
            void refreshDevices();
          }}
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
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-destructive/40 bg-card/95 p-6 md:p-8 text-center space-y-3">
            <h2 className="text-xl md:text-2xl font-bold font-serif text-destructive">
              Site Temporarily Closed
            </h2>
            <p className="text-sm text-muted-foreground">{siteClosedReason}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Please contact an administrator for access restoration.
            </p>
          </div>
        </div>
      )}
      <div
        className={`command-center-bg min-h-screen flex flex-col transition-opacity duration-1000 ${isBooting ? "opacity-0" : "opacity-100"}`}
      >
        <AppHeader onHomeClick={() => setView("home")} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1840px]">
            <div className="app-shell-frame p-3 sm:p-4 md:p-6 lg:p-8">
              {/* Auto-rotation button */}
              <div className="flex justify-end mb-3 sm:mb-4">
                <AutoRotationDisplay
                  personnel={personnel}
                  visits={visits}
                  commandants={commandants}
                  activeCategory={activeCategory}
                  activeView={activeView}
                  settings={autoDisplaySettings}
                  forcedControl={forcedAutoDisplay}
                  onActiveChange={setAutoDisplayActive}
                />
              </div>

              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {selectedPastCommandant && (
        <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSelectedPastCommandant(null)}
                className="px-3 py-1.5 rounded text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
            <CommandantHero
              commandant={selectedPastCommandant}
              compactDescription={false}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Index;
