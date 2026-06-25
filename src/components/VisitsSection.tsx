import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Globe, Calendar, User, Play, Pause, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DistinguishedVisit } from '@/types/domain';
import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";

interface VisitsSectionProps {
  visits: DistinguishedVisit[];
  onBack?: () => void;
  backTriggerNonce?: number;
}

export function VisitsSection({ visits, onBack, backTriggerNonce = 0 }: VisitsSectionProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [autoDisplayIndex, setAutoDisplayIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const lastProcessedBackNonce = useRef(backTriggerNonce);

  // Handle universal back button trigger
  useEffect(() => {
    if (backTriggerNonce === 0 || backTriggerNonce === lastProcessedBackNonce.current) {
      lastProcessedBackNonce.current = backTriggerNonce;
      return;
    }
    lastProcessedBackNonce.current = backTriggerNonce;

    if (autoDisplayActive) {
      setAutoDisplayActive(false);
    } else if (onBack) {
      onBack();
    }
  }, [backTriggerNonce]);

  // Auto-cycling effect for autodisplay
  useEffect(() => {
    if (!autoDisplayActive || visits.length === 0 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setAutoDisplayIndex((prev) => (prev + 1) % visits.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [autoDisplayActive, visits.length, isAutoPlaying]);

  const currentAutoDisplayVisit = autoDisplayActive && visits[autoDisplayIndex] ? visits[autoDisplayIndex] : null;

  return (
    <div className="scroll-reveal">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
        {visits.length > 0 && (
          <button
            onClick={() => {
              setAutoDisplayActive(true);
              setAutoDisplayIndex(0);
              setIsAutoPlaying(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#002060] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#003080] transition-all duration-200 shadow-sm"
          >
            <Play className="h-3.5 w-3.5" />
            Auto Display
          </button>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif gold-text">Distinguished Visits & Honours</h2>
      </div>
      <div className="space-y-6">
        {visits.map((visit, i) => (
          <div
            key={visit.id}
            className="gold-border rounded-lg bg-card overflow-hidden card-lift visit-slide-in"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-48 h-48 sm:h-auto bg-muted flex items-center justify-center text-primary shrink-0 relative overflow-hidden group">
                {visit.imageUrl ? (
                  <img src={visit.imageUrl} alt={visit.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <User className="h-16 w-16 opacity-40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold font-serif mb-1">{visit.name}</h3>
                <p className="text-sm gold-text font-medium mb-3">{visit.title}</p>
                <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {visit.country}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {visit.date}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{visit.description}</p>
              </div>
            </div>
          </div>
        ))}
        {visits.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No visits recorded.</p>
        )}
      </div>

      {/* Removed bottom back button */}

      {/* Auto-Display Full-Screen Modal */}
      {autoDisplayActive && currentAutoDisplayVisit && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain" />
              <div>
                <p className="text-[#FFD700] font-serif text-sm uppercase tracking-widest font-bold">
                  Distinguished Visits
                </p>
                <p className="text-white/60 text-xs mt-1">
                  {autoDisplayIndex + 1} of {visits.length}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title={isAutoPlaying ? 'Pause' : 'Play'}
              >
                {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setAutoDisplayActive(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-white transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center justify-center gap-8 max-w-2xl">
            {/* Large NDC Crest */}
            <img
              src={ndcCrest}
              alt="NDC"
              className="h-40 w-40 object-contain opacity-90 drop-shadow-lg"
            />

            {/* Visit Info */}
            <div className="text-center space-y-4 w-full">
              <h2 className="text-4xl font-bold text-white">
                {currentAutoDisplayVisit.name}
              </h2>
              {currentAutoDisplayVisit.title && (
                <p className="text-xl text-[#FFD700] font-semibold">
                  {currentAutoDisplayVisit.title}
                </p>
              )}
              {currentAutoDisplayVisit.country && (
                <div className="flex items-center justify-center gap-2 text-lg text-white/80">
                  <Globe className="h-5 w-5" />
                  <span>{currentAutoDisplayVisit.country}</span>
                </div>
              )}
              {currentAutoDisplayVisit.date && (
                <div className="flex items-center justify-center gap-2 text-sm text-white/70">
                  <Calendar className="h-4 w-4" />
                  <span>{currentAutoDisplayVisit.date}</span>
                </div>
              )}
            </div>

            {/* Visit Image */}
            {currentAutoDisplayVisit.imageUrl && (
              <div className="w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-[#FFD700]/30">
                <img
                  src={currentAutoDisplayVisit.imageUrl}
                  alt={currentAutoDisplayVisit.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Visit Description */}
            {currentAutoDisplayVisit.description && (
              <p className="text-center text-white/80 max-w-md">
                {currentAutoDisplayVisit.description}
              </p>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => setAutoDisplayIndex((prev) => (prev - 1 + visits.length) % visits.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="text-white text-sm font-semibold">
                {autoDisplayIndex + 1} / {visits.length}
              </div>

              <button
                onClick={() => setAutoDisplayIndex((prev) => (prev + 1) % visits.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
