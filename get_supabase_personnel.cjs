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
  console.log('Querying all personnel from Supabase...');
  const { data, error } = await supabase.from('personnel').select('*');
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const targets = data.filter(p => 
    p.name.includes('Akun') || 
    p.name.includes('Damb') || 
    p.name.includes('Danb') || 
    p.name.includes('Dumb') || 
    p.name.includes('Ilog')
  );

  console.log(`Found ${targets.length} matching records on Supabase:`);
  targets.forEach(p => {
    console.log(JSON.stringify(p, null, 2));
  });

  process.exit(0);
}

run().catch(console.error);
