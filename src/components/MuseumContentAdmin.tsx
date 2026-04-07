import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMuseumSections, type MuseumSectionRow } from "@/hooks/useMuseumSections";
import { useAboutItems, type AboutItemRow } from "@/hooks/useAboutItems";
import { useCollectionWings, type CollectionWingRow } from "@/hooks/useCollectionWings";
import { useTourRoutes, type TourRouteRow } from "@/hooks/useTourRoutes";

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between rounded-xl border border-[#002060]/20 bg-[#002060]/20 px-4 py-3 text-left transition hover:bg-[#002060]/30"
    >
      <span className="text-sm font-semibold text-[#002060]">{title} <span className="text-gray-400 font-normal">({count})</span></span>
      {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
      <label className="text-[11px] uppercase tracking-wider text-gray-500 pt-2">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function inputCls(small?: boolean) {
  return cn(
    "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FFD700]/40",
    small && "text-xs h-8",
  );
}

/* ------------------------------------------------------------------ */
/*  Museum Sections Editor                                            */
/* ------------------------------------------------------------------ */

function SectionsEditor() {
  const { sections, loading, upsert, remove } = useMuseumSections();
  const [editing, setEditing] = useState<MuseumSectionRow | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading sections…</div>;

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await upsert(editing);
    setSaving(false);
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      {sections.map((s) =>
        editing?.id === s.id ? (
          <div key={s.id} className="rounded-lg border border-[#002060]/20 bg-gray-50 p-3 space-y-2">
            <FieldRow label="ID"><Input value={editing.id} disabled className={inputCls(true)} /></FieldRow>
            <FieldRow label="Title"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Subtitle"><Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Description"><textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
            <FieldRow label="Icon Name"><Input value={editing.icon_name} onChange={(e) => setEditing({ ...editing, icon_name: e.target.value })} className={inputCls(true)} placeholder="Landmark, Trophy, Route…" /></FieldRow>
            <FieldRow label="Accent"><Input value={editing.accent} onChange={(e) => setEditing({ ...editing, accent: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Color"><Input type="color" value={editing.service_color} onChange={(e) => setEditing({ ...editing, service_color: e.target.value })} className="h-8 w-16 p-0 bg-transparent border-none" /></FieldRow>
            <FieldRow label="Order"><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} className={inputCls(true)} /></FieldRow>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-3 w-3" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div>
              <span className="text-sm font-medium text-gray-900">{s.title}</span>
              <span className="ml-2 text-[10px] text-gray-400">{s.id}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({ ...s })} className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-3 w-3 text-gray-500" /></button>
              <button onClick={() => remove(s.id)} className="p-1.5 rounded hover:bg-red-500/20"><Trash2 className="h-3 w-3 text-red-400/60" /></button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  About Items Editor                                                */
/* ------------------------------------------------------------------ */

function AboutItemsEditor() {
  const { items, loading, upsert, remove } = useAboutItems();
  const [editing, setEditing] = useState<AboutItemRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank: Omit<AboutItemRow, "id"> & { id?: string } = {
    eyebrow: "", title: "", body: "", display_order: items.length, is_published: true,
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>;

  const handleSave = async (row: Omit<AboutItemRow, "id"> & { id?: string }) => {
    setSaving(true);
    await upsert(row);
    setSaving(false);
    setEditing(null);
    setAdding(false);
  };

  const form = (item: Omit<AboutItemRow, "id"> & { id?: string }, onCancel: () => void) => (
    <div className="rounded-lg border border-[#002060]/20 bg-gray-50 p-3 space-y-2">
      <FieldRow label="Eyebrow"><Input value={item.eyebrow} onChange={(e) => setEditing({ ...item, eyebrow: e.target.value } as AboutItemRow)} className={inputCls(true)} /></FieldRow>
      <FieldRow label="Title"><Input value={item.title} onChange={(e) => setEditing({ ...item, title: e.target.value } as AboutItemRow)} className={inputCls(true)} /></FieldRow>
      <FieldRow label="Body"><textarea value={item.body} onChange={(e) => setEditing({ ...item, body: e.target.value } as AboutItemRow)} rows={4} className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
      <FieldRow label="Order"><Input type="number" value={item.display_order} onChange={(e) => setEditing({ ...item, display_order: Number(e.target.value) } as AboutItemRow)} className={inputCls(true)} /></FieldRow>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => handleSave(editing ?? item)} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3 w-3" /> Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.map((item) =>
        editing?.id === item.id ? (
          <div key={item.id}>{form(editing, () => setEditing(null))}</div>
        ) : (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div>
              <span className="text-[10px] text-[#002060]/60 mr-2">{item.eyebrow}</span>
              <span className="text-sm font-medium text-gray-900">{item.title}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({ ...item })} className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-3 w-3 text-gray-500" /></button>
              <button onClick={() => remove(item.id)} className="p-1.5 rounded hover:bg-red-500/20"><Trash2 className="h-3 w-3 text-red-400/60" /></button>
            </div>
          </div>
        ),
      )}
      {adding ? form({ ...blank }, () => setAdding(false)) : (
        <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditing({ ...blank } as AboutItemRow); }} className="border-dashed border-gray-300 text-gray-500 hover:text-gray-900">
          <Plus className="h-3 w-3 mr-1" /> Add Item
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collection Wings Editor                                           */
/* ------------------------------------------------------------------ */

function CollectionWingsEditor() {
  const { wings, loading, upsert, remove } = useCollectionWings();
  const [editing, setEditing] = useState<CollectionWingRow | null>(null);
  const [highlightsText, setHighlightsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setHighlightsText(editing.highlights.join("\n"));
  }, [editing?.id]);

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>;

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await upsert({ ...editing, highlights: highlightsText.split("\n").map((s) => s.trim()).filter(Boolean) });
    setSaving(false);
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      {wings.map((w) =>
        editing?.id === w.id ? (
          <div key={w.id} className="rounded-lg border border-[#002060]/20 bg-gray-50 p-3 space-y-2">
            <FieldRow label="ID"><Input value={editing.id} disabled className={inputCls(true)} /></FieldRow>
            <FieldRow label="Title"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Category"><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Summary"><textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} rows={3} className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
            <FieldRow label="Curatorial Note"><textarea value={editing.curatorial_note} onChange={(e) => setEditing({ ...editing, curatorial_note: e.target.value })} rows={3} className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
            <FieldRow label="Highlights"><textarea value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} rows={3} placeholder="One per line" className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
            <FieldRow label="Featured Fact"><Input value={editing.featured_fact} onChange={(e) => setEditing({ ...editing, featured_fact: e.target.value })} className={inputCls(true)} /></FieldRow>
            <FieldRow label="Order"><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} className={inputCls(true)} /></FieldRow>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-3 w-3" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div key={w.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div>
              <span className="text-sm font-medium text-gray-900">{w.title}</span>
              <span className="ml-2 text-[10px] text-gray-400">{w.category}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({ ...w })} className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-3 w-3 text-gray-500" /></button>
              <button onClick={() => remove(w.id)} className="p-1.5 rounded hover:bg-red-500/20"><Trash2 className="h-3 w-3 text-red-400/60" /></button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tour Routes Editor                                                */
/* ------------------------------------------------------------------ */

function TourRoutesEditor() {
  const { routes, loading, upsert, remove } = useTourRoutes();
  const [editing, setEditing] = useState<TourRouteRow | null>(null);
  const [stopsText, setStopsText] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank: Omit<TourRouteRow, "id"> & { id?: string } = {
    title: "", duration: "", audience: "", description: "", stops: [],
    service_color: "#002060", collection_id: null, display_order: routes.length, is_published: true,
  };

  useEffect(() => {
    if (editing) setStopsText(editing.stops.join("\n"));
  }, [editing?.id]);

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>;

  const handleSave = async (row: Omit<TourRouteRow, "id"> & { id?: string }) => {
    setSaving(true);
    await upsert({ ...row, stops: stopsText.split("\n").map((s) => s.trim()).filter(Boolean) });
    setSaving(false);
    setEditing(null);
    setAdding(false);
  };

  const renderForm = (item: Omit<TourRouteRow, "id"> & { id?: string }, onCancel: () => void) => (
    <div className="rounded-lg border border-[#002060]/20 bg-gray-50 p-3 space-y-2">
      <FieldRow label="Title"><Input value={item.title} onChange={(e) => setEditing({ ...item, title: e.target.value } as TourRouteRow)} className={inputCls(true)} /></FieldRow>
      <FieldRow label="Duration"><Input value={item.duration} onChange={(e) => setEditing({ ...item, duration: e.target.value } as TourRouteRow)} className={inputCls(true)} placeholder="e.g. 8–12 mins" /></FieldRow>
      <FieldRow label="Audience"><Input value={item.audience} onChange={(e) => setEditing({ ...item, audience: e.target.value } as TourRouteRow)} className={inputCls(true)} /></FieldRow>
      <FieldRow label="Description"><textarea value={item.description} onChange={(e) => setEditing({ ...item, description: e.target.value } as TourRouteRow)} rows={3} className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
      <FieldRow label="Stops"><textarea value={stopsText} onChange={(e) => setStopsText(e.target.value)} rows={4} placeholder="One stop per line" className={cn(inputCls(), "w-full rounded-md border px-3 py-2 text-xs resize-y")} /></FieldRow>
      <FieldRow label="Color"><Input type="color" value={item.service_color} onChange={(e) => setEditing({ ...item, service_color: e.target.value } as TourRouteRow)} className="h-8 w-16 p-0 bg-transparent border-none" /></FieldRow>
      <FieldRow label="Collection ID"><Input value={item.collection_id ?? ""} onChange={(e) => setEditing({ ...item, collection_id: e.target.value || null } as TourRouteRow)} className={inputCls(true)} placeholder="state, regional, world…" /></FieldRow>
      <FieldRow label="Order"><Input type="number" value={item.display_order} onChange={(e) => setEditing({ ...item, display_order: Number(e.target.value) } as TourRouteRow)} className={inputCls(true)} /></FieldRow>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => handleSave(editing ?? item)} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3 w-3" /> Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {routes.map((r) =>
        editing?.id === r.id ? (
          <div key={r.id}>{renderForm(editing, () => setEditing(null))}</div>
        ) : (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.service_color }} />
              <span className="text-sm font-medium text-gray-900">{r.title}</span>
              <span className="text-[10px] text-gray-400">{r.duration}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({ ...r })} className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-3 w-3 text-gray-500" /></button>
              <button onClick={() => remove(r.id)} className="p-1.5 rounded hover:bg-red-500/20"><Trash2 className="h-3 w-3 text-red-400/60" /></button>
            </div>
          </div>
        ),
      )}
      {adding ? renderForm({ ...blank }, () => setAdding(false)) : (
        <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditing({ ...blank } as TourRouteRow); setStopsText(""); }} className="border-dashed border-gray-300 text-gray-500 hover:text-gray-900">
          <Plus className="h-3 w-3 mr-1" /> Add Tour Route
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main CMS Admin Component                                          */
/* ------------------------------------------------------------------ */

export function MuseumContentAdmin() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sections: true, about: false, wings: false, tours: false,
  });

  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="rounded-2xl border border-[#FFD700]/15 bg-gradient-to-b from-[#002060]/8 to-transparent p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold font-serif text-[#002060]">Museum Content CMS</h3>
        <p className="text-xs text-gray-400 mt-0.5">Edit all museum section text, images, tours, and collection metadata from here.</p>
      </div>

      <div className="space-y-3">
        <div>
          <SectionHeader title="Main Sections (Entry Cards)" count={4} open={!!openSections.sections} onToggle={() => toggle("sections")} />
          {openSections.sections && <div className="mt-2"><SectionsEditor /></div>}
        </div>

        <div>
          <SectionHeader title="About NDC History Items" count={5} open={!!openSections.about} onToggle={() => toggle("about")} />
          {openSections.about && <div className="mt-2"><AboutItemsEditor /></div>}
        </div>

        <div>
          <SectionHeader title="Collection Wings" count={5} open={!!openSections.wings} onToggle={() => toggle("wings")} />
          {openSections.wings && <div className="mt-2"><CollectionWingsEditor /></div>}
        </div>

        <div>
          <SectionHeader title="Tour Routes" count={3} open={!!openSections.tours} onToggle={() => toggle("tours")} />
          {openSections.tours && <div className="mt-2"><TourRoutesEditor /></div>}
        </div>
      </div>
    </div>
  );
}
