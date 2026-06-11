import { useEffect, useMemo } from 'react';
import { Category } from '@/types/domain';
import { useAudioStore } from '@/hooks/useAudioStore';
import {
  playProfileSectionAudio,
  resolveCommandantSectionTrack,
  resolvePersonnelSectionTrack,
  stopProfileSectionAudio,
} from '@/lib/profileSectionAudio';

export function useProfileSectionAudioSession(
  trackId: string | null,
  enabled = true,
) {
  const stableTrackId = useMemo(() => trackId, [trackId]);

  useEffect(() => {
    if (!enabled || !stableTrackId) return;
    playProfileSectionAudio(stableTrackId);
    return () => {
      stopProfileSectionAudio();
    };
  }, [enabled, stableTrackId]);
}

export function usePersonnelProfileAudio(category: Category) {
  const audioAssignments = useAudioStore((state) => state.assignments);
  const trackId = useMemo(
    () => resolvePersonnelSectionTrack(category, audioAssignments),
    [category, audioAssignments],
  );
  useProfileSectionAudioSession(trackId);
}

export function useCommandantProfileAudio() {
  const audioAssignments = useAudioStore((state) => state.assignments);
  const trackId = useMemo(
    () => resolveCommandantSectionTrack(audioAssignments),
    [audioAssignments],
  );
  useProfileSectionAudioSession(trackId);
}
