'use server';

import { redirect } from 'next/navigation';
import { requireUser, findActiveMembership } from '@/lib/workspace';

export async function createWorkspace(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const existing = await findActiveMembership(supabase, userId);
  if (existing) redirect('/');

  const name = String(formData.get('name') ?? '').trim();
  const countryCode = String(formData.get('countryCode') ?? 'CZ').trim().toUpperCase();
  const currency = String(formData.get('currency') ?? 'CZK').trim().toUpperCase();
  const timezone = String(formData.get('timezone') ?? 'Europe/Prague').trim();

  if (!name) redirect('/onboarding?error=name');

  const { error } = await supabase.rpc('quote_create_workspace', {
    p_name: name,
    p_country_code: countryCode,
    p_currency: currency,
    p_timezone: timezone,
  });

  if (error) redirect('/onboarding?error=create');
  redirect('/price-book?setup=1');
}
