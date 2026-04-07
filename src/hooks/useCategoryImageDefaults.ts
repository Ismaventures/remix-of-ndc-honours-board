import { useCallback, useEffect, useState } from "react";
import { loadUiSetting, saveUiSetting } from "@/lib/uiSettingsStorage";

const SETTING_KEY = "category_image_defaults";

export interface CategoryImageDefaults {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  opacity?: number;
  hueRotate?: number;
  sepia?: number;
  blur?: number;
  warmth?: number;
  bgPreset?: string;
  bgCustomUrl?: string;
  depthZ?: number;
  perspective?: number;
  objectInset?: number;
  freeRotation?: boolean;
  animation?: string;
  animationSpeed?: number;
  bgFade?: number;
}

/** Map of collection_id → image settings defaults */
type CategoryImageDefaultsMap = Record<string, CategoryImageDefaults>;

export function useCategoryImageDefaults() {
  const [defaultsMap, setDefaultsMap] = useState<CategoryImageDefaultsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadUiSetting<CategoryImageDefaultsMap>(SETTING_KEY).then((saved) => {
      if (cancelled) return;
      if (saved) setDefaultsMap(saved);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const getDefaults = useCallback(
    (collectionId: string): CategoryImageDefaults | undefined =>
      defaultsMap[collectionId],
    [defaultsMap],
  );

  const setDefaults = useCallback(
    async (collectionId: string, defaults: CategoryImageDefaults) => {
      const next = { ...defaultsMap, [collectionId]: defaults };
      setDefaultsMap(next);
      await saveUiSetting(SETTING_KEY, next);
    },
    [defaultsMap],
  );

  const clearDefaults = useCallback(
    async (collectionId: string) => {
      const next = { ...defaultsMap };
      delete next[collectionId];
      setDefaultsMap(next);
      await saveUiSetting(SETTING_KEY, next);
    },
    [defaultsMap],
  );

  return { defaultsMap, loading, getDefaults, setDefaults, clearDefaults };
}
