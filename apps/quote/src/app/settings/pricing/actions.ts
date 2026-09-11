'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

function percentToBps(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? '').trim().replace(',', '.');
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null;
  return Math.round(percent * 100);
}

export async function savePricingSettings(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/settings/pricing?error=permission');

  const targetMarginBps = percentToBps(formData, 'targetMarginPercent');
  const minimumMarginBps = percentToBps(formData, 'minimumMarginPercent');
  const overheadBps = percentToBps(formData, 'overheadPercent');
  if (targetMarginBps === null) redirect('/settings/pricing?error=margin');
  if (minimumMarginBps === null) redirect('/settings/pricing?error=minimum-margin');
  if (overheadBps === null) redirect('/settings/pricing?error=overhead');
  if (minimumMarginBps > targetMarginBps) redirect('/settings/pricing?error=minimum-above-target');

  const current = organization.settings && typeof organization.settings === 'object' && !Array.isArray(organization.settings)
    ? organization.settings as Record<string, unknown>
    : {};
  const currentQuote = current.quote && typeof current.quote === 'object' && !Array.isArray(current.quote)
    ? current.quote as Record<string, unknown>
    : {};

  const settings = {
    ...current,
    quote: {
      ...currentQuote,
      targetMarginBps,
      minimumMarginBps,
      overheadBps,
      pricingFormulaVersion: 'mq-margin-0.1.14',
    },
  };

  const { error } = await supabase
    .from('organizations')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', organization.id);

  if (error) redirect('/settings/pricing?error=save');

  revalidatePath('/settings/pricing');
  revalidatePath('/projects');
  revalidatePath('/');
  redirect('/settings/pricing?saved=1');
}
