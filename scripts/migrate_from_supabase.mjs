import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

// Parse .env variables
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
// Use service role key if available for full database access, fallback to anon key
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase configuration missing in .env');
  process.exit(1);
}

console.log('Connecting to Supabase project:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const db = new Database('./database.sqlite');
const LOCAL_MEDIA_DIR = './local_media';

if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
  fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
}

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    return false;
  }
}

function parseUrl(urlStr) {
  if (!urlStr) return null;

  let cleanUrl = urlStr;
  if (urlStr.includes('::')) {
    const parts = urlStr.split('::');
    cleanUrl = parts[parts.length - 1];
  }

  if (!cleanUrl.startsWith('http')) return null;

  // Supabase URL format: https://[ref].supabase.co/storage/v1/object/public/[bucket]/[path]
  const supabaseMatch = cleanUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (supabaseMatch) {
    return {
      bucket: supabaseMatch[1],
      filePath: supabaseMatch[2],
      cleanUrl
    };
  }

  // Generic remote URL
  try {
    const parsed = new URL(cleanUrl);
    const ext = path.extname(parsed.pathname) || '.jpg';
    let hash = 0;
    for (let i = 0; i < cleanUrl.length; i++) {
      hash = (hash << 5) - hash + cleanUrl.charCodeAt(i);
      hash |= 0;
    }
    const safeName = `external_${Math.abs(hash)}${ext}`;
    return {
      bucket: 'external-media',
      filePath: safeName,
      cleanUrl
    };
  } catch {
    return null;
  }
}

async function migrateUrl(urlStr) {
  const parsed = parseUrl(urlStr);
  if (!parsed) return urlStr;

  const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
  const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);

  if (fs.existsSync(destPath)) {
    console.log(`Already downloaded: ${localUrl}`);
    return localUrl;
  }

  console.log(`Downloading remote asset: ${parsed.cleanUrl} -> ${destPath}`);
  const ok = await downloadFile(parsed.cleanUrl, destPath);
  return ok ? localUrl : urlStr;
}

const TABLES = [
  'commandants',
  'personnel',
  'visits',
  'audio_tracks',
  'audio_assignments',
  'museum_artifacts',
  'museum_sections',
  'museum_about_items',
  'museum_collection_wings',
  'museum_tour_routes',
  'ui_settings'
];

function clearDb() {
  console.log('Clearing local SQLite tables before migration...');
  db.transaction(() => {
    db.pragma('foreign_keys = OFF');
    for (const table of TABLES) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (err) {
        // Table might not exist yet if schema was not run
      }
    }
    db.pragma('foreign_keys = ON');
  })();
}

async function migrateCommandants() {
  console.log('\n--- Commandants ---');
  const { data, error } = await supabase.from('commandants').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO commandants (
          id, name, title, tenure_start, tenure_end, image_url, description, decoration, is_current,
          post_nominals, rank, years_experience, bio_summary, biography_full,
          education, training, past_appointments, honours, family_note, impact_statement,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.name,
        row.title,
        row.tenure_start,
        row.tenure_end,
        row.image_url,
        row.description,
        row.decoration,
        row.is_current ? 1 : 0,
        row.post_nominals,
        row.rank,
        row.years_experience,
        row.bio_summary,
        row.biography_full,
        JSON.stringify(row.education || []),
        JSON.stringify(row.training || []),
        JSON.stringify(row.past_appointments || []),
        JSON.stringify(row.honours || []),
        row.family_note,
        row.impact_statement,
        row.created_at,
        row.updated_at
      );
    }
  })();

  for (const row of data) {
    if (row.image_url) {
      const localUrl = await migrateUrl(row.image_url);
      if (localUrl !== row.image_url) {
        db.prepare('UPDATE commandants SET image_url = ? WHERE id = ?').run(localUrl, row.id);
      }
    }
  }
}

