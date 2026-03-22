import { useEffect, useMemo, useState } from 'react';

export type ThemeMode =
  | 'outdoor-tactical-light'
  | 'outdoor-high-contrast-command'
  | 'outdoor-tri-service'
  | 'indoor-defence-classic'
  | 'indoor-modern-command-ui'
  | 'indoor-tri-service';

type ThemeTokenMap = Record<string, string>;

const STORAGE_KEY = 'ndc-theme-mode';
export const DEFAULT_THEME_MODE: ThemeMode = 'indoor-defence-classic';

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  'outdoor-tactical-light': 'Outdoor 1 - Tactical Light',
  'outdoor-high-contrast-command': 'Outdoor 2 - High Contrast Command',
  'outdoor-tri-service': 'Outdoor 3 - Tri-Service Colors',
  'indoor-defence-classic': 'Indoor 1 - Defence Classic',
  'indoor-modern-command-ui': 'Indoor 2 - Modern Command UI',
  'indoor-tri-service': 'Indoor 3 - Tri-Service Colors',
};

const THEME_TOKENS: Record<ThemeMode, ThemeTokenMap> = {
  'outdoor-tactical-light': {
    background: '0 0% 100%',
    foreground: '218 69% 14%',
    card: '210 20% 98%',
    'card-foreground': '218 69% 14%',
    popover: '0 0% 100%',
    'popover-foreground': '218 69% 14%',
    primary: '218 69% 14%',
    'primary-foreground': '0 0% 100%',
    secondary: '44 55% 53%',
    'secondary-foreground': '218 69% 14%',
    muted: '210 22% 92%',
    'muted-foreground': '216 24% 30%',
    accent: '44 55% 53%',
    'accent-foreground': '218 69% 14%',
    border: '218 69% 14% / 0.16',
    input: '210 22% 91%',
    ring: '44 55% 53%',
    'sidebar-background': '218 69% 14%',
    'sidebar-foreground': '0 0% 100%',
    'sidebar-primary': '44 55% 53%',
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': '218 52% 22%',
    'sidebar-accent-foreground': '0 0% 100%',
    'sidebar-border': '0 0% 100% / 0.2',
    'sidebar-ring': '44 55% 53%',
    gold: '44 55% 53%',
    'gold-bright': '44 60% 61%',
    navy: '218 69% 14%',
    'navy-deep': '218 70% 10%',
    'military-green': '141 54% 27%',
  },
  'outdoor-high-contrast-command': {
    background: '0 0% 0%',
    foreground: '0 0% 100%',
    card: '0 0% 7%',
    'card-foreground': '0 0% 100%',
    popover: '0 0% 7%',
    'popover-foreground': '0 0% 100%',
    primary: '157 100% 50%',
    'primary-foreground': '0 0% 8%',
    secondary: '0 0% 12%',
    'secondary-foreground': '0 0% 96%',
    muted: '0 0% 14%',
    'muted-foreground': '0 0% 78%',
    accent: '45 100% 51%',
    'accent-foreground': '0 0% 8%',
    border: '157 100% 50% / 0.25',
    input: '0 0% 13%',
    ring: '157 100% 50%',
    'sidebar-background': '0 0% 4%',
    'sidebar-foreground': '0 0% 100%',
    'sidebar-primary': '157 100% 50%',
    'sidebar-primary-foreground': '0 0% 8%',
    'sidebar-accent': '0 0% 10%',
    'sidebar-accent-foreground': '0 0% 100%',
    'sidebar-border': '157 100% 50% / 0.2',
    'sidebar-ring': '157 100% 50%',
    gold: '45 100% 51%',
    'gold-bright': '45 100% 56%',
    navy: '0 0% 0%',
    'navy-deep': '0 0% 0%',
    'military-green': '157 100% 50%',
  },
  'indoor-defence-classic': {
    background: '214 68% 14%',
    foreground: '216 33% 97%',
    card: '214 62% 11%',
    'card-foreground': '216 33% 97%',
    popover: '214 62% 11%',
    'popover-foreground': '216 33% 97%',
    primary: '44 55% 53%',
    'primary-foreground': '214 62% 9%',
    secondary: '214 48% 20%',
    'secondary-foreground': '216 33% 97%',
    muted: '214 35% 22%',
    'muted-foreground': '214 15% 68%',
    accent: '44 55% 53%',
    'accent-foreground': '214 62% 9%',
    border: '44 55% 53% / 0.25',
    input: '214 35% 24%',
    ring: '44 55% 53%',
    'sidebar-background': '214 68% 10%',
    'sidebar-foreground': '216 28% 90%',
    'sidebar-primary': '44 55% 53%',
    'sidebar-primary-foreground': '214 62% 9%',
    'sidebar-accent': '214 45% 18%',
    'sidebar-accent-foreground': '216 33% 97%',
    'sidebar-border': '44 55% 53% / 0.2',
    'sidebar-ring': '44 55% 53%',
    gold: '44 55% 53%',
    'gold-bright': '44 60% 60%',
    navy: '214 68% 14%',
    'navy-deep': '214 70% 9%',
    'military-green': '150 33% 18%',
  },
  'indoor-modern-command-ui': {
    background: '0 0% 10%',
    foreground: '0 0% 88%',
    card: '0 0% 13%',
    'card-foreground': '0 0% 88%',
    popover: '0 0% 13%',
    'popover-foreground': '0 0% 88%',
    primary: '195 100% 50%',
    'primary-foreground': '0 0% 10%',
    secondary: '0 0% 16%',
    'secondary-foreground': '0 0% 88%',
    muted: '0 0% 18%',
    'muted-foreground': '0 0% 72%',
    accent: '195 100% 50%',
    'accent-foreground': '0 0% 10%',
    border: '195 100% 50% / 0.2',
    input: '0 0% 16%',
    ring: '195 100% 50%',
    'sidebar-background': '0 0% 8%',
    'sidebar-foreground': '0 0% 88%',
    'sidebar-primary': '195 100% 50%',
    'sidebar-primary-foreground': '0 0% 10%',
    'sidebar-accent': '0 0% 14%',
    'sidebar-accent-foreground': '0 0% 88%',
    'sidebar-border': '195 100% 50% / 0.2',
    'sidebar-ring': '195 100% 50%',
    gold: '195 100% 50%',
    'gold-bright': '195 100% 56%',
    navy: '0 0% 10%',
    'navy-deep': '0 0% 7%',
    'military-green': '195 100% 50%',
  },
  'outdoor-tri-service': {
    background: '0 0% 100%',
    foreground: '221 100% 15%',
    card: '208 50% 96%',
    'card-foreground': '221 100% 15%',
    popover: '0 0% 100%',
    'popover-foreground': '221 100% 15%',
    primary: '221 100% 19%',
    'primary-foreground': '0 0% 100%',
    secondary: '358 87% 52%',
    'secondary-foreground': '0 0% 100%',
    muted: '221 20% 90%',
    'muted-foreground': '221 20% 40%',
    accent: '208 67% 73%',
    'accent-foreground': '221 100% 15%',
    border: '221 100% 15% / 0.15',
    input: '221 20% 90%',
    ring: '221 100% 19%',
    'sidebar-background': '0 0% 98%',
    'sidebar-foreground': '221 100% 15%',
    'sidebar-primary': '221 100% 19%',
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': '208 67% 73%',
    'sidebar-accent-foreground': '221 100% 15%',
    'sidebar-border': '221 100% 15% / 0.15',
    'sidebar-ring': '221 100% 19%',
    gold: '208 67% 73%',
    'gold-bright': '208 67% 65%',
    navy: '221 100% 19%',
    'navy-deep': '221 100% 14%',
    'military-green': '221 100% 19%',
  },
  'indoor-tri-service': {
    background: '221 100% 15%',
    foreground: '0 0% 100%',
    card: '221 100% 11%',
    'card-foreground': '0 0% 100%',
    popover: '221 100% 11%',
    'popover-foreground': '0 0% 100%',
    primary: '208 67% 73%',
    'primary-foreground': '221 100% 10%',
    secondary: '358 87% 52%',
    'secondary-foreground': '0 0% 100%',
    muted: '221 30% 25%',
    'muted-foreground': '0 0% 85%',
    accent: '358 87% 52%',
    'accent-foreground': '0 0% 100%',
    border: '0 0% 100% / 0.15',
    input: '221 30% 25%',
    ring: '208 67% 73%',
    'sidebar-background': '221 100% 12%',
    'sidebar-foreground': '0 0% 100%',
    'sidebar-primary': '208 67% 73%',
    'sidebar-primary-foreground': '221 100% 10%',
    'sidebar-accent': '358 87% 52%',
    'sidebar-accent-foreground': '0 0% 100%',
    'sidebar-border': '0 0% 100% / 0.15',
    'sidebar-ring': '208 67% 73%',
    gold: '208 67% 73%',
    'gold-bright': '208 67% 80%',
    navy: '221 100% 15%',
    'navy-deep': '221 100% 10%',
    'military-green': '208 67% 73%',
  }
};

function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[mode];

  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--${token}`, value);
  });

  root.dataset.themeMode = mode;
}

function loadThemeModeFromStorage(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_THEME_MODE;
    if (stored in THEME_TOKENS) return stored as ThemeMode;
    return DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadThemeModeFromStorage);

  useEffect(() => {
    applyThemeMode(themeMode);
    localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  const modeOptions = useMemo(() => {
    return (Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map(mode => ({
      mode,
      label: THEME_MODE_LABELS[mode],
    }));
  }, []);

  const resetThemeMode = () => setThemeMode(DEFAULT_THEME_MODE);

  return {
    themeMode,
    setThemeMode,
    resetThemeMode,
    modeOptions,
  };
}
