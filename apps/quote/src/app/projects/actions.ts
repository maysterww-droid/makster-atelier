'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function formId(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(value) ? value : '';
}

export async function archiveProject(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = formId(formData, 'projectId');
  if (!projectId) redirect('/projects?error=project');
  if (!allowedRoles.has(role)) redirect('/projects?error=permission');

  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .is('archived_at', null);

  if (error) redirect('/projects?error=archive');

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect('/projects?archived=1');
}

export async function duplicateProject(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  const sourceProjectId = formId(formData, 'projectId');
  if (!sourceProjectId) redirect('/projects?error=project');
  if (!allowedRoles.has(role)) redirect('/projects?error=permission');

  const { data: source, error: sourceError } = await supabase
    .from('projects')
    .select('id, name, project_type, currency, client_id, settings, current_revision_id')
    .eq('id', sourceProjectId)
    .eq('organization_id', organization.id)
    .is('archived_at', null)
    .maybeSingle();

  if (sourceError || !source) redirect('/projects?error=source');

  const newProjectId = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshot = {
    source: 'makster-quote-duplicate',
    duplicatedFromProjectId: sourceProjectId,
    quoteVersion: '0.1.15',
    cabinets: [],
    commercial: { currency: source.currency },
    createdAt: now,
  };

  const { error: createError } = await supabase.rpc('create_project_with_initial_revision', {
    p_project_id: newProjectId,
    p_organization_id: organization.id,
    p_name: `${source.name} — копия`,
    p_project_type: source.project_type,
    p_currency: source.currency,
    p_snapshot: snapshot,
  });

  if (createError) redirect('/projects?error=duplicate-create');

  const { data: target, error: targetError } = await supabase
    .from('projects')
    .select('id, current_revision_id')
    .eq('id', newProjectId)
    .eq('organization_id', organization.id)
    .single();

  if (targetError || !target) redirect(`/projects/${newProjectId}?error=duplicate-target`);

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({ client_id: source.client_id, settings: source.settings, updated_at: now })
    .eq('id', newProjectId)
    .eq('organization_id', organization.id);

  if (projectUpdateError) redirect(`/projects/${newProjectId}?error=duplicate-settings`);

  const { data: cabinets, error: cabinetsError } = await supabase
    .from('quote_cabinets')
    .select('module_key, name, sort_order, width_mm, height_mm, depth_mm, quantity, construction_json, material_refs_json, hardware_refs_json, computed_parts_json, computed_cost_json, engine_version')
    .eq('project_id', sourceProjectId)
    .eq('organization_id', organization.id)
    .order('sort_order')
    .order('created_at');

  if (cabinetsError) redirect(`/projects/${newProjectId}?error=duplicate-cabinets`);

  if (cabinets?.length) {
    const rows = cabinets.map((cabinet) => ({
      ...cabinet,
      id: crypto.randomUUID(),
      organization_id: organization.id,
      project_id: newProjectId,
      project_revision_id: target.current_revision_id,
      created_by: userId,
      created_at: now,
      updated_at: now,
    }));
    const { error: insertError } = await supabase.from('quote_cabinets').insert(rows);
    if (insertError) redirect(`/projects/${newProjectId}?error=duplicate-cabinets-write`);
  }

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect(`/projects/${newProjectId}?duplicated=1`);
}
