import { getAudioUrl } from '@/hooks/useAudioStore';
import { playWindowsTudunSound } from '@/lib/transitionCues';

let activePreloadAudio: HTMLAudioElement | null = null;

/** Plays admin-assigned portrait preload sound, or Windows tudun fallback. */
export async function playPortraitPreloadSound(trackId: string | null | undefined) {
  if (trackId) {
    const url = await getAudioUrl(trackId);
    if (url) {
      try {
        if (activePreloadAudio) {
          activePreloadAudio.pause();
          activePreloadAudio = null;
        }
        const audio = new Audio(url);
        audio.volume = 0.9;
        activePreloadAudio = audio;
        audio.onended = () => {
          if (activePreloadAudio === audio) activePreloadAudio = null;
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        };
        await audio.play();
        return;
      } catch {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
    }
  }

  playWindowsTudunSound();
}
