import { useEffect, useState } from "react";
import { useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import { PreBootVault } from "./PreBootVault";

export function BootSequence({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const assignments = useAudioStore((s) => s.assignments);
  const tracks = useAudioStore((s) => s.tracks);
  const loadTracks = useAudioStore((s) => s.loadTracks);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => { void loadTracks(); }, [loadTracks]);

  // Play preloader audio track if configured
  useEffect(() => {
    if (!assignments.preloader) return;
    const hasTrack = tracks.some((t) => t.id === assignments.preloader);
    if (!hasTrack) return;
    playAudioTrack(assignments.preloader, true, false, { fadeMs: 420 });
  }, [assignments.preloader, tracks]);

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    // Smoothly transition and call onComplete once fade-out completes
    setTimeout(() => { if (onComplete) onComplete(); }, 1200);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000a1a] overflow-hidden transition-all duration-[1200ms] ease-out ${
        leaving ? "opacity-0 scale-[1.05] blur-[4px] pointer-events-none" : "opacity-100 scale-100 blur-none"
      }`}
    >
      <PreBootVault onComplete={handleEnter} />
    </div>
  );
}
