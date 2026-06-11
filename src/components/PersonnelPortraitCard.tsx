import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { Personnel } from '@/types/domain';
import { useMediaUrlResolution } from '@/hooks/useResolvedMediaUrl';
import { useAudioStore } from '@/hooks/useAudioStore';
import { playPortraitPreloadSound } from '@/lib/playPortraitPreloadSound';
import { cn } from '@/lib/utils';

export const PORTRAIT_CARD_ACCENT = (
  <div className="h-1.5 flex shrink-0">
    <div className="flex-1 bg-[#FF0000]" />
    <div className="flex-1 bg-[#00B0F0]" />
  </div>
);

function PortraitCardPreload({ isLightMode }: { isLightMode: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center overflow-hidden animate-fellow-shimmer',
        isLightMode ? 'bg-[#e8eaed]' : 'bg-slate-700/90'
      )}
    >
      <div className="relative flex flex-col items-center gap-2.5">
        <Shield
          strokeWidth={1.15}
          className={cn(
            'h-[4.5rem] w-[4.5rem] md:h-20 md:w-20',
            isLightMode
              ? 'text-[#5B9BD5]/50 fill-[#ADD8E6]/20'
              : 'text-[#00B0F0]/40 fill-[#002060]/25'
          )}
        />
        <span
          className={cn(
            'text-[9px] font-bold uppercase tracking-[0.22em]',
            isLightMode ? 'text-[#5B9BD5]/70' : 'text-white/45'
          )}
        >
          Loading portrait
        </span>
      </div>
    </div>
  );
}

export function PersonnelPortraitCard({
  person,
  isLightMode,
  onSelect,
  index = 0,
  onLoadReady,
}: {
  person: Personnel;
  isLightMode: boolean;
  onSelect: () => void;
  index?: number;
  onLoadReady?: (personId: string) => void;
}) {
  const { url: resolvedImageUrl, pending: urlPending } = useMediaUrlResolution(person.imageUrl);
  const [imageReady, setImageReady] = useState(false);
  const reportedReady = useRef(false);

  const markReady = useCallback(() => {
    if (reportedReady.current) return;
    reportedReady.current = true;
    onLoadReady?.(person.id);
  }, [onLoadReady, person.id]);

  useEffect(() => {
    reportedReady.current = false;
    setImageReady(false);
  }, [person.id, person.imageUrl]);

  useEffect(() => {
    if (urlPending) return;
    if (!person.imageUrl || !resolvedImageUrl) {
      markReady();
      return;
    }
    if (imageReady) markReady();
  }, [urlPending, person.imageUrl, resolvedImageUrl, imageReady, markReady]);

  const showPreload = urlPending || (Boolean(resolvedImageUrl) && !imageReady);
  const showPermanentPlaceholder = !urlPending && !resolvedImageUrl;

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden cursor-pointer transition-all duration-300 animate-fade-up',
        'rounded-2xl hover:shadow-[0_14px_36px_rgba(0,32,96,0.16)] hover:-translate-y-1',
        isLightMode
          ? 'bg-white border border-slate-200/80 shadow-[0_6px_20px_rgba(0,32,96,0.08)]'
          : 'bg-slate-800/95 border border-slate-600/70 shadow-[0_8px_24px_rgba(0,0,0,0.28)]'
      )}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {PORTRAIT_CARD_ACCENT}

      <div
        className={cn(
          'relative aspect-[4/5] w-full overflow-hidden flex items-center justify-center p-2.5 md:p-3',
          isLightMode ? 'bg-[#f3f4f6]' : 'bg-slate-700'
        )}
      >
        {showPreload && <PortraitCardPreload isLightMode={isLightMode} />}

        {showPermanentPlaceholder && !showPreload && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield
              strokeWidth={1.15}
              className={cn(
                'h-[4.5rem] w-[4.5rem] md:h-20 md:w-20',
                isLightMode
                  ? 'text-[#5B9BD5]/40 fill-[#ADD8E6]/15'
                  : 'text-[#00B0F0]/35 fill-[#002060]/20'
              )}
            />
          </div>
        )}

        {resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt={person.name}
            className={cn(
              'relative z-[1] max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-500 ease-out',
              imageReady ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageReady(true)}
            onError={() => setImageReady(true)}
          />
        )}
      </div>

      <div
        className={cn(
          'px-2 py-2.5 border-t',
          isLightMode ? 'bg-white border-slate-100' : 'bg-slate-900/80 border-slate-700/80'
        )}
      >
        <p
          className={cn(
            'text-[11px] md:text-xs font-bold text-center uppercase leading-snug tracking-wide line-clamp-2',
            isLightMode ? 'text-[#002060]' : 'text-white'
          )}
        >
          {person.name}
        </p>
      </div>
    </div>
  );
}

export function PersonnelPortraitGrid({
  personnel,
  isLightMode,
  onSelectPerson,
  enablePreloadSound = true,
}: {
  personnel: Personnel[];
  isLightMode: boolean;
  onSelectPerson: (person: Personnel) => void;
  enablePreloadSound?: boolean;
}) {
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const soundPlayedRef = useRef(false);
  const preloadTrackId = useAudioStore((s) => s.assignments.portrait_preload_complete);

  useEffect(() => {
    soundPlayedRef.current = false;
    setReadyIds(new Set());
  }, [personnel.map((p) => p.id).join('|')]);

  const handleLoadReady = useCallback((personId: string) => {
    setReadyIds((prev) => {
      if (prev.has(personId)) return prev;
      const next = new Set(prev);
      next.add(personId);
      return next;
    });
  }, []);

  const loadedCount = readyIds.size;
  const totalCount = personnel.length;
  const allLoaded = totalCount > 0 && loadedCount >= totalCount;
  const loadProgress = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;

  useEffect(() => {
    if (!enablePreloadSound || !allLoaded || soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    void playPortraitPreloadSound(preloadTrackId);
  }, [allLoaded, enablePreloadSound, preloadTrackId]);

  return (
    <div className="relative space-y-3">
      {!allLoaded && totalCount > 0 && (
        <div className="relative z-20 rounded-full overflow-hidden h-1.5 bg-slate-200/80 dark:bg-slate-700/80">
          <div className="h-full flex transition-all duration-500 ease-out" style={{ width: `${loadProgress}%` }}>
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#FF0000]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>
        </div>
      )}

      {allLoaded && totalCount > 0 && (
        <p
          className={cn(
            'text-center text-[10px] font-semibold uppercase tracking-[0.18em]',
            isLightMode ? 'text-[#5B9BD5]/80' : 'text-[#00B0F0]/70'
          )}
        >
          All portraits loaded
        </p>
      )}

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {personnel.map((person, index) => (
          <PersonnelPortraitCard
            key={person.id}
            person={person}
            isLightMode={isLightMode}
            onSelect={() => onSelectPerson(person)}
            index={index}
            onLoadReady={handleLoadReady}
          />
        ))}
      </div>
    </div>
  );
}
