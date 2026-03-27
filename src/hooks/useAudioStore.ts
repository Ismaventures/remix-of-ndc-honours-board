import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { del, get, keys, set } from 'idb-keyval';
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

const AUDIO_LOCAL_KEY_PREFIX = 'audio_';
const AUDIO_CACHE_KEY_PREFIX = 'audio_cache_';
const AUDIO_CACHE_TTL_MS = 73 * 60 * 60 * 1000;
const AUDIO_CACHE_MAX_ENTRIES = 180;

let audioCacheCleanupScheduled = false;

interface AudioCacheEntry {
  buffer: ArrayBuffer;
  cachedAt: number;
  sourceKey: string;
}

function isAudioCacheEntry(value: unknown): value is AudioCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AudioCacheEntry>;
  return (
    candidate.buffer instanceof ArrayBuffer &&
    typeof candidate.cachedAt === 'number' &&
    typeof candidate.sourceKey === 'string'
  );
}

function isFreshAudioCache(entry: AudioCacheEntry, sourceKey: string): boolean {
  if (entry.sourceKey !== sourceKey) return false;
  return Date.now() - entry.cachedAt <= AUDIO_CACHE_TTL_MS;
}

async function cleanupAudioCacheEntries(): Promise<void> {
  try {
    const allKeys = await keys();
    const cacheKeys = allKeys.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.startsWith(AUDIO_CACHE_KEY_PREFIX),
    );

    if (cacheKeys.length === 0) return;

    const validEntries: Array<{ key: string; cachedAt: number }> = [];

    for (const key of cacheKeys) {
      const cached = await get<unknown>(key);
      if (!isAudioCacheEntry(cached)) {
        await del(key);
        continue;
      }

      if (!isFreshAudioCache(cached, cached.sourceKey)) {
        await del(key);
        continue;
      }

      validEntries.push({ key, cachedAt: cached.cachedAt });
    }

    if (validEntries.length <= AUDIO_CACHE_MAX_ENTRIES) return;

    validEntries.sort((a, b) => b.cachedAt - a.cachedAt);
    const overflow = validEntries.slice(AUDIO_CACHE_MAX_ENTRIES);
    await Promise.allSettled(overflow.map((entry) => del(entry.key)));
  } catch {
    // Best-effort cleanup.
  }
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
        if (!audioCacheCleanupScheduled) {
          audioCacheCleanupScheduled = true;
          void cleanupAudioCacheEntries();
        }

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

        await del(`${AUDIO_CACHE_KEY_PREFIX}${id}`);

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

    const sourceKey = normalizedTrack?.bucketPath ?? `local:${id}`;
    const cachedValue = await get<unknown>(`${AUDIO_CACHE_KEY_PREFIX}${id}`);
    if (isAudioCacheEntry(cachedValue) && cachedValue.sourceKey === sourceKey) {
      if (!isFreshAudioCache(cachedValue, sourceKey)) {
        void prefetchAudioTrack(id);
      }
      return URL.createObjectURL(new Blob([cachedValue.buffer]));
    }

    if (cachedValue && !isAudioCacheEntry(cachedValue)) {
      await del(`${AUDIO_CACHE_KEY_PREFIX}${id}`);
    }

    if (normalizedTrack?.source === 'supabase' && normalizedTrack.bucketPath) {
      const remoteUrl = await getSupabaseAudioUrl(normalizedTrack.bucketPath);
      if (remoteUrl) {
        // Return stream URL immediately for fastest start, cache in background.
        void prefetchAudioTrack(id);
        return remoteUrl;
      }
    }

    const buffer = await get(`${AUDIO_LOCAL_KEY_PREFIX}${id}`);
    if (!buffer) return null;

    const blob = new Blob([buffer]);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to resolve audio URL', error);
    return null;
  }
}

export async function prefetchAudioTrack(id: string): Promise<void> {
  try {
    const track = useAudioStore.getState().tracks.find(t => t.id === id);
    const normalizedTrack = track ? normalizeStoredTrack(track) : null;
    if (!normalizedTrack) return;

    const sourceKey = normalizedTrack.bucketPath ?? `local:${id}`;
    const cacheKey = `${AUDIO_CACHE_KEY_PREFIX}${id}`;
    const cachedValue = await get<unknown>(cacheKey);
    if (isAudioCacheEntry(cachedValue) && cachedValue.sourceKey === sourceKey && isFreshAudioCache(cachedValue, sourceKey)) {
      return;
    }

    if (cachedValue && (!isAudioCacheEntry(cachedValue) || (isAudioCacheEntry(cachedValue) && cachedValue.sourceKey !== sourceKey))) {
      await del(cacheKey);
    }

    if (normalizedTrack.source !== 'supabase' || !normalizedTrack.bucketPath) return;

    const remoteUrl = await getSupabaseAudioUrl(normalizedTrack.bucketPath);
    if (!remoteUrl) return;

    const response = await fetch(remoteUrl, { cache: 'force-cache' });
    if (!response.ok) return;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      const payload: AudioCacheEntry = {
        buffer: arrayBuffer,
        cachedAt: Date.now(),
        sourceKey,
      };
      await set(cacheKey, payload);
    }
  } catch {
    // Prefetch is best-effort and should not interrupt normal playback.
  }
}
