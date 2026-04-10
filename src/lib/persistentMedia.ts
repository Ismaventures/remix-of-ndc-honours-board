import { del, get, keys, set } from 'idb-keyval';
import { supabase } from './supabaseClient';

const MEDIA_KEY_PREFIX = 'media_';
const MEDIA_URL_PREFIX = 'idb-media://';
const MEDIA_FALLBACK_DELIMITER = '::';
const MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET || 'ndc-media';
const AUDIO_BUCKET = import.meta.env.VITE_SUPABASE_AUDIO_BUCKET || 'ndc-audio';
const REMOTE_MEDIA_KEY_PREFIX = 'remote_media_';
export const REMOTE_MEDIA_CACHE_TTL_MS = 73 * 60 * 60 * 1000;
const REMOTE_MEDIA_MAX_ENTRIES = 600;
const FREE_IMAGE_PROXY_BASE = 'https://images.weserv.nl/';
const ENABLE_FREE_IMAGE_PROXY = import.meta.env.VITE_ENABLE_FREE_IMAGE_PROXY !== 'false';

let mediaCleanupScheduled = false;

interface StoredMedia {
  buffer: ArrayBuffer;
  type: string;
}

interface StoredRemoteMedia extends StoredMedia {
  sourceUrl: string;
  cachedAt: number;
}

interface ParsedMediaRef {
  localRef: string;
  publicUrl: string | null;
}

