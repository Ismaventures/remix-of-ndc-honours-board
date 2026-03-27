import { useState, useEffect, useCallback } from 'react';
import { Personnel, DistinguishedVisit, Commandant } from '@/types/domain';
import { supabase } from '@/lib/supabaseClient';

type PersonnelRow = {
  id: string;
  name: string;
  rank: string;
  category: string;
  service: string;
  period_start: number;
  period_end: number;
  image_url: string | null;
  citation: string;
  decoration?: string | null;
  seniority_order: number;
};

function normalizeCategory(value: string): Personnel['category'] {
  const key = value.trim().toLowerCase();
  if (key === 'fwc' || key === 'fwc+') return 'FWC';
  if (key === 'fdc' || key === 'fdc+') return 'FDC';
  if (key === 'staff' || key === 'directing staff') return 'Directing Staff';
  if (key === 'allied') return 'Allied';
  return 'Directing Staff';
}

function normalizeService(value: string): Personnel['service'] {
  const key = value.trim().toLowerCase();
  if (key === 'army') return 'Army';
  if (key === 'navy') return 'Navy';
  if (key === 'air force') return 'Air Force';
  if (key === 'civilian' || key === 'academic') return 'Civilian';
  if (key === 'foreign service' || key === 'foreign') return 'Foreign';
  return 'Civilian';
}

type CommandantRow = {
  id: string;
  name: string;
  title: string;
  tenure_start: number;
  tenure_end: number | null;
  image_url: string | null;
  description: string;
  decoration?: string | null;
  is_current: boolean;
};

type VisitRow = {
  id: string;
  name: string;
  title: string;
  country: string;
  date: string;
  image_url: string | null;
  description: string;
  decoration?: string | null;
};

const mapPersonnelToRow = (p: Personnel): PersonnelRow => ({
  id: p.id,
  name: p.name,
  rank: p.rank,
  category: p.category,
  service: p.service,
  period_start: p.periodStart,
  period_end: p.periodEnd,
  image_url: p.imageUrl ?? null,
  citation: p.citation,
  decoration: p.decoration ?? null,
  seniority_order: p.seniorityOrder,
});

const mapRowToPersonnel = (row: PersonnelRow): Personnel => ({
  id: row.id,
  name: row.name,
  rank: row.rank,
  category: normalizeCategory(row.category),
  service: normalizeService(row.service),
  periodStart: row.period_start,
  periodEnd: row.period_end,
  imageUrl: row.image_url ?? undefined,
  citation: row.citation,
  decoration: row.decoration ?? undefined,
  seniorityOrder: row.seniority_order,
});

const mapCommandantToRow = (c: Commandant): CommandantRow => ({
  id: c.id,
  name: c.name,
  title: c.title,
  tenure_start: c.tenureStart,
  tenure_end: c.tenureEnd,
  image_url: c.imageUrl ?? null,
  description: c.description,
  decoration: c.decoration ?? null,
  is_current: c.isCurrent,
});

const mapRowToCommandant = (row: CommandantRow): Commandant => ({
  id: row.id,
  name: row.name,
  title: row.title,
  tenureStart: row.tenure_start,
  tenureEnd: row.tenure_end,
  imageUrl: row.image_url ?? undefined,
  description: row.description,
  decoration: row.decoration ?? undefined,
  isCurrent: row.is_current,
});

const mapVisitToRow = (v: DistinguishedVisit): VisitRow => ({
  id: v.id,
  name: v.name,
  title: v.title,
  country: v.country,
  date: v.date,
  image_url: v.imageUrl ?? null,
  description: v.description,
  decoration: v.decoration ?? null,
});

const mapRowToVisit = (row: VisitRow): DistinguishedVisit => ({
  id: row.id,
  name: row.name,
  title: row.title,
  country: row.country,
  date: row.date,
  imageUrl: row.image_url ?? undefined,
  description: row.description,
  decoration: row.decoration ?? undefined,
});

const COLLECTION_CACHE_TTL_MS = 73 * 60 * 60 * 1000;
const PERSONNEL_CACHE_KEY = 'ndc_cache_personnel_v1';
const COMMANDANTS_CACHE_KEY = 'ndc_cache_commandants_v1';
const VISITS_CACHE_KEY = 'ndc_cache_visits_v1';

interface CollectionCache<T> {
  cachedAt: number;
  rows: T[];
}

