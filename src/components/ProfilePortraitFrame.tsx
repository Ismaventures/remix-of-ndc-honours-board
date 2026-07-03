import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePortraitFrameProps {
  imageUrl?: string;
  alt: string;
  placeholder?: ReactNode;
  serviceColor?: string;
}

/** Full-bleed official portrait panel with red/blue border frame (commandant / fellow full view). */
export function ProfilePortraitFrame({ imageUrl, alt, placeholder, serviceColor = 'tri-color' }: ProfilePortraitFrameProps) {
  return (
    <div className="w-[35%] shrink-0 flex h-full relative overflow-hidden">
      <div className="w-[12px] h-full flex flex-col shrink-0 flex-none">
        {/* Navy block is fixed height to align exactly with the horizontal category text line from the left panel */}
        <div className="h-[44px] shrink-0" style={{ backgroundColor: serviceColor === 'tri-color' ? '#002060' : serviceColor }} title="Navy" />
        <div className="flex-1" style={{ backgroundColor: serviceColor === 'tri-color' ? '#FF0000' : serviceColor }} title="Army" />
        <div className="flex-1" style={{ backgroundColor: serviceColor === 'tri-color' ? '#00B0F0' : serviceColor }} title="Air Force" />
      </div>

      <div className="flex-1 h-full min-h-0 relative bg-white flex items-center justify-center p-0 m-0 -ml-1">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="h-full w-full object-cover object-top"
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
