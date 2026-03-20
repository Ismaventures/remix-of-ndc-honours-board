import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List, Eye, User } from 'lucide-react';
import { Personnel, Category } from '@/data/mockData';
import { ProfileModal } from './ProfileModal';

interface PersonnelTableProps {
  data: Personnel[];
  title: string;
  category: Category;
}

const PAGE_SIZE = 10;

export function PersonnelTable({ data, title, category }: PersonnelTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'rank' | 'periodStart'>('periodStart');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState('');

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
    result.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data, category, search, serviceFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedPerson = selectedId ? data.find(p => p.id === selectedId) : null;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const services = [...new Set(data.filter(p => p.category === category).map(p => p.service))];

  return (
    <div className="scroll-reveal">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold gold-text">{title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('table')} className={`p-2 rounded transition-colors ${viewMode === 'table' ? 'bg-muted text-gold' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('gallery')} className={`p-2 rounded transition-colors ${viewMode === 'gallery' ? 'bg-muted text-gold' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, rank, or service..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-muted rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={e => { setServiceFilter(e.target.value); setPage(0); }}
          className="bg-muted text-sm text-foreground rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
        >
          <option value="">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {viewMode === 'table' ? (
        <div className="gold-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-gold text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-12">S/N</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gold-bright" onClick={() => handleSort('rank')}>
                  Rank {sortKey === 'rank' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gold-bright" onClick={() => handleSort('name')}>
                  Name {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gold-bright" onClick={() => handleSort('periodStart')}>
                  Period {sortKey === 'periodStart' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p, i) => (
                <tr key={p.id} className="border-t border-gold/10 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{page * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium">{p.rank}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.service}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.periodStart}–{p.periodEnd}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setSelectedId(p.id)} className="inline-flex items-center gap-1 text-xs gold-text hover:text-gold-bright transition-colors">
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="gold-border rounded p-4 bg-card hover:bg-muted/40 transition-colors text-left group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-gold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages} · {filtered.length} records</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {selectedPerson && (
        <ProfileModal person={selectedPerson} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
