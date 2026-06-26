const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function run() {
  console.log('Listing ALL files in ndc-media/images on Supabase...');
  const { data: files, error } = await supabase.storage.from('ndc-media').list('images', { limit: 1000 });
  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Total files: ${files.length}`);
  files.forEach((f, idx) => {
    console.log(`  ${idx+1}. Name: "${f.name}", Size: ${f.metadata ? f.metadata.size : 'unknown'}`);
  });

  process.exit(0);
}

run().catch(console.error);
