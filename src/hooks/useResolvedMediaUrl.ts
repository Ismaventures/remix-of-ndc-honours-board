import { useEffect, useMemo, useState } from 'react';
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

async function resolveMediaSource(source: string): Promise<string | null> {
  const cached = resolvedMediaUrlCache.get(source);
  if (cached) {
    return cached;
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

  if (next) {
    cacheResolvedMediaUrl(source, next);
  }

  return next;
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

      const next = await resolveMediaSource(source);
      if (disposed) {
        return;
      }

      if (next) {
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

export function useResolvedMediaUrls(sources?: Array<string | null | undefined>) {
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);
  const normalizedSources = useMemo(
    () => (sources ?? []).filter((source): source is string => Boolean(source && source.trim())),
    [sources],
  );
  const sourceKey = normalizedSources.join('||');

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      if (normalizedSources.length === 0) {
        setResolvedUrls([]);
        return;
      }

      const next = await Promise.all(normalizedSources.map((source) => resolveMediaSource(source)));
      if (disposed) {
        return;
      }

      setResolvedUrls(next.filter((url): url is string => Boolean(url)));
    };

    load();

    return () => {
      disposed = true;
    };
  }, [sourceKey, normalizedSources]);

  return resolvedUrls;
}
