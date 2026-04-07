import { Shield, Award, Users, Globe, Star, Settings, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-sidebar-primary/10 flex items-center justify-center">
            <LayoutGrid className="h-3.5 w-3.5 text-sidebar-primary" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-sidebar-primary">
            Chronicles of Staff
          </span>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateX(0)' : 'translateX(-16px)',
                transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-sidebar-primary shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.12)]'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5 border-l-[3px] border-transparent'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center shrink-0 transition-colors duration-200',
                isActive ? 'bg-sidebar-primary/15' : 'bg-transparent group-hover:bg-sidebar-accent/30'
              )}>
                <Icon className="h-4 w-4 shrink-0" />
              </div>
              <span className="leading-snug">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border bg-sidebar-accent/25">
        <div className="flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-sidebar-border" />
          <p className="text-[10px] text-sidebar-foreground/85 tracking-[0.12em] uppercase font-semibold whitespace-nowrap">
            Intellect · Courage · Patriotism
          </p>
          <div className="h-px flex-1 bg-sidebar-border" />
        </div>
      </div>
    </aside>
  );
}
