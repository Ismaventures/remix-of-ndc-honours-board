import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { set, get, del, keys } from 'idb-keyval';

export interface AudioTrack {
  id: string; // uuid or timestamp
  name: string; // label
  filename: string; // original filename
}

export interface AudioAssignments {
  preloader: string | null;
  globalAuto: string | null;
  distinguished_fellows_fwc: string | null;
  distinguished_fellows_fdc: string | null;
  directing_staff: string | null;
  allied_officers: string | null;
}

interface AudioState {
  tracks: AudioTrack[];
  assignments: AudioAssignments;
  masterVolume: number;
  isMuted: boolean;
  addTrack: (file: File, name: string) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  renameTrack: (id: string, newName: string) => void;
  setAssignment: (context: keyof AudioAssignments, trackId: string | null) => void;
  setMasterVolume: (val: number) => void;
  toggleMute: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (setStore, getStore) => ({
      tracks: [],
      assignments: {
        preloader: null,
        globalAuto: null,
        distinguished_fellows_fwc: null,
        distinguished_fellows_fdc: null,
        directing_staff: null,
        allied_officers: null,
      },
      masterVolume: 0.3, // defaults 30%
      isMuted: true, // Default muted as requested
      
      addTrack: async (file: File, name: string) => {
        const id = Date.now().toString();
        
        // Convert to ArrayBuffer for idb storage to mock local file system storage
        const buffer = await file.arrayBuffer();
        await set(`audio_${id}`, buffer);
        
        setStore((state) => ({
          tracks: [...state.tracks, { id, name, filename: file.name }]
        }));
      },
      
      deleteTrack: async (id: string) => {
        await del(`audio_${id}`);
        setStore((state) => {
          // Remove from assignments if deleted
          const newAssign = { ...state.assignments };
          Object.keys(newAssign).forEach((k) => {
            const key = k as keyof AudioAssignments;
            if (newAssign[key] === id) newAssign[key] = null;
          });
          
          return {
            tracks: state.tracks.filter(t => t.id !== id),
            assignments: newAssign
          };
        });
      },
      
      renameTrack: (id: string, newName: string) => {
        setStore((state) => ({
          tracks: state.tracks.map(t => t.id === id ? { ...t, name: newName } : t)
        }));
      },
      
      setAssignment: (context, trackId) => {
        setStore((state) => ({
          assignments: { ...state.assignments, [context]: trackId }
        }));
      },
      
      setMasterVolume: (val) => setStore({ masterVolume: val }),
      toggleMute: () => setStore((state) => ({ isMuted: !state.isMuted }))
    }),
    {
      name: 'military-audio-storage',
    }
  )
);

// Helper to retrieve the actual blob URL for playback
export async function getAudioUrl(id: string): Promise<string | null> {
  try {
    const buffer = await get(`audio_${id}`);
    if (!buffer) return null;
    const blob = new Blob([buffer]);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to load audio from idb", e);
    return null;
  }
}
