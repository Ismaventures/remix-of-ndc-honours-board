/**
 * Pull all data from Supabase and save as importable JSON
 * Run: node scripts/pull-from-supabase.mjs
 * Then import the JSON file via Admin Panel → Data Management → Import Data
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://iemdygtyyouosqmbwadn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbWR5Z3R5eW91b3NxbWJ3YWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTk2MzEsImV4cCI6MjA5MDM5NTYzMX0.oUV1r-neeqCqNbLfpW8Zs1OxW9GmUhZYryKnZoRYQRA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAll(table, select = '*') {
  const rows = [];
  const PAGE = 500;
  for (let from = 0; from < 50000; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      break;
    }
    const page = data ?? [];
    rows.push(...page);
    console.log(`  ${table}: fetched ${rows.length} rows so far...`);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function main() {
  console.log('Pulling data from Supabase...\n');

  const personnel = await fetchAll('personnel');
  const commandants = await fetchAll('commandants');
  const visits = await fetchAll('visits');
  const audioTracks = await fetchAll('audio_tracks');
  const audioAssignments = await fetchAll('audio_assignments');

  console.log(`\nResults:`);
  console.log(`  Personnel: ${personnel.length}`);
  console.log(`  Commandants: ${commandants.length}`);
  console.log(`  Visits: ${visits.length}`);
  console.log(`  Audio Tracks: ${audioTracks.length}`);
  console.log(`  Audio Assignments: ${audioAssignments.length}`);

  const exportData = {
    personnel,
    commandants,
    visits,
    audio_tracks: audioTracks,
    audio_assignments: audioAssignments,
  };

  const filename = `ndc-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`\nSaved to: ${filename}`);
  console.log(`Import this file via Admin Panel → Data Management → Import Data`);
}

main().catch(console.error);
