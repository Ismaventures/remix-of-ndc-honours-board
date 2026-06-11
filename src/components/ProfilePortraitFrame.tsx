import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePortraitFrameProps {
  imageUrl?: string;
  alt: string;
  placeholder?: ReactNode;
}

/** Full-bleed official portrait panel with red/blue border frame (commandant / fellow full view). */
export function ProfilePortraitFrame({ imageUrl, alt, placeholder }: ProfilePortraitFrameProps) {
  return (
    <div className="w-[35%] shrink-0 bg-white flex h-full relative overflow-hidden">
      <div className="w-[8px] h-full flex flex-col shrink-0">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="flex-1 h-full min-h-0 relative p-3 md:p-4">
        <div
          className={cn(
            'relative h-full w-full rounded-2xl overflow-hidden',
            'shadow-[0_16px_48px_rgba(0,32,96,0.16),0_4px_12px_rgba(0,0,0,0.06)]',
            'bg-slate-200'
          )}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
            />
          ) : (
            placeholder ?? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 text-slate-300">
                <Shield className="h-20 w-20 opacity-30" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400">
                  Official Portrait
                </span>
              </div>
            )
          )}

          <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl">
            <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#FF0000]" />
            <div className="absolute left-0 right-0 bottom-0 h-[6px] bg-[#FF0000]" />
            <div className="absolute top-0 left-0 right-0 h-[6px] bg-[#002060]" />
            <div className="absolute top-0 right-0 bottom-0 w-[6px] bg-[#002060]" />
          </div>
        </div>
      </div>
    </div>
  );
}
