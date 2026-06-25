/**
 * Data Migration Utility
 * One-time pull of data from old Supabase → local IndexedDB
 * Run from browser console: import { migrateFromSupabase } from '@/lib/dataMigration'; migrateFromSupabase()
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iemdygtyyouosqmbwadn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbWR5Z3R5eW91b3NxbWJ3YWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTk2MzEsImV4cCI6MjA5MDM5NTYzMX0.oUV1r-neeqCqNbLfpW8Zs1OxW9GmUhZYryKnZoRYQRA';

async function fetchAll(supabase: any, table: string, select = '*'): Promise<any[]> {
  const rows: any[] = [];
  const PAGE = 500;
  for (let from = 0; from < 50000; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`Migration: Error fetching ${table}:`, error.message);
      break;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export async function migrateFromSupabase(): Promise<{
  personnel: number;
  commandants: number;
  visits: number;
  audioTracks: number;
  audioAssignments: number;
}> {
  console.log('[Migration] Starting data migration from Supabase...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [personnel, commandants, visits, audioTracks, audioAssignments] = await Promise.all([
    fetchAll(supabase, 'personnel'),
    fetchAll(supabase, 'commandants'),
    fetchAll(supabase, 'visits'),
    fetchAll(supabase, 'audio_tracks'),
    fetchAll(supabase, 'audio_assignments'),
  ]);

  console.log(`[Migration] Fetched: ${personnel.length} personnel, ${commandants.length} commandants, ${visits.length} visits`);

  const { seedInitialData } = await import('./localDb');

  // Store personnel
  if (personnel.length > 0) {
    const db = await openLocalDb();
    const tx = db.transaction('personnel', 'readwrite');
    for (const row of personnel) {
      tx.objectStore('personnel').put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Store commandants
  if (commandants.length > 0) {
    const db = await openLocalDb();
    const tx = db.transaction('commandants', 'readwrite');
    for (const row of commandants) {
      tx.objectStore('commandants').put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Store visits
  if (visits.length > 0) {
    const db = await openLocalDb();
    const tx = db.transaction('visits', 'readwrite');
    for (const row of visits) {
      tx.objectStore('visits').put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Store audio tracks
  if (audioTracks.length > 0) {
    const db = await openLocalDb();
    const tx = db.transaction('audio_tracks', 'readwrite');
    for (const row of audioTracks) {
      tx.objectStore('audio_tracks').put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Store audio assignments
  if (audioAssignments.length > 0) {
    const db = await openLocalDb();
    const tx = db.transaction('audio_assignments', 'readwrite');
    for (const row of audioAssignments) {
      tx.objectStore('audio_assignments').put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  console.log('[Migration] Done! Data saved to local IndexedDB. Refresh the page to see it.');

  return {
    personnel: personnel.length,
    commandants: commandants.length,
    visits: visits.length,
    audioTracks: audioTracks.length,
    audioAssignments: audioAssignments.length,
  };
}

async function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ndc-honours-board', 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function exportLocalData(): Promise<string> {
  const db = await openLocalDb();
  const tables = ['personnel', 'commandants', 'visits', 'audio_tracks', 'audio_assignments'];
  const data: Record<string, any[]> = {};

  for (const table of tables) {
    const tx = db.transaction(table, 'readonly');
    const store = tx.objectStore(table);
    const all = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    data[table] = all;
  }

  return JSON.stringify(data, null, 2);
}

export async function importLocalData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await openLocalDb();

  for (const [table, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    for (const row of rows) {
      store.put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  console.log('[Import] Data imported successfully. Refresh the page.');
}
