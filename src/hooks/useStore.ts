import { useState, useEffect, useCallback, useRef } from 'react';
import { Personnel, DistinguishedVisit, Commandant } from '@/types/domain';
import { supabase, withRequestQueue } from '@/lib/supabaseClient';

type PersonnelRow = {
  id: string;
  name: string;
  rank: string;
  category: string;
  service: string;
  course?: number | null;
  academic_year?: string | null;
  period_start: number;
  period_end: number;
  image_url: string | null;
  citation: string;
  decoration?: string | null;
  biography_full?: string | null;
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
  if (key === 'army' || key === 'nigerian army') return 'Nigerian Army';
  if (key === 'navy' || key === 'nigerian navy') return 'Nigerian Navy';
  if (key === 'air force' || key === 'airforce' || key === 'nigerian air force') return 'Nigerian Air Force';
  if (key === 'civilian' || key === 'academic') return 'Civilian';
  if (key === 'foreign service' || key === 'foreign') return 'Foreign';
  return 'Civilian';
}

type CommandantRow = {
  id: string;
  name: string;
  rank?: string | null;
  title: string;
  post_nominals?: string | null;
  tenure_start: number;
  tenure_end: number | null;
  years_experience?: number | null;
  image_url?: string | null;
  description?: string;
  bio_summary?: string | null;
  biography_full?: string | null;
  education?: string[] | null;
  training?: string[] | null;
  past_appointments?: string[] | null;
  honours?: string[] | null;
  family_note?: string | null;
  impact_statement?: string | null;
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
} as any);

const mapRowToPersonnel = (row: PersonnelRow): Personnel => ({
  id: row.id,
  name: row.name ? row.name.toUpperCase() : '',
  rank: row.rank ? row.rank.toUpperCase() : '',
  category: normalizeCategory(row.category),
  service: normalizeService(row.service),
  course: (row as any).course ?? row.course ?? undefined,
  academicYear: (row as any).academicYear ?? (row as any).academic_year ?? row.academic_year ?? undefined,
  periodStart: (row as any).periodStart ?? row.period_start,
  periodEnd: (row as any).periodEnd ?? row.period_end,
  imageUrl: (row as any).imageUrl ?? row.image_url ?? undefined,
  citation: row.citation,
  decoration: (row as any).decoration ?? row.decoration ?? undefined,
  biographyFull: (row as any).biographyFull ?? (row as any).biography_full ?? row.biography_full ?? undefined,
  seniorityOrder: (row as any).seniorityOrder ?? row.seniority_order,
});

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const mapCommandantToRow = (c: Commandant): CommandantRow => ({
  id: c.id,
  name: c.name,
  rank: c.rank ?? null,
  title: c.title,
  post_nominals: c.postNominals ?? null,
  tenure_start: c.tenureStart,
  tenure_end: c.tenureEnd,
  years_experience: c.yearsExperience ?? null,
  image_url: c.imageUrl ?? null,
  description: c.description,
  bio_summary: c.bioSummary ?? null,
  biography_full: c.biographyFull ?? null,
  education: c.education ?? [],
  training: c.training ?? [],
  past_appointments: c.pastAppointments ?? [],
  honours: c.honours ?? [],
  family_note: c.familyNote ?? null,
  impact_statement: c.impactStatement ?? null,
  decoration: c.decoration ?? null,
  is_current: c.isCurrent,
});

