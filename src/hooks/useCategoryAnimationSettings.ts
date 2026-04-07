import { useCallback, useEffect, useState } from "react";
import { loadUiSetting, saveUiSetting } from "@/lib/uiSettingsStorage";
import type { AnimationPreset } from "@/components/MuseumObjectViewer";

const SETTING_KEY = "category_animation_config";

export interface CategoryAnimationConfig {
  /** Animation preset key */
  animation: AnimationPreset;
  /** Speed multiplier (0.1–3, default 1) */
  speed: number;
  /** Background fade intensity (0 = off, 1–100 = intensity) */
  bgFade?: number;
}

export const DEFAULT_CATEGORY_ANIMATION: CategoryAnimationConfig = {
  animation: "turntable",
  speed: 1,
  bgFade: 55,
};

/** Map of collection_id → animation config */
type CategoryAnimationMap = Record<string, CategoryAnimationConfig>;

export function useCategoryAnimationSettings() {
  const [configMap, setConfigMap] = useState<CategoryAnimationMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadUiSetting<CategoryAnimationMap>(SETTING_KEY).then((saved) => {
      if (cancelled) return;
      if (saved) setConfigMap(saved);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const getConfig = useCallback(
    (collectionId: string): CategoryAnimationConfig =>
      configMap[collectionId] ?? DEFAULT_CATEGORY_ANIMATION,
    [configMap],
  );

  const setConfig = useCallback(
    async (collectionId: string, config: CategoryAnimationConfig) => {
      const next = { ...configMap, [collectionId]: config };
      setConfigMap(next);
      await saveUiSetting(SETTING_KEY, next);
    },
    [configMap],
  );

  /** Apply one config to multiple categories at once */
  const applyToCategories = useCallback(
    async (categoryIds: string[], config: CategoryAnimationConfig) => {
      const next = { ...configMap };
      for (const id of categoryIds) {
        next[id] = config;
      }
      setConfigMap(next);
      await saveUiSetting(SETTING_KEY, next);
    },
    [configMap],
  );

  return { configMap, loading, getConfig, setConfig, applyToCategories };
}
