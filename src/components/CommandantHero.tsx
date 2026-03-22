import { useEffect, useState } from 'react';
import { Shield, Star } from 'lucide-react';
import { Commandant } from '@/types/domain';
import ndcCrest from '/images/ndc-crest.png';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';

interface CommandantHeroProps {
  commandant?: Commandant;
  compactDescription?: boolean;
}

export function CommandantHero({ commandant, compactDescription = true }: CommandantHeroProps) {
  const [visible, setVisible] = useState(false);
  const isCompact = compactDescription;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const name = commandant?.name ?? 'No commandant record available';
  const titleText = commandant?.title ?? 'Commandant record pending database data';
  const description = commandant?.description ??
    'No commandant biography is currently available from the database.';
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);

  return (
    <section className={`relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-slate-900/90 via-card/95 to-slate-900/90 backdrop-blur-md shadow-[0_0_50px_-12px_rgba(255,215,0,0.15)] ${isCurrent ? 'commandant-hero-current' : ''} ${isCompact ? 'mb-0' : 'mb-8'} transform transition-all hover:scale-[1.01] hover:shadow-[0_0_80px_-15px_rgba(255,215,0,0.2)] duration-500 group`}>
      {/* Subtle radar sweep & premium glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isCurrent && (
          <>
            <div className="absolute inset-0 command-sweep-light" />
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-command-topline" />
          </>
        )}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50" />
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.08)_0%,transparent_70%)]" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5 animate-radar-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/3 animate-radar-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Decorative corner lines */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-primary/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-primary/30 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-primary/30 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-primary/30 rounded-br-lg" />
      </div>

      <div className={`relative flex flex-col md:flex-row items-center ${isCompact ? 'gap-6 md:gap-8 p-6 md:p-10' : 'gap-10 p-8 md:p-14'}`}>
        {/* Portrait side */}
        <div
          className={`shrink-0 transition-all duration-1000 ease-out flex flex-col items-center group-hover:transform group-hover:translate-y-[-5px] ${
            visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}
        >
          <div className="relative">
            {/* Outer animated border ring */}
            <div className="absolute -inset-2 rounded-lg border border-primary/20 bg-primary/5 blur-[2px] " />
            <div className="absolute -inset-1 rounded-lg border border-primary/30 rotate-1 transition-transform group-hover:rotate-0 duration-500" />
            <div className="absolute -inset-1 rounded-lg border border-primary/30 -rotate-1 transition-transform group-hover:rotate-0 duration-500" />
            
            <div className={`relative rounded-md bg-muted gold-border-strong flex items-center justify-center overflow-hidden z-10 shadow-2xl ${isCurrent ? 'commandant-portrait-frame' : ''} ${isCompact ? 'w-40 h-52 md:w-48 md:h-64' : 'w-48 h-60 md:w-56 md:h-72'}`}>
              {commandantImageUrl ? (
                <img src={commandantImageUrl} alt={name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-primary/40">
                  <Shield className="h-16 w-16" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Official Portrait</span>
                </div>
              )}
            </div>
            
            {/* Gold corner accents (closer in) */}
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-2 border-l-2 border-primary z-20 rounded-tl" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-2 border-r-2 border-primary z-20 rounded-tr" />
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-2 border-l-2 border-primary z-20 rounded-bl" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-2 border-r-2 border-primary z-20 rounded-br" />
          </div>
        </div>

        {/* Details side */}
        <div
          className={`flex-1 text-center md:text-left transition-all duration-1000 ease-out delay-300 ${
            visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}
        >
          <div className="inline-flex items-center justify-center md:justify-start gap-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 mb-4 backdrop-blur shadow-[0_0_15px_rgba(255,215,0,0.1)]">
            <Star className="h-3.5 w-3.5 text-primary animate-pulse-slow fill-primary/30" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary/90 font-semibold">
              {isCurrent ? 'Current Commandant' : 'Past Commandant'}
            </span>
            <Star className="h-3.5 w-3.5 text-primary animate-pulse-slow fill-primary/30" />
          </div>

          <h2 className={`${isCompact ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'} font-bold font-serif mb-2 leading-tight bg-gradient-to-r from-foreground via-primary/90 to-foreground/80 bg-clip-text text-transparent drop-shadow-sm`}>
            {name}
          </h2>

          <div className="relative h-px w-full max-w-sm mx-auto md:mx-0 mb-5 overflow-hidden bg-primary/10 mt-2">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-yellow-200 to-transparent transition-all duration-1500 ease-out delay-700 ${
                visible ? 'w-full' : 'w-0'
              }`}
            />
          </div>

          {isCurrent && <div className="h-[3px] w-32 mb-4 mx-auto md:mx-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/80 to-primary/0 animate-command-underline" />}

          <p className={`${isCompact ? 'text-base md:text-lg mb-3' : 'text-lg md:text-xl mb-4'} gold-text font-medium tracking-wide uppercase text-primary/90`}>
            {titleText}
          </p>

          <p
            className={`${isCompact ? 'text-sm md:text-[15px]' : 'text-sm md:text-base'} text-muted-foreground leading-relaxed max-w-2xl transition-all duration-1000 ease-out delay-500 font-medium ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={compactDescription ? {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 4,
              overflow: 'hidden',
            } : undefined}
          >
            {description}
          </p>

          <div
            className={`flex items-center ${isCompact ? 'gap-4 mt-6 p-3' : 'gap-5 mt-8 p-4'} justify-center md:justify-start transition-all duration-1000 ease-out delay-700 rounded-lg bg-black/20 border border-white/5 inline-flex ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <img src={ndcCrest} alt="NDC Crest" className={`${isCompact ? 'h-10 w-10' : 'h-12 w-12'} object-contain opacity-80 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]`} />
            <div className={`${isCompact ? 'h-8' : 'h-10'} w-px bg-primary/30`} />
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/80 font-semibold drop-shadow-sm">
              Intellect · Courage · Patriotism
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
