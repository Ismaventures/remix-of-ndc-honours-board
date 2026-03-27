import { useEffect, useMemo, useState } from 'react';
import { loadUiSetting, saveUiSetting } from '@/lib/uiSettingsStorage';
import { hasDeviceOverrides, readAutoDisplayOverride } from '@/lib/deviceOverrideSettings';

export type AutoDisplayTransitionType =
  | 'fade-zoom'
  | 'slide-up'
  | 'slide-left'
  | 'slide-right'
  | 'slide-down'
  | 'zoom-out'
  | 'flip-x'
  | 'flip-y'
  | 'rotate-in'
  | 'blur-in'
  | 'skew-lift'
  | 'scale-rise'
  | 'ndc-scatter'
  | 'pro-slider'
  | 'barracks-reveal'
  | 'salute-flash'
  | 'parade-sweep'
  | 'mission-brief'
  | 'runway-sweep';

export type AutoDisplayContextKey =
  | 'commandants'
  | 'visits'
  | 'FWC'
  | 'FDC'
  | 'Directing Staff'
  | 'Allied';

export type CommandantLayoutType = 'standard' | 'split';

export type TransitionCueType =
  | 'none'
  | 'whoosh'
  | 'clank'
  | 'flash'
  | 'drum'
  | 'scan'
  | 'sweep';

export interface AutoDisplayTiming {
  slideDurationMs: number;
  transitionDurationMs: number;
}

export interface AutoDisplaySettings {
  global: AutoDisplayTiming;
  byContext: Record<AutoDisplayContextKey, AutoDisplayTiming>;
  transitionSequence: AutoDisplayTransitionType[];
  transitionSequenceByContext: Record<AutoDisplayContextKey, AutoDisplayTransitionType[]>;
  appliedTransitionByContext: Record<AutoDisplayContextKey, AutoDisplayTransitionType | null>;
  transitionDurationByTypeMs: Record<AutoDisplayTransitionType, number>;
  transitionCueByType: Record<AutoDisplayTransitionType, TransitionCueType>;
  commandantLayout?: CommandantLayoutType;
}

const STORAGE_KEY = 'ndc-auto-display-settings';
const SUPABASE_SETTING_KEY = 'auto_display_settings';

export const TRANSITION_TYPES: Array<{ id: AutoDisplayTransitionType; label: string }> = [
  { id: 'fade-zoom', label: 'Fade Zoom' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'slide-left', label: 'Slide Left' },
  { id: 'slide-right', label: 'Slide Right' },
  { id: 'slide-down', label: 'Slide Down' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'flip-x', label: 'Flip X' },
  { id: 'flip-y', label: 'Flip Y' },
  { id: 'rotate-in', label: 'Rotate In' },
  { id: 'blur-in', label: 'Blur In' },
  { id: 'skew-lift', label: 'Skew Lift' },
  { id: 'scale-rise', label: 'Scale Rise' },
  { id: 'ndc-scatter', label: 'Scattered NDC Logo' },
  { id: 'pro-slider', label: 'Pro Slider (Framer)' },
  { id: 'barracks-reveal', label: 'Barracks Reveal' },
  { id: 'salute-flash', label: 'Salute Flash' },
  { id: 'parade-sweep', label: 'Parade Sweep' },
  { id: 'mission-brief', label: 'Mission Brief' },
  { id: 'runway-sweep', label: 'Runway Sweep' },
];

export const TRANSITION_CUE_TYPES: Array<{ id: TransitionCueType; label: string }> = [
  { id: 'none', label: 'No Cue' },
  { id: 'whoosh', label: 'Whoosh' },
  { id: 'clank', label: 'Metal Clank' },
  { id: 'flash', label: 'Flash Hit' },
  { id: 'drum', label: 'Drum Strike' },
  { id: 'scan', label: 'Scan Pulse' },
  { id: 'sweep', label: 'Searchlight Sweep' },
];

