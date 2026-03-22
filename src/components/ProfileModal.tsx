import { X, User, Shield } from "lucide-react";
import { Personnel } from "@/types/domain";
import { useEffect, useState } from "react";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

interface ProfileModalProps {
  person: Personnel;
  onClose: () => void;
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);

  useEffect(() => {
    const timer = setTimeout(() => setDetailsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const isLongCitation = person.citation && person.citation.length > 200;
  const displayCitation =
    isLongCitation && !isExpanded
      ? person.citation.substring(0, 200) + "..."
      : person.citation;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm modal-backdrop-enter overflow-y-auto pt-2 md:pt-4 pb-2"
      onClick={onClose}
    >
      <div
        className="bg-card/95 backdrop-blur-md gold-border rounded-xl max-w-4xl w-full mx-3 md:mx-4 overflow-hidden shadow-[0_10px_50px_hsl(var(--primary)/0.22)] modal-enter relative mt-0 md:mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/20 via-primary/80 to-primary/20" />

        <div className="flex items-center justify-between px-6 py-5 border-b border-primary/10 bg-muted/20">
          <h3 className="text-xl font-bold font-serif flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            OFFICER'S PROFILE
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive active:scale-95 bg-background border border-border"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row gap-5 mb-6">
            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-xl bg-muted/40 flex items-center justify-center text-primary border-2 border-primary/30 shrink-0 self-center sm:self-start shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/10 z-0 group-hover:bg-primary/20 transition-colors" />
              {resolvedImageUrl ? (
                <img
                  src={resolvedImageUrl}
                  alt={person.name}
                  className="h-full w-full object-cover rounded-lg relative z-10"
                />
              ) : (
                <User className="h-14 w-14 relative z-10 opacity-60" />
              )}
            </div>

            <div
              className={`flex flex-col justify-center flex-1 transition-all duration-700 ease-out ${
                detailsVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4"
              }`}
            >
              <div className="inline-block px-3 py-1 rounded bg-primary/15 text-primary text-xs font-bold uppercase tracking-widest mb-3 self-start border border-primary/20">
                {person.rank}
              </div>
              <h4 className="text-2xl md:text-3xl font-bold font-serif text-foreground mb-2 leading-tight">
                {person.name}
              </h4>
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium px-3 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                  {person.service}
                </p>
                <div className="h-1 w-1 rounded-full bg-primary/50" />
                <p className="text-sm text-muted-foreground font-semibold">
                  {person.periodStart} – {person.periodEnd}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-muted/20 border border-primary/10 rounded-xl p-4 mb-5 transition-all duration-700 ease-out delay-100 ${
              detailsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
              Service Category
            </p>
            <p className="text-base font-medium text-foreground">
              {person.category}
            </p>
          </div>

          <div
            className={`bg-card rounded-xl p-5 border-l-4 border-l-primary shadow-sm transition-all duration-700 ease-out delay-200 ${
              detailsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-slow" />
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Official Bio / Citation
              </p>
            </div>
            <div className="relative">
              <p className="text-base leading-relaxed text-foreground/90 italic font-serif transition-all duration-300">
                "{displayCitation}"
              </p>
              {isLongCitation && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                >
                  {isExpanded ? "Read Less" : "Read More..."}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
