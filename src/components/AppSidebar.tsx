import { Shield, Award, Users, Globe, Star, Settings, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionKey = 'fwc' | 'fdc' | 'directing' | 'allied' | 'visits' | 'admin';

interface AppSidebarProps {
  active: SectionKey;
  onNavigate: (key: SectionKey) => void;
}

const NAV_ITEMS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: 'fwc', label: 'Distinguished Fellows (FWC)', icon: Shield },
  { key: 'fdc', label: 'Distinguished Fellows (FDC)', icon: Award },
  { key: 'directing', label: 'Directing Staff Chronicle', icon: Users },
  { key: 'allied', label: 'Allied Officers', icon: Globe },
  { key: 'visits', label: 'Distinguished Visits & Honours', icon: Star },
  { key: 'admin', label: 'Admin Panel', icon: Settings },
];

export function AppSidebar({ active, onNavigate }: AppSidebarProps) {
  return (
    <aside className="w-72 shrink-0 bg-navy-deep border-r border-gold/15 flex flex-col">
      <div className="px-4 py-5 border-b border-gold/15">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-gold" />
          <span className="text-xs font-semibold tracking-widest uppercase text-gold">
            Command Directory
          </span>
        </div>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors duration-150',
                isActive
                  ? 'bg-muted text-gold border-l-2 border-gold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="leading-snug">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gold/15 text-[10px] text-muted-foreground tracking-wide uppercase">
        Intellect · Courage · Patriotism
      </div>
    </aside>
  );
}
