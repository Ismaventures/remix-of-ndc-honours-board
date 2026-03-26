import { useEffect, useMemo, useState } from "react";
import { loadUiSetting, saveUiSetting } from "@/lib/uiSettingsStorage";
import {
  hasDeviceOverrides,
  readThemeOverride,
} from "@/lib/deviceOverrideSettings";

export type ThemeMode =
  | "outdoor-tactical-light"
  | "outdoor-high-contrast-command"
  | "outdoor-tri-service"
  | "indoor-defence-classic"
  | "indoor-modern-command-ui"
  | "indoor-tri-service";

type ThemeTokenMap = Record<string, string>;

const STORAGE_KEY = "ndc-theme-mode";
const SUPABASE_SETTING_KEY = "theme_mode";
export const DEFAULT_THEME_MODE: ThemeMode = "indoor-defence-classic";

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  "outdoor-tactical-light": "Outdoor 1 - Tactical Light",
  "outdoor-high-contrast-command": "Outdoor 2 - High Contrast Command",
  "outdoor-tri-service": "Outdoor 3 - Tri-Service Colors",
  "indoor-defence-classic": "Indoor 1 - Defence Classic",
  "indoor-modern-command-ui": "Indoor 2 - Modern Command UI",
  "indoor-tri-service": "Indoor 3 - Tri-Service Colors",
};