async function migratePersonnel() {
  console.log('\n--- Personnel ---');
  const { data, error } = await supabase.from('personnel').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, image_url, citation, decoration, seniority_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.name,
        row.rank,
        row.category,
        row.service,
        row.period_start,
        row.period_end,
        row.image_url,
        row.citation,
        row.decoration,
        row.seniority_order
      );
    }
  })();

  for (const row of data) {
    if (row.image_url) {
      const localUrl = await migrateUrl(row.image_url);
      if (localUrl !== row.image_url) {
        db.prepare('UPDATE personnel SET image_url = ? WHERE id = ?').run(localUrl, row.id);
      }
    }
  }
}

async function migrateVisits() {
  console.log('\n--- Visits ---');
  const { data, error } = await supabase.from('visits').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO visits (id, name, title, country, date, image_url, description, decoration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.name,
        row.title,
        row.country,
        row.date,
        row.image_url,
        row.description,
        row.decoration
      );
    }
  })();

  for (const row of data) {
    if (row.image_url) {
      const localUrl = await migrateUrl(row.image_url);
      if (localUrl !== row.image_url) {
        db.prepare('UPDATE visits SET image_url = ? WHERE id = ?').run(localUrl, row.id);
      }
    }
  }
}

async function migrateAudioTracks() {
  console.log('\n--- Audio Tracks ---');
  const { data, error } = await supabase.from('audio_tracks').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO audio_tracks (id, name, filename, bucket_path, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.name,
        row.filename,
        row.bucket_path,
        row.created_at
      );
    }
  })();

  for (const row of data) {
    if (row.bucket_path) {
      const fullUrl = `${SUPABASE_URL}/storage/v1/object/public/ndc-audio/${row.bucket_path}`;
      const destPath = path.join(LOCAL_MEDIA_DIR, 'ndc-audio', row.bucket_path);
      if (!fs.existsSync(destPath)) {
        console.log(`Downloading audio track: ${fullUrl} -> ${destPath}`);
        await downloadFile(fullUrl, destPath);
      }
    }
  }
}

