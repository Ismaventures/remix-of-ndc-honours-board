import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, UserRound } from 'lucide-react';
import { DeviceClient, DeviceControlView } from '@/hooks/useDeviceControl';
import { ThemeMode } from '@/hooks/useThemeMode';
import { BootSequenceSettings } from '@/hooks/useBootSequenceSettings';
import { AutoDisplaySettings } from '@/hooks/useAutoDisplaySettings';
import { Commandant, Personnel } from '@/types/domain';

interface DeviceControlPanelProps {
  devices: DeviceClient[];
  personnel: Personnel[];
  commandants: Commandant[];
  currentDeviceId: string;
  currentDeviceLabel: string;
  isSuperAdmin: boolean;
  currentThemeMode: ThemeMode;
  currentBootSettings: BootSequenceSettings;
  currentAutoDisplaySettings: AutoDisplaySettings;
  onRefresh: () => void;
  onRenameCurrentDevice: (nextLabel: string) => Promise<boolean>;
  onSendView: (deviceIds: string[], view: DeviceControlView) => Promise<boolean>;
  onSendAutoDisplay: (deviceIds: string[], enabled: boolean) => Promise<boolean>;
  onSendCloseApp: (deviceIds: string[], reason: string) => Promise<boolean>;
  onSendReopenApp: (deviceIds: string[]) => Promise<boolean>;
  onSendOpenPersonProfile: (deviceIds: string[], payload: { view: Exclude<DeviceControlView, 'home' | 'visits' | 'admin'>; personId: string }) => Promise<boolean>;
  onSendOpenCommandantProfile: (deviceIds: string[], payload: { commandantId: string }) => Promise<boolean>;
  onSendSlideStep: (deviceIds: string[], direction: 'next' | 'prev') => Promise<boolean>;
  onSendCloseProfile: (deviceIds: string[]) => Promise<boolean>;
  onSendApplyProfile: (deviceIds: string[], payload: {
    themeMode: ThemeMode;
    bootSequenceSettings: BootSequenceSettings;
    autoDisplaySettings: AutoDisplaySettings;
  }) => Promise<boolean>;
  onSendClearProfile: (deviceIds: string[]) => Promise<boolean>;
  onSendGlobalClose: (reason: string) => Promise<boolean>;
  onSendGlobalOpen: () => Promise<boolean>;
}

const VIEW_OPTIONS: Array<{ id: DeviceControlView; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'fwc', label: 'FWC' },
  { id: 'fdc', label: 'FDC' },
  { id: 'directing', label: 'Directing Staff' },
  { id: 'allied', label: 'Allied' },
  { id: 'visits', label: 'Visits' },
  { id: 'admin', label: 'Admin' },
];

