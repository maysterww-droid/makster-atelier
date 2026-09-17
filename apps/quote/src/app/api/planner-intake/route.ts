import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildPlannerCabinetRows, plannerMeasurementPayload, plannerProjectSettings, type PlannerContract } from '@/lib/planner-intake';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function safeEqual(a:string,b:string){const aa=Buffer.from(a);const bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
function authOk(request:NextRequest){const configured=String(process.env.MAKSTER_QUOTE_INGEST_TOKEN??'').trim();const supplied=String(request.headers.get('authorization')??'').replace(/^Bearer\s+/i,'').trim();return Boolean(configured&&supplied&&safeEqual(configured,supplied));}
function visualization(contract:PlannerContract){const payload=contract.project?.payload??{};return{materials:contract.manufacturing?.materials??{},appliances:contract.manufacturing?.appliances??{},lighting:payload.lighting??{},presentation:payload.presentation??{}};}

export async function POST(request:NextRequest){
  if(!authOk(request))return NextResponse.json({ok:false,code:'UNAUTHORIZED'},{status:401});
  const contract=(await request.json().catch(()=>null)) as PlannerContract|null;
  if(!contract||contract.contract!=='MAKSTER_PROJECT_HANDOFF'||contract.version!=='1.1'||!contract.handoffId)return NextResponse.json({ok:false,code:'INVALID_PLANNER_HANDOFF'},{status:400});

  const admin=createAdminClient();
  let organizationId='';
  let sourceProjectId='';
  let createdProjectId:string|undefined;
  try{
    const {data:handoff,error:handoffError}=await admin.from('makster_project_handoffs')
      .select('id,organization_id,deployment_id,destination,status,source_project_id,consumer_ref')
      .eq('id',contract.handoffId).eq('destination','QUOTE').maybeSingle();
    if(handoffError||!handoff)return NextResponse.json({ok:false,code:'HANDOFF_NOT_FOUND'},{status:404});

    organizationId=String(handoff.organization_id??'');
    sourceProjectId=String(contract.source?.projectId??contract.project?.id??handoff.source_project_id??'').trim();
    const deploymentId=String(handoff.deployment_id??'').trim();
    if(!organizationId||!deploymentId||!sourceProjectId)return NextResponse.json({ok:false,code:'INVALID_TENANT_ROUTE'},{status:400});
    if(contract.tenant?.organizationId&&contract.tenant.organizationId!==organizationId)return NextResponse.json({ok:false,code:'TENANT_MISMATCH'},{status:403});

    const [{data:entitlement},{data:sameHandoff},{data:link}]=await Promise.all([
      admin.from('makster_product_entitlements').select('status').eq('organization_id',organizationId).eq('product','DREAM_PLANNER').maybeSingle(),
      admin.from('quote_planner_imports').select('project_id,sync_count,latest_source_hash').eq('handoff_id',handoff.id).maybeSingle(),
      admin.from('makster_project_sync_links').select('id,consumer_ref,latest_source_hash,sync_count,state').eq('organization_id',organizationId).eq('deployment_id',deploymentId).eq('destination','QUOTE').eq('source_project_id',sourceProjectId).maybeSingle(),
    ]);
    if(!entitlement||!['active','trialing'].includes(String(entitlement.status)))return NextResponse.json({ok:false,code:'PLANNER_ENTITLEMENT_REQUIRED'},{status:403});
    if(sameHandoff?.project_id)return NextResponse.json({ok:true,projectId:sameHandoff.project_id,url:`/projects/${sameHandoff.project_id}`,idempotent:true,unchanged:true,syncCount:sameHandoff.sync_count});

    const sourceHash=String(contract.sync?.sourceHash??'').trim()||`handoff:${handoff.id}`;
    const existingProjectId=String(link?.consumer_ref??contract.sync?.consumerRef??handoff.consumer_ref??'').trim();
    const nextSyncCount=Math.max(Number(link?.sync_count??0)+1,Number(contract.sync?.syncCount??1),1);

    if(existingProjectId&&link?.latest_source_hash===sourceHash){
      await Promise.all([
        admin.from('makster_project_handoffs').update({status:'ACCEPTED',consumer_ref:existingProjectId,consumed_at:new Date().toISOString(),error_message:null}).eq('id',handoff.id),
        admin.from('makster_project_sync_links').update({latest_handoff_id:handoff.id,state:'ACTIVE',updated_at:new Date().toISOString()}).eq('id',link.id),
        admin.from('makster_project_handoff_events').insert({organization_id:organizationId,handoff_id:handoff.id,source_project_id:sourceProjectId,event_type:'UNCHANGED',status:'ACCEPTED',detail_json:{consumerRef:existingProjectId,sourceHash,syncCount:Number(link.sync_count??0)}}),
      ]);
      return NextResponse.json({ok:true,projectId:existingProjectId,url:`/projects/${existingProjectId}`,unchanged:true,idempotent:true,syncCount:Number(link.sync_count??0)});
    }

    let projectId=existingProjectId;
    if(!projectId){
      const contact=contract.lead?.contact??{};
      let clientId:string|null=null;
      if(contact.email){const {data}=await admin.from('clients').select('id').eq('organization_id',organizationId).eq('email',contact.email).is('archived_at',null).limit(1).maybeSingle();clientId=data?.id??null;}
      if(!clientId&&contact.phone){const {data}=await admin.from('clients').select('id').eq('organization_id',organizationId).eq('phone',contact.phone).is('archived_at',null).limit(1).maybeSingle();clientId=data?.id??null;}
      if(!clientId){const {data,error}=await admin.from('clients').insert({organization_id:organizationId,display_name:String(contact.name||'Dream Planner lead').slice(0,200),email:contact.email||null,phone:contact.phone||null,notes:'Created automatically from Dream Planner intake.'}).select('id').single();if(error)throw error;clientId=data.id;}
      const {data:project,error}=await admin.from('projects').insert({organization_id:organizationId,client_id:clientId,name:String(contract.project?.name||'Dream Planner Project').slice(0,200),project_type:'kitchen',status:'active',currency:contract.commercial?.currency??'EUR',settings:{}}).select('id').single();
      if(error)throw error;
      projectId=project.id;
      createdProjectId=project.id;
    }

    const settings=plannerProjectSettings(contract,{id:handoff.id,deployment_id:handoff.deployment_id});
    const measurement=plannerMeasurementPayload(organizationId,projectId,contract);
    const cabinetRows=await buildPlannerCabinetRows(admin,organizationId,projectId,'',contract);
    const mode=existingProjectId?'UPDATE':'CREATE';
    const {data:syncResult,error:syncError}=await admin.rpc('quote_apply_planner_sync_v1',{
      p_organization_id:organizationId,
      p_project_id:projectId,
      p_handoff_id:handoff.id,
      p_contract_version:contract.version,
      p_source_project_id:sourceProjectId,
      p_source_hash:sourceHash,
      p_sync_count:nextSyncCount,
      p_project_name:String(contract.project?.name||'Dream Planner Project'),
      p_currency:contract.commercial?.currency??'EUR',
      p_settings:settings,
      p_snapshot:contract.project??{},
      p_measurement:measurement,
      p_cabinets:cabinetRows,
      p_pricing:contract.commercial?.pricing??{},
      p_visualization:visualization(contract),
    });
    if(syncError)throw syncError;

    const now=new Date().toISOString();
    const syncLinkPayload={organization_id:organizationId,deployment_id:deploymentId,destination:'QUOTE',source_project_id:sourceProjectId,consumer_ref:projectId,latest_handoff_id:handoff.id,latest_source_hash:sourceHash,state:'ACTIVE',sync_count:nextSyncCount,updated_at:now};
    const [{error:linkError},{error:handoffUpdateError},{error:eventError}]=await Promise.all([
      admin.from('makster_project_sync_links').upsert(syncLinkPayload,{onConflict:'organization_id,deployment_id,destination,source_project_id'}),
      admin.from('makster_project_handoffs').update({status:'ACCEPTED',consumer_ref:projectId,consumed_at:now,error_message:null}).eq('id',handoff.id),
      admin.from('makster_project_handoff_events').insert({organization_id:organizationId,handoff_id:handoff.id,source_project_id:sourceProjectId,event_type:mode,status:'ACCEPTED',detail_json:{consumerRef:projectId,sourceHash,syncCount:nextSyncCount,result:syncResult}}),
    ]);
    if(linkError||handoffUpdateError||eventError)throw linkError||handoffUpdateError||eventError;

    return NextResponse.json({ok:true,projectId,url:`/projects/${projectId}`,mode,intakeStage:'ESTIMATE_REVIEW',syncCount:nextSyncCount,...((syncResult&&typeof syncResult==='object')?syncResult:{})});
  }catch(error){
    if(createdProjectId)await admin.from('projects').delete().eq('id',createdProjectId);
    if(contract?.handoffId)await admin.from('makster_project_handoffs').update({status:'FAILED',error_message:error instanceof Error?error.message:'Quote Planner intake failed'}).eq('id',contract.handoffId);
    if(organizationId&&sourceProjectId&&contract?.handoffId)await admin.from('makster_project_handoff_events').insert({organization_id:organizationId,handoff_id:contract.handoffId,source_project_id:sourceProjectId,event_type:'FAILED',status:'FAILED',detail_json:{message:error instanceof Error?error.message:'Planner intake failed'}});
    return NextResponse.json({ok:false,code:'PLANNER_IMPORT_FAILED',message:error instanceof Error?error.message:'Planner import failed'},{status:500});
  }
}