export const DEFAULT_TRANSITION_CUE_BY_TYPE: Record<AutoDisplayTransitionType, TransitionCueType> = {
  'fade-zoom': 'whoosh',
  'slide-up': 'whoosh',
  'slide-left': 'whoosh',
  'slide-right': 'whoosh',
  'slide-down': 'whoosh',
  'zoom-out': 'whoosh',
  'flip-x': 'clank',
  'flip-y': 'clank',
  'rotate-in': 'whoosh',
  'blur-in': 'scan',
  'skew-lift': 'scan',
  'scale-rise': 'whoosh',
  'ndc-scatter': 'flash',
  'pro-slider': 'sweep',
  'barracks-reveal': 'clank',
  'salute-flash': 'flash',
  'parade-sweep': 'drum',
  'mission-brief': 'scan',
  'runway-sweep': 'sweep',
};

export const AUTO_DISPLAY_CONTEXTS: Array<{ key: AutoDisplayContextKey; label: string }> = [
  { key: 'commandants', label: 'Commandants' },
  { key: 'visits', label: 'Visits' },
  { key: 'FWC', label: 'FWC' },
  { key: 'FDC', label: 'FDC' },
  { key: 'Directing Staff', label: 'Directing Staff' },
  { key: 'Allied', label: 'Allied Officers' },
];

