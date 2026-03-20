import { Globe, Calendar, User } from 'lucide-react';
import { DistinguishedVisit } from '@/data/mockData';

interface VisitsSectionProps {
  visits: DistinguishedVisit[];
}

export function VisitsSection({ visits }: VisitsSectionProps) {
  return (
    <div className="scroll-reveal">
      <h2 className="text-2xl font-bold gold-text mb-6">Distinguished Visits & Honours</h2>
      <div className="space-y-6">
        {visits.map((visit, i) => (
          <div
            key={visit.id}
            className="gold-border rounded-lg bg-card overflow-hidden hover:gold-glow transition-shadow duration-300 scroll-reveal"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-48 h-48 sm:h-auto bg-muted flex items-center justify-center text-gold shrink-0">
                {visit.imageUrl ? (
                  <img src={visit.imageUrl} alt={visit.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-16 w-16 opacity-40" />
                )}
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
