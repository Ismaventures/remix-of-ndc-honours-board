const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const https = require('https');

const dbPath = path.join(__dirname, 'database.sqlite');
const LOCAL_MEDIA_DIR = path.join(__dirname, 'local_media');
const SUPABASE_STORAGE_URL = 'https://iemdygtyyouosqmbwadn.supabase.co/storage/v1/object/public';

console.log('Using database:', dbPath);
console.log('Local media directory:', LOCAL_MEDIA_DIR);

if (!fs.existsSync(dbPath)) {
  console.error('Database does not exist!');
  process.exit(1);
}

const db = new Database(dbPath);

async function downloadFile(url, destPath) {
  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: status ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    console.log(`Successfully downloaded: ${url} -> ${destPath}`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${url}:`, err.message);
    return false;
  }
}

function getRemoteUrlAndDestPath(urlStr) {
  if (!urlStr) return null;

  let cleanUrl = urlStr;
  if (urlStr.includes('::')) {
    const parts = urlStr.split('::');
    cleanUrl = parts[parts.length - 1];
  }

  // If it's already a supabase URL
  if (cleanUrl.startsWith('http')) {
    const supabaseMatch = cleanUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (supabaseMatch) {
      const bucket = supabaseMatch[1];
      const filePath = supabaseMatch[2];
      return {
        remoteUrl: cleanUrl,
        destPath: path.join(LOCAL_MEDIA_DIR, bucket, filePath),
        localUrl: `local-media://${bucket}/${filePath}`
      };
    }
    // Generic external URL
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
        remoteUrl: cleanUrl,
        destPath: path.join(LOCAL_MEDIA_DIR, 'external-media', safeName),
        localUrl: `local-media://external-media/${safeName}`
      };
    } catch {
      return null;
    }
  }

  // If it's a local-media URL
  if (cleanUrl.startsWith('local-media://')) {
    const withoutScheme = cleanUrl.replace('local-media://', '');
    const firstSlash = withoutScheme.indexOf('/');
    if (firstSlash !== -1) {
      const bucket = withoutScheme.substring(0, firstSlash);
      const filePath = withoutScheme.substring(firstSlash + 1);
      return {
        remoteUrl: `${SUPABASE_STORAGE_URL}/${bucket}/${filePath}`,
        destPath: path.join(LOCAL_MEDIA_DIR, bucket, filePath),
        localUrl: cleanUrl
      };
    }
  }

  return null;
}

async function run() {
  let downloadCount = 0;
  let skippedCount = 0;

  try {
    // 1. Personnel
    console.log('\nScanning personnel...');
    const personnel = db.prepare('SELECT id, name, image_url FROM personnel').all();
    for (const p of personnel) {
      const info = getRemoteUrlAndDestPath(p.image_url);
      if (info) {
        if (!fs.existsSync(info.destPath)) {
          console.log(`Missing personnel image: ${p.name} (${p.image_url})`);
          const success = await downloadFile(info.remoteUrl, info.destPath);
          if (success) {
            downloadCount++;
            // Update DB if URL changed or is set
            if (p.image_url !== info.localUrl) {
              db.prepare('UPDATE personnel SET image_url = ? WHERE id = ?').run(info.localUrl, p.id);
            }
          }
        } else {
          skippedCount++;
        }
      }
    }

    // 2. Commandants
    console.log('\nScanning commandants...');
    const commandants = db.prepare('SELECT id, name, image_url FROM commandants').all();
    for (const cmd of commandants) {
      const info = getRemoteUrlAndDestPath(cmd.image_url);
      if (info) {
        if (!fs.existsSync(info.destPath)) {
          console.log(`Missing commandant image: ${cmd.name} (${cmd.image_url})`);
          const success = await downloadFile(info.remoteUrl, info.destPath);
          if (success) {
            downloadCount++;
            if (cmd.image_url !== info.localUrl) {
              db.prepare('UPDATE commandants SET image_url = ? WHERE id = ?').run(info.localUrl, cmd.id);
            }
          }
        } else {
          skippedCount++;
        }
      }
    }

    // 3. Visits
    console.log('\nScanning visits...');
    const visits = db.prepare('SELECT id, name, image_url FROM visits').all();
    for (const v of visits) {
      const info = getRemoteUrlAndDestPath(v.image_url);
      if (info) {
        if (!fs.existsSync(info.destPath)) {
          console.log(`Missing visit image: ${v.name} (${v.image_url})`);
          const success = await downloadFile(info.remoteUrl, info.destPath);
          if (success) {
            downloadCount++;
            if (v.image_url !== info.localUrl) {
              db.prepare('UPDATE visits SET image_url = ? WHERE id = ?').run(info.localUrl, v.id);
            }
          }
        } else {
          skippedCount++;
        }
      }
    }

    // 4. Museum Artifacts
    console.log('\nScanning museum artifacts...');
    const artifacts = db.prepare('SELECT id, name, media_urls FROM museum_artifacts').all();
    for (const a of artifacts) {
      if (a.media_urls) {
        try {
          const urls = JSON.parse(a.media_urls);
          if (Array.isArray(urls)) {
            const updatedUrls = [];
            let changed = false;
            for (const url of urls) {
              const info = getRemoteUrlAndDestPath(url);
              if (info) {
                if (!fs.existsSync(info.destPath)) {
                  console.log(`Missing artifact media for: ${a.name}`);
                  const success = await downloadFile(info.remoteUrl, info.destPath);
                  if (success) {
                    downloadCount++;
                    updatedUrls.push(info.localUrl);
                    changed = true;
                  } else {
                    updatedUrls.push(url);
                  }
                } else {
                  updatedUrls.push(info.localUrl);
                  if (url !== info.localUrl) changed = true;
                  skippedCount++;
                }
              } else {
                updatedUrls.push(url);
              }
            }
            if (changed) {
              db.prepare('UPDATE museum_artifacts SET media_urls = ? WHERE id = ?').run(JSON.stringify(updatedUrls), a.id);
            }
          }
        } catch (e) {
          console.error(`Failed to parse media_urls for artifact: ${a.name}`, e.message);
        }
      }
    }

    console.log(`\nFinished Media Synchronization!`);
    console.log(`Downloaded ${downloadCount} missing assets.`);
    console.log(`Verified ${skippedCount} existing assets.`);

  } catch (err) {
    console.error('Error during media synchronization:', err);
  } finally {
    db.close();
    process.exit(0);
  }
}

run();
