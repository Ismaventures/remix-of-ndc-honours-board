import { ArrowLeft, Globe, Calendar, User } from 'lucide-react';
import { DistinguishedVisit } from '@/types/domain';

interface VisitsSectionProps {
  visits: DistinguishedVisit[];
  onBack?: () => void;
}

export function VisitsSection({ visits, onBack }: VisitsSectionProps) {
  return (
    <div className="scroll-reveal">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
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
    </div>
  );
}
