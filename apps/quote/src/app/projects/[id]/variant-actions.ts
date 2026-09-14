'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { CommercialVariantKey } from '@/lib/project-commercial-options';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);
const allowedVariants = new Set<CommercialVariantKey>(['base', 'standard', 'premium']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function selectCommercialVariant(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = String(formData.get('projectId') ?? '').trim().slice(0, 80);
  const requested = String(formData.get('selectedVariant') ?? '').trim() as CommercialVariantKey;
  if (!projectId || !allowedRoles.has(role) || !allowedVariants.has(requested)) redirect(`/projects/${projectId || ''}`);

  const { data: project, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (error || !project) redirect(`/projects/${projectId}?error=variant`);

  const settings = record(project.settings);
  const quoteCommercial = record(settings.quoteCommercial);
  const nextSettings = {
    ...settings,
    quoteCommercial: {
      ...quoteCommercial,
      selectedVariant: requested,
    },
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id);
  if (updateError) redirect(`/projects/${projectId}?error=variant`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote`);
  redirect(`/projects/${projectId}`);
}
