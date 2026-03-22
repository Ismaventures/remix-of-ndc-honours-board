import { useMemo, useState } from 'react';
import { DeviceClient, DeviceControlView } from '@/hooks/useDeviceControl';

interface DeviceControlPanelProps {
  devices: DeviceClient[];
  currentDeviceId: string;
  onRefresh: () => void;
  onSendView: (deviceIds: string[], view: DeviceControlView) => Promise<boolean>;
  onSendAutoDisplay: (deviceIds: string[], enabled: boolean) => Promise<boolean>;
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

export function DeviceControlPanel({ devices, currentDeviceId, onRefresh, onSendView, onSendAutoDisplay }: DeviceControlPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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
