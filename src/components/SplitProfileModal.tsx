import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useProfileViewerChrome } from '@/hooks/useProfileViewerChrome';
import { cn } from '@/lib/utils';

interface SplitProfileModalProps {
  slideKey: string;
  slideDir: 'left' | 'right' | null;
  currentIndex: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
  children: ReactNode;
  getItemLabel?: (index: number) => string;
}

export function SplitProfileModal({
  slideKey,
  slideDir,
  currentIndex,
  totalCount,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
  children,
  getItemLabel,
}: SplitProfileModalProps) {
  const [portalReady, setPortalReady] = useState(false);
  const { navVisible, revealNav, containerProps } = useProfileViewerChrome({
    enabled: true,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
  });

  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  const handlePrev = useCallback(() => {
    revealNav();
    onPrev();
  }, [onPrev, revealNav]);

  const handleNext = useCallback(() => {
    revealNav();
    onNext();
  }, [onNext, revealNav]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      revealNav();
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) handlePrev();
      if (e.key === 'ArrowRight' && hasNext) handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, hasPrev, hasNext, handlePrev, handleNext, revealNav]);

  if (!portalReady) return null;

  const navButtonClass = cn(
    'absolute top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 rounded-full',
    'bg-slate-900/10 hover:bg-slate-900/20 border border-slate-900/20 hover:border-slate-900/40 backdrop-blur-sm',
    'transition-all duration-500 group/nav',
    navVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-white text-slate-900 flex flex-col modal-backdrop-enter overflow-hidden"
      onClick={onClose}
      {...containerProps}
    >
      <div className="relative flex-1 min-h-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-50 inline-flex items-center justify-center p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Close profile"
        >
          <X className="h-5 w-5" />
        </button>

        {hasPrev && (
          <button
            onClick={handlePrev}
            aria-label="Previous profile"
            className={cn(navButtonClass, 'left-6')}
          >
            <ChevronLeft className="h-6 w-6 text-slate-700 group-hover/nav:text-slate-900 transition-colors" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={handleNext}
            aria-label="Next profile"
            className={cn(navButtonClass, 'right-[37%]')}
          >
            <ChevronRight className="h-6 w-6 text-slate-700 group-hover/nav:text-slate-900 transition-colors" />
          </button>
        )}

        <div
          key={slideKey}
          className={cn(
            'flex-1 min-h-0 flex flex-col',
            slideDir === 'left' && 'profile-slide-left',
            slideDir === 'right' && 'profile-slide-right'
          )}
        >
          {children}
        </div>

        {currentIndex >= 0 && totalCount > 1 && (
          <div
            className={cn(
              'absolute left-[32.5%] -translate-x-1/2 bottom-6 z-50 flex justify-center gap-1.5',
              'bg-slate-900/5 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-200',
              'transition-opacity duration-500',
              navVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            {Array.from({ length: totalCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  revealNav();
                  onSelectIndex(i);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentIndex
                    ? 'w-8 bg-[#002060]'
                    : 'w-1.5 bg-slate-400/50 hover:bg-slate-400'
                )}
                aria-label={getItemLabel?.(i) ?? `Profile ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
