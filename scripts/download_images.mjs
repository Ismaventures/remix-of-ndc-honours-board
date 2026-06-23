import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = './database.sqlite';
const LOCAL_MEDIA_DIR = './local_media';

if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
  fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

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
  if (!urlStr || !urlStr.startsWith('http')) return null;

  // Supabase URL format: https://[ref].supabase.co/storage/v1/object/public/[bucket]/[path]
  const supabaseMatch = urlStr.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (supabaseMatch) {
    return {
      bucket: supabaseMatch[1],
      filePath: supabaseMatch[2]
    };
  }

  // Generic remote URL
  try {
    const parsed = new URL(urlStr);
    const ext = path.extname(parsed.pathname) || '.jpg';
    let hash = 0;
    for (let i = 0; i < urlStr.length; i++) {
      hash = (hash << 5) - hash + urlStr.charCodeAt(i);
      hash |= 0;
    }
    const safeName = `external_${Math.abs(hash)}${ext}`;
    return {
      bucket: 'external-media',
      filePath: safeName
    };
  } catch {
    return null;
  }
}

async function processUrl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
  const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);

  if (fs.existsSync(destPath)) {
    console.log(`Already downloaded: ${localUrl}`);
    return localUrl;
  }

  console.log(`Downloading: ${url} -> ${destPath}`);
  const ok = await downloadFile(url, destPath);
  return ok ? localUrl : url;
}

async function run() {
  try {
    // 1. commandants
    console.log('\n--- Commandants ---');
    const commandants = db.prepare('SELECT id, name, image_url FROM commandants').all();
    for (const cmd of commandants) {
      if (cmd.image_url) {
        const updatedUrl = await processUrl(cmd.image_url);
        if (updatedUrl !== cmd.image_url) {
          db.prepare('UPDATE commandants SET image_url = ? WHERE id = ?').run(updatedUrl, cmd.id);
          console.log(`✓ Updated commandant: ${cmd.name}`);
        }
      }
    }

    // 2. personnel
    console.log('\n--- Personnel ---');
    const personnel = db.prepare('SELECT id, name, image_url FROM personnel').all();
    for (const p of personnel) {
      if (p.image_url) {
        const updatedUrl = await processUrl(p.image_url);
        if (updatedUrl !== p.image_url) {
          db.prepare('UPDATE personnel SET image_url = ? WHERE id = ?').run(updatedUrl, p.id);
          console.log(`✓ Updated personnel: ${p.name}`);
        }
      }
    }

    // 3. visits
    console.log('\n--- Visits ---');
    const visits = db.prepare('SELECT id, name, image_url FROM visits').all();
    for (const v of visits) {
      if (v.image_url) {
        const updatedUrl = await processUrl(v.image_url);
        if (updatedUrl !== v.image_url) {
          db.prepare('UPDATE visits SET image_url = ? WHERE id = ?').run(updatedUrl, v.id);
          console.log(`✓ Updated visit: ${v.name}`);
        }
      }
    }

    // 4. museum_tours
    console.log('\n--- Museum Tours ---');
    const tours = db.prepare('SELECT id, name, cover_image_url FROM museum_tours').all();
    for (const t of tours) {
      if (t.cover_image_url) {
        const updatedUrl = await processUrl(t.cover_image_url);
        if (updatedUrl !== t.cover_image_url) {
          db.prepare('UPDATE museum_tours SET cover_image_url = ? WHERE id = ?').run(updatedUrl, t.id);
          console.log(`✓ Updated tour: ${t.name}`);
        }
      }
    }

    // 5. museum_artifacts
    console.log('\n--- Museum Artifacts ---');
    const artifacts = db.prepare('SELECT id, name, media_urls FROM museum_artifacts').all();
    for (const a of artifacts) {
      if (a.media_urls) {
        try {
          const urls = JSON.parse(a.media_urls);
          if (Array.isArray(urls)) {
            const updatedUrls = [];
            let changed = false;
            for (const u of urls) {
              const updated = await processUrl(u);
              if (updated !== u) {
                changed = true;
              }
              updatedUrls.push(updated);
            }
            if (changed) {
              db.prepare('UPDATE museum_artifacts SET media_urls = ? WHERE id = ?')
                .run(JSON.stringify(updatedUrls), a.id);
              console.log(`✓ Updated artifact: ${a.name}`);
            }
          }
        } catch (e) {
          console.error(`Failed to parse media_urls for artifact ${a.name}:`, e.message);
        }
      }
    }

    // 6. museum_tour_steps
    console.log('\n--- Tour Steps ---');
    const steps = db.prepare('SELECT id, title, audio_url FROM museum_tour_steps').all();
    for (const s of steps) {
      if (s.audio_url) {
        const updatedUrl = await processUrl(s.audio_url);
        if (updatedUrl !== s.audio_url) {
          db.prepare('UPDATE museum_tour_steps SET audio_url = ? WHERE id = ?').run(updatedUrl, s.id);
          console.log(`✓ Updated tour step: ${s.title}`);
        }
      }
    }

    // 7. audio_tracks
    console.log('\n--- Audio Tracks ---');
    const tracks = db.prepare('SELECT id, name, bucket_path FROM audio_tracks').all();
    for (const tr of tracks) {
      if (tr.bucket_path) {
        let url = tr.bucket_path;
        if (!url.startsWith('http')) {
          url = `https://iemdygtyyouosqmbwadn.supabase.co/storage/v1/object/public/ndc-audio/${tr.bucket_path}`;
        }
        const parsed = parseUrl(url);
        if (parsed) {
          const destPath = path.join(LOCAL_MEDIA_DIR, 'ndc-audio', parsed.filePath);
          if (!fs.existsSync(destPath)) {
            console.log(`Downloading audio: ${url} -> ${destPath}`);
            await downloadFile(url, destPath);
          } else {
            console.log(`Already downloaded audio: ${destPath}`);
          }
        }
      }
    }

    console.log('\nMigration and downloads complete successfully!');
  } catch (err) {
    console.error('Migration script failed:', err);
  } finally {
    db.close();
  }
}

run();
