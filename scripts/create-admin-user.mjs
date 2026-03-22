import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.QUICK_ADMIN_EMAIL || process.env.VITE_QUICK_ADMIN_EMAIL || 'admin@ndc.gov.ng';
const adminPassword = process.env.QUICK_ADMIN_PASSWORD || process.env.VITE_QUICK_ADMIN_PASSWORD || 'NDC_admin_2026!';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required env vars: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAdminUser() {
  const { error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
    },
  });

  if (error) {
    const message = (error.message || '').toLowerCase();
    if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
      console.log(`Admin user already exists: ${adminEmail}`);
      return;
    }
    throw error;
  }

  console.log(`Created admin user: ${adminEmail}`);
}

ensureAdminUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to ensure admin user:', err.message || err);
    process.exit(1);
  });
