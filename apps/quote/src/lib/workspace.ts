import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Workspace = {
  id: string;
  name: string;
  country_code: string | null;
  currency: string;
  timezone: string;
  settings: Record<string, unknown>;
};

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId || typeof userId !== 'string') {
    redirect('/login');
  }

  return { supabase, userId };
}

export async function findActiveMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Cannot load workspace membership: ${error.message}`);
  return data;
}

export async function requireWorkspace() {
  const { supabase, userId } = await requireUser();
  const membership = await findActiveMembership(supabase, userId);

  if (!membership) redirect('/onboarding');

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('id, name, country_code, currency, timezone, settings')
    .eq('id', membership.organization_id)
    .single();

  if (error || !organization) {
    throw new Error(`Cannot load workspace: ${error?.message ?? 'not found'}`);
  }

  return {
    supabase,
    userId,
    role: membership.role as string,
    organization: organization as Workspace,
  };
}