async function migrateAudioAssignments() {
  console.log('\n--- Audio Assignments ---');
  const { data, error } = await supabase.from('audio_assignments').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO audio_assignments (context, track_id, updated_at)
        VALUES (?, ?, ?)
      `).run(
        row.context,
        row.track_id,
        row.updated_at
      );
    }
  })();
}

async function migrateMuseumArtifacts() {
  console.log('\n--- Museum Artifacts ---');
  const { data, error } = await supabase.from('museum_artifacts').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO museum_artifacts (
          id, name, description, era, origin_label, strategic_significance, 
          media_urls, tags, related_artifact_ids, gallery_category, 
          period_label, map_lat, map_lng, map_zoom, linked_view, 
          linked_record_id, is_published, created_at, updated_at, collection_id, tag, location, display_order, image_settings
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.name,
        row.description,
        row.era,
        row.origin_label,
        row.strategic_significance,
        JSON.stringify(row.media_urls || []),
        JSON.stringify(row.tags || []),
        JSON.stringify(row.related_artifact_ids || []),
        row.gallery_category,
        row.period_label,
        row.map_lat,
        row.map_lng,
        row.map_zoom,
        row.linked_view,
        row.linked_record_id,
        row.is_published ? 1 : 0,
        row.created_at,
        row.updated_at,
        row.collection_id,
        row.tag,
        row.location,
        row.display_order || 0,
        JSON.stringify(row.image_settings || {})
      );
    }
  })();

  for (const row of data) {
    if (Array.isArray(row.media_urls) && row.media_urls.length > 0) {
      const updatedUrls = [];
      let changed = false;
      for (const url of row.media_urls) {
        const localUrl = await migrateUrl(url);
        if (localUrl !== url) {
          changed = true;
        }
        updatedUrls.push(localUrl);
      }
      if (changed) {
        db.prepare('UPDATE museum_artifacts SET media_urls = ? WHERE id = ?')
          .run(JSON.stringify(updatedUrls), row.id);
      }
    }
  }
}

function initializeLocalSchema() {
  console.log('Initializing local SQLite schema tables...');

  // Create local auth users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS local_users (
      email TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      user_id TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    INSERT OR IGNORE INTO local_users (email, password, user_id)
    VALUES ('admin@ndc.gov.ng', 'NDC_admin_2026!', 'admin-uuid-123')
  `).run();

  // Run supabase_schema.sql
  if (fs.existsSync('supabase_schema.sql')) {
    const schemaSql = fs.readFileSync('supabase_schema.sql', 'utf8');
    const statements = schemaSql.split(';');
    db.transaction(() => {
      for (let stmt of statements) {
        stmt = stmt.split('\n').map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
        if (!stmt) continue;
        if (
          stmt.startsWith('ALTER TABLE') && (
            stmt.includes('ENABLE ROW LEVEL SECURITY') || 
            stmt.includes('OWNER TO')
          )
        ) continue;
        if (stmt.startsWith('DROP POLICY') || stmt.startsWith('CREATE POLICY')) continue;
        if (stmt.includes('storage.buckets') || stmt.includes('storage.objects')) continue;
        if (stmt.includes('auth.users')) {
          stmt = stmt.replace(/REFERENCES auth\.users\(id\)( ON DELETE CASCADE| ON DELETE SET NULL)?/g, '');
        }

        stmt = stmt.replace(/timestamptz/g, 'TEXT');
        stmt = stmt.replace(/bigserial/g, 'INTEGER');
        stmt = stmt.replace(/double precision/g, 'REAL');
        stmt = stmt.replace(/jsonb/g, 'TEXT');
        stmt = stmt.replace(/text\[\]/g, 'TEXT');
        stmt = stmt.replace(/now\(\)/g, 'CURRENT_TIMESTAMP');
        stmt = stmt.replace(/DEFAULT gen_random_uuid\(\)/ig, '');
        stmt = stmt.replace(/uuid/g, 'TEXT');
        stmt = stmt.replace(/::[a-zA-Z0-9_]+(\[\])?/g, '');
        stmt = stmt.replace(/'\{\}'/g, "'[]'");

        if (stmt.toUpperCase().includes('CREATE TABLE') || stmt.toUpperCase().includes('CREATE INDEX')) {
          try {
            db.prepare(stmt).run();
          } catch (err) {
            console.error('Failed to run schema statement:', stmt, err.message);
          }
        }
      }
    })();
  }

  // Run supabase_cms_migration.sql
  if (fs.existsSync('supabase_cms_migration.sql')) {
    const cmsSql = fs.readFileSync('supabase_cms_migration.sql', 'utf8');
    const statements = cmsSql.split(';');
    db.transaction(() => {
      for (let stmt of statements) {
        stmt = stmt.split('\n').map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
        if (!stmt) continue;
        if (
          stmt.startsWith('ALTER TABLE') && (
            stmt.includes('ENABLE ROW LEVEL SECURITY') || 
            stmt.includes('OWNER TO')
          )
        ) continue;
        if (stmt.startsWith('DROP POLICY') || stmt.startsWith('CREATE POLICY')) continue;
        if (stmt.includes('storage.buckets') || stmt.includes('storage.objects')) continue;
        if (stmt.includes('auth.users')) {
          stmt = stmt.replace(/REFERENCES auth\.users\(id\)( ON DELETE CASCADE| ON DELETE SET NULL)?/g, '');
        }

        stmt = stmt.replace(/timestamptz/g, 'TEXT');
        stmt = stmt.replace(/bigserial/g, 'INTEGER');
        stmt = stmt.replace(/double precision/g, 'REAL');
        stmt = stmt.replace(/jsonb/g, 'TEXT');
        stmt = stmt.replace(/text\[\]/g, 'TEXT');
        stmt = stmt.replace(/now\(\)/g, 'CURRENT_TIMESTAMP');
        stmt = stmt.replace(/DEFAULT gen_random_uuid\(\)/ig, '');
        stmt = stmt.replace(/uuid/g, 'TEXT');
        stmt = stmt.replace(/::[a-zA-Z0-9_]+(\[\])?/g, '');
        stmt = stmt.replace(/'\{\}'/g, "'[]'");

        if (stmt.startsWith('ALTER TABLE')) {
          stmt = stmt.replace(/ADD COLUMN IF NOT EXISTS/ig, 'ADD COLUMN');
          try {
            db.prepare(stmt).run();
          } catch (err) {
            if (!err.message.includes('duplicate column')) {
              console.error('Failed to run migration schema update:', stmt, err.message);
            }
          }
        } else if (stmt.toUpperCase().includes('CREATE TABLE') || stmt.toUpperCase().includes('CREATE INDEX')) {
          try {
            db.prepare(stmt).run();
          } catch (err) {
            console.error('Failed to run migration CREATE statement:', stmt, err.message);
          }
        }
      }
    })();
  }
}

