import type { ThemeMode } from '@/hooks/useThemeMode';
import type { BootSequenceSettings } from '@/hooks/useBootSequenceSettings';
import type { AutoDisplaySettings } from '@/hooks/useAutoDisplaySettings';
import type { IdleStageSettings } from '@/hooks/useIdleStageSettings';

const THEME_OVERRIDE_KEY = 'ndc-device-override-theme';
const BOOT_OVERRIDE_KEY = 'ndc-device-override-boot';
const AUTO_OVERRIDE_KEY = 'ndc-device-override-auto';
const IDLE_OVERRIDE_KEY = 'ndc-device-override-idle';

export interface DeviceProfilePayload {
  themeMode?: ThemeMode;
  bootSequenceSettings?: Partial<BootSequenceSettings>;
  autoDisplaySettings?: Partial<AutoDisplaySettings>;
  idleStageSettings?: Partial<IdleStageSettings>;
}

export function readThemeOverride(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_OVERRIDE_KEY);
    if (!raw) return null;
    return raw as ThemeMode;
  } catch {
    return null;
  }
}

export function readBootOverride(): Partial<BootSequenceSettings> | null {
  try {
    const raw = localStorage.getItem(BOOT_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<BootSequenceSettings>;
  } catch {
    return null;
  }
}

export function readAutoDisplayOverride(): Partial<AutoDisplaySettings> | null {
  try {
    const raw = localStorage.getItem(AUTO_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AutoDisplaySettings>;
  } catch {
    return null;
  }
}

export function readIdleStageOverride(): Partial<IdleStageSettings> | null {
  try {
    const raw = localStorage.getItem(IDLE_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<IdleStageSettings>;
  } catch {
    return null;
  }
}

export function hasDeviceOverrides(): boolean {
  try {
    return Boolean(localStorage.getItem(THEME_OVERRIDE_KEY) || localStorage.getItem(BOOT_OVERRIDE_KEY) || localStorage.getItem(AUTO_OVERRIDE_KEY) || localStorage.getItem(IDLE_OVERRIDE_KEY));
  } catch {
    return false;
  }
}

export function saveDeviceOverrides(payload: DeviceProfilePayload) {
  try {
    if (payload.themeMode) {
      localStorage.setItem(THEME_OVERRIDE_KEY, payload.themeMode);
    }
    if (payload.bootSequenceSettings) {
      localStorage.setItem(BOOT_OVERRIDE_KEY, JSON.stringify(payload.bootSequenceSettings));
    }
    if (payload.autoDisplaySettings) {
      localStorage.setItem(AUTO_OVERRIDE_KEY, JSON.stringify(payload.autoDisplaySettings));
    }
    if (payload.idleStageSettings) {
      localStorage.setItem(IDLE_OVERRIDE_KEY, JSON.stringify(payload.idleStageSettings));
    }
  } catch {
    // ignore
  }
}

export function clearDeviceOverrides() {
  try {
    localStorage.removeItem(THEME_OVERRIDE_KEY);
    localStorage.removeItem(BOOT_OVERRIDE_KEY);
    localStorage.removeItem(AUTO_OVERRIDE_KEY);
    localStorage.removeItem(IDLE_OVERRIDE_KEY);
  } catch {
    // ignore
  }
}
