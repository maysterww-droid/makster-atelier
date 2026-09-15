'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const editorRoles = new Set(['owner','admin','sales','designer','technologist']);
const shapes = new Set(['straight','l','u','island','other']);
const PHOTO_BUCKET = 'quote-measurements';
const PHOTO_MIME = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 40;

type PhotoMeta = { path:string; name:string; mime:string; size:number; uploadedAt:string };

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
function photoList(value: unknown): PhotoMeta[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item)=>{
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string,unknown>;
    const path = typeof row.path === 'string' ? row.path : '';
    if (!path) return [];
    return [{
      path,
      name: typeof row.name === 'string' ? row.name.slice(0,300) : 'photo',
      mime: typeof row.mime === 'string' ? row.mime : 'image/jpeg',
      size: Number.isFinite(Number(row.size)) ? Number(row.size) : 0,
      uploadedAt: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
    }];
  }).slice(0,MAX_PHOTOS);
}

async function requireProject(projectId:string) {
  const workspace = await requireWorkspace();
  const { data:project, error } = await workspace.supabase
    .from('projects')
    .select('id')
    .eq('id',projectId)
    .eq('organization_id',workspace.organization.id)
    .is('archived_at',null)
    .maybeSingle();
  return { ...workspace, project: error ? null : project };
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

export async function registerMeasurementPhoto(formData:FormData) {
  const projectId = uuid(formData.get('projectId'));
  if (!projectId) return { ok:false, error:'project' } as const;
  const { supabase, organization, userId, role, project } = await requireProject(projectId);
  if (!project || !editorRoles.has(role)) return { ok:false, error:'permission' } as const;

  const path = String(formData.get('path')??'').trim();
  const name = String(formData.get('name')??'photo').trim().slice(0,300) || 'photo';
  const mime = String(formData.get('mime')??'').trim().toLowerCase();
  const size = Number(formData.get('size')??0);
  const expectedPrefix = `${organization.id}/${projectId}/`;
  if (!path.startsWith(expectedPrefix) || !PHOTO_MIME.has(mime) || !Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) {
    return { ok:false, error:'invalid-photo' } as const;
  }

  const { data:measurement, error:readError } = await supabase
    .from('quote_project_measurements')
    .select('id, photos_json')
    .eq('organization_id',organization.id)
    .eq('project_id',projectId)
    .maybeSingle();
  if (readError) return { ok:false, error:'save' } as const;

  const current = photoList(measurement?.photos_json);
  if (current.length >= MAX_PHOTOS) return { ok:false, error:'photo-limit' } as const;
  if (current.some((photo)=>photo.path===path)) return { ok:true } as const;
  const next = [...current,{path,name,mime,size,uploadedAt:new Date().toISOString()}];

  const result = measurement
    ? await supabase.from('quote_project_measurements').update({photos_json:next,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',measurement.id).eq('organization_id',organization.id)
    : await supabase.from('quote_project_measurements').insert({organization_id:organization.id,project_id:projectId,photos_json:next,status:'draft',created_by:userId,updated_by:userId});
  if (result.error) return { ok:false, error:'save' } as const;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/measurements`);
  return { ok:true } as const;
}

export async function removeMeasurementPhoto(formData:FormData) {
  const projectId = uuid(formData.get('projectId'));
  if (!projectId) return;
  const { supabase, organization, userId, role, project } = await requireProject(projectId);
  if (!project || !editorRoles.has(role)) return;
  const path = String(formData.get('path')??'').trim();
  const expectedPrefix = `${organization.id}/${projectId}/`;
  if (!path.startsWith(expectedPrefix)) return;

  const { data:measurement } = await supabase
    .from('quote_project_measurements')
    .select('id, photos_json')
    .eq('organization_id',organization.id)
    .eq('project_id',projectId)
    .maybeSingle();
  if (!measurement) return;
  const next = photoList(measurement.photos_json).filter((photo)=>photo.path!==path);
  const { error:removeError } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (removeError) return;
  await supabase.from('quote_project_measurements').update({photos_json:next,updated_by:userId,updated_at:new Date().toISOString()}).eq('id',measurement.id).eq('organization_id',organization.id);
  revalidatePath(`/projects/${projectId}/measurements`);
}