function toAbsoluteHttpUrl(ref: string): string | null {
  try {
    const url = new URL(ref, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hashRef(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
}

function toRemoteMediaKey(url: string): string {
  return `${REMOTE_MEDIA_KEY_PREFIX}${hashRef(url)}`;
}

function normalizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isSupabaseMediaReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

function parsePersistentMediaRef(ref: string): ParsedMediaRef | null {
  if (!ref.startsWith(MEDIA_URL_PREFIX)) return null;

  const [localRef, publicUrlRaw] = ref.split(MEDIA_FALLBACK_DELIMITER, 2);
  const publicUrl = publicUrlRaw && toAbsoluteHttpUrl(publicUrlRaw) ? publicUrlRaw : null;
  return { localRef, publicUrl };
}

function composePersistentMediaRef(localRef: string, publicUrl: string | null): string {
  if (!publicUrl) return localRef;
  return `${localRef}${MEDIA_FALLBACK_DELIMITER}${publicUrl}`;
}

async function uploadMediaToSupabase(id: string, file: File): Promise<string | null> {
  if (!isSupabaseMediaReady()) return null;

  const safeFilename = normalizeFilename(file.name || `${id}.bin`);
  const isAudioFile = file.type.startsWith('audio/');
  const bucket = isAudioFile ? AUDIO_BUCKET : MEDIA_BUCKET;
  const path = `${isAudioFile ? 'tracks' : 'images'}/${id}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '31536000',
    });

  if (uploadError) {
    console.error(`Supabase media upload failed (bucket: ${bucket}):`, uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function toOptimizedRemoteImageUrl(url: string): string {
  if (!ENABLE_FREE_IMAGE_PROXY) return url;

  try {
    const parsed = new URL(url);
    const isSupabaseAsset = parsed.hostname.endsWith('.supabase.co');
    if (!isSupabaseAsset) return url;

    const proxyTarget = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
    const params = new URLSearchParams({
      url: proxyTarget,
      w: '1600',
      q: '82',
      output: 'webp',
    });

    return `${FREE_IMAGE_PROXY_BASE}?${params.toString()}`;
  } catch {
    return url;
  }
}

function isRemoteMediaFresh(cachedAt: number): boolean {
  return Date.now() - cachedAt <= REMOTE_MEDIA_CACHE_TTL_MS;
}

function isStoredRemoteMedia(value: unknown): value is StoredRemoteMedia {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredRemoteMedia>;
  return (
    candidate.buffer instanceof ArrayBuffer &&
    typeof candidate.type === 'string' &&
    typeof candidate.sourceUrl === 'string' &&
    typeof candidate.cachedAt === 'number'
  );
}

async function cleanupRemoteMediaCache(): Promise<void> {
  try {
    const allKeys = await keys();
    const mediaKeys = allKeys.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.startsWith(REMOTE_MEDIA_KEY_PREFIX),
    );

    if (mediaKeys.length === 0) return;

    const validEntries: Array<{ key: string; cachedAt: number }> = [];

    for (const key of mediaKeys) {
      const cached = await get<unknown>(key);
      if (!isStoredRemoteMedia(cached)) {
        await del(key);
        continue;
      }

      if (!isRemoteMediaFresh(cached.cachedAt)) {
        await del(key);
        continue;
      }

      validEntries.push({ key, cachedAt: cached.cachedAt });
    }

    if (validEntries.length <= REMOTE_MEDIA_MAX_ENTRIES) return;

    validEntries.sort((a, b) => b.cachedAt - a.cachedAt);
    const overflow = validEntries.slice(REMOTE_MEDIA_MAX_ENTRIES);
    await Promise.allSettled(overflow.map((entry) => del(entry.key)));
  } catch {
    // Best-effort cleanup.
  }
}

async function fetchAndPersistRemoteMedia(url: string): Promise<StoredRemoteMedia | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) return null;

    const payload: StoredRemoteMedia = {
      buffer,
      type: response.headers.get('content-type') || 'application/octet-stream',
      sourceUrl: url,
      cachedAt: Date.now(),
    };

    await set(toRemoteMediaKey(url), payload);
    return payload;
  } catch {
    return null;
  }
}

async function resolveRemoteMediaRefToObjectUrl(ref: string): Promise<string> {
  const absoluteUrl = toAbsoluteHttpUrl(ref);
  if (!absoluteUrl) return ref;

  const requestUrl = toOptimizedRemoteImageUrl(absoluteUrl);

  const key = toRemoteMediaKey(requestUrl);
  const cached = await get<StoredRemoteMedia>(key);

  if (cached?.sourceUrl === requestUrl && isRemoteMediaFresh(cached.cachedAt)) {
    return URL.createObjectURL(new Blob([cached.buffer], { type: cached.type || 'application/octet-stream' }));
  }

  if (cached?.sourceUrl === requestUrl) {
    // Serve stale cache first for resilient rendering, then refresh best-effort.
    if (!isRemoteMediaFresh(cached.cachedAt)) {
      void fetchAndPersistRemoteMedia(requestUrl);
    }
    return URL.createObjectURL(new Blob([cached.buffer], { type: cached.type || 'application/octet-stream' }));
  }

  if (cached) await del(key);

  const refreshed = await fetchAndPersistRemoteMedia(requestUrl);
  if (!refreshed) return ref;

  return URL.createObjectURL(new Blob([refreshed.buffer], { type: refreshed.type || 'application/octet-stream' }));
}

export async function prefetchMediaReferences(refs: Array<string | null | undefined>): Promise<void> {
  if (!mediaCleanupScheduled) {
    mediaCleanupScheduled = true;
    void cleanupRemoteMediaCache();
  }

  const uniqueRefs = Array.from(
    new Set(
      refs
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim()),
    ),
  );

  const warm = async (ref: string) => {
    const parsedPersistentRef = parsePersistentMediaRef(ref);
    if (parsedPersistentRef) {
      if (!parsedPersistentRef.publicUrl) return;
      const warmRef = parsedPersistentRef.publicUrl;

      const absoluteUrl = toAbsoluteHttpUrl(warmRef);
      if (!absoluteUrl) return;

      const requestUrl = toOptimizedRemoteImageUrl(absoluteUrl);

      const key = toRemoteMediaKey(requestUrl);
      const cached = await get<StoredRemoteMedia>(key);
      if (cached?.sourceUrl === requestUrl && isRemoteMediaFresh(cached.cachedAt)) return;
      if (cached && cached.sourceUrl !== requestUrl) {
        await del(key);
      }

      await fetchAndPersistRemoteMedia(requestUrl);
      return;
    }

    const absoluteUrl = toAbsoluteHttpUrl(ref);
    if (!absoluteUrl) return;

    const requestUrl = toOptimizedRemoteImageUrl(absoluteUrl);

    const key = toRemoteMediaKey(requestUrl);
    const cached = await get<StoredRemoteMedia>(key);
    if (cached?.sourceUrl === requestUrl && isRemoteMediaFresh(cached.cachedAt)) return;
    if (cached && cached.sourceUrl !== requestUrl) {
      await del(key);
    }

    await fetchAndPersistRemoteMedia(requestUrl);
  };

  for (let i = 0; i < uniqueRefs.length; i += 4) {
    const batch = uniqueRefs.slice(i, i + 4);
    await Promise.allSettled(batch.map((ref) => warm(ref)));
  }
}

export function isPersistentMediaRef(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith(MEDIA_URL_PREFIX);
}

export async function saveMediaFile(file: File): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const buffer = await file.arrayBuffer();
  const localRef = `${MEDIA_URL_PREFIX}${id}`;

  await set(`${MEDIA_KEY_PREFIX}${id}`, {
    buffer,
    type: file.type || 'application/octet-stream',
  } satisfies StoredMedia);

  const publicUrl = await uploadMediaToSupabase(id, file);
  return composePersistentMediaRef(localRef, publicUrl);
}

export async function resolveMediaRefToObjectUrl(ref: string): Promise<string | null> {
  const parsedPersistentRef = parsePersistentMediaRef(ref);
  if (!parsedPersistentRef) {
    return resolveRemoteMediaRefToObjectUrl(ref);
  }

  const id = parsedPersistentRef.localRef.slice(MEDIA_URL_PREFIX.length);
  const stored = await get<StoredMedia>(`${MEDIA_KEY_PREFIX}${id}`);
  if (!stored) {
    if (!parsedPersistentRef.publicUrl) return null;
    return resolveRemoteMediaRefToObjectUrl(parsedPersistentRef.publicUrl);
  }

  const blob = new Blob([stored.buffer], { type: stored.type || 'application/octet-stream' });
  return URL.createObjectURL(blob);
}