function readCollectionCache<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CollectionCache<T>;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.cachedAt !== 'number') {
      localStorage.removeItem(key);
      return null;
    }

    // Keep last-known-good data available even when stale so screens can
    // still render in poor/no network conditions. Fresh data will overwrite it.
    if (Date.now() - parsed.cachedAt > COLLECTION_CACHE_TTL_MS) {
      return parsed.rows;
    }

    return parsed.rows;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCollectionCache<T>(key: string, rows: T[]): void {
  try {
    const payload: CollectionCache<T> = {
      cachedAt: Date.now(),
      rows,
    };

    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Best-effort cache write.
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

export function usePersonnelStore() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  useEffect(() => {
    const cachedRows = readCollectionCache<PersonnelRow>(PERSONNEL_CACHE_KEY);
    if (cachedRows) {
      setPersonnel(cachedRows.map(mapRowToPersonnel));
    }

    const loadPersonnel = async () => {
      const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .order('seniority_order', { ascending: true });

      if (error) {
        console.error('Failed to load personnel from Supabase:', error.message);
        if (!cachedRows) {
          setPersonnel([]);
        }
        return;
      }

      const rows = (data as PersonnelRow[] | null) ?? [];
      writeCollectionCache(PERSONNEL_CACHE_KEY, rows);
      setPersonnel(rows.map(mapRowToPersonnel));
    };

    void loadPersonnel();
  }, []);

  const addPersonnel = useCallback((p: Omit<Personnel, 'id'>) => {
    const newPersonnel: Personnel = { ...p, id: `p-${Date.now()}` };
    setPersonnel(prev => {
      const next = [...prev, newPersonnel];
      writeCollectionCache(PERSONNEL_CACHE_KEY, next.map(mapPersonnelToRow));
      return next;
    });

    void supabase
      .from('personnel')
      .insert(mapPersonnelToRow(newPersonnel))
      .then(({ error }) => {
        if (error) {
          console.error('Failed to add personnel:', error.message);
        }
      });
  }, []);

  const updatePersonnel = useCallback((id: string, data: Partial<Personnel>) => {
    setPersonnel(prev => {
      const next = prev.map(p => (p.id === id ? { ...p, ...data } : p));
      writeCollectionCache(PERSONNEL_CACHE_KEY, next.map(mapPersonnelToRow));
      return next;
    });

    const payload: Partial<PersonnelRow> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.rank !== undefined) payload.rank = data.rank;
    if (data.category !== undefined) payload.category = data.category;
    if (data.service !== undefined) payload.service = data.service;
    if (data.periodStart !== undefined) payload.period_start = data.periodStart;
    if (data.periodEnd !== undefined) payload.period_end = data.periodEnd;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl ?? null;
    if (data.citation !== undefined) payload.citation = data.citation;
    if (data.decoration !== undefined) payload.decoration = data.decoration ?? null;
    if (data.seniorityOrder !== undefined) payload.seniority_order = data.seniorityOrder;

    void supabase
      .from('personnel')
      .update(payload)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update personnel:', error.message);
        }
      });
  }, []);

  const deletePersonnel = useCallback((id: string) => {
    setPersonnel(prev => {
      const next = prev.filter(p => p.id !== id);
      writeCollectionCache(PERSONNEL_CACHE_KEY, next.map(mapPersonnelToRow));
      return next;
    });

    void supabase
      .from('personnel')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete personnel:', error.message);
        }
      });
  }, []);

  return { personnel, addPersonnel, updatePersonnel, deletePersonnel };
}

