import {createHash,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {CheckpointStore,ORG} from './checkpoint.mjs';
import {SmmService} from './smm-service.mjs';
import {MarketingService} from './marketing.mjs';
import {buildMarketingToday} from './dashboard.mjs';
import {savePreparation,AI_POLICY} from './ai-workflow.mjs';
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function createHandler({bridgeHash,url,key,fetchImpl=fetch,openaiConfigured=false}){return async req=>{
 const token=req.headers.get('x-makster-bridge')||'';
 const actual=createHash('sha256').update(token).digest('hex');
 if(!bridgeHash||!timingSafeEqual(Buffer.from(actual),Buffer.from(bridgeHash)))return json({error:'OWNER_AUTH_REQUIRED'},401);
 try{
  const path=new URL(req.url).searchParams.get('route');
  if(req.method==='GET'&&path==='/capabilities')return json({ownerAuthenticated:true,authentication:'VERCEL_AUTHENTICATION',isolatedLocalQA:false});
  const isExport=/^\/drafts\/[a-f0-9-]{36}\/export$/.test(path||'');
  if(!(req.method==='GET'&&(path==='/state'||isExport))&&!(req.method==='POST'&&['/drafts','/drafts/preview','/briefs','/marketing/action','/ai/prepare'].includes(path)))return json({error:'QA_ROUTE_DISABLED_NO_PUBLISHING'},404);
  if(Number(req.headers.get('content-length')||0)>16384)return json({error:'REQUEST_TOO_LARGE'},413);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>16384)return json({error:'REQUEST_TOO_LARGE'},413);
  const body=raw?JSON.parse(raw):null,idempotency=req.headers.get('idempotency-key')||'';
  if(req.method==='POST'&&!/^[a-zA-Z0-9_-]{8,150}$/.test(idempotency))return json({error:'IDEMPOTENCY_KEY_REQUIRED'},400);
  for(let attempt=0;attempt<3;attempt++){
   const store=new CheckpointStore({url,key,fetchImpl});
   const service=new SmmService(store,{SUPABASE_URL:url,SUPABASE_SECRET_KEY:'SERVER_ONLY',DEMO_ORGANIZATION_ID:ORG});
   try{let result;if(path==='/state'){result=await service.state();result.version='6.2.0-owner-qa';result.marketing=await new MarketingService(store).read(result);result.dashboard=buildMarketingToday(result,result.marketing);const state=await store.get();result.aiPreparation={status:openaiConfigured?'KEY_CONFIGURED_EXECUTION_DISABLED':'KEY_NOT_CONFIGURED',model:AI_POLICY.model,paidExecutionEnabled:false,proposedCapUsd:AI_POLICY.cycleCapUsd,preparations:state.officeContent.filter(x=>x.smm?.kind==='live_cycle_preparation')};result.persistence='SUPABASE_PRIVATE_ATOMIC_QA_CHECKPOINT';result.authentication='VERCEL_AUTHENTICATION';result.checkpointRevision=store.revision;}
    else if(isExport)result=await service.exportDraft(path.split('/')[2]);
    else if(path==='/drafts/preview'){const state=structuredClone(await store.get());const previewStore={get:async()=>state,applySmmRecords:async()=>{},addGrowthAuditLog:async()=>{}};result=await new SmmService(previewStore,{}).draft({...body,acceptReuse:true},'preview-'+idempotency);result.previewOnly=true;}
    else if(path==='/ai/prepare'){const base=await service.state();result=await savePreparation(store,base,await new MarketingService(store).read(base),body,idempotency);}
    else if(path==='/marketing/action')result=await new MarketingService(store).action(body,idempotency,await service.state());
    else result=path==='/drafts'?await service.draft(body,idempotency):await service.brief(body,idempotency);
    await store.commit();return json(result,req.method==='POST'?201:200);
   }catch(e){if(e.status===409&&e.message==='QA_CONCURRENT_UPDATE_RETRY'&&attempt<2)continue;throw e;}
  }
 }catch(e){return json({error:e.status?e.message:'QA_OPERATION_FAILED'},e.status||500);}
};}
