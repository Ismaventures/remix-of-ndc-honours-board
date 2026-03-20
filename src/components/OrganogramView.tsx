import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowLeft, User, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { Personnel, Category } from '@/data/mockData';
import { ProfileModal } from './ProfileModal';

interface OrganogramViewProps {
  data: Personnel[];
  title: string;
  category: Category;
  onBack: () => void;
}

interface RankGroup {
  rank: string;
  seniority: number;
  members: Personnel[];
}

export function OrganogramView({ data, title, category, onBack }: OrganogramViewProps) {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'hierarchy' | 'gallery'>('hierarchy');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let result = data.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.rank.toLowerCase().includes(q) ||
        p.service.toLowerCase().includes(q)
      );
    }
    if (serviceFilter) {
      result = result.filter(p => p.service === serviceFilter);
    }
    return result.sort((a, b) => a.seniorityOrder - b.seniorityOrder);
  }, [data, category, search, serviceFilter]);

  const rankGroups = useMemo(() => {
    const groups: Record<string, RankGroup> = {};
    filtered.forEach(p => {
      if (!groups[p.rank]) {
        groups[p.rank] = { rank: p.rank, seniority: p.seniorityOrder, members: [] };
      }
      groups[p.rank].members.push(p);
    });
    return Object.values(groups).sort((a, b) => a.seniority - b.seniority);
  }, [filtered]);

  const services = [...new Set(data.filter(p => p.category === category).map(p => p.service))];
  const selectedPerson = selectedId ? data.find(p => p.id === selectedId) : null;

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded gold-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold font-serif gold-text">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} personnel records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`p-2 rounded transition-colors ${viewMode === 'hierarchy' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`p-2 rounded transition-colors ${viewMode === 'gallery' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, rank, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="bg-muted text-sm text-foreground rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {viewMode === 'hierarchy' ? (
        /* ORGANOGRAM / HIERARCHY VIEW */
        <div className="space-y-6">
          {rankGroups.map((group, gi) => (
            <div
              key={group.rank}
              className="scroll-reveal"
              style={{ animationDelay: `${gi * 100}ms` }}
            >
              {/* Rank tier label */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-primary/15" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold px-3 py-1 gold-border rounded-full bg-card">
                  {group.rank}
                </span>
                <div className="h-px flex-1 bg-primary/15" />
              </div>

              {/* Vertical connector from rank label */}
              {group.members.length > 0 && (
                <div className="flex justify-center mb-2">
                  <div className="w-px h-4 bg-primary/20" />
                </div>
              )}

              {/* Personnel nodes */}
              <div className="flex flex-wrap justify-center gap-3">
                {group.members.map((person, pi) => (
                  <button
                    key={person.id}
                    onClick={() => setSelectedId(person.id)}
                    className="w-48 gold-border rounded-lg bg-card p-4 text-left group card-lift active:scale-[0.97] row-reveal"
                    style={{ animationDelay: `${gi * 100 + pi * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-muted gold-border flex items-center justify-center shrink-0 overflow-hidden">
                        {person.imageUrl ? (
                          <img src={person.imageUrl} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-primary/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-snug truncate">{person.name}</p>
                        <p className="text-[10px] text-muted-foreground">{person.service}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-primary/70">
                      {person.periodStart}–{person.periodEnd}
                    </p>
                  </button>
                ))}
              </div>

              {/* Connector line to next rank group */}
              {gi < rankGroups.length - 1 && (
                <div className="flex justify-center mt-3">
                  <div className="w-px h-6 bg-primary/15" />
                </div>
              )}
            </div>
          ))}

          {rankGroups.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No records found.</p>
          )}
        </div>
      ) : (
        /* GALLERY VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="gold-border rounded-lg p-4 bg-card text-left group active:scale-[0.97] card-lift scroll-reveal"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted gold-border flex items-center justify-center text-primary overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 opacity-40" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.rank}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{p.service}</span>
                <span>{p.periodStart}–{p.periodEnd}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPerson && (
        <ProfileModal person={selectedPerson} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
