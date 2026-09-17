'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace';

const editorRoles=new Set(['owner','admin','sales','designer','technologist']);
const sources=new Set(['standard','measurement','manual']);
function uuid(value:FormDataEntryValue|null){const text=String(value??'').trim();return /^[0-9a-fA-F-]{36}$/.test(text)?text:'';}

export async function saveDimensionSource(formData:FormData){
  const {supabase,organization,role}=await requireWorkspace();
  const projectId=uuid(formData.get('projectId'));const cabinetId=uuid(formData.get('cabinetId'));
  if(!projectId||!cabinetId||!editorRoles.has(role))return;
  const raw=String(formData.get('dimensionSource')??'manual').trim();const source=sources.has(raw)?raw:'manual';
  const reference=source==='measurement'?String(formData.get('measurementReference')??'').trim().slice(0,300)||null:null;
  await supabase.from('quote_cabinets').update({dimension_source:source,measurement_reference:reference,updated_at:new Date().toISOString()}).eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id);
  revalidatePath(`/projects/${projectId}`);
}
