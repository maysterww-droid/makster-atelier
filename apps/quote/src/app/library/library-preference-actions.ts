'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { quoteModulePreset } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles=new Set(['owner','admin','sales','designer','technologist','viewer']);

export async function togglePresetFavorite(formData:FormData){
  const workspace=await requireWorkspace();
  if(!allowedRoles.has(workspace.role))redirect('/library?error=permission');
  const presetKey=String(formData.get('presetKey')??'').trim();
  if(!quoteModulePreset(presetKey))redirect('/library?error=preset');
  const {data:existing,error:readError}=await workspace.supabase.from('quote_library_prefs').select('is_favorite,use_count,last_used_at').eq('organization_id',workspace.organization.id).eq('user_id',workspace.userId).eq('preset_key',presetKey).maybeSingle();
  if(readError)redirect('/library?error=favorite');
  const payload={organization_id:workspace.organization.id,user_id:workspace.userId,preset_key:presetKey,is_favorite:!Boolean(existing?.is_favorite),use_count:Number(existing?.use_count??0),last_used_at:existing?.last_used_at??null,updated_at:new Date().toISOString()};
  const {error}=await workspace.supabase.from('quote_library_prefs').upsert(payload,{onConflict:'organization_id,user_id,preset_key'});
  if(error)redirect('/library?error=favorite');
  revalidatePath('/library');
  redirect('/library');
}
