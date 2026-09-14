'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const editorRoles = new Set(['owner','admin','sales','designer','technologist']);
const shapes = new Set(['straight','l','u','island','other']);

function uuid(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(text) ? text : '';
}
function text(value: FormDataEntryValue | null, max = 4000) {
  return String(value ?? '').trim().slice(0, max) || null;
}
function positiveNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

export async function saveProjectMeasurements(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  const projectId = uuid(formData.get('projectId'));
  if (!projectId) redirect('/projects?error=project');
  if (!editorRoles.has(role)) redirect(`/projects/${projectId}/measurements?error=permission`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .is('archived_at', null)
    .maybeSingle();
  if (projectError || !project) redirect('/projects?error=project');

  const intent = String(formData.get('intent') ?? 'draft');
  const measuredAt = text(formData.get('measuredAt'), 20);
  const siteAddress = text(formData.get('siteAddress'), 1000);
  const roomHeightMm = positiveNumber(formData.get('roomHeightMm'));
  const wallAMm = positiveNumber(formData.get('wallAMm'));
  const roomShapeRaw = String(formData.get('roomShape') ?? '').trim();
  const status = intent === 'complete' ? 'complete' : 'draft';

  if (status === 'complete' && (!measuredAt || !siteAddress || !roomHeightMm || !wallAMm)) {
    redirect(`/projects/${projectId}/measurements?error=required`);
  }

  const payload = {
    organization_id: organization.id,
    project_id: projectId,
    measured_at: measuredAt,
    measured_by: text(formData.get('measuredBy'), 300),
    site_address: siteAddress,
    room_shape: shapes.has(roomShapeRaw) ? roomShapeRaw : null,
    room_height_mm: roomHeightMm,
    wall_a_mm: wallAMm,
    wall_b_mm: positiveNumber(formData.get('wallBMm')),
    wall_c_mm: positiveNumber(formData.get('wallCMm')),
    wall_d_mm: positiveNumber(formData.get('wallDMm')),
    niches_text: text(formData.get('nichesText')),
    windows_text: text(formData.get('windowsText')),
    doors_text: text(formData.get('doorsText')),
    plumbing_text: text(formData.get('plumbingText')),
    gas_text: text(formData.get('gasText')),
    ventilation_text: text(formData.get('ventilationText')),
    electrical_text: text(formData.get('electricalText')),
    appliances_text: text(formData.get('appliancesText')),
    floor_walls_text: text(formData.get('floorWallsText')),
    notes: text(formData.get('notes'), 8000),
    status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await supabase
    .from('quote_project_measurements')
    .select('id, created_by')
    .eq('organization_id', organization.id)
    .eq('project_id', projectId)
    .maybeSingle();
  if (existingError) redirect(`/projects/${projectId}/measurements?error=save`);

  const result = existing
    ? await supabase.from('quote_project_measurements').update(payload).eq('id', existing.id).eq('organization_id', organization.id)
    : await supabase.from('quote_project_measurements').insert({ ...payload, created_by: userId });

  if (result.error) redirect(`/projects/${projectId}/measurements?error=save`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/measurements`);
  revalidatePath('/dashboard');
  redirect(`/projects/${projectId}/measurements?saved=${status}`);
}