const mapRowToCommandant = (row: CommandantRow): Commandant => ({
  id: row.id,
  name: row.name ? row.name.toUpperCase() : '',
  rank: row.rank ? row.rank.toUpperCase() : undefined,
  title: row.title,
  postNominals: row.post_nominals ?? undefined,
  tenureStart: row.tenure_start,
  tenureEnd: row.tenure_end,
  yearsExperience: row.years_experience ?? undefined,
  imageUrl: row.image_url ?? undefined,
  description: row.description ?? '',
  bioSummary: row.bio_summary ?? undefined,
  biographyFull: row.biography_full ?? undefined,
  education: normalizeStringArray(row.education),
  training: normalizeStringArray(row.training),
  pastAppointments: normalizeStringArray(row.past_appointments),
  honours: normalizeStringArray(row.honours),
  familyNote: row.family_note ?? undefined,
  impactStatement: row.impact_statement ?? undefined,
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
  name: row.name ? row.name.toUpperCase() : '',
  title: row.title,
  country: row.country,
  date: row.date,
  imageUrl: row.image_url ?? undefined,
  description: row.description,
  decoration: row.decoration ?? undefined,
});

const COLLECTION_CACHE_TTL_MS = 73 * 60 * 60 * 1000;
const COLLECTION_BACKGROUND_REFRESH_MS = 90 * 1000;
const COMMANDANTS_BACKGROUND_REFRESH_MS = 20 * 1000;
const ENABLE_COMMANDANTS_REALTIME = import.meta.env.VITE_ENABLE_COMMANDANTS_REALTIME === 'true';
const COMMANDANTS_FETCH_PAGE_SIZE = 2;
const PERSONNEL_CACHE_KEY = 'ndc_cache_personnel_v1';
const COMMANDANTS_CACHE_KEY = 'ndc_cache_commandants_v1';
const VISITS_CACHE_KEY = 'ndc_cache_visits_v1';
const COLLECTION_CACHE_SCHEMA_KEY = 'ndc_cache_schema_version';
const COLLECTION_CACHE_SCHEMA_VERSION = '3';

const COLLECTION_CACHE_KEYS = [
  PERSONNEL_CACHE_KEY,
  COMMANDANTS_CACHE_KEY,
  VISITS_CACHE_KEY,
];

let collectionCacheSchemaEnsured = false;

