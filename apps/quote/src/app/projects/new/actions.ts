'use server';

import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const allowedTypes = new Set(['kitchen', 'wardrobe', 'cabinet', 'sideboard', 'built_in', 'mixed']);

export async function createProject(formData: FormData) {
  const { supabase, organization } = await requireWorkspace();
  const name = String(formData.get('name') ?? '').trim();
  const requestedType = String(formData.get('projectType') ?? 'kitchen');
  const projectType = allowedTypes.has(requestedType) ? requestedType : 'mixed';
  const currency = String(formData.get('currency') ?? organization.currency).trim().toUpperCase();

  if (!name) redirect('/projects/new?error=name');
  if (!/^[A-Z]{3}$/.test(currency)) redirect('/projects/new?error=currency');

  const projectId = crypto.randomUUID();
  const snapshot = {
    source: 'makster-quote',
    quoteVersion: '0.1.1',
    cabinets: [],
    commercial: { currency },
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.rpc('create_project_with_initial_revision', {
    p_project_id: projectId,
    p_organization_id: organization.id,
    p_name: name,
    p_project_type: projectType,
    p_currency: currency,
    p_snapshot: snapshot,
  });

  if (error) redirect(`/projects/new?error=create&code=${encodeURIComponent(error.code ?? '')}`);
  redirect(`/projects/${projectId}`);
}
