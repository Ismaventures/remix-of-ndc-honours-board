import { useEffect, useMemo, useState } from 'react';
import { loadUiSetting, saveUiSetting } from '@/lib/uiSettingsStorage';
import { hasDeviceOverrides, readBootOverride } from '@/lib/deviceOverrideSettings';

export interface BootSequenceSettings {
  totalDurationMs: number;
  archiveTransitionMs: number;
}

const STORAGE_KEY = 'ndc-boot-sequence-settings';
const SUPABASE_SETTING_KEY = 'boot_sequence_settings';

export const DEFAULT_BOOT_SEQUENCE_SETTINGS: BootSequenceSettings = {
  totalDurationMs: 11000,
  archiveTransitionMs: 600,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function sanitizeSettings(input: Partial<BootSequenceSettings> | null | undefined): BootSequenceSettings {
  const total = Number(input?.totalDurationMs);
  const archive = Number(input?.archiveTransitionMs);

  return {
    totalDurationMs: Number.isFinite(total) ? clamp(Math.round(total), 7000, 24000) : DEFAULT_BOOT_SEQUENCE_SETTINGS.totalDurationMs,
    archiveTransitionMs: Number.isFinite(archive) ? clamp(Math.round(archive), 250, 2000) : DEFAULT_BOOT_SEQUENCE_SETTINGS.archiveTransitionMs,
  };
}

function loadSettings(): BootSequenceSettings {
  try {
    const override = readBootOverride();
    if (override) {
      return sanitizeSettings(override);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BOOT_SEQUENCE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<BootSequenceSettings>;
    return sanitizeSettings(parsed);
  } catch {
    return DEFAULT_BOOT_SEQUENCE_SETTINGS;
  }
}

export function useBootSequenceSettings() {
  const [settings, setSettingsState] = useState<BootSequenceSettings>(loadSettings);

  useEffect(() => {
    let mounted = true;

    const syncFromSupabase = async () => {
      if (hasDeviceOverrides()) return;
      const remote = await loadUiSetting<Partial<BootSequenceSettings>>(SUPABASE_SETTING_KEY);
      if (!mounted || !remote) return;
      const merged = sanitizeSettings(remote);
      setSettingsState(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    };

    void syncFromSupabase();

    return () => {
      mounted = false;
    };
  }, []);

  const setSettings = (next: Partial<BootSequenceSettings>) => {
    setSettingsState(prev => {
      const merged = sanitizeSettings({ ...prev, ...next });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (!hasDeviceOverrides()) {
        void saveUiSetting(SUPABASE_SETTING_KEY, merged);
      }
      return merged;
    });
  };

  const resetSettings = () => {
    setSettingsState(DEFAULT_BOOT_SEQUENCE_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOOT_SEQUENCE_SETTINGS));
    if (!hasDeviceOverrides()) {
      void saveUiSetting(SUPABASE_SETTING_KEY, DEFAULT_BOOT_SEQUENCE_SETTINGS);
    }
  };

  const state = useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
    }),
    [settings]
  );

  return state;
}
