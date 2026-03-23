import { useCallback, useMemo, useState } from "react";

export interface CinematicExperienceSettings {
  whooshCooldownMs: number;
  ambientLevel: number;
  ambientFadeInMs: number;
  ambientFadeOutMs: number;
  commandantDurationMs: number;
  imageDurationMs: number;
}

const STORAGE_KEY = "ndc-cinematic-experience-settings";

const DEFAULT_SETTINGS: CinematicExperienceSettings = {
  whooshCooldownMs: 400,
  ambientLevel: 0.16,
  ambientFadeInMs: 2400,
  ambientFadeOutMs: 1800,
  commandantDurationMs: 1200,
  imageDurationMs: 840,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function sanitizeSettings(raw: Partial<CinematicExperienceSettings> | null | undefined): CinematicExperienceSettings {
  return {
    whooshCooldownMs: clamp(Math.round(Number(raw?.whooshCooldownMs) || DEFAULT_SETTINGS.whooshCooldownMs), 300, 500),
    ambientLevel: clamp(Number(raw?.ambientLevel) || DEFAULT_SETTINGS.ambientLevel, 0.1, 0.25),
    ambientFadeInMs: clamp(Math.round(Number(raw?.ambientFadeInMs) || DEFAULT_SETTINGS.ambientFadeInMs), 2000, 3000),
    ambientFadeOutMs: clamp(Math.round(Number(raw?.ambientFadeOutMs) || DEFAULT_SETTINGS.ambientFadeOutMs), 1200, 2800),
    commandantDurationMs: clamp(Math.round(Number(raw?.commandantDurationMs) || DEFAULT_SETTINGS.commandantDurationMs), 900, 1800),
    imageDurationMs: clamp(Math.round(Number(raw?.imageDurationMs) || DEFAULT_SETTINGS.imageDurationMs), 650, 1400),
  };
}

function loadSettings(): CinematicExperienceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw) as Partial<CinematicExperienceSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useCinematicExperienceSettings() {
  const [settings, setSettings] = useState<CinematicExperienceSettings>(() => loadSettings());

  const persist = useCallback((next: CinematicExperienceSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateSettings = useCallback((patch: Partial<CinematicExperienceSettings>) => {
    const next = sanitizeSettings({ ...settings, ...patch });
    persist(next);
  }, [persist, settings]);

  const resetSettings = useCallback(() => {
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  return useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
    defaultSettings: DEFAULT_SETTINGS,
  }), [settings, updateSettings, resetSettings]);
}
