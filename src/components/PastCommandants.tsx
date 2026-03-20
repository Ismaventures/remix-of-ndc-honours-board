import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Commandant } from '@/data/mockData';

interface PastCommandantsProps {
  commandants: Commandant[];
}

export function PastCommandants({ commandants }: PastCommandantsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const past = commandants.filter(c => !c.isCurrent);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (past.length === 0) return null;

  return (
    <section
      className="mb-10"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold font-serif gold-text">Past Commandants</h2>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">Legacy of Leadership</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {past.map((cmd, i) => (
          <div
            key={cmd.id}
            className="shrink-0 w-72 gold-border rounded-lg bg-card p-5 card-lift"
            style={{
              scrollSnapAlign: 'start',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateX(0)' : 'translateX(30px)',
              transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.1}s`,
            }}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded bg-muted gold-border flex items-center justify-center shrink-0">
                {cmd.imageUrl ? (
                  <img src={cmd.imageUrl} alt={cmd.name} className="w-full h-full rounded object-cover" />
                ) : (
                  <Shield className="h-6 w-6 text-primary/40" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold font-serif leading-snug">{cmd.name}</h3>
                <p className="text-[10px] text-primary mt-0.5">{cmd.tenureStart} – {cmd.tenureEnd ?? 'Present'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {cmd.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
