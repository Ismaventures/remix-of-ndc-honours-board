import { useEffect, useState, useRef } from "react";
import { useAudioStore, getAudioUrl } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import { PreBootVault } from "./PreBootVault";

const DEFAULT_DURATION_MS = 10_000;

export function BootSequence({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const assignments = useAudioStore((s) => s.assignments);
  const tracks = useAudioStore((s) => s.tracks);
  const loadTracks = useAudioStore((s) => s.loadTracks);
  const setMuted = useAudioStore((s) => s.setMuted);
  const [leaving, setLeaving] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(DEFAULT_DURATION_MS);
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

    const hasTrack = tracks.some((t) => t.id === preloaderId);
    if (!hasTrack) return;

    // Detect audio duration via a temporary Audio element
    (async () => {
      try {
        const url = await getAudioUrl(preloaderId);
        if (url) {
          const tempAudio = new Audio();
          tempAudio.src = url;
          await new Promise<void>((resolve) => {
            tempAudio.addEventListener("loadedmetadata", () => {
              if (tempAudio.duration && Number.isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                setAudioDuration(tempAudio.duration * 1000);
              }
              resolve();
            });
            tempAudio.addEventListener("error", () => resolve());
            // Fallback if metadata never fires
            setTimeout(resolve, 3000);
          });
          tempAudio.src = "";
        }
      } catch {
        // Fall back to default duration
      }
    })();

    // Start the actual preloader audio through AudioManager
    playAudioTrack(preloaderId, true, false, { fadeMs: 420 });
  }, [assignments.preloader, tracks]);

  const handleProgressComplete = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 1200);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000a1a] overflow-hidden transition-all duration-[1200ms] ease-out ${
        leaving ? "opacity-0 scale-[1.05] blur-[4px] pointer-events-none" : "opacity-100 scale-100 blur-none"
      }`}
    >
      <PreBootVault onComplete={handleProgressComplete} durationMs={audioDuration} />
    </div>
  );
}
