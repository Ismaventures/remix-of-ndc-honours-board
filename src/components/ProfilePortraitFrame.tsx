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
    <div className="w-[35%] shrink-0 flex h-full relative overflow-hidden">
      <div className="w-[12px] h-full flex flex-col shrink-0 flex-none">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="flex-1 h-full min-h-0 relative bg-white flex items-center justify-center p-0 m-0 -ml-1">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="h-full w-full object-cover object-center"
            loading="eager"
          />
        ) : (
          placeholder ?? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
              <Shield className="h-20 w-20 opacity-30" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400">
                Official Portrait
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
