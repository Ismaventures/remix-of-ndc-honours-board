const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const envText = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
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
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Credentials missing in .env file!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const LOCAL_MEDIA_DIR = path.join(__dirname, '..', 'local_media');

console.log('Using SQLite DB:', dbPath);
console.log('Local media directory:', LOCAL_MEDIA_DIR);

const db = new Database(dbPath);

async function downloadFile(url, destPath) {
  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log(`✓ Downloaded: ${url} -> ${destPath}`);
    return true;
  } catch (err) {
    console.error(`✗ Error downloading ${url}:`, err.message);
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

  const supabaseMatch = cleanUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (supabaseMatch) {
    return {
      bucket: supabaseMatch[1],
      filePath: supabaseMatch[2],
      cleanUrl
    };
  }

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

async function run() {
  let downloadCount = 0;
  let updateCount = 0;

  try {
    // 1. Personnel
    console.log('\n--- Syncing Personnel from Supabase ---');
    const { data: remotePersonnel, error: pError } = await supabase.from('personnel').select('*');
    if (pError) throw pError;
    console.log(`Fetched ${remotePersonnel.length} personnel records from Supabase.`);

    for (const remote of remotePersonnel) {
      if (remote.image_url) {
        const parsed = parseUrl(remote.image_url);
        if (parsed) {
          const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);
          const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
          
          if (!fs.existsSync(destPath)) {
            console.log(`Missing file for ${remote.name}: downloading...`);
            const ok = await downloadFile(parsed.cleanUrl, destPath);
            if (ok) downloadCount++;
          }
          
          // Check if local DB has this record and needs update
          const localRecord = db.prepare('SELECT image_url FROM personnel WHERE id = ?').get(remote.id);
          if (localRecord) {
            if (localRecord.image_url !== localUrl) {
              db.prepare('UPDATE personnel SET image_url = ? WHERE id = ?').run(localUrl, remote.id);
              console.log(`✓ Updated SQLite reference for ${remote.name} -> ${localUrl}`);
              updateCount++;
            }
          } else {
            // If the record exists on Supabase but not in SQLite (e.g. newly added), we insert it
            console.log(`Inserting missing personnel ${remote.name} into SQLite...`);
            db.prepare(`
              INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, image_url, citation, decoration, seniority_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              remote.id, remote.name, remote.rank, remote.category, remote.service, 
              remote.period_start, remote.period_end, localUrl, remote.citation, 
              remote.decoration, remote.seniority_order
            );
            updateCount++;
          }
        }
      } else {
        // If image is null on Supabase, check if it's set in SQLite and clear it
        const localRecord = db.prepare('SELECT image_url FROM personnel WHERE id = ?').get(remote.id);
        if (localRecord && localRecord.image_url) {
          db.prepare('UPDATE personnel SET image_url = NULL WHERE id = ?').run(remote.id);
          console.log(`✓ Cleared image reference for ${remote.name} (null on Supabase)`);
          updateCount++;
        }
      }
    }

    // 2. Commandants
    console.log('\n--- Syncing Commandants from Supabase ---');
    const { data: remoteCmds, error: cError } = await supabase.from('commandants').select('*');
    if (cError) throw cError;
    console.log(`Fetched ${remoteCmds.length} commandants from Supabase.`);

    for (const remote of remoteCmds) {
      if (remote.image_url) {
        const parsed = parseUrl(remote.image_url);
        if (parsed) {
          const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);
          const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
          
          if (!fs.existsSync(destPath)) {
            console.log(`Missing file for Commandant ${remote.name}: downloading...`);
            const ok = await downloadFile(parsed.cleanUrl, destPath);
            if (ok) downloadCount++;
          }
          
          const localRecord = db.prepare('SELECT image_url FROM commandants WHERE id = ?').get(remote.id);
          if (localRecord) {
            if (localRecord.image_url !== localUrl) {
              db.prepare('UPDATE commandants SET image_url = ? WHERE id = ?').run(localUrl, remote.id);
              console.log(`✓ Updated SQLite reference for Commandant ${remote.name} -> ${localUrl}`);
              updateCount++;
            }
          }
        }
      }
    }

    // 3. Visits
    console.log('\n--- Syncing Visits from Supabase ---');
    const { data: remoteVisits, error: vError } = await supabase.from('visits').select('*');
    if (vError) throw vError;
    
    for (const remote of remoteVisits) {
      if (remote.image_url) {
        const parsed = parseUrl(remote.image_url);
        if (parsed) {
          const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);
          const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
          
          if (!fs.existsSync(destPath)) {
            console.log(`Missing file for Visit ${remote.name}: downloading...`);
            const ok = await downloadFile(parsed.cleanUrl, destPath);
            if (ok) downloadCount++;
          }
          
          const localRecord = db.prepare('SELECT image_url FROM visits WHERE id = ?').get(remote.id);
          if (localRecord && localRecord.image_url !== localUrl) {
            db.prepare('UPDATE visits SET image_url = ? WHERE id = ?').run(localUrl, remote.id);
            console.log(`✓ Updated SQLite reference for Visit ${remote.name} -> ${localUrl}`);
            updateCount++;
          }
        }
      }
    }

    console.log(`\nSync completed successfully!`);
    console.log(`- Downloaded ${downloadCount} missing assets.`);
    console.log(`- Updated ${updateCount} SQLite records.`);

  } catch (err) {
    console.error('Sync script failed:', err);
  } finally {
    db.close();
    process.exit(0);
  }
}

run();
