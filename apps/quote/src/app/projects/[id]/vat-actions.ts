'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function saveProjectVat(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = String(formData.get('projectId') ?? '').trim().slice(0, 80);
  if (!projectId || !allowedRoles.has(role)) redirect(`/projects/${projectId || ''}?error=permission`);

  const raw = String(formData.get('taxPercent') ?? '').trim().replace(',', '.');
  const taxPercent = Number(raw);
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 1000) {
    redirect(`/projects/${projectId}?error=tax#price`);
  }
  const taxBps = Math.round(taxPercent * 100);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/dashboard?error=project');

  const settings = record(project.settings);
  const quoteCommercial = record(settings.quoteCommercial);
  const nextSettings = {
    ...settings,
    taxBps,
    quoteCommercial: {
      ...quoteCommercial,
      taxBps,
    },
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id);
  if (updateError) redirect(`/projects/${projectId}?error=tax-save#price`);

  const { data: verified, error: verifyError } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  const persisted = record(verified?.settings);
  const persistedCommercial = record(persisted.quoteCommercial);
  if (verifyError || Number(persisted.taxBps) !== taxBps || Number(persistedCommercial.taxBps) !== taxBps) {
    redirect(`/projects/${projectId}?error=tax-verify#price`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote`);
  redirect(`/projects/${projectId}?saved=vat#price`);
}
