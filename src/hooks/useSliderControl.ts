import { useCallback, useEffect, useRef, useState } from "react";

interface UseSliderControlOptions {
  resumeAfterMs?: number;
}

export function useSliderControl(options: UseSliderControlOptions = {}) {
  const { resumeAfterMs = 4000 } = options;
  const [isHovering, setIsHovering] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResumeTimer = useCallback(() => {
    if (!resumeTimerRef.current) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  const registerInteraction = useCallback(() => {
    setIsInteracting(true);
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, resumeAfterMs);
  }, [clearResumeTimer, resumeAfterMs]);

  const setHovering = useCallback((hovering: boolean) => {
    setIsHovering(hovering);
    if (!hovering) {
      setIsInteracting(false);
      clearResumeTimer();
    } else {
      setIsInteracting(true);
      clearResumeTimer();
    }
  }, [clearResumeTimer]);

  useEffect(() => {
    return () => {
      clearResumeTimer();
    };
  }, [clearResumeTimer]);

  return {
    isPaused: isHovering || isInteracting,
    isHovering,
    isInteracting,
    setHovering,
    registerInteraction,
  };
}
