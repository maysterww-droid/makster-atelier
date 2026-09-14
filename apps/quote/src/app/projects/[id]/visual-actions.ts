'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles=new Set(['owner','admin','sales','designer','technologist']);
const uuid=/^[0-9a-fA-F-]{36}$/;

export async function reorderVisualCabinets(projectId:string,orderedIds:string[]){
  const {supabase,organization,role}=await requireWorkspace();
  if(!allowedRoles.has(role))throw new Error('permission');
  if(!uuid.test(projectId))throw new Error('project');
  if(!Array.isArray(orderedIds)||orderedIds.length<2||orderedIds.length>500||orderedIds.some((id)=>!uuid.test(id)))throw new Error('order');

  const {data:rows,error}=await supabase
    .from('quote_cabinets')
    .select('id')
    .eq('project_id',projectId)
    .eq('organization_id',organization.id)
    .order('sort_order')
    .order('created_at');
  if(error||!rows)throw new Error('order-load');

  const currentIds=rows.map((row)=>row.id);
  if(currentIds.length!==orderedIds.length)throw new Error('order-stale');
  const currentSet=new Set(currentIds);
  if(new Set(orderedIds).size!==orderedIds.length||orderedIds.some((id)=>!currentSet.has(id)))throw new Error('order-invalid');

  const now=new Date().toISOString();
  const results=await Promise.all(orderedIds.map((id,index)=>supabase
    .from('quote_cabinets')
    .update({sort_order:index*10,updated_at:now})
    .eq('id',id)
    .eq('project_id',projectId)
    .eq('organization_id',organization.id)));
  if(results.some((result)=>result.error))throw new Error('order-save');

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');
  return{ok:true};
}
