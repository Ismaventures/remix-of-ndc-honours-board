import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Monitor, SkipForward } from 'lucide-react';
import { Category, Personnel, DistinguishedVisit, Commandant } from '@/types/domain';
import { CommandantHero } from './CommandantHero';
import { useAudioStore } from '@/hooks/useAudioStore';
import { playAudioTrack } from '@/components/AudioManager';

interface AutoRotationDisplayProps {
  personnel: Personnel[];
  visits: DistinguishedVisit[];
  commandants: Commandant[];
  activeCategory?: Category | null;
  activeView?: 'home' | 'visits' | 'admin' | 'category';
}

type Slide =
  | { type: 'commandant'; commandant: Commandant }
  | { type: 'personnel'; person: Personnel }
  | { type: 'visit'; visit: DistinguishedVisit };

export function AutoRotationDisplay({ personnel, visits, commandants, activeCategory = null, activeView = 'home' }: AutoRotationDisplayProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'pre-in'>('in');
  const [transitionType, setTransitionType] = useState<number>(0);
  const [showNavControls, setShowNavControls] = useState(true);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  
  const audioAssignments = useAudioStore(s => s.assignments);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);

  const slides: Slide[] = useMemo(() => {
    if (activeCategory) {
      const categoryPersonnel = personnel
        .filter(p => p.category === activeCategory)
        .sort((a, b) => a.seniorityOrder - b.seniorityOrder)
        .slice(0, 12)
        .map(person => ({ type: 'personnel' as const, person }));

      return categoryPersonnel.length > 0
        ? categoryPersonnel
        : commandants.slice(0, 1).map(commandant => ({ type: 'commandant' as const, commandant }));
    }

    if (activeView === 'visits') {
      const visitSlides = visits.slice(0, 12).map(visit => ({ type: 'visit' as const, visit }));
      return visitSlides.length > 0
        ? visitSlides
        : commandants.slice(0, 1).map(commandant => ({ type: 'commandant' as const, commandant }));
    }

    return commandants
      .slice()
      .sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.tenureStart ?? 0) - (a.tenureStart ?? 0);
      })
      .map(commandant => ({ type: 'commandant' as const, commandant }));
  }, [activeCategory, activeView, personnel, visits, commandants]);

  const revealControls = useCallback(() => {
    setShowNavControls(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNavControls(false), 2200);
  }, []);

  const transitionTo = useCallback((nextIndex: number) => {
    if (slides.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    
    // Pick a new random transition type from 6 different professional styles
    const newTransition = Math.floor(Math.random() * 6);
    setTransitionType(newTransition);
    setFadeState('out');

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    
    // First timeout: wait for the outgoing animation, swap slide content, and switch to a pre-entry state
    transitionTimerRef.current = setTimeout(() => {
      setCurrentIndex(nextIndex);
      setFadeState('pre-in');
      
      // Second timeout: rapid flash to trigger the incoming animation
      setTimeout(() => {
        setFadeState('in');
        isTransitioningRef.current = false;
      }, 50);
    }, 450);
  }, [slides.length]);

  const advance = useCallback(() => {
    transitionTo((currentIndex + 1) % slides.length);
  }, [currentIndex, slides.length, transitionTo]);

  const retreat = useCallback(() => {
    transitionTo((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, slides.length, transitionTo]);

  const handleManualAdvance = useCallback(() => {
    revealControls();
    advance();
  }, [advance, revealControls]);

  const handleManualRetreat = useCallback(() => {
    revealControls();
    retreat();
  }, [retreat, revealControls]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(advance, 8000);
    return () => clearInterval(interval);
  }, [isActive, advance]);

  useEffect(() => {
    if (!isActive) return;
    revealControls();
  }, [isActive, revealControls, currentIndex]);

  useEffect(() => {
    if (!isActive) {
      setShowInteractionHint(false);
      if (interactionHintTimerRef.current) {
        clearTimeout(interactionHintTimerRef.current);
        interactionHintTimerRef.current = null;
      }
      return;
    }

    setShowInteractionHint(true);
    if (interactionHintTimerRef.current) clearTimeout(interactionHintTimerRef.current);
    interactionHintTimerRef.current = setTimeout(() => {
      setShowInteractionHint(false);
    }, 2200);
  }, [isActive]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  useEffect(() => {
    if (isActive) {
      const slide = slides[currentIndex];
      let trackId = audioAssignments.globalAuto;
      
      if (activeCategory === 'FWC' && audioAssignments.distinguished_fellows_fwc) {
        trackId = audioAssignments.distinguished_fellows_fwc;
      } else if (activeCategory === 'FDC' && audioAssignments.distinguished_fellows_fdc) {
        trackId = audioAssignments.distinguished_fellows_fdc;
      } else if (activeCategory === 'Directing Staff' && audioAssignments.directing_staff) {
        trackId = audioAssignments.directing_staff;
      } else if (activeCategory === 'Allied' && audioAssignments.allied_officers) {
        trackId = audioAssignments.allied_officers;
      } else if (slide?.type === 'personnel' && slide.person.category) {
        const cat = slide.person.category.toLowerCase();
        if (cat.includes('fwc') && audioAssignments.distinguished_fellows_fwc) {
          trackId = audioAssignments.distinguished_fellows_fwc;
        } else if (cat.includes('fdc') && audioAssignments.distinguished_fellows_fdc) {
          trackId = audioAssignments.distinguished_fellows_fdc;
        } else if (cat.includes('directing') && audioAssignments.directing_staff) {
          trackId = audioAssignments.directing_staff;
        } else if (cat.includes('allied') && audioAssignments.allied_officers) {
          trackId = audioAssignments.allied_officers;
        }
      }
      playAudioTrack(trackId);
    } else {
      playAudioTrack(null); // Stop audio when exiting auto mode
    }
  }, [isActive, currentIndex, slides, audioAssignments, activeCategory]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (interactionHintTimerRef.current) clearTimeout(interactionHintTimerRef.current);
    };
  }, []);

  const onTouchStart = (x: number) => {
    touchStartXRef.current = x;
    revealControls();
  };

  const onTouchEnd = (x: number) => {
    if (touchStartXRef.current === null) return;
    const delta = x - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(delta) < 50) return;
    if (delta < 0) {
      handleManualAdvance();
    } else {
      handleManualRetreat();
    }
  };

  if (!isActive) {
    return (
      <button
        onClick={() => {
          setTransitionType(Math.floor(Math.random() * 4));
          setCurrentIndex(0);
          setIsActive(true);
        }}
        className="flex items-center gap-2 px-4 py-2 gold-border rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 active:scale-[0.97]"
      >
        <Monitor className="h-4 w-4 text-primary" />
        <span>
          {activeCategory
            ? `${activeCategory} Auto Display`
            : activeView === 'visits'
              ? 'Visits Auto Display'
              : 'Commandants Auto Display'}
        </span>
      </button>
    );
  }

  const slide = slides[currentIndex];

  const getTransitionClasses = () => {
    switch (transitionType) {
      case 1: // Slide Up
        return fadeState === 'in' ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-16 blur-[4px]';
      case 2: // Slide Left
        return fadeState === 'in' ? 'opacity-100 translate-x-0 blur-0' : 'opacity-0 -translate-x-16 blur-[4px]';
      case 3: // Slide Right
        return fadeState === 'in' ? 'opacity-100 translate-x-0 blur-0' : 'opacity-0 translate-x-16 blur-[4px]';
      case 4: // Zoom Out (Recede)
        return fadeState === 'in' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-[1.05] blur-[4px]';
      case 5: // Slide Down
        return fadeState === 'in' ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 -translate-y-16 blur-[4px]';
      case 0: // Zoom Default
      default:
        return fadeState === 'in' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-[0.95] blur-[4px]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      onMouseMove={revealControls}
      onTouchStart={(e) => onTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') handleManualAdvance();
        if (e.key === 'ArrowLeft') handleManualRetreat();
      }}
      tabIndex={0}
    >
      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur border-b border-primary/15">
        <span className="text-xs uppercase tracking-widest text-primary font-medium">
          {activeCategory
            ? `${activeCategory} Auto Display`
            : activeView === 'visits'
              ? 'Visits Auto Display'
              : 'Commandants Auto Display'} · {currentIndex + 1}/{slides.length}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-primary/20 pr-4">
            {/* Audio controls are now handled globally via the AudioManager floating button */}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleManualAdvance} className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
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
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
        <div className={`absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${showInteractionHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div className="px-4 py-2 rounded-md border border-primary/30 bg-slate-950/85 backdrop-blur text-[10px] md:text-xs uppercase tracking-[0.16em] text-primary/90 text-center whitespace-nowrap">
            Swipe • Arrow Keys • Side Buttons
          </div>
        </div>

        <button
          onClick={handleManualRetreat}
          className={`absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full border border-primary/35 bg-background/70 backdrop-blur flex items-center justify-center text-primary transition-all duration-200 ${showNavControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={handleManualAdvance}
          className={`absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full border border-primary/35 bg-background/70 backdrop-blur flex items-center justify-center text-primary transition-all duration-200 ${showNavControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className={`${slide.type === 'commandant' ? 'max-w-3xl lg:max-w-4xl' : 'max-w-5xl xl:max-w-6xl'} w-full transition-all duration-600 ease-out ${getTransitionClasses()}`}
        >
          {slide.type === 'commandant' && (
            <CommandantHero commandant={slide.commandant} compactDescription />
          )}

          {slide.type === 'personnel' && (
            <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-slate-900/90 via-card/95 to-slate-900/90 backdrop-blur-md p-8 md:p-12 lg:p-14 shadow-[0_0_50px_-12px_rgba(255,215,0,0.15)] group transform transition-all hover:scale-[1.02] duration-500">
              {/* Background styling layers */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,215,0,0.08)_0%,transparent_60%)]" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />

              <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
                <div className="relative w-40 h-52 md:w-48 md:h-64 rounded-md border border-primary/40 overflow-hidden bg-muted flex-shrink-0 shadow-xl group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30 transition-colors duration-500 z-20 rounded-md" />
                  {slide.person.imageUrl ? (
                    <img src={slide.person.imageUrl} alt={slide.person.name} className="w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs uppercase tracking-widest text-primary/40 bg-gradient-to-b from-muted to-muted/50 p-4 text-center">
                      <span>No Image</span>
                    </div>
                  )}
                  {/* Decorative internal corners */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-primary/50 z-20" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-primary/50 z-20" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-primary/50 z-20" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-primary/50 z-20" />
                </div>

                <div className="text-center md:text-left flex-1 min-w-0 z-10 flex flex-col justify-center pt-2">
                  <div className="inline-flex px-3 py-1 bg-primary/10 border border-primary/20 rounded-sm mb-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-primary/90 font-medium">
                      {slide.person.category}
                    </p>
                  </div>
                  
                  <h2 className="mb-3 tracking-wide drop-shadow-md bg-gradient-to-r from-foreground via-primary/90 to-foreground/80 bg-clip-text text-transparent leading-tight">
                    <span className="text-2xl md:text-3xl font-semibold font-serif align-middle mr-2">{slide.person.rank}</span>
                    <span className="text-4xl md:text-5xl font-bold font-serif align-middle">{slide.person.name}</span>
                  </h2>
                  
                  <div className="h-px w-24 bg-gradient-to-r from-primary/80 to-transparent mx-auto md:mx-0 mb-4" />
                  
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-6 text-sm text-foreground/80">
                    <span className="bg-foreground/5 px-2 py-0.5 rounded border border-foreground/10">{slide.person.service}</span>
                    <span className="text-primary/40">•</span>
                    <span className="font-mono tracking-wider text-primary/70">{slide.person.periodStart}–{slide.person.periodEnd}</span>
                  </div>

                  <div className="relative pl-4 border-l-2 border-primary/30 py-1">
                    <p className="text-base text-muted-foreground italic leading-relaxed font-light">
                      "{slide.person.citation}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {slide.type === 'visit' && (
            <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-b from-slate-900/90 via-card/95 to-slate-900/90 backdrop-blur-md p-10 md:p-14 lg:p-16 shadow-[0_0_50px_-12px_rgba(255,215,0,0.15)] text-center group transform transition-all hover:scale-[1.02] duration-500">
              {/* Background ambient lighting */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.06)_0%,transparent_70%)]" />
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120%] h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-8 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-primary/90 font-medium">
                    Distinguished Visit
                  </p>
                </div>
                
                <div className="w-56 h-36 mx-auto mb-8 rounded-lg border-2 border-primary/30 overflow-hidden bg-muted shadow-2xl relative group-hover:-translate-y-1 transition-transform duration-500">
                  <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10" />
                  {slide.visit.imageUrl ? (
                    <img src={slide.visit.imageUrl} alt={slide.visit.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-primary/40 bg-gradient-to-br from-muted to-muted/80">No Image</div>
                  )}
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold font-serif mb-3 tracking-wide bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent drop-shadow-sm">
                  {slide.visit.name}
                </h2>
                
                <p className="text-sm md:text-base text-primary/90 font-semibold mb-4 tracking-[0.14em] uppercase">{slide.visit.title}</p>
                
                <div className="flex items-center justify-center gap-4 mb-8">
                  <span className="px-3 py-1 rounded bg-foreground/5 border border-foreground/10 text-foreground/80 text-sm">{slide.visit.country}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  <span className="text-primary/70 font-mono text-sm tracking-wider">{slide.visit.date}</span>
                </div>

                <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-light border-t border-primary/20 pt-6">
                  {slide.visit.description}
                </p>
              </div>
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
