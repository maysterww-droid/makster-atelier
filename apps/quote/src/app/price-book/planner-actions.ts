'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace';

const moduleKinds=['door','drawer','sink','hob','oven','dishwasher','tall','wall','corner_blind','corner_l'] as const;

function positiveMoney(formData:FormData,key:string){
  const raw=String(formData.get(key)??'').trim().replace(/\s/g,'').replace(',','.');
  const value=Number(raw);
  if(!Number.isFinite(value)||value<=0||value>100_000_000)throw new Error(`invalid_${key}`);
  return Math.round(value*100)/100;
}

export async function publishPlannerPriceBook(formData:FormData){
  const {organization,userId,role}=await requireWorkspace();
  if(!['owner','admin'].includes(role))redirect('/price-book?plannerError=permission');
  const admin=createAdminClient();
  const {data:entitlement,error:entitlementError}=await admin.from('makster_product_entitlements').select('status').eq('organization_id',organization.id).eq('product','DREAM_PLANNER').maybeSingle();
  if(entitlementError||!entitlement||!['active','trialing'].includes(String(entitlement.status)))redirect('/price-book?plannerError=entitlement');

  let modulePrice600:Record<string,number>={};
  let vatRate=0;
  try{
    modulePrice600=Object.fromEntries(moduleKinds.map(kind=>[kind,positiveMoney(formData,kind)]));
    const vatPct=Number(String(formData.get('vatPct')??'').replace(',','.'));
    if(!Number.isFinite(vatPct)||vatPct<0||vatPct>30)throw new Error('vat');
    vatRate=Math.round(vatPct*1000)/100000;
  }catch{
    redirect('/price-book?plannerError=values');
  }

  const now=new Date().toISOString();
  const revision=`PLANNER_${organization.id.slice(0,8).toUpperCase()}_${Date.now()}`;
  const payload={
    modulePrice600,
    itemOverrides:{},
    allowLocalCatalogFallback:false,
    source:'MAKSTER_QUOTE',
    publishedAt:now,
    publishedBy:userId,
    note:'Client-visible PRELIMINARY Dream Planner prices. Internal purchase prices are not exposed.',
  };

  const {error:insertError}=await admin.from('makster_commercial_pricebooks').insert({revision,organization_id:organization.id,currency:organization.currency,vat_rate:vatRate,payload,active:false,created_at:now,updated_at:now});
  if(insertError)redirect('/price-book?plannerError=publish');

  const {data:previous}=await admin.from('makster_commercial_pricebooks').select('revision').eq('organization_id',organization.id).eq('active',true).neq('revision',revision);
  const previousRevisions=(previous??[]).map(row=>row.revision);
  if(previousRevisions.length){
    const {error}=await admin.from('makster_commercial_pricebooks').update({active:false,updated_at:now}).eq('organization_id',organization.id).eq('active',true);
    if(error){await admin.from('makster_commercial_pricebooks').delete().eq('revision',revision).eq('organization_id',organization.id);redirect('/price-book?plannerError=publish');}
  }
  const {error:activateError}=await admin.from('makster_commercial_pricebooks').update({active:true,updated_at:now}).eq('revision',revision).eq('organization_id',organization.id);
  if(activateError){
    if(previousRevisions.length)await admin.from('makster_commercial_pricebooks').update({active:true,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).in('revision',previousRevisions.slice(0,1));
    await admin.from('makster_commercial_pricebooks').delete().eq('revision',revision).eq('organization_id',organization.id);
    redirect('/price-book?plannerError=publish');
  }

  revalidatePath('/price-book');
  revalidatePath('/dashboard');
  redirect(`/price-book?plannerPublished=${encodeURIComponent(revision)}`);
}