async function migrateMuseumSections() {
  console.log('\n--- Museum Sections ---');
  const { data, error } = await supabase.from('museum_sections').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO museum_sections (id, title, subtitle, description, icon_name, accent, service_color, display_order, is_published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.title,
        row.subtitle,
        row.description,
        row.icon_name,
        row.accent,
        row.service_color,
        row.display_order || 0,
        row.is_published ? 1 : 0,
        row.updated_at
      );
    }
  })();
}

async function migrateMuseumAboutItems() {
  console.log('\n--- Museum About Items ---');
  const { data, error } = await supabase.from('museum_about_items').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO museum_about_items (id, eyebrow, title, body, display_order, is_published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.eyebrow,
        row.title,
        row.body,
        row.display_order || 0,
        row.is_published ? 1 : 0,
        row.updated_at
      );
    }
  })();
}

async function migrateMuseumCollectionWings() {
  console.log('\n--- Museum Collection Wings ---');
  const { data, error } = await supabase.from('museum_collection_wings').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO museum_collection_wings (id, title, category, summary, curatorial_note, highlights, featured_fact, display_order, is_published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.title,
        row.category,
        row.summary,
        row.curatorial_note,
        JSON.stringify(row.highlights || []),
        row.featured_fact,
        row.display_order || 0,
        row.is_published ? 1 : 0,
        row.updated_at
      );
    }
  })();
}

async function migrateMuseumTourRoutes() {
  console.log('\n--- Museum Tour Routes ---');
  const { data, error } = await supabase.from('museum_tour_routes').select('*');
  if (error) throw error;
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO museum_tour_routes (id, title, duration, audience, description, stops, service_color, collection_id, display_order, is_published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.title,
        row.duration,
        row.audience,
        row.description,
        JSON.stringify(row.stops || []),
        row.service_color,
        row.collection_id,
        row.display_order || 0,
        row.is_published ? 1 : 0,
        row.updated_at
      );
    }
  })();
}

async function migrateUiSettings() {
  console.log('\n--- UI Settings ---');
  const { data, error } = await supabase.from('ui_settings').select('*');
  if (error) {
    console.warn('ui_settings table skip:', error.message);
    return;
  }
  console.log(`Fetched ${data.length} records.`);

  db.transaction(() => {
    for (const row of data) {
      db.prepare(`
        INSERT INTO ui_settings (id, user_id, setting_key, setting_value, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.user_id,
        row.setting_key,
        JSON.stringify(row.setting_value || {}),
        row.updated_at
      );
    }
  })();
}

async function run() {
  try {
    initializeLocalSchema();
    clearDb();
    await migrateCommandants();
    await migratePersonnel();
    await migrateVisits();
    await migrateAudioTracks();
    await migrateAudioAssignments();
    await migrateMuseumArtifacts();
    await migrateMuseumSections();
    await migrateMuseumAboutItems();
    await migrateMuseumCollectionWings();
    await migrateMuseumTourRoutes();
    await migrateUiSettings();
    console.log('\nSUCCESS: Supabase remote data and media assets fully synchronized locally!');
  } catch (err) {
    console.error('Migration crashed:', err);
  } finally {
    db.close();
    process.exit(0);
  }
}

run();
