const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

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
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Credentials missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

async function run() {
  try {
    const personnel = db.prepare("SELECT id, name, category, rank, image_url FROM personnel WHERE category IN ('FWC', 'FDC')").all();
    const nullFellows = personnel.filter(p => !p.image_url);
    console.log(`FWC/FDC fellows with null image_url in DB: ${nullFellows.length}`);

    console.log('Fetching file list from Supabase Storage...');
    // We fetch a larger limit to see all files in ndc-media/images
    const { data: files, error } = await supabase.storage.from('ndc-media').list('images', { limit: 1000 });
    if (error) {
      throw error;
    }
    console.log(`Total files in ndc-media/images on Supabase: ${files.length}`);

    // Try to match null fellows against filenames
    const matches = [];
    const unmatched = [];
    
    for (const f of nullFellows) {
      // Normalize name for matching
      const cleanName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanRank = f.rank ? f.rank.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      
      const foundFile = files.find(file => {
        const fname = file.name.toLowerCase();
        // check if filename contains fellow's clean name or if clean name contains parts of filename
        return fname.includes(cleanName) || (cleanName.length > 3 && fname.includes(cleanName.substring(0, 5)));
      });
      
      if (foundFile) {
        matches.push({ fellow: f, file: foundFile });
      } else {
        unmatched.push(f);
      }
    }

    console.log(`\nMatched ${matches.length} fellows to files in storage:`);
    matches.forEach((m, idx) => {
      console.log(`  ${idx+1}. Fellow: [${m.fellow.category}] ${m.fellow.rank} ${m.fellow.name} -> File: ${m.file.name}`);
    });

    console.log(`\nUnmatched fellows (${unmatched.length}):`);
    unmatched.forEach((u, idx) => {
      console.log(`  ${idx+1}. [${u.category}] ${u.rank} ${u.name}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
    process.exit(0);
  }
}

run();
