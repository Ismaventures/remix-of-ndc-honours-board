import { useMemo, useState } from 'react';
import { DeviceClient, DeviceControlView } from '@/hooks/useDeviceControl';
import { ThemeMode } from '@/hooks/useThemeMode';
import { BootSequenceSettings } from '@/hooks/useBootSequenceSettings';
import { AutoDisplaySettings } from '@/hooks/useAutoDisplaySettings';

interface DeviceControlPanelProps {
  devices: DeviceClient[];
  currentDeviceId: string;
  isSuperAdmin: boolean;
  currentThemeMode: ThemeMode;
  currentBootSettings: BootSequenceSettings;
  currentAutoDisplaySettings: AutoDisplaySettings;
  onRefresh: () => void;
  onSendView: (deviceIds: string[], view: DeviceControlView) => Promise<boolean>;
  onSendAutoDisplay: (deviceIds: string[], enabled: boolean) => Promise<boolean>;
  onSendCloseApp: (deviceIds: string[], reason: string) => Promise<boolean>;
  onSendReopenApp: (deviceIds: string[]) => Promise<boolean>;
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
  currentDeviceId,
  isSuperAdmin,
  currentThemeMode,
  currentBootSettings,
  currentAutoDisplaySettings,
  onRefresh,
  onSendView,
  onSendAutoDisplay,
  onSendCloseApp,
  onSendReopenApp,
  onSendApplyProfile,
  onSendClearProfile,
  onSendGlobalClose,
  onSendGlobalOpen,
}: DeviceControlPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [shutdownReason, setShutdownReason] = useState('Temporarily closed by super admin.');

  const selectedCount = selectedIds.length;

  const onlineDevices = useMemo(() => {
    const now = Date.now();
    return devices.map(device => {
      const lastSeen = new Date(device.last_seen).getTime();
      const online = Number.isFinite(lastSeen) && now - lastSeen < 45000;
      return { ...device, online };
    });
  }, [devices]);

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

  return (
    <div className="surface-panel p-5 md:p-6 space-y-4">
      <div>
        <h4 className="text-base font-semibold gold-text">Multi-Device Control</h4>
        <p className="text-xs text-muted-foreground mt-1">See every logged-in device and control multiple screens from this admin panel.</p>
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
              </tr>
            </thead>
            <tbody>
              {onlineDevices.map(device => (
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
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${device.online ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground uppercase text-xs">{device.current_view}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{device.auto_display_enabled ? 'Running' : 'Stopped'}</td>
                </tr>
              ))}
              {onlineDevices.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground text-xs" colSpan={5}>No devices found yet. Open the app on another logged-in device to see it here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
