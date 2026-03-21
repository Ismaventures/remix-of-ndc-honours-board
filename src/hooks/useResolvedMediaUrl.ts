import { useEffect, useState } from 'react';
import { resolveMediaRefToObjectUrl } from '@/lib/persistentMedia';

export function useResolvedMediaUrl(source?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    let disposed = false;
    let objectUrlToRevoke: string | null = null;

    const load = async () => {
      if (!source) {
        setResolvedUrl('');
        return;
      }

      const next = await resolveMediaRefToObjectUrl(source);
      if (disposed) {
        if (next && next.startsWith('blob:')) {
          URL.revokeObjectURL(next);
        }
        return;
      }

      setResolvedUrl(next ?? '');
      if (next && next.startsWith('blob:')) {
        objectUrlToRevoke = next;
      }
    };

    load();

    return () => {
      disposed = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [source]);

  return resolvedUrl;
}
