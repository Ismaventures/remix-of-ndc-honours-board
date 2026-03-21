import { get, set } from 'idb-keyval';

const MEDIA_KEY_PREFIX = 'media_';
const MEDIA_URL_PREFIX = 'idb-media://';

interface StoredMedia {
  buffer: ArrayBuffer;
  type: string;
}

export function isPersistentMediaRef(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith(MEDIA_URL_PREFIX);
}

export async function saveMediaFile(file: File): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const buffer = await file.arrayBuffer();

  await set(`${MEDIA_KEY_PREFIX}${id}`, {
    buffer,
    type: file.type || 'application/octet-stream',
  } satisfies StoredMedia);

  return `${MEDIA_URL_PREFIX}${id}`;
}

export async function resolveMediaRefToObjectUrl(ref: string): Promise<string | null> {
  if (!isPersistentMediaRef(ref)) return ref;

  const id = ref.slice(MEDIA_URL_PREFIX.length);
  const stored = await get<StoredMedia>(`${MEDIA_KEY_PREFIX}${id}`);
  if (!stored) return null;

  const blob = new Blob([stored.buffer], { type: stored.type || 'application/octet-stream' });
  return URL.createObjectURL(blob);
}
