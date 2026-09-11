'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

export async function saveQuoteBrand(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/settings/quote?error=permission');

  const current = organization.settings && typeof organization.settings === 'object' && !Array.isArray(organization.settings)
    ? organization.settings as Record<string, unknown>
    : {};

  const quoteBrand = {
    tradeName: text(formData, 'tradeName', 160) || organization.name,
    legalName: text(formData, 'legalName', 200),
    registrationId: text(formData, 'registrationId', 80),
    vatId: text(formData, 'vatId', 80),
    address: text(formData, 'address', 500),
    email: text(formData, 'email', 320),
    phone: text(formData, 'phone', 80),
    website: text(formData, 'website', 300),
    bankAccount: text(formData, 'bankAccount', 160),
    iban: text(formData, 'iban', 100),
    footerText: text(formData, 'footerText', 1200),
  };

  const { error } = await supabase
    .from('organizations')
    .update({ settings: { ...current, quoteBrand }, updated_at: new Date().toISOString() })
    .eq('id', organization.id);

  if (error) redirect('/settings/quote?error=save');
  revalidatePath('/settings/quote');
  revalidatePath('/');
  redirect('/settings/quote?saved=1');
}