function ensureCollectionCacheSchema(): void {
  if (collectionCacheSchemaEnsured) return;
  collectionCacheSchemaEnsured = true;

  try {
    const version = localStorage.getItem(COLLECTION_CACHE_SCHEMA_KEY);
    if (version === COLLECTION_CACHE_SCHEMA_VERSION) return;

    COLLECTION_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(COLLECTION_CACHE_SCHEMA_KEY, COLLECTION_CACHE_SCHEMA_VERSION);
  } catch {
    // Best-effort schema alignment.
  }
}

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSupabaseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const parts = [
      typeof maybe.message === 'string' ? maybe.message : null,
      typeof maybe.code === 'string' ? `code=${maybe.code}` : null,
      typeof maybe.details === 'string' && maybe.details.length > 0
        ? `details=${maybe.details}`
        : null,
      typeof maybe.hint === 'string' && maybe.hint.length > 0 ? `hint=${maybe.hint}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return 'Unknown Supabase error';
}

function applyRemoteRowsOrFallback<T>(
  remoteRows: T[],
  existingRows: T[],
): T[] {
  if (remoteRows.length === 0 && existingRows.length > 0) {
    return existingRows;
  }
  return remoteRows;
}

export function usePersonnelStore() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    const loadPersonnel = async () => {
      if (inFlight || disposed) return;
      inFlight = true;

      try {
        const result = await withRequestQueue(async () => {
          const { data, error } = await supabase
            .from('personnel')
            .select('*')
            .order('seniority_order', { ascending: true });

          if (error) {
            throw error;
          }

          return (data as PersonnelRow[] | null) ?? [];
        }, 3);

        if (!disposed) {
          setPersonnel(result.map(mapRowToPersonnel));
        }
      } catch (error) {
        console.error('Failed to load personnel from SQLite:', error);
      } finally {
        inFlight = false;
      }
    };

    void loadPersonnel();

    const interval = setInterval(() => {
      void loadPersonnel();
    }, COLLECTION_BACKGROUND_REFRESH_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  const addPersonnel = useCallback((p: Omit<Personnel, 'id'>) => {
    const newPersonnel: Personnel = {
      ...p,
      name: p.name ? p.name.toUpperCase() : '',
      rank: p.rank ? p.rank.toUpperCase() : '',
      id: `p-${Date.now()}`
    };
    setPersonnel(prev => [...prev, newPersonnel]);

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
    let updatedData = { ...data };
    if (data.name !== undefined) {
      updatedData.name = data.name ? data.name.toUpperCase() : '';
    }
    if (data.rank !== undefined) {
      updatedData.rank = data.rank ? data.rank.toUpperCase() : '';
    }
    setPersonnel(prev => prev.map(p => (p.id === id ? { ...p, ...updatedData } : p)));

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
    setPersonnel(prev => prev.filter(p => p.id !== id));

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
  const [isCommandantsLoading, setIsCommandantsLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    const fetchCommandants = async (): Promise<CommandantRow[]> => {
      return withRequestQueue(async () => {
        const rows: CommandantRow[] = [];

        for (let from = 0; from < 400; from += COMMANDANTS_FETCH_PAGE_SIZE) {
          const to = from + COMMANDANTS_FETCH_PAGE_SIZE - 1;
          const page = await supabase
            .from('commandants')
            .select('id,name,rank,title,post_nominals,tenure_start,tenure_end,years_experience,is_current,decoration,image_url,description,bio_summary,biography_full,education,training,past_appointments,honours,family_note,impact_statement')
            .order('tenure_start', { ascending: false })
            .range(from, to);

          if (page.error) {
            throw page.error;
          }

          const pageRows = (page.data as CommandantRow[] | null) ?? [];
          rows.push(...pageRows);

          if (pageRows.length < COMMANDANTS_FETCH_PAGE_SIZE) {
            break;
          }
        }

        return rows;
      }, 4);
    };

    const fetchCommandantsFallback = async (): Promise<CommandantRow[]> => {
      return withRequestQueue(async () => {
        const { data, error } = await supabase
          .from('commandants')
          .select('id,name,rank,title,post_nominals,tenure_start,tenure_end,years_experience,is_current,decoration,description,image_url,bio_summary,biography_full,education,training,past_appointments,honours,family_note,impact_statement')
          .order('tenure_start', { ascending: false });

        if (error) {
          throw error;
        }

        return ((data as CommandantRow[] | null) ?? []).map((row) => ({
          ...row,
          description: row.description ?? '',
        }));
      }, 4);
    };

    const loadCommandants = async () => {
      if (inFlight || disposed) return;
      inFlight = true;

      const retryDelays = [0, 250, 900];

      for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
        if (retryDelays[attempt] > 0) {
          await wait(retryDelays[attempt]);
        }

        try {
          let rows: CommandantRow[] = [];
          let usedFallbackFetch = false;
          try {
            rows = await fetchCommandants();
          } catch (primaryError) {
            console.error(
              'Primary commandants fetch failed, falling back to lightweight fetch:',
              formatSupabaseError(primaryError),
            );
            rows = await fetchCommandantsFallback();
            usedFallbackFetch = true;
          }

          if (!disposed) {
            setCommandants((prev) => {
              const prevRows = prev.map(mapCommandantToRow);
              const rowsWithFallbackPreservation = usedFallbackFetch
                ? rows.map((row) => {
                    const previous = prevRows.find((entry) => entry.id === row.id);
                    return {
                      ...row,
                      image_url: row.image_url ?? previous?.image_url ?? null,
                      description:
                        row.description && row.description.trim().length > 0
                          ? row.description
                          : previous?.description ?? '',
                    };
                  })
                : rows;

              return rowsWithFallbackPreservation.map(mapRowToCommandant);
            });
            setIsCommandantsLoading(false);
          }
          inFlight = false;
          return;
        } catch (error) {
          console.error('Failed to load commandants from SQLite:', formatSupabaseError(error));
        }
      }

      if (!disposed) {
        setIsCommandantsLoading(false);
      }
      inFlight = false;
    };

    void loadCommandants();

    const interval = setInterval(() => {
      void loadCommandants();
    }, COMMANDANTS_BACKGROUND_REFRESH_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  const addCommandant = useCallback((c: Omit<Commandant, 'id'>) => {
    const newCommandant: Commandant = {
      ...c,
      name: c.name ? c.name.toUpperCase() : '',
      rank: c.rank ? c.rank.toUpperCase() : undefined,
      id: `c-${Date.now()}`
    };
    setCommandants(prev => [...prev, newCommandant]);

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
    let updatedData = { ...data };
    if (data.name !== undefined) {
      updatedData.name = data.name ? data.name.toUpperCase() : '';
    }
    if (data.rank !== undefined) {
      updatedData.rank = data.rank ? data.rank.toUpperCase() : undefined;
    }
    setCommandants(prev => prev.map(c => (c.id === id ? { ...c, ...updatedData } : c)));

    const payload: Partial<CommandantRow> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.rank !== undefined) payload.rank = data.rank ?? null;
    if (data.title !== undefined) payload.title = data.title;
    if (data.postNominals !== undefined) payload.post_nominals = data.postNominals ?? null;
    if (data.tenureStart !== undefined) payload.tenure_start = data.tenureStart;
    if (data.tenureEnd !== undefined) payload.tenure_end = data.tenureEnd;
    if (data.yearsExperience !== undefined) payload.years_experience = data.yearsExperience ?? null;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl ?? null;
    if (data.description !== undefined) payload.description = data.description;
    if (data.bioSummary !== undefined) payload.bio_summary = data.bioSummary ?? null;
    if (data.biographyFull !== undefined) payload.biography_full = data.biographyFull ?? null;
    if (data.education !== undefined) payload.education = data.education;
    if (data.training !== undefined) payload.training = data.training;
    if (data.pastAppointments !== undefined) payload.past_appointments = data.pastAppointments;
    if (data.honours !== undefined) payload.honours = data.honours;
    if (data.familyNote !== undefined) payload.family_note = data.familyNote ?? null;
    if (data.impactStatement !== undefined) payload.impact_statement = data.impactStatement ?? null;
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
    setCommandants(prev => prev.filter(c => c.id !== id));

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

  return {
    commandants,
    isCommandantsLoading,
    addCommandant,
    updateCommandant,
    deleteCommandant,
  };
}

export function useVisitsStore() {
  const [visits, setVisits] = useState<DistinguishedVisit[]>([]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    const loadVisits = async () => {
      if (inFlight || disposed) return;
      inFlight = true;

      try {
        const result = await withRequestQueue(async () => {
          const { data, error } = await supabase
            .from('visits')
            .select('*')
            .order('date', { ascending: false });

          if (error) {
            throw error;
          }

          return (data as VisitRow[] | null) ?? [];
        }, 3);

        if (!disposed) {
          setVisits(result.map(mapRowToVisit));
        }
      } catch (error) {
        console.error('Failed to load visits from SQLite:', error);
      } finally {
        inFlight = false;
      }
    };

    void loadVisits();

    const interval = setInterval(() => {
      void loadVisits();
    }, COLLECTION_BACKGROUND_REFRESH_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  const addVisit = useCallback((v: Omit<DistinguishedVisit, 'id'>) => {
    const newVisit: DistinguishedVisit = { ...v, name: v.name ? v.name.toUpperCase() : '', id: `v-${Date.now()}` };
    setVisits(prev => [...prev, newVisit]);

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
    const updatedData = data.name !== undefined ? { ...data, name: data.name ? data.name.toUpperCase() : '' } : data;
    setVisits(prev => prev.map(v => (v.id === id ? { ...v, ...updatedData } : v)));

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
    setVisits(prev => prev.filter(v => v.id !== id));

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
