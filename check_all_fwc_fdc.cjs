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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Get ALL personnel from Supabase with full detail
  console.log('=== ALL Supabase Personnel (FWC + FDC only) ===');
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .in('category', ['FWC', 'FDC', 'fwc', 'fdc', 'fwc+', 'fdc+']);
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Total FWC/FDC on Supabase: ${data.length}`);
  data.forEach((p, i) => {
    console.log(`${i+1}. [${p.category}] ${p.rank || ''} ${p.name}`);
    console.log(`   image_url: ${p.image_url || 'NULL'}`);
  });

  // Also check if there's a personnel-images table or bucket with separate images
  console.log('\n=== Checking personnel-images bucket on storage ===');
  const { data: piFiles, error: piError } = await supabase.storage.from('personnel-images').list('', { limit: 100 });
  if (piError) {
    console.log('personnel-images bucket error (may not exist):', piError.message);
  } else {
    console.log(`Files in personnel-images bucket: ${piFiles.length}`);
    piFiles.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name} (${f.metadata?.size || 'unknown'} bytes)`);
    });
  }
  
  // Also check ndc-media/images for ALL files
  console.log('\n=== ALL files in ndc-media/images ===');
  const { data: allFiles, error: afError } = await supabase.storage.from('ndc-media').list('images', { limit: 500 });
  if (afError) {
    console.log('Error:', afError.message);
  } else {
    console.log(`Total files: ${allFiles.length}`);
  }

  process.exit(0);
}

run().catch(console.error);
