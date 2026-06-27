import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { Personnel } from '@/types/domain';
import { useMediaUrlResolution } from '@/hooks/useResolvedMediaUrl';
import { useAudioStore } from '@/hooks/useAudioStore';
import { playPortraitPreloadSound } from '@/lib/playPortraitPreloadSound';
import { cn } from '@/lib/utils';

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
        'group relative overflow-hidden rounded-2xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 w-full shadow-lg animate-fade-up',
        isLightMode
          ? 'bg-white border-slate-200 hover:shadow-xl hover:border-slate-300'
          : 'bg-slate-950 border-slate-800 hover:shadow-2xl hover:border-slate-700'
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
      {/* Top tri-service strip */}
      <div className="absolute inset-x-0 top-0 h-[4px] flex z-20 rounded-t-2xl">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      {/* Main card body */}
      <div className="p-3 pb-0 flex-1 flex flex-col w-full">

        {/* Photo frame with red/white border */}
        <div className="w-full aspect-[3/4] rounded-lg border-[3px] border-white relative overflow-hidden shadow-md bg-white">
          {/* Inner decorative border */}
          <div className="absolute inset-[3px] border border-slate-200 rounded pointer-events-none z-10" />

          {showPreload && <PortraitCardPreload isLightMode={isLightMode} />}

          {showPermanentPlaceholder && !showPreload && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <Shield
                strokeWidth={1.15}
                className="h-16 w-16 text-slate-300 animate-pulse"
              />
            </div>
          )}

          {resolvedImageUrl && (
            <img
              src={resolvedImageUrl}
              alt={person.name}
              className={cn(
                'relative z-[1] w-full h-full object-cover object-top transition-opacity duration-500 ease-out',
                imageReady ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageReady(true)}
              onError={() => setImageReady(true)}
            />
          )}
        </div>

        {/* Name and title below photo */}
        <div className="text-center mt-2.5 px-1">
          {person.title && (
            <p className="text-[9px] text-slate-500 italic leading-tight line-clamp-2">
              {person.title}
            </p>
          )}
        </div>
      </div>

      {/* Navy blue info box */}
      <div className="mx-3 mt-2 mb-1 bg-[#002060] rounded-lg p-3 text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">
        {person.rank && (
          <p className="text-[#FFD700] text-xs md:text-sm font-serif font-extrabold leading-tight">
            {person.rank}
          </p>
        )}
        <p className="text-[#FFD700] text-xs md:text-sm font-serif font-extrabold leading-tight">
          {person.name}
        </p>

        <p className="text-white/70 text-[8px] md:text-[9px] font-bold tracking-widest uppercase mt-1.5">
          {person.service || 'NIGERIAN ARMED FORCES'}
        </p>

        {person.periodStart && (
          <p className="text-white/70 text-[8px] md:text-[9px] font-bold tracking-widest uppercase mt-0.5">
            YEAR: {person.periodStart} – {person.periodEnd || 'PRESENT'}
          </p>
        )}
      </div>

      {/* Tap to open */}
      <div className="py-2.5 text-center text-[9px] sm:text-[10px] font-extrabold tracking-wider text-sky-600 uppercase">
        TAP TO OPEN FULL DETAILS
      </div>

      {/* Bottom tri-service strip */}
      <div className="absolute inset-x-0 bottom-0 h-[4px] flex z-20 rounded-b-2xl">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
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

  useEffect(() => {
    if (!enablePreloadSound || !allLoaded || soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    void playPortraitPreloadSound(preloadTrackId);
  }, [allLoaded, enablePreloadSound, preloadTrackId]);

  return (
    <div className="relative space-y-3">
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-7 max-w-[1400px] mx-auto">
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
