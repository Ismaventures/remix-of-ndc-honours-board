import { useCallback, useEffect, useState } from "react";
import { loadUiSetting, saveUiSetting } from "@/lib/uiSettingsStorage";

const SETTING_KEY = "museum_display_frame";
const DEFAULT_FRAME = "/images/glass-case-frame.png";

/** Tunable display parameters for the glass-case viewer */
export interface FrameDisplayParams {
  /** Perspective depth in px (300–2000, default 600) */
  perspective: number;
  /** Z-axis translation — how "deep" the object sits in the case (0–60, default 16) */
  depthZ: number;
  /** Tilt sensitivity multiplier (0.1–2.0, default 1.0) */
  tiltSensitivity: number;
  /** Object inset from frame edges in % (5–40, default 22) */
  objectInset: number;
  /** Vignette darkness 0–100 (default 45) */
  vignette: number;
  /** Spotlight warmth/intensity 0–100 (default 18) */
  spotlight: number;
  /** Glass reflection intensity 0–100 (default 55) */
  glassReflection: number;
  /** Specular highlight intensity 0–100 (default 30) */
  specularIntensity: number;
  /** Contact shadow opacity 0–100 (default 35) */
  shadowOpacity: number;
  /** Contact shadow blur in px (0–30, default 12 → blur-lg) */
  shadowBlur: number;
  /** Frame opacity 0–100 (default 100) */
  frameOpacity: number;
}

export const DEFAULT_FRAME_DISPLAY: FrameDisplayParams = {
  perspective: 600,
  depthZ: 16,
  tiltSensitivity: 1.0,
  objectInset: 22,
  vignette: 45,
  spotlight: 18,
  glassReflection: 55,
  specularIntensity: 30,
  shadowOpacity: 35,
  shadowBlur: 12,
  frameOpacity: 100,
};

export interface DisplayFrameSettings {
  /** URL of the active glass-case frame image */
  activeFrameUrl: string;
  /** All saved frame URLs (built-in + uploaded) */
  savedFrames: string[];
  /** Tunable display parameters */
  displayParams: FrameDisplayParams;
}

const DEFAULTS: DisplayFrameSettings = {
  activeFrameUrl: DEFAULT_FRAME,
  savedFrames: [DEFAULT_FRAME],
  displayParams: { ...DEFAULT_FRAME_DISPLAY },
};

export function useDisplayFrameSettings() {
  const [settings, setSettings] = useState<DisplayFrameSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadUiSetting<DisplayFrameSettings>(SETTING_KEY);
      if (!cancelled && saved) {
        // ensure built-in frame is always present
        const frames = saved.savedFrames?.length
          ? saved.savedFrames.includes(DEFAULT_FRAME)
            ? saved.savedFrames
            : [DEFAULT_FRAME, ...saved.savedFrames]
          : [DEFAULT_FRAME];
        setSettings({
          activeFrameUrl: saved.activeFrameUrl || DEFAULT_FRAME,
          savedFrames: frames,
          displayParams: { ...DEFAULT_FRAME_DISPLAY, ...(saved.displayParams ?? {}) },
        });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next: DisplayFrameSettings) => {
    setSettings(next);
    await saveUiSetting(SETTING_KEY, next);
  }, []);

  const setActiveFrame = useCallback(
    (url: string) => persist({ ...settings, activeFrameUrl: url }),
    [settings, persist],
  );

  const addFrame = useCallback(
    (url: string) => {
      if (settings.savedFrames.includes(url)) return persist({ ...settings, activeFrameUrl: url });
      return persist({ activeFrameUrl: url, savedFrames: [...settings.savedFrames, url] });
    },
    [settings, persist],
  );

  const removeFrame = useCallback(
    (url: string) => {
      if (url === DEFAULT_FRAME) return; // can't remove built-in
      const next = settings.savedFrames.filter((f) => f !== url);
      return persist({
        ...settings,
        savedFrames: next,
        activeFrameUrl: settings.activeFrameUrl === url ? DEFAULT_FRAME : settings.activeFrameUrl,
      });
    },
    [settings, persist],
  );

  const setDisplayParams = useCallback(
    (params: Partial<FrameDisplayParams>) =>
      persist({ ...settings, displayParams: { ...settings.displayParams, ...params } }),
    [settings, persist],
  );

  const resetDisplayParams = useCallback(
    () => persist({ ...settings, displayParams: { ...DEFAULT_FRAME_DISPLAY } }),
    [settings, persist],
  );

  return {
    frameUrl: settings.activeFrameUrl,
    savedFrames: settings.savedFrames,
    displayParams: settings.displayParams,
    loading,
    setActiveFrame,
    addFrame,
    removeFrame,
    setDisplayParams,
    resetDisplayParams,
  };
}
