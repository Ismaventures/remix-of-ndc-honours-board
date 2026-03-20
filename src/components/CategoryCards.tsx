import { useEffect, useState } from 'react';
import { Shield, Award, Users, Globe, Star, Settings } from 'lucide-react';
import { Category } from '@/data/mockData';

export type ViewKey = 'home' | 'fwc' | 'fdc' | 'directing' | 'allied' | 'visits' | 'admin';

interface CategoryCardsProps {
  onSelect: (key: ViewKey) => void;
}

const CARDS: {
  key: ViewKey;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  accentClass: string;
}[] = [
  {
    key: 'fwc',
    label: 'Distinguished Fellows (FWC)',
    subtitle: 'Fellows of the War College',
    icon: Shield,
    accentClass: 'from-primary/15 to-transparent',
  },
  {
    key: 'fdc',
    label: 'Distinguished Fellows (FDC)',
    subtitle: 'Fellows of the Defence College',
    icon: Award,
    accentClass: 'from-secondary/20 to-transparent',
  },
  {
    key: 'directing',
    label: 'Directing Staff',
    subtitle: 'Chronicle of Excellence',
    icon: Users,
    accentClass: 'from-primary/10 to-secondary/10',
  },
  {
    key: 'allied',
    label: 'Allied Officers',
    subtitle: 'International Partnerships',
    icon: Globe,
    accentClass: 'from-secondary/15 to-transparent',
  },
  {
    key: 'visits',
    label: 'Distinguished Visits',
    subtitle: 'Honours & Ceremonies',
    icon: Star,
    accentClass: 'from-primary/12 to-secondary/8',
  },
  {
    key: 'admin',
    label: 'Admin Panel',
    subtitle: 'Manage Records',
    icon: Settings,
    accentClass: 'from-muted/40 to-transparent',
  },
];

export function CategoryCards({ onSelect }: CategoryCardsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="text-xl font-bold font-serif gold-text">Command Directory</h2>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">Select a category to explore</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => onSelect(card.key)}
              className="relative overflow-hidden gold-border rounded-lg bg-card p-6 text-left group active:scale-[0.97] card-lift"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.08}s`,
              }}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded bg-muted/60 flex items-center justify-center gold-border">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-serif leading-snug">{card.label}</h3>
                    <p className="text-[10px] text-muted-foreground tracking-wide">{card.subtitle}</p>
                  </div>
                </div>

                {/* Gold line that expands on hover */}
                <div className="h-px w-full bg-primary/10 overflow-hidden">
                  <div className="h-full bg-primary w-0 group-hover:w-full transition-all duration-700 ease-out" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