export function useCommandantsStore() {
  const [commandants, setCommandants] = useState<Commandant[]>([]);

  useEffect(() => {
    const cachedRows = readCollectionCache<CommandantRow>(COMMANDANTS_CACHE_KEY);
    if (cachedRows) {
      setCommandants(cachedRows.map(mapRowToCommandant));
    }

    const loadCommandants = async () => {
      const { data, error } = await supabase
        .from('commandants')
        .select('*')
        .order('tenure_start', { ascending: false });

      if (error) {
        console.error('Failed to load commandants from Supabase:', error.message);
        if (!cachedRows) {
          setCommandants([]);
        }
        return;
      }

      const rows = (data as CommandantRow[] | null) ?? [];
      writeCollectionCache(COMMANDANTS_CACHE_KEY, rows);
      setCommandants(rows.map(mapRowToCommandant));
    };

    void loadCommandants();
  }, []);

  const addCommandant = useCallback((c: Omit<Commandant, 'id'>) => {
    const newCommandant: Commandant = { ...c, id: `c-${Date.now()}` };
    setCommandants(prev => {
      const next = [...prev, newCommandant];
      writeCollectionCache(COMMANDANTS_CACHE_KEY, next.map(mapCommandantToRow));
      return next;
    });

    void supabase
      .from('commandants')
      .insert(mapCommandantToRow(newCommandant))
      .then(({ error }) => {
        if (error) {
          console.error('Failed to add commandant:', error.message);
        }
      });
  }, []);

  const updateCommandant = useCallback((id: string, data: Partial<Commandant>) => {
    setCommandants(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, ...data } : c));
      writeCollectionCache(COMMANDANTS_CACHE_KEY, next.map(mapCommandantToRow));
      return next;
    });

    const payload: Partial<CommandantRow> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.title !== undefined) payload.title = data.title;
    if (data.tenureStart !== undefined) payload.tenure_start = data.tenureStart;
    if (data.tenureEnd !== undefined) payload.tenure_end = data.tenureEnd;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl ?? null;
    if (data.description !== undefined) payload.description = data.description;
    if (data.decoration !== undefined) payload.decoration = data.decoration ?? null;
    if (data.isCurrent !== undefined) payload.is_current = data.isCurrent;

    void supabase
      .from('commandants')
      .update(payload)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update commandant:', error.message);
        }
      });
  }, []);

  const deleteCommandant = useCallback((id: string) => {
    setCommandants(prev => {
      const next = prev.filter(c => c.id !== id);
      writeCollectionCache(COMMANDANTS_CACHE_KEY, next.map(mapCommandantToRow));
      return next;
    });

    void supabase
      .from('commandants')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete commandant:', error.message);
        }
      });
  }, []);

  return { commandants, addCommandant, updateCommandant, deleteCommandant };
}

export function useVisitsStore() {
  const [visits, setVisits] = useState<DistinguishedVisit[]>([]);

  useEffect(() => {
    const cachedRows = readCollectionCache<VisitRow>(VISITS_CACHE_KEY);
    if (cachedRows) {
      setVisits(cachedRows.map(mapRowToVisit));
    }

    const loadVisits = async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to load visits from Supabase:', error.message);
        if (!cachedRows) {
          setVisits([]);
        }
        return;
      }

      const rows = (data as VisitRow[] | null) ?? [];
      writeCollectionCache(VISITS_CACHE_KEY, rows);
      setVisits(rows.map(mapRowToVisit));
    };

    void loadVisits();
  }, []);

  const addVisit = useCallback((v: Omit<DistinguishedVisit, 'id'>) => {
    const newVisit: DistinguishedVisit = { ...v, id: `v-${Date.now()}` };
    setVisits(prev => {
      const next = [...prev, newVisit];
      writeCollectionCache(VISITS_CACHE_KEY, next.map(mapVisitToRow));
      return next;
    });

    void supabase
      .from('visits')
      .insert(mapVisitToRow(newVisit))
      .then(({ error }) => {
        if (error) {
          console.error('Failed to add visit:', error.message);
        }
      });
  }, []);

  const updateVisit = useCallback((id: string, data: Partial<DistinguishedVisit>) => {
    setVisits(prev => {
      const next = prev.map(v => (v.id === id ? { ...v, ...data } : v));
      writeCollectionCache(VISITS_CACHE_KEY, next.map(mapVisitToRow));
      return next;
    });

    const payload: Partial<VisitRow> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.title !== undefined) payload.title = data.title;
    if (data.country !== undefined) payload.country = data.country;
    if (data.date !== undefined) payload.date = data.date;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl ?? null;
    if (data.description !== undefined) payload.description = data.description;
    if (data.decoration !== undefined) payload.decoration = data.decoration ?? null;

    void supabase
      .from('visits')
      .update(payload)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update visit:', error.message);
        }
      });
  }, []);

  const deleteVisit = useCallback((id: string) => {
    setVisits(prev => {
      const next = prev.filter(v => v.id !== id);
      writeCollectionCache(VISITS_CACHE_KEY, next.map(mapVisitToRow));
      return next;
    });

    void supabase
      .from('visits')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete visit:', error.message);
        }
      });
  }, []);

  return { visits, addVisit, updateVisit, deleteVisit };
}


export interface AudioSettings {
  audioUrl: string | null;
}

const defaultAudioSettings: AudioSettings = {
  audioUrl: null, // "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
};

export function useAudioSettingsStore() {
  const [settings, setSettings] = useState<AudioSettings>(() =>
    loadFromStorage("ndc_audio_settings", defaultAudioSettings)
  );

  useEffect(() => {
    localStorage.setItem("ndc_audio_settings", JSON.stringify(settings));
  }, [settings]);

  const updateAudioUrl = useCallback((url: string | null) => {
    setSettings({ audioUrl: url });
  }, []);

  return { settings, updateAudioUrl };
}
