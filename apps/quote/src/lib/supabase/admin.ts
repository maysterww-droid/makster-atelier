import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
