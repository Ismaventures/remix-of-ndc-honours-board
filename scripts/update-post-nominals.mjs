import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required env vars in .env file: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const postNominalsMap = {
  'Ahmed': 'GSS psc(+)afwc +fnwc(+)fdc(+)SCHOLAR',
  'Okosun': 'GSS psc(+) fdc(+) ndc (EG) nwc(+) BEng MPM MNSE MNIM',
  'Olotu': 'GSS psc(+) fdc(+) rcds AFRIN MA',
  'Bashir': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Daji': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Kadiri': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Jonah': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Alade': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Agholor': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Lokoson': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Isa': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Okpanachi': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Aloko': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Adedeji': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Diya': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Ayinla': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Abbe': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Abubakar': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Garuba': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Osinowo': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Shiyanbade': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
  'Useni': 'GSS psc(+) fdc(+) MSc Mphil MNIM',
};

async function updatePostNominals() {
  const { data: commandants, error: fetchError } = await supabase
    .from('commandants')
    .select('id, name');

  if (fetchError) {
    throw fetchError;
  }

  console.log(`Fetched ${commandants.length} commandants. Updating post_nominals...`);

  for (const cmd of commandants) {
    let postNominals = 'GSS psc(+) fdc(+) MSc Mphil MNIM'; // Default fallback
    
    // Look up specific match
    for (const [key, val] of Object.entries(postNominalsMap)) {
      if (cmd.name.toLowerCase().includes(key.toLowerCase())) {
        postNominals = val;
        break;
      }
    }

    console.log(`Updating ${cmd.name} to: ${postNominals}`);
    const { error: updateError } = await supabase
      .from('commandants')
      .update({ post_nominals: postNominals })
      .eq('id', cmd.id);

    if (updateError) {
      console.error(`Error updating ${cmd.name}:`, updateError.message);
    }
  }

  console.log('Update complete.');
}

updatePostNominals()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to update post_nominals:', err);
    process.exit(1);
  });
