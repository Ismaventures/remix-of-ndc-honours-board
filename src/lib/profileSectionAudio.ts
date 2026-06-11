import { useEffect, useMemo } from 'react';
import { playAudioTrack } from '@/components/AudioManager';
import { AudioAssignments } from '@/hooks/useAudioStore';
import { Category } from '@/types/domain';

export function resolvePersonnelSectionTrack(
  category: Category,
  assignments: AudioAssignments,
): string | null {
  switch (category) {
    case 'FWC':
      return assignments.distinguished_fellows_fwc ?? assignments.globalAuto;
    case 'FDC':
      return assignments.distinguished_fellows_fdc ?? assignments.globalAuto;
    case 'Allied':
      return assignments.allied_officers ?? assignments.globalAuto;
    case 'Directing Staff':
      return assignments.directing_staff ?? assignments.globalAuto;
    default:
      return assignments.globalAuto;
  }
}

export function resolveCommandantSectionTrack(assignments: AudioAssignments): string | null {
  return assignments.globalAuto;
}

/** Start section music once — plays through without looping; not restarted when swiping profiles. */
export function playProfileSectionAudio(trackId: string | null) {
  if (!trackId) return;
  playAudioTrack(trackId, false, true, { fadeMs: 480, loop: false });
}

/** Stop section music when the user exits full biography view. */
export function stopProfileSectionAudio() {
  playAudioTrack(null, false, false, { fadeMs: 650 });
}
