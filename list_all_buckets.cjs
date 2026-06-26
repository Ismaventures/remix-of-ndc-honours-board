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
  console.log('Fetching buckets...');
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error fetching buckets:', error);
    process.exit(1);
  }

  console.log(`Found ${data.length} buckets:`);
  data.forEach((b, idx) => {
    console.log(`  ${idx+1}. Name: ${b.name}, Public: ${b.public}`);
  });

  process.exit(0);
}

run().catch(console.error);