export function DeviceControlPanel({
  devices,
  personnel,
  commandants,
  currentDeviceId,
  currentDeviceLabel,
  isSuperAdmin,
  currentThemeMode,
  currentBootSettings,
  currentAutoDisplaySettings,
  onRefresh,
  onRenameCurrentDevice,
  onSendView,
  onSendAutoDisplay,
  onSendCloseApp,
  onSendReopenApp,
  onSendOpenPersonProfile,
  onSendOpenCommandantProfile,
  onSendSlideStep,
  onSendCloseProfile,
  onSendApplyProfile,
  onSendClearProfile,
  onSendGlobalClose,
  onSendGlobalOpen,
}: DeviceControlPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showOfflineDevices, setShowOfflineDevices] = useState(false);
  const [shutdownReason, setShutdownReason] = useState('Temporarily closed by super admin.');
  const [remoteView, setRemoteView] = useState<Exclude<DeviceControlView, 'home' | 'visits' | 'admin'>>('fwc');
  const [remotePersonId, setRemotePersonId] = useState('');
  const [remoteCommandantId, setRemoteCommandantId] = useState('');
  const [renameDraft, setRenameDraft] = useState(currentDeviceLabel);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameStatus, setRenameStatus] = useState<string | null>(null);

  useEffect(() => {
    setRenameDraft(currentDeviceLabel);
  }, [currentDeviceLabel]);

  const selectedCount = selectedIds.length;

  const normalizedDevices = useMemo(() => {
    const now = Date.now();
    const byId = new Map<string, DeviceClient & { online: boolean }>();

    for (const device of devices) {
      const lastSeen = new Date(device.last_seen).getTime();
      const online = Number.isFinite(lastSeen) && now - lastSeen < 45000;
      const existing = byId.get(device.device_id);

      if (!existing) {
        byId.set(device.device_id, { ...device, online });
        continue;
      }

      const existingTime = new Date(existing.last_seen).getTime();
      if (!Number.isFinite(existingTime) || lastSeen > existingTime) {
        byId.set(device.device_id, { ...device, online });
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
    );
  }, [devices]);

  const onlineDevices = useMemo(
    () => normalizedDevices.filter(device => device.online),
    [normalizedDevices],
  );

  const offlineDevices = useMemo(
    () => normalizedDevices.filter(device => !device.online),
    [normalizedDevices],
  );

  const visibleDevices = showOfflineDevices ? [...onlineDevices, ...offlineDevices] : onlineDevices;

  const remoteProfiles = useMemo(() => {
    const categoryMap: Record<Exclude<DeviceControlView, 'home' | 'visits' | 'admin'>, string> = {
      fwc: 'FWC',
      fdc: 'FDC',
      directing: 'Directing Staff',
      allied: 'Allied',
    };
    const category = categoryMap[remoteView];
    return personnel
      .filter(person => person.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [personnel, remoteView]);

  const commandantProfiles = useMemo(
    () =>
      commandants
        .slice()
        .sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1;
          if (!a.isCurrent && b.isCurrent) return 1;
          return (b.tenureStart ?? 0) - (a.tenureStart ?? 0);
        }),
    [commandants],
  );

  const toggleDevice = (deviceId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedIds(prev => (prev.includes(deviceId) ? prev : [...prev, deviceId]));
      return;
    }
    setSelectedIds(prev => prev.filter(id => id !== deviceId));
  };

  const selectAll = () => {
    setSelectedIds(onlineDevices.map(device => device.device_id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const formatLastSeen = (iso: string) => {
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return 'Unknown';
    return value.toLocaleString();
  };

  const sendView = async (view: DeviceControlView) => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendView(selectedIds, view);
    setBusy(false);
  };

  const sendAutoDisplay = async (enabled: boolean) => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendAutoDisplay(selectedIds, enabled);
    setBusy(false);
  };

  const applyCurrentProfile = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendApplyProfile(selectedIds, {
      themeMode: currentThemeMode,
      bootSequenceSettings: currentBootSettings,
      autoDisplaySettings: currentAutoDisplaySettings,
    });
    setBusy(false);
  };

  const clearProfile = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendClearProfile(selectedIds);
    setBusy(false);
  };

  const openRemoteProfile = async () => {
    if (selectedIds.length === 0 || !remotePersonId) return;
    setBusy(true);
    await onSendOpenPersonProfile(selectedIds, { view: remoteView, personId: remotePersonId });
    setBusy(false);
  };

  const openRemoteCommandantProfile = async () => {
    if (selectedIds.length === 0 || !remoteCommandantId) return;
    setBusy(true);
    await onSendOpenCommandantProfile(selectedIds, { commandantId: remoteCommandantId });
    setBusy(false);
  };

  const sendSlideStep = async (direction: 'next' | 'prev') => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendSlideStep(selectedIds, direction);
    setBusy(false);
  };

  const closeRemoteProfile = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendCloseProfile(selectedIds);
    setBusy(false);
  };

  const closeSelectedApps = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendCloseApp(selectedIds, shutdownReason.trim() || 'Temporarily closed by super admin.');
    setBusy(false);
  };

  const reopenSelectedApps = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    await onSendReopenApp(selectedIds);
    setBusy(false);
  };

  const closeEntireSite = async () => {
    if (!isSuperAdmin) return;
    setBusy(true);
    await onSendGlobalClose(shutdownReason.trim() || 'Temporarily closed by super admin.');
    setBusy(false);
  };

  const reopenEntireSite = async () => {
    if (!isSuperAdmin) return;
    setBusy(true);
    await onSendGlobalOpen();
    setBusy(false);
  };

  const renameThisDevice = async () => {
    setRenameBusy(true);
    const ok = await onRenameCurrentDevice(renameDraft);
    setRenameBusy(false);
    setRenameStatus(ok ? 'Device name saved.' : 'Could not save device name.');
    window.setTimeout(() => setRenameStatus(null), 2200);
  };

  return (
    <div className="surface-panel p-5 md:p-6 space-y-4">
      <div>
        <h4 className="text-base font-semibold gold-text">Multi-Device Control</h4>
        <p className="text-xs text-muted-foreground mt-1">See every logged-in device and control multiple screens from this admin panel.</p>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Name This Device</p>
        <p className="text-[11px] text-muted-foreground">Set a clear name here. Other admins will see this exact label in the device list.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={renameDraft}
            onChange={e => setRenameDraft(e.target.value)}
            placeholder="e.g. Reception TV, Hall A Screen"
            className="w-full px-3 py-2 rounded border border-primary/20 bg-background/80 text-xs text-foreground"
          />
          <button
            type="button"
            onClick={() => void renameThisDevice()}
            disabled={renameBusy}
            className="px-3 py-2 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Save Name
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">Current device ID: {currentDeviceId.slice(0, 8)}...</p>
        {renameStatus && <p className="text-xs text-primary">{renameStatus}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={onRefresh} className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10">
          Refresh Devices
        </button>
        <button onClick={selectAll} className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10">
          Select All
        </button>
        <button onClick={clearSelection} className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10">
          Clear
        </button>
        <span className="px-3 py-1.5 rounded border border-primary/15 text-[11px] uppercase tracking-wider text-muted-foreground">Selected: {selectedCount}</span>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Device Visibility</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowOfflineDevices(false)}
            className={`px-3 py-1.5 rounded border text-[11px] uppercase tracking-wider transition-colors ${
              !showOfflineDevices
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-primary/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Online Only ({onlineDevices.length})
          </button>
          <button
            type="button"
            onClick={() => setShowOfflineDevices(true)}
            className={`px-3 py-1.5 rounded border text-[11px] uppercase tracking-wider transition-colors ${
              showOfflineDevices
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-primary/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Show Offline ({offlineDevices.length})
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Send View Command To Selected Devices</p>
        <div className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => void sendView(option.id)}
              disabled={busy || selectedCount === 0}
              className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Auto Display Control</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void sendAutoDisplay(true)}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Start Auto Display
          </button>
          <button
            onClick={() => void sendAutoDisplay(false)}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Stop Auto Display
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-background via-card/70 to-background p-4 md:p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Mobile Remote Control App</p>
          <p className="text-[11px] text-muted-foreground mt-1">Use this panel on your phone over Wi-Fi to remotely swipe slides, control auto mode, and open full profile views.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void sendSlideStep('prev')}
            disabled={busy || selectedCount === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/35 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Swipe Left
          </button>
          <button
            onClick={() => void sendSlideStep('next')}
            disabled={busy || selectedCount === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/35 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Swipe Right
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => void sendAutoDisplay(true)}
            disabled={busy || selectedCount === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/35 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Start Auto
          </button>
          <button
            onClick={() => void sendAutoDisplay(false)}
            disabled={busy || selectedCount === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/35 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Pause className="h-4 w-4" />
            Stop Auto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={remoteCommandantId}
            onChange={e => setRemoteCommandantId(e.target.value)}
            className="px-3 py-2 rounded border border-primary/20 bg-background/80 text-xs text-foreground"
          >
            <option value="">Select commandant profile</option>
            {commandantProfiles.map(commandant => (
              <option key={commandant.id} value={commandant.id}>
                {commandant.name} ({commandant.tenureStart}-{commandant.tenureEnd ?? 'Present'})
              </option>
            ))}
          </select>
          <button
            onClick={() => void openRemoteCommandantProfile()}
            disabled={busy || selectedCount === 0 || !remoteCommandantId}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <UserRound className="h-4 w-4" />
            Open Commandant Full View
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Per-Device Profile</p>
        <p className="text-[11px] text-muted-foreground">Apply this admin device's current Theme, Boot, and Auto Display settings to selected targets as local overrides.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void applyCurrentProfile()}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Apply Current Settings As Profile
          </button>
          <button
            onClick={() => void clearProfile()}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Clear Device Profile
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Remote Profile Navigation</p>
        <p className="text-[11px] text-muted-foreground">Navigate selected screens into a category and open a specific personnel profile remotely.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={remoteView}
            onChange={e => {
              const nextView = e.target.value as Exclude<DeviceControlView, 'home' | 'visits' | 'admin'>;
              setRemoteView(nextView);
              setRemotePersonId('');
            }}
            className="px-3 py-2 rounded border border-primary/20 bg-background/80 text-xs text-foreground"
          >
            <option value="fwc">FWC</option>
            <option value="fdc">FDC</option>
            <option value="directing">Directing Staff</option>
            <option value="allied">Allied</option>
          </select>
          <select
            value={remotePersonId}
            onChange={e => setRemotePersonId(e.target.value)}
            className="px-3 py-2 rounded border border-primary/20 bg-background/80 text-xs text-foreground"
          >
            <option value="">Select personnel profile</option>
            {remoteProfiles.map(person => (
              <option key={person.id} value={person.id}>{person.rank} {person.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void openRemoteProfile()}
            disabled={busy || selectedCount === 0 || !remotePersonId}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Open Selected Profile
          </button>
          <button
            onClick={() => void closeRemoteProfile()}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Close Open Profile
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Remote App Power</p>
        <input
          value={shutdownReason}
          onChange={e => setShutdownReason(e.target.value)}
          placeholder="Reason shown on closed screens"
          className="w-full px-3 py-2 rounded border border-primary/20 bg-background/80 text-xs text-foreground"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void closeSelectedApps()}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-destructive/35 text-[11px] uppercase tracking-wider text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Close Selected App Screens
          </button>
          <button
            onClick={() => void reopenSelectedApps()}
            disabled={busy || selectedCount === 0}
            className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Reopen Selected App Screens
          </button>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-destructive">Super Admin Global Control</p>
          <p className="text-[11px] text-muted-foreground">These commands affect all visitors, including non-logged users currently on the site.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void closeEntireSite()}
              disabled={busy}
              className="px-3 py-1.5 rounded border border-destructive/40 text-[11px] uppercase tracking-wider text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Close Entire Site
            </button>
            <button
              onClick={() => void reopenEntireSite()}
              disabled={busy}
              className="px-3 py-1.5 rounded border border-primary/25 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              Reopen Entire Site
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-primary/15 bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-primary text-xs uppercase tracking-wider border-b border-primary/10">
                <th className="px-3 py-3 text-left">Pick</th>
                <th className="px-3 py-3 text-left">Device</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Current View</th>
                <th className="px-3 py-3 text-left">Auto Display</th>
                {showOfflineDevices && <th className="px-3 py-3 text-left">Last Seen</th>}
              </tr>
            </thead>
            <tbody>
              {visibleDevices.map(device => (
                <tr key={device.device_id} className="border-b border-primary/5">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(device.device_id)}
                      onChange={e => toggleDevice(device.device_id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    <div className="flex flex-col">
                      <span>{device.device_label}</span>
                      <span className="text-[10px] text-muted-foreground">{device.device_id === currentDeviceId ? 'This device' : device.device_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${device.online ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35' : 'bg-muted text-muted-foreground border border-muted-foreground/20'}`}>
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground uppercase text-xs">{device.current_view}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{device.auto_display_enabled ? 'Running' : 'Stopped'}</td>
                  {showOfflineDevices && (
                    <td className="px-3 py-2 text-muted-foreground text-xs">{device.online ? '-' : formatLastSeen(device.last_seen)}</td>
                  )}
                </tr>
              ))}
              {visibleDevices.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground text-xs" colSpan={showOfflineDevices ? 6 : 5}>
                    {showOfflineDevices
                      ? 'No devices found yet. Open the app on another logged-in device to see it here.'
                      : 'No online devices right now. Click Show Offline to view disconnected devices.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
