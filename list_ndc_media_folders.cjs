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
  console.log('Listing root of ndc-media...');
  const { data, error } = await supabase.storage.from('ndc-media').list('', { limit: 100 });
  if (error) {
    console.error('Error listing ndc-media root:', error);
    process.exit(1);
  }

  console.log(`Found ${data.length} items at root:`);
  data.forEach((item, idx) => {
    console.log(`  ${idx+1}. Name: ${item.name}, ID: ${item.id || 'none'}, Metadata:`, item.metadata || 'none');
  });

  process.exit(0);
}

run().catch(console.error);
