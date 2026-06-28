import { useEffect, useState, useRef } from "react";
import { useAudioStore, getAudioUrl } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import { PreBootVault } from "./PreBootVault";
import { BootSequenceSettings } from "@/hooks/useBootSequenceSettings";

export function BootSequence({
  settings,
  onComplete,
}: {
  settings?: BootSequenceSettings;
  onComplete?: () => void;
}) {
  const assignments = useAudioStore((s) => s.assignments);
  const tracks = useAudioStore((s) => s.tracks);
  const loadTracks = useAudioStore((s) => s.loadTracks);
  const setMuted = useAudioStore((s) => s.setMuted);
  const [leaving, setLeaving] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  
  const defaultDuration = settings?.totalDurationMs ?? 2000;
  const [audioDuration, setAudioDuration] = useState<number>(defaultDuration);
  const startedRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => { void loadTracks(); }, [loadTracks]);

  useEffect(() => {
    setMuted(false);
  }, [setMuted]);

  // Resolve the preloader audio duration and start playing it immediately
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const preloaderId = assignments.preloader;
    if (!preloaderId) return;

    // Start the actual preloader audio through AudioManager
    playAudioTrack(preloaderId, true, false, { fadeMs: 420 });
  }, [assignments.preloader, tracks]);

  const handleProgressComplete = () => {
    if (leaving) return;
    setLeaving(true);
    const fadeDuration = isSkipped ? 250 : 1200;
    setTimeout(() => { if (onComplete) onComplete(); }, fadeDuration);
  };

  const handleSkip = () => {
    if (leaving) return;
    setIsSkipped(true);
    setLeaving(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 250);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000a1a] cursor-pointer overflow-hidden transition-all ease-out ${
        isSkipped ? "duration-[300ms]" : "duration-[1200ms]"
      } ${
        leaving ? "opacity-0 scale-[1.05] blur-[4px] pointer-events-none" : "opacity-100 scale-100 blur-none"
      }`}
    >
      <PreBootVault onComplete={handleProgressComplete} durationMs={audioDuration} />
      
      {/* Subtle indicator for user */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.25em] text-white/30 hover:text-white/60 transition-colors uppercase animate-pulse select-none">
        Click / Tap anywhere to skip intro
      </div>
    </div>
  );
}
