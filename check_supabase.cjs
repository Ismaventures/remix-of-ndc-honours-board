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
  console.log('Querying Supabase personnel...');
  const { data, error } = await supabase.from('personnel').select('id, name, category, image_url');
  if (error) {
    console.error('Error fetching personnel:', error);
    process.exit(1);
  }

  console.log('Total personnel on Supabase:', data.length);
  const withImages = data.filter(p => p.image_url);
  console.log('Personnel with image_url on Supabase:', withImages.length);

  console.log('\nSample records with images on Supabase:');
  withImages.slice(0, 15).forEach(p => {
    console.log(`- [${p.category}] ${p.name}: ${p.image_url}`);
  });

  const commandants = await supabase.from('commandants').select('id, name, image_url');
  console.log('\nTotal commandants on Supabase:', commandants.data ? commandants.data.length : 0);
  const cmdWithImages = commandants.data ? commandants.data.filter(c => c.image_url) : [];
  console.log('Commandants with image_url on Supabase:', cmdWithImages.length);

  process.exit(0);
}

run().catch(console.error);
