import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Personnel, DistinguishedVisit, Category, Service } from '@/data/mockData';

interface AdminPanelProps {
  personnel: Personnel[];
  visits: DistinguishedVisit[];
  onAddPersonnel: (p: Omit<Personnel, 'id'>) => void;
  onUpdatePersonnel: (id: string, data: Partial<Personnel>) => void;
  onDeletePersonnel: (id: string) => void;
  onAddVisit: (v: Omit<DistinguishedVisit, 'id'>) => void;
  onUpdateVisit: (id: string, data: Partial<DistinguishedVisit>) => void;
  onDeleteVisit: (id: string) => void;
}

const CATEGORIES: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];
const SERVICES: Service[] = ['Army', 'Navy', 'Air Force', 'Civilian', 'Foreign'];

export function AdminPanel({
  personnel, visits,
  onAddPersonnel, onUpdatePersonnel, onDeletePersonnel,
  onAddVisit, onUpdateVisit, onDeleteVisit,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'personnel' | 'visits'>('personnel');
  const [editingP, setEditingP] = useState<Personnel | null>(null);
  const [editingV, setEditingV] = useState<DistinguishedVisit | null>(null);
  const [showFormP, setShowFormP] = useState(false);
  const [showFormV, setShowFormV] = useState(false);

  return (
    <div className="scroll-reveal">
      <h2 className="text-2xl font-bold gold-text mb-6">Admin Panel</h2>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('personnel')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'personnel' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          Personnel
        </button>
        <button onClick={() => setTab('visits')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'visits' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          Visits
        </button>
      </div>

      {tab === 'personnel' && (
        <div>
          <button onClick={() => { setEditingP(null); setShowFormP(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97] mb-4">
            <Plus className="h-4 w-4" /> Add Personnel
          </button>

          {showFormP && (
            <PersonnelForm
              initial={editingP}
              onSave={(data) => {
                if (editingP) onUpdatePersonnel(editingP.id, data);
                else onAddPersonnel(data as Omit<Personnel, 'id'>);
                setShowFormP(false);
                setEditingP(null);
              }}
              onCancel={() => { setShowFormP(false); setEditingP(null); }}
            />
          )}

          <div className="gold-border rounded overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-gold text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {personnel.slice(0, 20).map(p => (
                  <tr key={p.id} className="border-t border-gold/10 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.rank}</td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingP(p); setShowFormP(true); }} className="p-1 text-muted-foreground hover:text-gold transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onDeletePersonnel(p.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'visits' && (
        <div>
          <button onClick={() => { setEditingV(null); setShowFormV(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97] mb-4">
            <Plus className="h-4 w-4" /> Add Visit
          </button>

          {showFormV && (
            <VisitForm
              initial={editingV}
              onSave={(data) => {
                if (editingV) onUpdateVisit(editingV.id, data);
                else onAddVisit(data as Omit<DistinguishedVisit, 'id'>);
                setShowFormV(false);
                setEditingV(null);
              }}
              onCancel={() => { setShowFormV(false); setEditingV(null); }}
            />
          )}

          <div className="gold-border rounded overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-gold text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Country</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} className="border-t border-gold/10 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{v.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.country}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.date}</td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingV(v); setShowFormV(true); }} className="p-1 text-muted-foreground hover:text-gold transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onDeleteVisit(v.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonnelForm({ initial, onSave, onCancel }: {
  initial: Personnel | null;
  onSave: (data: Partial<Personnel>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    rank: initial?.rank || '',
    category: initial?.category || 'FWC' as Category,
    service: initial?.service || 'Army' as Service,
    periodStart: initial?.periodStart || 2020,
    periodEnd: initial?.periodEnd || 2022,
    citation: initial?.citation || 'Recognized for outstanding contributions to strategic leadership and national defence development.',
    imageUrl: initial?.imageUrl || '',
  });

  const update = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="gold-border rounded p-4 bg-card mb-4 scroll-reveal">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold gold-text">{initial ? 'Edit' : 'Add'} Personnel</h4>
        <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input placeholder="Rank" value={form.rank} onChange={e => update('rank', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <select value={form.category} onChange={e => update('category', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.service} onChange={e => update('service', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40">
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" placeholder="Period Start" value={form.periodStart} onChange={e => update('periodStart', parseInt(e.target.value))} className="bg-muted rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input type="number" placeholder="Period End" value={form.periodEnd} onChange={e => update('periodEnd', parseInt(e.target.value))} className="bg-muted rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 sm:col-span-2" />
        <textarea placeholder="Citation" value={form.citation} onChange={e => update('citation', e.target.value)} rows={2} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 sm:col-span-2 resize-none" />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

function VisitForm({ initial, onSave, onCancel }: {
  initial: DistinguishedVisit | null;
  onSave: (data: Partial<DistinguishedVisit>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    title: initial?.title || '',
    country: initial?.country || '',
    date: initial?.date || '',
    imageUrl: initial?.imageUrl || '',
    description: initial?.description || '',
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="gold-border rounded p-4 bg-card mb-4 scroll-reveal">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold gold-text">{initial ? 'Edit' : 'Add'} Visit</h4>
        <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input placeholder="Title/Position" value={form.title} onChange={e => update('title', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input placeholder="Country" value={form.country} onChange={e => update('country', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input type="date" value={form.date} onChange={e => update('date', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40" />
        <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 sm:col-span-2" />
        <textarea placeholder="Description" value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="bg-muted rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 sm:col-span-2 resize-none" />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}
