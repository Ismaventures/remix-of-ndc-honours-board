import { useState, useEffect, useCallback } from 'react';
import { Personnel, DistinguishedVisit, initialPersonnel, initialVisits } from '@/data/mockData';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
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
