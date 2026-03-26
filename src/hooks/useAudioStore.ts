import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import {
  deleteAudioFromSupabase,
  getSupabaseAudioUrl,
  isSupabaseAudioReady,
  listAudioAssignmentsFromSupabase,
  listAudioTracksFromSupabase,
  renameAudioInSupabase,
  upsertAudioAssignmentToSupabase,
  uploadAudioToSupabase,
} from '@/lib/audioStorage';

export interface AudioTrack {
  id: string;
  name: string;
  filename: string;
  source?: 'local' | 'supabase';
  bucketPath?: string;
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
  loadTracks: () => Promise<void>;
  addTrack: (file: File, name: string) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  renameTrack: (id: string, newName: string) => Promise<void>;
  setAssignment: (context: keyof AudioAssignments, trackId: string | null) => void;
  setMasterVolume: (val: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
}

function normalizeStoredTrack(track: AudioTrack): AudioTrack {
  return {
    ...track,
    source: track.source ?? (track.bucketPath ? 'supabase' : 'local'),
  };
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
      masterVolume: 0.3,
      isMuted: true,

      loadTracks: async () => {
        if (!isSupabaseAudioReady()) return;

        const [remoteTracks, remoteAssignments] = await Promise.all([
          listAudioTracksFromSupabase(),
          listAudioAssignmentsFromSupabase(),
        ]);

        if (!remoteTracks.length && !remoteAssignments.length) return;

        const mappedRemote: AudioTrack[] = remoteTracks.map(track => ({
          id: track.id,
          name: track.name,
          filename: track.filename,
          source: 'supabase',
          bucketPath: track.bucketPath,
        }));

        setStore(state => {
          const localOnly = state.tracks.filter(track => normalizeStoredTrack(track).source !== 'supabase');
          const mergedById = new Map<string, AudioTrack>();

          [...localOnly, ...mappedRemote].forEach(track => {
            mergedById.set(track.id, track);
          });

          const assignmentPatch: Partial<AudioAssignments> = {};
          remoteAssignments.forEach(item => {
            const key = item.context as keyof AudioAssignments;
            if (key in state.assignments) {
              assignmentPatch[key] = item.trackId;
            }
          });

          return {
            tracks: Array.from(mergedById.values()),
            assignments: {
              ...state.assignments,
              ...assignmentPatch,
            },
          };
        });
      },

      addTrack: async (file: File, name: string) => {
        const id = Date.now().toString();

        const remoteTrack = await uploadAudioToSupabase(id, name, file);
        if (remoteTrack) {
          setStore(state => ({
            tracks: [
              ...state.tracks,
              {
                id,
                name,
                filename: file.name,
                source: 'supabase',
                bucketPath: remoteTrack.bucketPath,
              },
            ],
          }));
          return;
        }

        const buffer = await file.arrayBuffer();
        await set(`audio_${id}`, buffer);

        setStore(state => ({
          tracks: [...state.tracks, { id, name, filename: file.name, source: 'local' }],
        }));
      },

      deleteTrack: async (id: string) => {
        const target = getStore().tracks.find(track => track.id === id);
        const normalizedTarget = target ? normalizeStoredTrack(target) : null;

        if (normalizedTarget?.source === 'supabase') {
          const deleted = await deleteAudioFromSupabase(id, normalizedTarget.bucketPath);
          if (!deleted) return;
        } else {
          await del(`audio_${id}`);
        }

        setStore(state => {
          const newAssignments = { ...state.assignments };
          (Object.keys(newAssignments) as Array<keyof AudioAssignments>).forEach(key => {
            if (newAssignments[key] === id) newAssignments[key] = null;
          });

          return {
            tracks: state.tracks.filter(track => track.id !== id),
            assignments: newAssignments,
          };
        });
      },

      renameTrack: async (id: string, newName: string) => {
        const target = getStore().tracks.find(track => track.id === id);
        const normalizedTarget = target ? normalizeStoredTrack(target) : null;

        if (normalizedTarget?.source === 'supabase') {
          const renamed = await renameAudioInSupabase(id, newName);
          if (!renamed) return;
        }

        setStore(state => ({
          tracks: state.tracks.map(track =>
            track.id === id
              ? {
                  ...track,
                  name: newName,
                }
              : track
          ),
        }));
      },

      setAssignment: (context, trackId) => {
        setStore(state => ({
          assignments: {
            ...state.assignments,
            [context]: trackId,
          },
        }));

        void upsertAudioAssignmentToSupabase(context, trackId);
      },

      setMasterVolume: val => setStore({ masterVolume: val }),
      setMuted: muted => setStore({ isMuted: muted }),
      toggleMute: () => setStore(state => ({ isMuted: !state.isMuted })),
    }),
    {
      name: 'military-audio-storage',
    }
  )
);

export async function getAudioUrl(id: string): Promise<string | null> {
  try {
    const track = useAudioStore.getState().tracks.find(t => t.id === id);
    const normalizedTrack = track ? normalizeStoredTrack(track) : null;

    if (normalizedTrack?.source === 'supabase' && normalizedTrack.bucketPath) {
      const remoteUrl = await getSupabaseAudioUrl(normalizedTrack.bucketPath);
      if (remoteUrl) return remoteUrl;
    }

    const buffer = await get(`audio_${id}`);
    if (!buffer) return null;

    const blob = new Blob([buffer]);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to resolve audio URL', error);
    return null;
  }
}
