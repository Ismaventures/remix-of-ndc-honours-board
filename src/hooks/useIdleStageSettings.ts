import { useEffect, useMemo, useState } from 'react';
import { loadUiSetting, saveUiSetting } from '@/lib/uiSettingsStorage';
import { hasDeviceOverrides, readIdleStageOverride } from '@/lib/deviceOverrideSettings';

export type IdleStageDesignType =
  | 'orbital-command'
  | 'flag-parade'
  | 'radar-grid'
  | 'preboot-sequence'
  | 'holographic-display'
  | 'commandant-honour-wall';

export interface IdleStageSettings {
  enabled: boolean;
  activationDelayMs: number;
  design: IdleStageDesignType;
}

const STORAGE_KEY = 'ndc-idle-stage-settings';
const SUPABASE_SETTING_KEY = 'idle_stage_settings';

export const IDLE_STAGE_DESIGNS: Array<{ id: IdleStageDesignType; label: string; description: string }> = [
  {
    id: 'orbital-command',
    label: 'Orbital Command',
    description: 'Pre-boot inspired circular command orbit with tri-service logo nodes.',
  },
  {
    id: 'flag-parade',
    label: 'Flag Parade',
    description: 'Ceremonial tri-service look with bold patriotic gradients and crest glow.',
  },
  {
    id: 'radar-grid',
    label: 'Radar Grid',
    description: 'Tactical radar feel with scanning layers and subtle signal pulses.',
  },
  {
    id: 'preboot-sequence',
    label: 'Preboot Sequence',
    description: 'Massive rotating armed forces logos fading in the background exactly like the boot screen.',
  },
  {
    id: 'holographic-display',
    label: 'Holographic Display',
    description: 'Futuristic floating holographic projections of the military branches with digital data streams.',
  },
  {
    id: 'commandant-honour-wall',
    label: 'Commandant Honour Wall',
    description: 'Rotating past commandant profiles with service-themed military insignia and premium ceremonial ambience.',
  },
];

export const DEFAULT_IDLE_STAGE_SETTINGS: IdleStageSettings = {
  enabled: false,
  activationDelayMs: 120000,
  design: 'orbital-command',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function sanitizeSettings(input: Partial<IdleStageSettings> | null | undefined): IdleStageSettings {
  const activationDelay = Number(input?.activationDelayMs);
  const design = input?.design;

  return {
    enabled: Boolean(input?.enabled),
    activationDelayMs: Number.isFinite(activationDelay)
      ? clamp(Math.round(activationDelay), 15000, 600000)
      : DEFAULT_IDLE_STAGE_SETTINGS.activationDelayMs,
    design: design && IDLE_STAGE_DESIGNS.some(item => item.id === design)
      ? design
      : DEFAULT_IDLE_STAGE_SETTINGS.design,
  };
}

function loadSettings(): IdleStageSettings {
  try {
    const override = readIdleStageOverride();
    if (override) {
      return sanitizeSettings(override);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IDLE_STAGE_SETTINGS;
    return sanitizeSettings(JSON.parse(raw) as Partial<IdleStageSettings>);
  } catch {
    return DEFAULT_IDLE_STAGE_SETTINGS;
  }
}

export function useIdleStageSettings() {
  const [settings, setSettingsState] = useState<IdleStageSettings>(loadSettings);

  useEffect(() => {
    let mounted = true;

    const syncFromSupabase = async () => {
      if (hasDeviceOverrides()) return;
      const remote = await loadUiSetting<Partial<IdleStageSettings>>(SUPABASE_SETTING_KEY);
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

  const setSettings = (next: Partial<IdleStageSettings>) => {
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
    setSettingsState(DEFAULT_IDLE_STAGE_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_IDLE_STAGE_SETTINGS));
    if (!hasDeviceOverrides()) {
      void saveUiSetting(SUPABASE_SETTING_KEY, DEFAULT_IDLE_STAGE_SETTINGS);
    }
  };

  return useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
    }),
    [settings],
  );
}