const THEME_TOKENS: Record<ThemeMode, ThemeTokenMap> = {
  "outdoor-tactical-light": {
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%",
    card: "0 0% 100%",
    "card-foreground": "222.2 84% 4.9%",
    popover: "0 0% 100%",
    "popover-foreground": "222.2 84% 4.9%",
    primary: "221.2 83.2% 53.3%", // Vibrant Blue
    "primary-foreground": "210 40% 98%",
    secondary: "210 40% 96.1%",
    "secondary-foreground": "222.2 47.4% 11.2%",
    muted: "210 40% 96.1%",
    "muted-foreground": "215.4 16.3% 46.9%",
    accent: "210 40% 96.1%",
    "accent-foreground": "222.2 47.4% 11.2%",
    border: "214.3 31.8% 91.4%",
    input: "214.3 31.8% 91.4%",
    ring: "221.2 83.2% 53.3%",
    "sidebar-background": "0 0% 98%",
    "sidebar-foreground": "240 5.3% 26.1%",
    "sidebar-primary": "240 5.9% 10%",
    "sidebar-primary-foreground": "0 0% 98%",
    "sidebar-accent": "240 4.8% 95.9%",
    "sidebar-accent-foreground": "240 5.9% 10%",
    "sidebar-border": "220 13% 91%",
    "sidebar-ring": "217.2 91.2% 59.8%",
    gold: "43 96% 64%",
    "gold-bright": "48 96% 89%",
    navy: "222.2 47.4% 11.2%",
    "navy-deep": "222.2 84% 4.9%",
    "military-green": "142.1 76.2% 36.3%",
  },
  "outdoor-high-contrast-command": {
    background: "0 0% 99%",
    foreground: "0 0% 0%",
    card: "0 0% 100%",
    "card-foreground": "0 0% 0%",
    popover: "0 0% 100%",
    "popover-foreground": "0 0% 0%",
    primary: "220 100% 50%",
    "primary-foreground": "0 0% 100%",
    secondary: "210 20% 90%",
    "secondary-foreground": "0 0% 0%",
    muted: "0 0% 92%",
    "muted-foreground": "0 0% 40%",
    accent: "200 100% 50%",
    "accent-foreground": "0 0% 100%",
    border: "0 0% 80%",
    input: "0 0% 95%",
    ring: "220 100% 50%",
    "sidebar-background": "0 0% 98%",
    "sidebar-foreground": "0 0% 0%",
    "sidebar-primary": "220 100% 50%",
    "sidebar-primary-foreground": "0 0% 100%",
    "sidebar-accent": "210 20% 90%",
    "sidebar-accent-foreground": "0 0% 0%",
    "sidebar-border": "0 0% 80%",
    "sidebar-ring": "220 100% 50%",
    gold: "45 100% 50%",
    "gold-bright": "45 100% 60%",
    navy: "220 50% 10%",
    "navy-deep": "220 50% 5%",
    "military-green": "120 100% 25%",
  },
  "indoor-defence-classic": {
    background: "214 68% 14%",
    foreground: "216 33% 97%",
    card: "214 62% 11%",
    "card-foreground": "216 33% 97%",
    popover: "214 62% 11%",
    "popover-foreground": "216 33% 97%",
    primary: "206 72% 58%",
    "primary-foreground": "214 62% 9%",
    secondary: "214 48% 20%",
    "secondary-foreground": "216 33% 97%",
    muted: "214 35% 22%",
    "muted-foreground": "214 15% 68%",
    accent: "206 72% 58%",
    "accent-foreground": "214 62% 9%",
    border: "206 72% 58% / 0.25",
    input: "214 35% 24%",
    ring: "206 72% 58%",
    "sidebar-background": "214 68% 10%",
    "sidebar-foreground": "216 28% 90%",
    "sidebar-primary": "206 72% 58%",
    "sidebar-primary-foreground": "214 62% 9%",
    "sidebar-accent": "214 45% 18%",
    "sidebar-accent-foreground": "216 33% 97%",
    "sidebar-border": "206 72% 58% / 0.2",
    "sidebar-ring": "206 72% 58%",
    gold: "206 72% 58%",
    "gold-bright": "206 82% 70%",
    navy: "214 68% 14%",
    "navy-deep": "214 70% 9%",
    "military-green": "150 33% 18%",
  },
  "indoor-modern-command-ui": {
    background: "0 0% 10%",
    foreground: "0 0% 88%",
    card: "0 0% 13%",
    "card-foreground": "0 0% 88%",
    popover: "0 0% 13%",
    "popover-foreground": "0 0% 88%",
    primary: "195 100% 50%",
    "primary-foreground": "0 0% 10%",
    secondary: "0 0% 16%",
    "secondary-foreground": "0 0% 88%",
    muted: "0 0% 18%",
    "muted-foreground": "0 0% 72%",
    accent: "195 100% 50%",
    "accent-foreground": "0 0% 10%",
    border: "195 100% 50% / 0.2",
    input: "0 0% 16%",
    ring: "195 100% 50%",
    "sidebar-background": "0 0% 8%",
    "sidebar-foreground": "0 0% 88%",
    "sidebar-primary": "195 100% 50%",
    "sidebar-primary-foreground": "0 0% 10%",
    "sidebar-accent": "0 0% 14%",
    "sidebar-accent-foreground": "0 0% 88%",
    "sidebar-border": "195 100% 50% / 0.2",
    "sidebar-ring": "195 100% 50%",
    gold: "195 100% 50%",
    "gold-bright": "195 100% 56%",
    navy: "0 0% 10%",
    "navy-deep": "0 0% 7%",
    "military-green": "195 100% 50%",
  },
  "outdoor-tri-service": {
    background: "210 44% 97%",
    foreground: "221 73% 18%",
    card: "0 0% 100%",
    "card-foreground": "221 73% 18%",
    popover: "0 0% 100%",
    "popover-foreground": "221 73% 18%",
    primary: "221 78% 31%",
    "primary-foreground": "0 0% 100%",
    secondary: "3 76% 47%",
    "secondary-foreground": "0 0% 100%",
    muted: "209 26% 89%",
    "muted-foreground": "220 24% 36%",
    accent: "151 58% 33%",
    "accent-foreground": "0 0% 100%",
    border: "221 52% 20% / 0.18",
    input: "209 28% 90%",
    ring: "221 78% 31%",
    "sidebar-background": "221 63% 16%",
    "sidebar-foreground": "208 33% 95%",
    "sidebar-primary": "208 67% 70%",
    "sidebar-primary-foreground": "221 78% 16%",
    "sidebar-accent": "3 76% 47%",
    "sidebar-accent-foreground": "0 0% 100%",
    "sidebar-border": "208 33% 95% / 0.18",
    "sidebar-ring": "208 67% 70%",
    gold: "208 67% 70%",
    "gold-bright": "207 78% 80%",
    navy: "221 73% 18%",
    "navy-deep": "222 78% 12%",
    "military-green": "151 58% 33%",
  },
  "indoor-tri-service": {
    background: "221 100% 15%",
    foreground: "0 0% 100%",
    card: "221 100% 11%",
    "card-foreground": "0 0% 100%",
    popover: "221 100% 11%",
    "popover-foreground": "0 0% 100%",
    primary: "208 67% 73%",
    "primary-foreground": "221 100% 10%",
    secondary: "358 87% 52%",
    "secondary-foreground": "0 0% 100%",
    muted: "221 30% 25%",
    "muted-foreground": "0 0% 85%",
    accent: "358 87% 52%",
    "accent-foreground": "0 0% 100%",
    border: "0 0% 100% / 0.15",
    input: "221 30% 25%",
    ring: "208 67% 73%",
    "sidebar-background": "221 100% 12%",
    "sidebar-foreground": "0 0% 100%",
    "sidebar-primary": "208 67% 73%",
    "sidebar-primary-foreground": "221 100% 10%",
    "sidebar-accent": "358 87% 52%",
    "sidebar-accent-foreground": "0 0% 100%",
    "sidebar-border": "0 0% 100% / 0.15",
    "sidebar-ring": "208 67% 73%",
    gold: "208 67% 73%",
    "gold-bright": "208 67% 80%",
    navy: "221 100% 15%",
    "navy-deep": "221 100% 10%",
    "military-green": "208 67% 73%",
  },
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
    const override = readThemeOverride();
    if (override && override in THEME_TOKENS) {
      return override;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_THEME_MODE;
    if (stored in THEME_TOKENS) return stored as ThemeMode;
    return DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    loadThemeModeFromStorage,
  );

  useEffect(() => {
    let mounted = true;

    const syncFromSupabase = async () => {
      if (hasDeviceOverrides()) return;
      const remote = await loadUiSetting<ThemeMode>(SUPABASE_SETTING_KEY);
      if (!mounted || !remote) return;
      if (!(remote in THEME_TOKENS)) return;
      setThemeMode(remote);
      localStorage.setItem(STORAGE_KEY, remote);
    };

    void syncFromSupabase();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyThemeMode(themeMode);
    localStorage.setItem(STORAGE_KEY, themeMode);
    if (!hasDeviceOverrides()) {
      void saveUiSetting(SUPABASE_SETTING_KEY, themeMode);
    }
  }, [themeMode]);

  const modeOptions = useMemo(() => {
    return (Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map((mode) => ({
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
