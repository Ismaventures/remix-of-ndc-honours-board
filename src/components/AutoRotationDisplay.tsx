import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Monitor } from 'lucide-react';
import { Personnel, DistinguishedVisit } from '@/data/mockData';
import { CommandantHero } from './CommandantHero';

interface AutoRotationDisplayProps {
  personnel: Personnel[];
  visits: DistinguishedVisit[];
}

type Slide = 
  | { type: 'commandant' }
  | { type: 'personnel'; person: Personnel }
  | { type: 'visit'; visit: DistinguishedVisit };

export function AutoRotationDisplay({ personnel, visits }: AutoRotationDisplayProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  const slides: Slide[] = [
    { type: 'commandant' },
    ...personnel.filter(p => ['General', 'Admiral', 'Air Marshal', 'Lieutenant General', 'Vice Admiral'].includes(p.rank)).slice(0, 6).map(person => ({ type: 'personnel' as const, person })),
    ...visits.slice(0, 3).map(visit => ({ type: 'visit' as const, visit })),
  ];

  const advance = useCallback(() => {
    setFadeState('out');
    setTimeout(() => {
      setCurrentIndex(i => (i + 1) % slides.length);
      setFadeState('in');
    }, 600);
  }, [slides.length]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(advance, 8000);
    return () => clearInterval(interval);
  }, [isActive, advance]);

  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className="flex items-center gap-2 px-4 py-2 gold-border rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 active:scale-[0.97]"
      >
        <Monitor className="h-4 w-4 text-primary" />
        <span>Auto Display Mode</span>
      </button>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur border-b border-primary/15">
        <span className="text-xs uppercase tracking-widest text-primary font-medium">
          Auto Display · {currentIndex + 1}/{slides.length}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={advance} className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsActive(false)}
            className="px-3 py-1.5 rounded text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
        <div
          className={`max-w-4xl w-full transition-all duration-600 ease-out ${
            fadeState === 'in'
              ? 'opacity-100 scale-100 blur-0'
              : 'opacity-0 scale-[0.97] blur-[4px]'
          }`}
        >
          {slide.type === 'commandant' && <CommandantHero />}

          {slide.type === 'personnel' && (
            <div className="gold-border rounded-lg bg-card p-12 gold-glow text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                {slide.person.category}
              </p>
              <h2 className="text-4xl font-bold font-serif mb-2">{slide.person.name}</h2>
              <p className="text-lg gold-text font-medium mb-1">{slide.person.rank}</p>
              <p className="text-sm text-muted-foreground mb-6">{slide.person.service} · {slide.person.periodStart}–{slide.person.periodEnd}</p>
              <div className="max-w-md mx-auto">
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{slide.person.citation}"
                </p>
              </div>
            </div>
          )}

          {slide.type === 'visit' && (
            <div className="gold-border rounded-lg bg-card p-12 gold-glow text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Distinguished Visit
              </p>
              <h2 className="text-4xl font-bold font-serif mb-2">{slide.visit.name}</h2>
              <p className="text-lg gold-text font-medium mb-1">{slide.visit.title}</p>
              <p className="text-sm text-muted-foreground mb-6">{slide.visit.country} · {slide.visit.date}</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                {slide.visit.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pb-6">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