export const DEFAULT_AUTO_DISPLAY_SETTINGS: AutoDisplaySettings = {
  global: {
    slideDurationMs: 8000,
    transitionDurationMs: 450,
  },
  byContext: {
    commandants: { slideDurationMs: 8000, transitionDurationMs: 450 },
    visits: { slideDurationMs: 9000, transitionDurationMs: 500 },
    FWC: { slideDurationMs: 7600, transitionDurationMs: 420 },
    FDC: { slideDurationMs: 7600, transitionDurationMs: 420 },
    'Directing Staff': { slideDurationMs: 8200, transitionDurationMs: 480 },
    Allied: { slideDurationMs: 8200, transitionDurationMs: 480 },
  },
  transitionSequence: [
    'pro-slider',
    'fade-zoom',
    'slide-up',
    'slide-left',
    'slide-right',
    'slide-down',
    'zoom-out',
    'flip-x',
    'flip-y',
    'rotate-in',
    'blur-in',
    'skew-lift',
    'scale-rise',
    'barracks-reveal',
    'salute-flash',
    'parade-sweep',
    'mission-brief',
    'runway-sweep',
  ],
  transitionSequenceByContext: {
    commandants: [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
    visits: [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
    FWC: [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
    FDC: [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
    'Directing Staff': [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
    Allied: [
      'pro-slider', 'fade-zoom', 'slide-up', 'slide-left', 'slide-right', 'slide-down', 'zoom-out',
      'flip-x', 'flip-y', 'rotate-in', 'blur-in', 'skew-lift', 'scale-rise',
    ],
  },
  appliedTransitionByContext: {
    commandants: null,
    visits: null,
    FWC: null,
    FDC: null,
    'Directing Staff': null,
    Allied: null,
  },
  transitionDurationByTypeMs: {
    'fade-zoom': 450,
    'slide-up': 520,
    'slide-left': 520,
    'slide-right': 520,
    'slide-down': 520,
    'zoom-out': 520,
    'flip-x': 700,
    'flip-y': 700,
    'rotate-in': 620,
    'blur-in': 560,
    'skew-lift': 580,
    'scale-rise': 520,
    'ndc-scatter': 2500,
    'pro-slider': 800,
    'barracks-reveal': 1100,
    'salute-flash': 900,
    'parade-sweep': 1200,
    'mission-brief': 1000,
    'runway-sweep': 1000,
  },
  transitionCueByType: DEFAULT_TRANSITION_CUE_BY_TYPE,
  commandantLayout: 'standard',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isTransitionType = (value: unknown): value is AutoDisplayTransitionType =>
  typeof value === 'string' && TRANSITION_TYPES.some(item => item.id === value);

const isTransitionCueType = (value: unknown): value is TransitionCueType =>
  typeof value === 'string' && TRANSITION_CUE_TYPES.some(item => item.id === value);

function sanitizeTiming(input: Partial<AutoDisplayTiming> | null | undefined, fallback: AutoDisplayTiming): AutoDisplayTiming {
  const slideDuration = Number(input?.slideDurationMs);
  const transitionDuration = Number(input?.transitionDurationMs);

  return {
    slideDurationMs: Number.isFinite(slideDuration) ? clamp(Math.round(slideDuration), 3000, 30000) : fallback.slideDurationMs,
    transitionDurationMs: Number.isFinite(transitionDuration) ? clamp(Math.round(transitionDuration), 250, 2600) : fallback.transitionDurationMs,
  };
}

function sanitizeSettings(input: Partial<AutoDisplaySettings> | null | undefined): AutoDisplaySettings {
  const global = sanitizeTiming(input?.global, DEFAULT_AUTO_DISPLAY_SETTINGS.global);

  const byContext = AUTO_DISPLAY_CONTEXTS.reduce<Record<AutoDisplayContextKey, AutoDisplayTiming>>((acc, context) => {
    const contextInput = input?.byContext?.[context.key] as Partial<AutoDisplayTiming> | undefined;
    acc[context.key] = sanitizeTiming(contextInput, DEFAULT_AUTO_DISPLAY_SETTINGS.byContext[context.key]);
    return acc;
  }, {} as Record<AutoDisplayContextKey, AutoDisplayTiming>);

  const sequenceInput = Array.isArray(input?.transitionSequence)
    ? input.transitionSequence.filter(isTransitionType)
    : [];
  const uniqueSequence = Array.from(new Set(sequenceInput));

  const transitionSequence = uniqueSequence.length > 0
    ? uniqueSequence
    : DEFAULT_AUTO_DISPLAY_SETTINGS.transitionSequence;

  const transitionSequenceByContext = AUTO_DISPLAY_CONTEXTS.reduce<Record<AutoDisplayContextKey, AutoDisplayTransitionType[]>>((acc, context) => {
    const contextSequenceInput = Array.isArray(input?.transitionSequenceByContext?.[context.key])
      ? input?.transitionSequenceByContext?.[context.key]?.filter(isTransitionType)
      : [];
    const uniqueContextSequence = Array.from(new Set(contextSequenceInput));
    acc[context.key] = uniqueContextSequence.length > 0
      ? uniqueContextSequence
      : transitionSequence;
    return acc;
  }, {} as Record<AutoDisplayContextKey, AutoDisplayTransitionType[]>);

  const appliedTransitionByContext = AUTO_DISPLAY_CONTEXTS.reduce<Record<AutoDisplayContextKey, AutoDisplayTransitionType | null>>((acc, context) => {
    const raw = input?.appliedTransitionByContext?.[context.key];
    acc[context.key] = isTransitionType(raw) ? raw : null;
    return acc;
  }, {} as Record<AutoDisplayContextKey, AutoDisplayTransitionType | null>);

  const transitionDurationByTypeMs = TRANSITION_TYPES.reduce<Record<AutoDisplayTransitionType, number>>((acc, transition) => {
    const raw = Number(input?.transitionDurationByTypeMs?.[transition.id]);
    acc[transition.id] = Number.isFinite(raw)
      ? clamp(Math.round(raw), 250, 3000)
      : DEFAULT_AUTO_DISPLAY_SETTINGS.transitionDurationByTypeMs[transition.id];
    return acc;
  }, {} as Record<AutoDisplayTransitionType, number>);

  const transitionCueByType = TRANSITION_TYPES.reduce<Record<AutoDisplayTransitionType, TransitionCueType>>((acc, transition) => {
    const raw = input?.transitionCueByType?.[transition.id];
    acc[transition.id] = isTransitionCueType(raw)
      ? raw
      : DEFAULT_TRANSITION_CUE_BY_TYPE[transition.id];
    return acc;
  }, {} as Record<AutoDisplayTransitionType, TransitionCueType>);

  const commandantLayout = (input?.commandantLayout === 'split' || input?.commandantLayout === 'standard') 
    ? input.commandantLayout 
    : DEFAULT_AUTO_DISPLAY_SETTINGS.commandantLayout;

  return {
    global,
    byContext,
    transitionSequence,
    transitionSequenceByContext,
    appliedTransitionByContext,
    transitionDurationByTypeMs,
    transitionCueByType,
    commandantLayout,
  };
}

function loadSettings(): AutoDisplaySettings {
  try {
    const override = readAutoDisplayOverride();
    if (override) {
      return sanitizeSettings(override);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_DISPLAY_SETTINGS;
    return sanitizeSettings(JSON.parse(raw) as Partial<AutoDisplaySettings>);
  } catch {
    return DEFAULT_AUTO_DISPLAY_SETTINGS;
  }
}

export function useAutoDisplaySettings() {
  const [settings, setSettingsState] = useState<AutoDisplaySettings>(loadSettings);

  useEffect(() => {
    let mounted = true;

    const syncFromSupabase = async () => {
      if (hasDeviceOverrides()) return;
      const remote = await loadUiSetting<Partial<AutoDisplaySettings>>(SUPABASE_SETTING_KEY);
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

  const write = (next: AutoDisplaySettings, syncRemote = true) => {
    setSettingsState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (syncRemote && !hasDeviceOverrides()) {
      void saveUiSetting(SUPABASE_SETTING_KEY, next);
    }
  };

  const setGlobalTiming = (next: Partial<AutoDisplayTiming>) => {
    const merged = sanitizeSettings({
      ...settings,
      global: { ...settings.global, ...next },
    });
    write(merged);
  };

  const setContextTiming = (context: AutoDisplayContextKey, next: Partial<AutoDisplayTiming>) => {
    const merged = sanitizeSettings({
      ...settings,
      byContext: {
        ...settings.byContext,
        [context]: { ...settings.byContext[context], ...next },
      },
    });
    write(merged);
  };

  const setTransitionDuration = (transition: AutoDisplayTransitionType, durationMs: number) => {
    const merged = sanitizeSettings({
      ...settings,
      transitionDurationByTypeMs: {
        ...settings.transitionDurationByTypeMs,
        [transition]: durationMs,
      },
    });
    write(merged);
  };

  const setTransitionSequence = (sequence: AutoDisplayTransitionType[]) => {
    const merged = sanitizeSettings({
      ...settings,
      transitionSequence: sequence,
    });
    write(merged);
  };

  const setContextTransitionSequence = (context: AutoDisplayContextKey, sequence: AutoDisplayTransitionType[]) => {
    const merged = sanitizeSettings({
      ...settings,
      transitionSequenceByContext: {
        ...settings.transitionSequenceByContext,
        [context]: sequence,
      },
    });
    write(merged);
  };

  const setCommandantLayout = (layout: 'standard' | 'split') => {
    const merged = sanitizeSettings({
      ...settings,
      commandantLayout: layout,
    });
    write(merged);
  };

  const importSettings = (candidate: Partial<AutoDisplaySettings>) => {
    const merged = sanitizeSettings(candidate);
    write(merged);
  };

  const resetSettings = () => write(DEFAULT_AUTO_DISPLAY_SETTINGS);

  return useMemo(
    () => ({
      settings,
      setGlobalTiming,
      setContextTiming,
      setTransitionDuration,
      setTransitionSequence,
      setContextTransitionSequence,
      setCommandantLayout,
      importSettings,
      resetSettings,
    }),
    [settings]
  );
}
