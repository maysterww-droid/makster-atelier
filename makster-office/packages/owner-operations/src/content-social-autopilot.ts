
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type {
  MaksterCreativeAsset,MaksterContentDraftSet,MaksterContentPerformance,MaksterOfficeApproval,
  MaksterOfficeContentItem,MaksterPilotProject,MaksterPilotRun,MaksterPublishJob,OfficeChannel,OwnerOperationsState
} from './types.js';
import { createOfficeApproval } from './makster-ai-office.js';

const nowIso=()=>new Date().toISOString();
const stageIndex=(s:string)=>['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].indexOf(s);

function projectTags(p:ProjectModelV1){
  const tags=new Set<string>();
  tags.add(String(p.projectType??'project'));
  for(const f of p.furniture??[])tags.add(String(f.kind??'furniture'));
  for(const m of p.selections?.materials??[]){
    if(m.manufacturer)tags.add(String(m.manufacturer));
    if(m.code)tags.add(String(m.code));
    if(m.name)tags.add(String(m.name));
  }
  if(p.jobControl?.client?.company)tags.add('b2b');
  return [...tags].filter(Boolean).slice(0,30);
}

export function addCreativeAsset(input:{
  projectId:string;kind:MaksterCreativeAsset['kind'];title:string;uri?:string;tags?:string[];
  roomType?:string;materialTags?:string[];approvedForMarketing?:boolean;hero?:boolean
}):MaksterCreativeAsset{
  const now=nowIso();
  return {
    id:crypto.randomUUID(),projectId:input.projectId,kind:input.kind,title:input.title.trim()||'Makster asset',
    ...(input.uri?{uri:input.uri}:{}),tags:[...(input.tags??[])],...(input.roomType?{roomType:input.roomType}:{}),
    materialTags:[...(input.materialTags??[])],approvedForMarketing:input.approvedForMarketing??false,hero:input.hero??false,
    createdAt:now,updatedAt:now
  };
}

export function buildProjectContentDrafts(project:ProjectModelV1,state:OwnerOperationsState,input?:{
  channels?:OfficeChannel[];audience?:string;angle?:string
}){
  const approvedAssets=state.creativeAssets.filter(x=>x.projectId===project.projectId&&x.approvedForMarketing);
  if(!approvedAssets.length)throw new Error('content_project_has_no_approved_assets');
  const channels=input?.channels??['instagram_organic','facebook_organic','tiktok_organic','linkedin','website'];
  const tags=projectTags(project);
  const client=project.jobControl?.client?.company??project.jobControl?.client?.name??'private client';
  const contract=project.jobControl?.money?.contractValueMinor??0;
  const furniture=(project.furniture??[]).map(x=>x.name||x.kind).filter(Boolean).slice(0,6);
  const materials=(project.selections?.materials??[]).map(x=>[x.manufacturer,x.code,x.name].filter(Boolean).join(' ')).filter(Boolean).slice(0,6);
  const stage=project.jobControl?.stage??'lead';
  const audience=input?.audience??(project.jobControl?.client?.company?'architects and interior designers':'premium homeowners');
  const angle=input?.angle??(stage==='closed'?'finished project proof':'behind-the-scenes project progress');
  const proof=[
    furniture.length?`Furniture: ${furniture.join(', ')}`:'',
    materials.length?`Materials: ${materials.join(', ')}`:'',
    contract>0?`Project value: ${(contract/100).toFixed(0)} ${project.jobControl?.money?.currency??project.currency}`:'',
    `Makster project stage: ${stage}`,
    `Approved real assets: ${approvedAssets.length}`
  ].filter(Boolean);

  const items:MaksterOfficeContentItem[]=[];
  const mk=(channel:OfficeChannel,format:MaksterOfficeContentItem['format'],title:string,body:string)=>{
    const now=nowIso();
    const x:MaksterOfficeContentItem={id:crypto.randomUUID(),channel,format,title,body,status:'awaiting_approval',
      createdByAgent:'Content Agent',createdAt:now,updatedAt:now};
    items.push(x);return x;
  };

  if(channels.includes('instagram_organic'))mk('instagram_organic','post',
    `${project.title} · real Makster project`,
    `Задача: создать ${furniture.join(', ')||'custom furniture'} для ${client}. ${materials.length?`Использовали ${materials.join(', ')}. `:''}Показываем реальную работу Makster: от инженерного решения до монтажа. ${tags.slice(0,8).map(x=>'#'+String(x).replace(/\s+/g,'')).join(' ')}`);
  if(channels.includes('facebook_organic'))mk('facebook_organic','post',
    `${project.title} — custom furniture case`,
    `Реальный проект Makster. ${proof.join(' · ')}. В следующих материалах покажем детали конструкции, производство и готовый результат.`);
  if(channels.includes('tiktok_organic'))mk('tiktok_organic','video_script',
    `${project.title} · 20 sec transformation`,
    `0–2s: сильный финальный кадр. 2–6s: исходная задача. 6–13s: производство/монтаж. 13–18s: детали материалов и фурнитуры. 18–20s: готовый результат + Makster.`);
  if(channels.includes('linkedin'))mk('linkedin','case_study',
    `${project.title}: engineering-led custom furniture`,
    `Case study: ${angle}. ${proof.join(' · ')}. Акцент для архитекторов и дизайнеров — предсказуемая инженерия, координация поставок и качественный монтаж.`);
  if(channels.includes('website'))mk('website','case_study',
    `${project.title} — Makster case study`,
    `Клиент: ${client}. Задача: ${furniture.join(', ')||project.projectType}. Решение: ${materials.join(', ')||'custom material specification'}. Проект прошёл через Makster Engineering, procurement, production and installation workflow.`);

  const set:MaksterContentDraftSet={id:crypto.randomUUID(),projectId:project.projectId,generatedAt:nowIso(),
    sourceAssetIds:approvedAssets.map(x=>x.id),items:items.map(x=>x.id),
    strategy:{audience,angle,proofPoints:proof,channels}};
  const approvals=items.map(x=>createOfficeApproval({
    kind:'content_publish',title:`Publish approval · ${x.title}`,detail:`Approve ${x.format} for ${x.channel}.`,
    entityType:'content',entityId:x.id,requestedBy:'Content Agent'
  }));
  return {set,items,approvals};
}

export function createPublishJob(content:MaksterOfficeContentItem,approval?:MaksterOfficeApproval,input?:{scheduledAt?:string}):MaksterPublishJob{
  const now=nowIso();
  return {id:crypto.randomUUID(),contentId:content.id,channel:content.channel,
    status:approval?.status==='approved'||approval?.status==='executed'?'approved':'awaiting_approval',
    ...(input?.scheduledAt?{scheduledAt:input.scheduledAt}:{}),...(approval?{approvalId:approval.id}:{}),createdAt:now,updatedAt:now};
}

export function queueApprovedPublishJob(job:MaksterPublishJob,content:MaksterOfficeContentItem,approval:MaksterOfficeApproval){
  if(!['approved','executed'].includes(approval.status))throw new Error('publish_owner_approval_required');
  if(content.status!=='approved'&&content.status!=='awaiting_approval')throw new Error('content_not_publishable');
  job.status='queued';job.updatedAt=nowIso();content.status='approved';content.updatedAt=nowIso();
  return {job,content};
}

export function recordContentPerformance(input:{
  contentId:string;channel:OfficeChannel;impressions?:number;views?:number;clicks?:number;engagements?:number;
  leads?:number;qualifiedLeads?:number;attributedRevenueMinor?:number;capturedAt?:string
}):MaksterContentPerformance{
  return {id:crypto.randomUUID(),contentId:input.contentId,channel:input.channel,capturedAt:input.capturedAt??nowIso(),
    impressions:Math.max(0,input.impressions??0),views:Math.max(0,input.views??0),clicks:Math.max(0,input.clicks??0),
    engagements:Math.max(0,input.engagements??0),leads:Math.max(0,input.leads??0),qualifiedLeads:Math.max(0,input.qualifiedLeads??0),
    attributedRevenueMinor:Math.max(0,input.attributedRevenueMinor??0)};
}

export function buildCreativeLearning(state:OwnerOperationsState){
  const byFormat=new Map<string,{key:string;items:number;impressions:number;views:number;engagements:number;leads:number;qualified:number;revenue:number}>();
  for(const perf of state.contentPerformance){
    const content=state.officeContent.find(x=>x.id===perf.contentId);if(!content)continue;
    const key=`${content.format} · ${content.channel}`;
    const x=byFormat.get(key)??{key,items:0,impressions:0,views:0,engagements:0,leads:0,qualified:0,revenue:0};
    x.items+=1;x.impressions+=perf.impressions;x.views+=perf.views;x.engagements+=perf.engagements;x.leads+=perf.leads;x.qualified+=perf.qualifiedLeads;x.revenue+=perf.attributedRevenueMinor;
    byFormat.set(key,x);
  }
  return [...byFormat.values()].map(x=>({...x,
    engagementRate:x.impressions>0?Number((x.engagements/x.impressions*100).toFixed(1)):0,
    leadRate:x.impressions>0?Number((x.leads/x.impressions*100).toFixed(2)):0,
    qualifiedRate:x.leads>0?Number((x.qualified/x.leads*100).toFixed(1)):0
  })).sort((a,b)=>(b.revenue+b.qualified*10000)-(a.revenue+a.qualified*10000));
}

export function evaluatePilotProject(project:ProjectModelV1,state:OwnerOperationsState):MaksterPilotProject{
  const leadLinked=state.officeLeads.some(x=>x.projectId===project.projectId);
  const stage=project.jobControl?.stage??'lead';
  const commercialReady=(project.jobControl?.money?.contractValueMinor??0)>0&&stageIndex(stage)>=stageIndex('contract');
  const procurementReady=(project.purchaseOrders??[]).length>0||state.materialRfqs.some(x=>x.projectId===project.projectId)||stageIndex(stage)<stageIndex('purchasing');
  const ops=state.productionOperations.filter(x=>x.projectId===project.projectId);
  const productionTracked=ops.length>0||stageIndex(stage)<stageIndex('production');
  const installationTracked=Boolean(project.installationHandover)||(project.installationPunchItems??[]).length>0||stageIndex(stage)<stageIndex('installation');
  const contract=project.jobControl?.money?.contractValueMinor??0,received=project.jobControl?.money?.receivedMinor??0;
  const finalPaymentReady=contract>0&&received>=contract;
  const financeTracked=state.financeLedgerEntries.some(x=>x.projectId===project.projectId)||contract>0;
  const contentCandidate=state.creativeAssets.some(x=>x.projectId===project.projectId&&x.approvedForMarketing);
  const checkpoints={leadLinked,commercialReady,procurementReady,productionTracked,installationTracked,finalPaymentReady,financeTracked,contentCandidate};
  const blockers=Object.entries(checkpoints).filter(([,v])=>!v).map(([k])=>k);
  const score=Math.round(Object.values(checkpoints).filter(Boolean).length/Object.keys(checkpoints).length*100);
  const now=nowIso();
  return {id:crypto.randomUUID(),projectId:project.projectId,title:project.title,startedAt:now,
    status:blockers.length===0?'completed':stage==='closed'?'blocked':'active',checkpoints,blockers,score,updatedAt:now};
}

export function createPilotRun(projects:ProjectModelV1[],state:OwnerOperationsState,input?:{name?:string;count?:number;createdBy?:string}){
  const count=Math.max(1,Math.min(5,input?.count??3));
  const candidates=projects.filter(x=>x.jobControl?.stage!=='closed').slice(0,count);
  const rows=candidates.map(x=>evaluatePilotProject(x,state));
  const run:MaksterPilotRun={id:crypto.randomUUID(),name:input?.name??'Makster Real Project Pilot',
    targetProjectCount:count,projectIds:candidates.map(x=>x.projectId),status:'active',startedAt:nowIso(),createdBy:input?.createdBy??'owner'};
  return {run,projects:rows};
}

export function buildContentStudioDashboard(projects:ProjectModelV1[],state:OwnerOperationsState){
  const learning=buildCreativeLearning(state);
  return {
    version:'5.5.0',
    summary:{
      assets:state.creativeAssets.length,marketingApprovedAssets:state.creativeAssets.filter(x=>x.approvedForMarketing).length,
      contentDrafts:state.officeContent.filter(x=>x.status==='draft'||x.status==='awaiting_approval').length,
      approvedContent:state.officeContent.filter(x=>x.status==='approved').length,
      queued:state.publishJobs.filter(x=>x.status==='queued').length,published:state.publishJobs.filter(x=>x.status==='published').length,
      pilotActive:state.pilotProjects.filter(x=>x.status==='active').length
    },
    assets:state.creativeAssets.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    content:state.officeContent.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    publishJobs:state.publishJobs.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    learning,pilotProjects:state.pilotProjects.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    pilotRuns:state.pilotRuns.slice().sort((a,b)=>b.startedAt.localeCompare(a.startedAt)),
    candidateProjects:projects.filter(p=>state.creativeAssets.some(a=>a.projectId===p.projectId&&a.approvedForMarketing)).map(p=>({projectId:p.projectId,title:p.title,stage:p.jobControl?.stage??'lead',tags:projectTags(p)}))
  };
}
