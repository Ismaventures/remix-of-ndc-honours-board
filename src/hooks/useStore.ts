import { useState, useEffect, useCallback } from 'react';
import { Personnel, DistinguishedVisit, Commandant, initialPersonnel, initialVisits, initialCommandants } from '@/data/mockData';

const COMMANDANTS_DATA_VERSION = '2026-03-21-commandants-v3';
const LEGACY_COMMANDANTS = new Set([
  'Rear Admiral A.A. Ahmad',
  'AVM E.O. Abubakar',
  'Rear Admiral M.A. Osondu',
  'Maj Gen. T.A. Lagbaja',
  'AVM C.O. Egbuchunam',
  'Rear Admiral S.I. Akhigbe',
]);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function isLegacyCommandantsData(data: unknown): boolean {
  if (!Array.isArray(data)) return true;
  if (data.length < 15) return true;

  return data.some(item => {
    if (!item || typeof item !== 'object') return true;
    const name = (item as { name?: unknown }).name;
    return typeof name === 'string' && LEGACY_COMMANDANTS.has(name);
  });
}

function loadCommandantsFromStorage(): Commandant[] {
  try {
    const storedVersion = localStorage.getItem('ndc_commandants_version');
    const storedCommandants = localStorage.getItem('ndc_commandants');

    if (storedVersion !== COMMANDANTS_DATA_VERSION || !storedCommandants) {
      localStorage.setItem('ndc_commandants_version', COMMANDANTS_DATA_VERSION);
      localStorage.setItem('ndc_commandants', JSON.stringify(initialCommandants));
      return initialCommandants;
    }

    const parsed = JSON.parse(storedCommandants) as unknown;
    if (isLegacyCommandantsData(parsed)) {
      localStorage.setItem('ndc_commandants_version', COMMANDANTS_DATA_VERSION);
      localStorage.setItem('ndc_commandants', JSON.stringify(initialCommandants));
      return initialCommandants;
    }

    return parsed as Commandant[];
  } catch {
    return initialCommandants;
  }
}

export function usePersonnelStore() {
  const [personnel, setPersonnel] = useState<Personnel[]>(() =>
    loadFromStorage('ndc_personnel', initialPersonnel)
  );

  useEffect(() => {
    localStorage.setItem('ndc_personnel', JSON.stringify(personnel));
  }, [personnel]);

  const addPersonnel = useCallback((p: Omit<Personnel, 'id'>) => {
    setPersonnel(prev => [...prev, { ...p, id: `p-${Date.now()}` }]);
  }, []);

  const updatePersonnel = useCallback((id: string, data: Partial<Personnel>) => {
    setPersonnel(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePersonnel = useCallback((id: string) => {
    setPersonnel(prev => prev.filter(p => p.id !== id));
  }, []);

  return { personnel, addPersonnel, updatePersonnel, deletePersonnel };
}

export function useCommandantsStore() {
  const [commandants, setCommandants] = useState<Commandant[]>(() =>
    loadCommandantsFromStorage()
  );

  useEffect(() => {
    localStorage.setItem('ndc_commandants', JSON.stringify(commandants));
    localStorage.setItem('ndc_commandants_version', COMMANDANTS_DATA_VERSION);
  }, [commandants]);

  const addCommandant = useCallback((c: Omit<Commandant, 'id'>) => {
    setCommandants(prev => [...prev, { ...c, id: `c-${Date.now()}` }]);
  }, []);

  const updateCommandant = useCallback((id: string, data: Partial<Commandant>) => {
    setCommandants(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteCommandant = useCallback((id: string) => {
    setCommandants(prev => prev.filter(c => c.id !== id));
  }, []);

  return { commandants, addCommandant, updateCommandant, deleteCommandant };
}

export function useVisitsStore() {
  const [visits, setVisits] = useState<DistinguishedVisit[]>(() =>
    loadFromStorage('ndc_visits', initialVisits)
  );

  useEffect(() => {
    localStorage.setItem('ndc_visits', JSON.stringify(visits));
  }, [visits]);

  const addVisit = useCallback((v: Omit<DistinguishedVisit, 'id'>) => {
    setVisits(prev => [...prev, { ...v, id: `v-${Date.now()}` }]);
  }, []);

  const updateVisit = useCallback((id: string, data: Partial<DistinguishedVisit>) => {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  }, []);

  const deleteVisit = useCallback((id: string) => {
    setVisits(prev => prev.filter(v => v.id !== id));
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
