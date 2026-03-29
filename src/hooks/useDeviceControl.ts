import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDefaultDeviceLabel, getOrCreateDeviceId } from '@/lib/deviceIdentity';

export type DeviceControlView = 'home' | 'fwc' | 'fdc' | 'directing' | 'allied' | 'visits' | 'admin';

export type DeviceControlCommandType =
  | 'set-view'
  | 'set-auto-display'
  | 'apply-device-profile'
  | 'clear-device-profile'
  | 'open-person-profile'
  | 'close-profile'
  | 'close-app'
  | 'reopen-app';

export interface DeviceClient {
  device_id: string;
  device_label: string;
  last_seen: string;
  current_view: string;
  auto_display_enabled: boolean;
}

interface DeviceControlCommand {
  id: number;
  command_type: DeviceControlCommandType;
  payload: Record<string, unknown>;
}

interface UseDeviceControlOptions {
  currentView: string;
  autoDisplayEnabled: boolean;
  onCommand: (commandType: DeviceControlCommandType, payload: Record<string, unknown>) => void;
}

const isSupabaseConfigured = () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const DEVICE_LABEL_STORAGE_KEY = 'ndc-device-label';

const loadDeviceLabelFromStorage = (deviceId: string): string => {
  try {
    const key = `${DEVICE_LABEL_STORAGE_KEY}:${deviceId}`;
    const stored = localStorage.getItem(key);
    if (stored && stored.trim().length > 0) return stored.trim();
  } catch {
    // Ignore storage access errors and fallback to default label.
  }
  return getDefaultDeviceLabel(deviceId);
};

const saveDeviceLabelToStorage = (deviceId: string, label: string) => {
  try {
    const key = `${DEVICE_LABEL_STORAGE_KEY}:${deviceId}`;
    localStorage.setItem(key, label);
  } catch {
    // Ignore storage access errors.
  }
};

export function useDeviceControl({ currentView, autoDisplayEnabled, onCommand }: UseDeviceControlOptions) {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const [devices, setDevices] = useState<DeviceClient[]>([]);

  useEffect(() => {
    const initialLabel = loadDeviceLabelFromStorage(deviceId);
    setDeviceLabel(initialLabel);
    saveDeviceLabelToStorage(deviceId, initialLabel);
  }, [deviceId]);

  const renameCurrentDevice = useCallback(async (nextLabel: string) => {
    const normalized = nextLabel.trim();
    const resolvedLabel = normalized.length > 0 ? normalized : getDefaultDeviceLabel(deviceId);

    setDeviceLabel(resolvedLabel);
    saveDeviceLabelToStorage(deviceId, resolvedLabel);

    if (!isSupabaseConfigured()) return false;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return false;

    const { error } = await supabase
      .from('device_clients')
      .upsert({
        device_id: deviceId,
        user_id: session.user.id,
        device_label: resolvedLabel,
        current_view: currentView,
        auto_display_enabled: autoDisplayEnabled,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'device_id' });

    return !error;
  }, [autoDisplayEnabled, currentView, deviceId]);

  const heartbeat = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const payload = {
      device_id: deviceId,
      user_id: session.user.id,
      device_label: deviceLabel.trim() || getDefaultDeviceLabel(deviceId),
      current_view: currentView,
      auto_display_enabled: autoDisplayEnabled,
      last_seen: new Date().toISOString(),
    };

    await supabase.from('device_clients').upsert(payload, { onConflict: 'device_id' });
  }, [autoDisplayEnabled, currentView, deviceId, deviceLabel]);

  const refreshDevices = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setDevices([]);
      return;
    }

    const { data } = await supabase
      .from('device_clients')
      .select('device_id,device_label,last_seen,current_view,auto_display_enabled')
      .eq('user_id', session.user.id)
      .order('last_seen', { ascending: false });

    const resolved = (data ?? []) as DeviceClient[];
    setDevices(resolved);

    const ownDevice = resolved.find((entry) => entry.device_id === deviceId);
    if (ownDevice?.device_label && ownDevice.device_label.trim().length > 0 && ownDevice.device_label !== deviceLabel) {
      setDeviceLabel(ownDevice.device_label);
      saveDeviceLabelToStorage(deviceId, ownDevice.device_label);
    }
  }, [deviceId, deviceLabel]);

  const sendCommandToDevices = useCallback(
    async (targetDeviceIds: string[], commandType: DeviceControlCommandType, payload: Record<string, unknown>) => {
      if (!isSupabaseConfigured() || targetDeviceIds.length === 0) return false;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return false;

      const rows = targetDeviceIds.map(targetId => ({
        user_id: session.user.id,
        target_device_id: targetId,
        command_type: commandType,
        payload,
      }));

      const { error } = await supabase.from('device_control_commands').insert(rows);
      if (error) {
        console.error('Failed to send device command:', error.message);
        return false;
      }

      return true;
    },
    []
  );

  useEffect(() => {
    void heartbeat();

    const interval = setInterval(() => {
      void heartbeat();
    }, 12000);

    return () => clearInterval(interval);
  }, [heartbeat]);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!isSupabaseConfigured()) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from('device_control_commands')
        .select('id,command_type,payload')
        .eq('user_id', session.user.id)
        .eq('target_device_id', deviceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (!isMounted || !data || data.length === 0) return;

      const commands = data as DeviceControlCommand[];

      for (const command of commands) {
        onCommand(command.command_type, command.payload ?? {});
        await supabase
          .from('device_control_commands')
          .update({ status: 'done', executed_at: new Date().toISOString() })
          .eq('id', command.id);
      }
    };

    void poll();

    const interval = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [deviceId, onCommand]);

  useEffect(() => {
    void refreshDevices();
    const interval = setInterval(() => {
      void refreshDevices();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshDevices]);

  return useMemo(
    () => ({
      deviceId,
      deviceLabel,
      devices,
      refreshDevices,
      renameCurrentDevice,
      sendCommandToDevices,
    }),
    [deviceId, deviceLabel, devices, refreshDevices, renameCurrentDevice, sendCommandToDevices]
  );
}
