import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDefaultDeviceLabel, getOrCreateDeviceId } from '@/lib/deviceIdentity';

export type DeviceControlView = 'home' | 'fwc' | 'fdc' | 'directing' | 'allied' | 'visits' | 'admin';

export type DeviceControlCommandType =
  | 'set-view'
  | 'set-auto-display'
  | 'apply-device-profile'
  | 'clear-device-profile'
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

export function useDeviceControl({ currentView, autoDisplayEnabled, onCommand }: UseDeviceControlOptions) {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [devices, setDevices] = useState<DeviceClient[]>([]);

  const heartbeat = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const payload = {
      device_id: deviceId,
      user_id: session.user.id,
      device_label: getDefaultDeviceLabel(deviceId),
      current_view: currentView,
      auto_display_enabled: autoDisplayEnabled,
      last_seen: new Date().toISOString(),
    };

    await supabase.from('device_clients').upsert(payload, { onConflict: 'device_id' });
  }, [autoDisplayEnabled, currentView, deviceId]);

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

    setDevices((data ?? []) as DeviceClient[]);
  }, []);

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
      devices,
      refreshDevices,
      sendCommandToDevices,
    }),
    [deviceId, devices, refreshDevices, sendCommandToDevices]
  );
}
