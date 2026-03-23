import { useEffect } from "react";
import { cinematicAudioManager } from "@/lib/cinematicAudioManager";

interface UseCinematicAudioOptions {
  ambientEnabled?: boolean;
  ambientFadeInMs?: number;
  ambientFadeOutMs?: number;
}

export function useCinematicAudio(options: UseCinematicAudioOptions = {}) {
  const {
    ambientEnabled = false,
    ambientFadeInMs = 2400,
    ambientFadeOutMs = 1800,
  } = options;

  useEffect(() => {
    if (!ambientEnabled) {
      cinematicAudioManager.stopAmbient(ambientFadeOutMs);
      return;
    }
    cinematicAudioManager.playAmbient(ambientFadeInMs);
    return () => {
      cinematicAudioManager.stopAmbient(ambientFadeOutMs);
    };
  }, [ambientEnabled, ambientFadeInMs, ambientFadeOutMs]);

  return {
    playWhoosh: () => cinematicAudioManager.playWhoosh(),
    playChime: () => cinematicAudioManager.playChime(),
    playAmbient: (fadeInMs?: number) => cinematicAudioManager.playAmbient(fadeInMs),
    stopAmbient: (fadeOutMs?: number) => cinematicAudioManager.stopAmbient(fadeOutMs),
    setWhooshCooldown: (ms: number) => cinematicAudioManager.setWhooshCooldown(ms),
    setAmbientLevel: (level: number) => cinematicAudioManager.setAmbientLevel(level),
  };
}
