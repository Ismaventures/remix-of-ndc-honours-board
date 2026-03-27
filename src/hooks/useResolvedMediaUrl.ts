import { useEffect, useState } from 'react';
import { resolveMediaRefToObjectUrl } from '@/lib/persistentMedia';

const RESOLVED_MEDIA_CACHE_MAX = 420;
const resolvedMediaUrlCache = new Map<string, string>();
const resolvingMediaUrlCache = new Map<string, Promise<string | null>>();

function cacheResolvedMediaUrl(source: string, url: string): void {
  if (resolvedMediaUrlCache.has(source)) {
    resolvedMediaUrlCache.delete(source);
  }

  resolvedMediaUrlCache.set(source, url);

  if (resolvedMediaUrlCache.size <= RESOLVED_MEDIA_CACHE_MAX) return;

  const oldestKey = resolvedMediaUrlCache.keys().next().value as string | undefined;
  if (!oldestKey) return;

  const oldestUrl = resolvedMediaUrlCache.get(oldestKey);
  resolvedMediaUrlCache.delete(oldestKey);

  if (oldestUrl && oldestUrl.startsWith('blob:')) {
    URL.revokeObjectURL(oldestUrl);
  }
}

export function useResolvedMediaUrl(source?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      if (!source) {
        setResolvedUrl('');
        return;
      }

      const cached = resolvedMediaUrlCache.get(source);
      if (cached) {
        setResolvedUrl(cached);
        return;
      }

      let pending = resolvingMediaUrlCache.get(source);
      if (!pending) {
        pending = resolveMediaRefToObjectUrl(source);
        resolvingMediaUrlCache.set(source, pending);
      }

      const next = await pending;
      if (resolvingMediaUrlCache.get(source) === pending) {
        resolvingMediaUrlCache.delete(source);
      }

      if (disposed) {
        return;
      }

      if (next) {
        cacheResolvedMediaUrl(source, next);
        setResolvedUrl(next);
      } else {
        setResolvedUrl('');
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [source]);

  return resolvedUrl;
}
