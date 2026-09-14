'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const editorRoles = new Set(['owner','admin','sales','designer','technologist']);
function uuid(value:FormDataEntryValue|null){const text=String(value??'').trim();return /^[0-9a-fA-F-]{36}$/.test(text)?text:'';}

export async function saveCabinetAsTemplate(formData:FormData){
  const {supabase,organization,userId,role}=await requireWorkspace();
  const projectId=uuid(formData.get('projectId'));const cabinetId=uuid(formData.get('cabinetId'));
  if(!projectId||!cabinetId)redirect('/projects?error=module');
  if(!editorRoles.has(role))redirect(`/projects/${projectId}?error=permission`);
  const {data:row,error}=await supabase.from('quote_cabinets')
    .select('module_key,name,width_mm,height_mm,depth_mm,construction_json,material_refs_json,hardware_refs_json')
    .eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id).maybeSingle();
  if(error||!row)redirect(`/projects/${projectId}?error=module-source`);
  const requested=String(formData.get('templateName')??'').trim();
  const name=(requested||row.name||'My standard').slice(0,200);
  const {error:insertError}=await supabase.from('quote_module_templates').insert({
    organization_id:organization.id,name,module_key:row.module_key,width_mm:row.width_mm,height_mm:row.height_mm,depth_mm:row.depth_mm,
    construction_json:row.construction_json??{},material_refs_json:row.material_refs_json??{},hardware_refs_json:row.hardware_refs_json??{},
    is_favorite:true,use_count:0,created_by:userId,updated_at:new Date().toISOString(),
  });
  if(insertError)redirect(`/projects/${projectId}?error=template-save`);
  revalidatePath('/library');revalidatePath(`/projects/${projectId}`);
  redirect(`/library?project=${projectId}`);
}
