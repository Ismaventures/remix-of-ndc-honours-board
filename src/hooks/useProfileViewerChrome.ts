import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

const CONTROLS_IDLE_MS = 3000;
const SWIPE_THRESHOLD_PX = 50;

export function useProfileViewerChrome({
  enabled,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  enabled: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [navVisible, setNavVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const revealNav = useCallback(() => {
    if (!enabled) return;
    setNavVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setNavVisible(false), CONTROLS_IDLE_MS);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setNavVisible(false);
      return;
    }
    revealNav();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [enabled, revealNav]);

  const onTouchStart = useCallback((clientX: number, clientY: number) => {
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    revealNav();
  }, [revealNav]);

  const onTouchEnd = useCallback((clientX: number, clientY: number) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (startX === null || startY === null) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    revealNav();
    if (deltaX < 0 && hasNext) {
      onNext();
    } else if (deltaX > 0 && hasPrev) {
      onPrev();
    }
  }, [hasNext, hasPrev, onNext, onPrev, revealNav]);

  const containerProps = {
    onPointerDown: revealNav,
    onMouseMove: revealNav,
    onTouchStart: (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) onTouchStart(touch.clientX, touch.clientY);
    },
    onTouchEnd: (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) onTouchEnd(touch.clientX, touch.clientY);
    },
  };

  return {
    navVisible,
    revealNav,
    containerProps,
  };
}
