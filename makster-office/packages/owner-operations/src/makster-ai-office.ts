
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type {
  MaksterOfficeApproval,MaksterOfficeCampaign,MaksterOfficeContentItem,MaksterOfficeCycle,
  MaksterOfficeLead,MaksterOfficeOwnerBrief,OwnerOperationsState,OfficeChannel,MaksterGrowthConnection,MaksterGrowthSyncSnapshot,MaksterAutopilotDecision,MaksterAutopilotRun
} from './types.js';

export const MAKSTER_OFFICE_AGENTS=[
  {name:'Growth Director',department:'growth',mission:'Оркестрирует полный growth-cycle и отвечает за итоговый Owner Brief.'},
  {name:'Analytics Agent',department:'analytics',mission:'Считает воронку, CAC/ROAS, эффективность каналов и отклонения.'},
  {name:'Audience Agent',department:'audience',mission:'Определяет сегменты, рынки, ICP и приоритетные аудитории.'},
  {name:'Creative Strategist',department:'creative',mission:'Формирует креативную идею, офферы и гипотезы.'},
  {name:'Content Agent',department:'content',mission:'Готовит посты, кейсы, email, landing copy и сценарии.'},
  {name:'Google Ads Agent',department:'ads',mission:'Планирует Google Ads, ключевые запросы и search intent.'},
  {name:'Meta Ads Agent',department:'ads',mission:'Планирует Facebook Ads и Meta targeting.'},
  {name:'Instagram Growth Agent',department:'ads',mission:'Ведёт Instagram как отдельный бизнес-канал.'},
  {name:'TikTok Growth Agent',department:'ads',mission:'Планирует TikTok Ads и короткий видеоконтент.'},
  {name:'Lead Qualification Agent',department:'sales_bridge',mission:'Квалифицирует лиды и передаёт готовые в Sales/Projects.'},
  {name:'Partner Acquisition Agent',department:'sales_bridge',mission:'Ищет архитекторов, дизайнеров и B2B-партнёров.'},
  {name:'Owner Brief Agent',department:'owner_brief',mission:'Собирает решения, риски и approvals владельца.'},
] as const;

const safeDiv=(a:number,b:number)=>b>0?a/b:0;
const pct=(a:number,b:number)=>Math.round(safeDiv(a,b)*1000)/10;
const nowIso=()=>new Date().toISOString();

export function createOfficeCampaign(input:{
  name:string;channel:OfficeChannel;objective:MaksterOfficeCampaign['objective'];market:string;
  budgetMinor:number;currency:string;createdBy?:string;startAt?:string;endAt?:string
}):MaksterOfficeCampaign{
  if(!input.name.trim())throw new Error('office_campaign_name_required');
  if(!Number.isFinite(input.budgetMinor)||input.budgetMinor<0)throw new Error('office_campaign_budget_invalid');
  const now=nowIso();
  return {
    id:crypto.randomUUID(),name:input.name.trim(),channel:input.channel,objective:input.objective,market:input.market.trim()||'CZ',
    status:'draft',budgetMinor:input.budgetMinor,spentMinor:0,currency:input.currency,
    impressions:0,clicks:0,leads:0,qualifiedLeads:0,wonDeals:0,attributedRevenueMinor:0,
    ...(input.startAt?{startAt:input.startAt}:{}),...(input.endAt?{endAt:input.endAt}:{}),
    createdBy:input.createdBy??'owner',createdAt:now,updatedAt:now
  };
}

export function createOfficeLead(input:{
  name:string;source:MaksterOfficeLead['source'];currency:string;company?:string;email?:string;phone?:string;
  country?:string;estimatedValueMinor?:number;campaignId?:string;note?:string
}):MaksterOfficeLead{
  if(!input.name.trim())throw new Error('office_lead_name_required');
  const now=nowIso();
  return {
    id:crypto.randomUUID(),name:input.name.trim(),source:input.source,currency:input.currency,status:'new',probabilityPercent:10,
    ...(input.company?{company:input.company}:{}),...(input.email?{email:input.email}:{}),...(input.phone?{phone:input.phone}:{}),
    ...(input.country?{country:input.country}:{}),...(input.estimatedValueMinor!=null?{estimatedValueMinor:input.estimatedValueMinor}:{}),
    ...(input.campaignId?{campaignId:input.campaignId}:{}),...(input.note?{note:input.note}:{}),
    createdAt:now,updatedAt:now
  };
}

export function createOfficeApproval(input:{
  kind:MaksterOfficeApproval['kind'];title:string;detail:string;entityType:MaksterOfficeApproval['entityType'];entityId:string;
  requestedBy:string;amountMinor?:number;currency?:string
}):MaksterOfficeApproval{
  return {
    id:crypto.randomUUID(),kind:input.kind,title:input.title,detail:input.detail,
    ...(input.amountMinor!=null?{amountMinor:input.amountMinor}:{}),...(input.currency?{currency:input.currency}:{}),
    entityType:input.entityType,entityId:input.entityId,status:'pending',requestedBy:input.requestedBy,requestedAt:nowIso()
  };
}

function campaignMetrics(c:MaksterOfficeCampaign){
  const ctr=pct(c.clicks,c.impressions);
  const cpl=c.leads>0?Math.round(c.spentMinor/c.leads):null;
  const cpql=c.qualifiedLeads>0?Math.round(c.spentMinor/c.qualifiedLeads):null;
  const roas=c.spentMinor>0?Math.round(c.attributedRevenueMinor/c.spentMinor*100)/100:null;
  const leadToQualified=pct(c.qualifiedLeads,c.leads);
  const qualifiedToWon=pct(c.wonDeals,c.qualifiedLeads);
  return {ctrPercent:ctr,costPerLeadMinor:cpl,costPerQualifiedLeadMinor:cpql,roas,leadToQualifiedPercent:leadToQualified,qualifiedToWonPercent:qualifiedToWon};
}

export function buildMaksterOfficeDashboard(
  projects:ProjectModelV1[],
  state:OwnerOperationsState,
  currency='EUR',
  now=new Date()
){
  const campaigns=state.officeCampaigns.filter(x=>x.currency===currency).map(c=>({...c,metrics:campaignMetrics(c)}))
    .sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')||b.updatedAt.localeCompare(a.updatedAt));
  const leads=state.officeLeads.filter(x=>x.currency===currency);
  const pending=state.officeApprovals.filter(x=>x.status==='pending');
  const spend=campaigns.reduce((s,x)=>s+x.spentMinor,0),budget=campaigns.reduce((s,x)=>s+x.budgetMinor,0);
  const attributed=campaigns.reduce((s,x)=>s+x.attributedRevenueMinor,0);
  const won=leads.filter(x=>x.status==='won').length,qualified=leads.filter(x=>['qualified','measurement_booked','proposal','negotiation','won'].includes(x.status)).length;
  const totalEstimated=leads.reduce((s,x)=>s+(x.estimatedValueMinor??0),0);
  const openPipeline=leads.filter(x=>!['won','lost'].includes(x.status)).reduce((s,x)=>s+(x.estimatedValueMinor??0),0);
  const weightedPipeline=leads.filter(x=>!['won','lost'].includes(x.status)).reduce((s,x)=>s+Math.round((x.estimatedValueMinor??0)*(x.probabilityPercent??10)/100),0);
  const actualRevenue=leads.reduce((s,x)=>s+(x.actualRevenueMinor??0),0);
  const actualProfit=leads.reduce((s,x)=>s+(x.actualProfitMinor??0),0);
  const overdueFollowUps=leads.filter(x=>x.nextFollowUpAt&&!['won','lost'].includes(x.status)&&new Date(x.nextFollowUpAt)<now).length;

  const channelMap=new Map<string,{channel:string;budgetMinor:number;spentMinor:number;leads:number;qualifiedLeads:number;wonDeals:number;revenueMinor:number}>();
  for(const c of campaigns){
    const x=channelMap.get(c.channel)??{channel:c.channel,budgetMinor:0,spentMinor:0,leads:0,qualifiedLeads:0,wonDeals:0,revenueMinor:0};
    x.budgetMinor+=c.budgetMinor;x.spentMinor+=c.spentMinor;x.leads+=c.leads;x.qualifiedLeads+=c.qualifiedLeads;x.wonDeals+=c.wonDeals;x.revenueMinor+=c.attributedRevenueMinor;
    channelMap.set(c.channel,x);
  }
  const channels=[...channelMap.values()].map(x=>({...x,roas:x.spentMinor>0?Math.round(x.revenueMinor/x.spentMinor*100)/100:null,cplMinor:x.leads>0?Math.round(x.spentMinor/x.leads):null}))
    .sort((a,b)=>(b.revenueMinor-b.spentMinor)-(a.revenueMinor-a.spentMinor));

  const recentBrief=state.officeOwnerBriefs.slice().sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))[0]??null;
  const agents=MAKSTER_OFFICE_AGENTS.map(a=>({
    ...a,
    runs:state.officeAgentRuns.filter(x=>x.agent===a.name).length,
    lastRun:state.officeAgentRuns.filter(x=>x.agent===a.name).sort((x,y)=>y.completedAt.localeCompare(x.completedAt))[0]?.completedAt??null
  }));
  const convertedProjects=projects.filter(p=>leads.some(l=>l.projectId===p.projectId));
  return {
    version:'5.4.0',generatedAt:now.toISOString(),currency,
    summary:{
      activeCampaigns:campaigns.filter(x=>x.status==='active').length,totalCampaigns:campaigns.length,budgetMinor:budget,spentMinor:spend,
      leads:leads.length,newLeads:leads.filter(x=>x.status==='new').length,qualifiedLeads:qualified,wonLeads:won,
      openPipelineMinor:openPipeline,weightedPipelineMinor:weightedPipeline,totalLeadValueMinor:totalEstimated,attributedRevenueMinor:attributed,actualRevenueMinor:actualRevenue,actualProfitMinor:actualProfit,overdueFollowUps,pendingApprovals:pending.length,
      convertedProjects:convertedProjects.length,roas:spend>0?Math.round(attributed/spend*100)/100:null
    },
    campaigns,channels,leads:leads.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    pendingApprovals:pending.sort((a,b)=>a.requestedAt.localeCompare(b.requestedAt)),
    content:state.officeContent.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    cycles:state.officeCycles.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    connections:state.growthConnections, syncSnapshots:state.growthSyncSnapshots.slice().sort((a,b)=>b.capturedAt.localeCompare(a.capturedAt)).slice(0,100),
    autopilot:{
      latestRun:state.officeAutopilotRuns.slice().sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))[0]??null,
      decisions:state.officeAutopilotDecisions.slice().sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt)).slice(0,100),
      pending:state.officeAutopilotDecisions.filter(x=>x.status==='proposed'||x.status==='approved').length
    },
    liveExecution:{
      guardrails:state.growthSpendGuardrails,
      executions:state.growthProviderExecutions.slice().sort((a,b)=>b.requestedAt.localeCompare(a.requestedAt)).slice(0,100),
      audit:state.growthAuditLog.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100),
      inboundLeadEvents:state.growthInboundLeadEvents.slice().sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)).slice(0,100),
      summary:{
        executed:state.growthProviderExecutions.filter(x=>x.status==='executed').length,
        blocked:state.growthProviderExecutions.filter(x=>x.status==='blocked').length,
        failed:state.growthProviderExecutions.filter(x=>x.status==='failed').length,
        waitingConnection:state.growthProviderExecutions.filter(x=>x.status==='provider_not_connected').length,
        inboundIngested:state.growthInboundLeadEvents.filter(x=>x.status==='ingested').length,
        inboundDuplicates:state.growthInboundLeadEvents.filter(x=>x.status==='duplicate').length,
        inboundRejected:state.growthInboundLeadEvents.filter(x=>x.status==='rejected').length
      }
    },
    agents,recentBrief
  };
}

export function runMaksterOfficeCycle(state:OwnerOperationsState,input:{
  title?:string;market?:string;currency?:string;monthlyBudgetMinor?:number;goal?:string;createdBy?:string
}){
  const now=nowIso(),currency=input.currency??'EUR',market=input.market??'CZ';
  const cycle:MaksterOfficeCycle={
    id:crypto.randomUUID(),title:input.title??`Growth Cycle ${now.slice(0,10)}`,market,currency,
    monthlyBudgetMinor:Math.max(0,input.monthlyBudgetMinor??0),status:'awaiting_approval',
    goal:input.goal??'Generate qualified furniture leads and partner opportunities.',
    createdBy:input.createdBy??'owner',createdAt:now,updatedAt:now
  };

  const active=state.officeCampaigns.filter(x=>x.status==='active'&&x.currency===currency);
  const leads=state.officeLeads.filter(x=>x.currency===currency);
  const spend=active.reduce((s,x)=>s+x.spentMinor,0);
  const attributed=active.reduce((s,x)=>s+x.attributedRevenueMinor,0);
  const weak=active.filter(x=>x.spentMinor>0&&(x.leads===0||x.attributedRevenueMinor<x.spentMinor));
  const strong=active.filter(x=>x.spentMinor>0&&x.attributedRevenueMinor>=x.spentMinor*3);

  const runs=MAKSTER_OFFICE_AGENTS.map((a,idx)=>{
    let summary='';
    const output:Record<string,unknown>={market,currency};
    if(a.name==='Analytics Agent'){
      summary=`Active campaigns ${active.length}; spend ${spend}; attributed revenue ${attributed}; leads ${leads.length}.`;
      Object.assign(output,{activeCampaigns:active.length,spendMinor:spend,attributedRevenueMinor:attributed,leadCount:leads.length});
    }else if(a.name==='Audience Agent'){
      summary=`Prioritize premium custom furniture clients and architecture/design partners in ${market}.`;
      Object.assign(output,{segments:['premium residential','architects','interior designers','developers'],market});
    }else if(a.name==='Creative Strategist'){
      summary='Creative direction: real Makster projects, before/after visual stories, engineering precision and premium execution.';
      Object.assign(output,{pillars:['real projects','visualization','engineering precision','premium installation']});
    }else if(a.name==='Content Agent'){
      summary='Prepared a content queue focused on case studies, workshop proof, material expertise and partner acquisition.';
      Object.assign(output,{recommendedFormats:['case_study','reel','post','partner_email']});
    }else if(a.name.includes('Google Ads')){
      summary='Google: prioritize high-intent custom kitchen / wardrobe / bespoke furniture searches.';
      Object.assign(output,{channel:'google_ads',objective:'leads'});
    }else if(a.name.includes('Meta Ads')){
      summary='Facebook: remarketing, homeowner audiences and project case-study ads.';
      Object.assign(output,{channel:'facebook_ads',objective:'remarketing'});
    }else if(a.name.includes('Instagram')){
      summary='Instagram: separate business channel with portfolio, Reels, paid lead campaigns and designer outreach.';
      Object.assign(output,{channel:'instagram_ads',objective:'leads'});
    }else if(a.name.includes('TikTok')){
      summary='TikTok: short visual transformations, workshop/process content and paid testing.';
      Object.assign(output,{channel:'tiktok_ads',objective:'awareness'});
    }else if(a.name==='Lead Qualification Agent'){
      summary=`${leads.filter(x=>x.status==='new').length} new lead(s) require qualification and value scoring.`;
      Object.assign(output,{newLeads:leads.filter(x=>x.status==='new').map(x=>x.id)});
    }else if(a.name==='Partner Acquisition Agent'){
      summary='Continue B2B pipeline for architects, designers, project managers and fit-out partners.';
      Object.assign(output,{partnerTypes:['architect','interior_designer','project_manager','developer']});
    }else if(a.name==='Owner Brief Agent'){
      summary=`Owner attention: ${weak.length} weak campaign(s), ${strong.length} strong campaign(s), ${state.officeApprovals.filter(x=>x.status==='pending').length} pending approval(s).`;
      Object.assign(output,{weakCampaignIds:weak.map(x=>x.id),strongCampaignIds:strong.map(x=>x.id)});
    }else{
      summary='Growth Director assembled Analytics → Audience → Creative → Content → Ads → Sales Bridge → Owner Brief.';
      Object.assign(output,{sequence:['analytics','audience','creative','content','ads','sales_bridge','owner_brief']});
    }
    return {id:crypto.randomUUID(),cycleId:cycle.id,agent:a.name,department:a.department,status:'completed' as const,summary,output,startedAt:now,completedAt:new Date(Date.parse(now)+idx*1000).toISOString()};
  });

  const approvals:MaksterOfficeApproval[]=[];
  if(cycle.monthlyBudgetMinor>0)approvals.push(createOfficeApproval({
    kind:'campaign_budget',title:`Growth budget · ${market}`,detail:`Approve monthly AI Office growth budget ${cycle.monthlyBudgetMinor} minor units.`,
    amountMinor:cycle.monthlyBudgetMinor,currency,entityType:'cycle',entityId:cycle.id,requestedBy:'Growth Director'
  }));
  for(const c of weak) approvals.push(createOfficeApproval({
    kind:'campaign_launch',title:`Pause/rework weak campaign · ${c.name}`,detail:'Campaign is spending without sufficient return. Owner approval required before changing live campaign state.',
    entityType:'campaign',entityId:c.id,requestedBy:'Growth Director'
  }));

  const brief:MaksterOfficeOwnerBrief={
    id:crypto.randomUUID(),cycleId:cycle.id,generatedAt:now,
    headline:`Makster AI Office · ${market} Growth Brief`,
    summary:`${active.length} active campaign(s), ${leads.length} lead(s), ${state.officeApprovals.filter(x=>x.status==='pending').length+approvals.length} approval(s) requiring owner attention.`,
    metrics:{activeCampaigns:active.length,spendMinor:spend,leads:leads.length,qualifiedLeads:leads.filter(x=>['qualified','measurement_booked','proposal','negotiation','won'].includes(x.status)).length,wonDeals:leads.filter(x=>x.status==='won').length,attributedRevenueMinor:attributed,pendingApprovals:state.officeApprovals.filter(x=>x.status==='pending').length+approvals.length},
    priorities:[
      'Protect spend behind Owner Approval.',
      'Move qualified leads into Sales / Makster Project as quickly as possible.',
      'Scale channels only after lead quality and attributed revenue are visible.'
    ],
    risks:[
      ...(weak.length?[`${weak.length} campaign(s) show weak return.`]:[]),
      ...(leads.filter(x=>x.status==='new').length?[`${leads.filter(x=>x.status==='new').length} new lead(s) still unqualified.`]:[])
    ]
  };
  return {cycle,runs,approvals,brief};
}


export const CRM_STAGE_PROBABILITY:Record<MaksterOfficeLead['status'],number>={
  new:10,contacted:20,qualified:35,measurement_booked:50,proposal:65,negotiation:80,won:100,lost:0
};

export function advanceOfficeLead(lead:MaksterOfficeLead,input:{
  status:MaksterOfficeLead['status'];nextFollowUpAt?:string;lostReason?:string;owner?:string;
}):MaksterOfficeLead{
  const allowed:MaksterOfficeLead['status'][]=['new','contacted','qualified','measurement_booked','proposal','negotiation','won','lost'];
  if(!allowed.includes(input.status))throw new Error('office_lead_status_invalid');
  if(input.status==='lost'&&!input.lostReason?.trim())throw new Error('office_lead_lost_reason_required');
  return {...lead,status:input.status,probabilityPercent:CRM_STAGE_PROBABILITY[input.status],
    ...(input.nextFollowUpAt?{nextFollowUpAt:input.nextFollowUpAt}:{}),
    ...(input.lostReason?{lostReason:input.lostReason}:{}),...(input.owner?{owner:input.owner}:{}),updatedAt:nowIso()};
}

export function connectGrowthProvider(input:{
  provider:MaksterGrowthConnection['provider'];accountId?:string;displayName?:string
}):MaksterGrowthConnection{
  const now=nowIso();
  return {id:crypto.randomUUID(),provider:input.provider,status:input.accountId?'configured':'disconnected',
    ...(input.accountId?{accountId:input.accountId}:{}),...(input.displayName?{displayName:input.displayName}:{}),createdAt:now,updatedAt:now};
}

export function applyGrowthProviderSync(state:OwnerOperationsState,input:{
  provider:MaksterGrowthSyncSnapshot['provider'];providerCampaignId:string;capturedAt?:string;
  spendMinor:number;impressions:number;clicks:number;leads:number;attributedRevenueMinor?:number;
  raw?:Record<string,unknown>;
}){
  const campaign=state.officeCampaigns.find(x=>x.providerCampaignId===input.providerCampaignId);
  if(!campaign)throw new Error('provider_campaign_not_mapped');
  const snap:MaksterGrowthSyncSnapshot={id:crypto.randomUUID(),provider:input.provider,campaignId:campaign.id,
    providerCampaignId:input.providerCampaignId,capturedAt:input.capturedAt??nowIso(),
    spendMinor:Math.max(0,input.spendMinor),impressions:Math.max(0,input.impressions),clicks:Math.max(0,input.clicks),
    leads:Math.max(0,input.leads),attributedRevenueMinor:Math.max(0,input.attributedRevenueMinor??0),...(input.raw?{raw:input.raw}:{})};
  campaign.spentMinor=snap.spendMinor;campaign.impressions=snap.impressions;campaign.clicks=snap.clicks;campaign.leads=snap.leads;
  campaign.attributedRevenueMinor=snap.attributedRevenueMinor;campaign.updatedAt=nowIso();
  return {campaign,snapshot:snap};
}

export function reconcileProjectRevenueAttribution(projects:ProjectModelV1[],state:OwnerOperationsState){
  const rows=[] as Array<{leadId:string;projectId:string;campaignId?:string;contractMinor:number;receivedMinor:number;forecastProfitMinor:number|null}>;
  for(const lead of state.officeLeads){
    if(!lead.projectId)continue;
    const p=projects.find(x=>x.projectId===lead.projectId);if(!p)continue;
    const contract=p.jobControl?.money?.contractValueMinor??0,received=p.jobControl?.money?.receivedMinor??0;
    const actualCost=(p as any).jobControl?.money?.actualCostMinor;
    const forecastProfit=actualCost==null?null:contract-actualCost;
    lead.actualRevenueMinor=contract;
    if(forecastProfit!=null)lead.actualProfitMinor=forecastProfit;
    rows.push({leadId:lead.id,projectId:p.projectId,...(lead.campaignId?{campaignId:lead.campaignId}:{}),contractMinor:contract,receivedMinor:received,forecastProfitMinor:forecastProfit});
  }
  return rows;
}


function campaignActualEconomics(campaignId:string,state:OwnerOperationsState){
  const leads=state.officeLeads.filter(x=>x.campaignId===campaignId);
  return {
    actualRevenueMinor:leads.reduce((s,x)=>s+(x.actualRevenueMinor??0),0),
    actualProfitMinor:leads.reduce((s,x)=>s+(x.actualProfitMinor??0),0),
    wonDeals:leads.filter(x=>x.status==='won').length
  };
}

export function buildGrowthAutopilot(state:OwnerOperationsState,currency='EUR',now=new Date()){
  const active=state.officeCampaigns.filter(x=>x.currency===currency&&['active','planned'].includes(x.status));
  const decisions:MaksterAutopilotDecision[]=[];
  for(const c of active){
    const econ=campaignActualEconomics(c.id,state);
    const roas=c.spentMinor>0?c.attributedRevenueMinor/c.spentMinor:null;
    const cpql=c.qualifiedLeads>0?Math.round(c.spentMinor/c.qualifiedLeads):null;
    const quality=c.leads>0?c.qualifiedLeads/c.leads*100:0;
    let action:MaksterAutopilotDecision['action']='hold';
    let factor=1,confidence=55,reason='Недостаточно данных для изменения бюджета.';
    if(c.spentMinor===0){
      action='hold';confidence=45;reason='Кампания ещё не накопила spend — сохраняем бюджет до появления данных.';
    }else if(econ.actualProfitMinor>0&&econ.actualProfitMinor>=c.spentMinor*3&&quality>=30){
      action='scale';factor=1.25;confidence=92;reason='Кампания приводит проекты с подтверждённой прибылью и приемлемым качеством лидов.';
    }else if(econ.actualRevenueMinor>0&&econ.actualProfitMinor>0&&quality>=20){
      action='scale';factor=1.15;confidence=82;reason='Есть подтверждённая выручка и прибыль по реальным Makster Project.';
    }else if(c.spentMinor>=Math.max(10000,c.budgetMinor*.25)&&c.qualifiedLeads===0){
      action='pause';factor=0;confidence=90;reason='Существенный расход без квалифицированных лидов.';
    }else if(c.spentMinor>=Math.max(10000,c.budgetMinor*.25)&&quality<15){
      action='reduce';factor=.7;confidence=78;reason='Низкое качество лидов при уже значимом расходе.';
    }else if(roas!=null&&roas<1&&c.spentMinor>=Math.max(10000,c.budgetMinor*.2)){
      action='reduce';factor=.8;confidence=70;reason='Атрибутированная выручка ниже рекламного расхода; пока уменьшаем, а не отключаем полностью.';
    }else if(roas!=null&&roas>=3&&quality>=25){
      action='scale';factor=1.15;confidence=72;reason='ROAS и качество лидов поддерживают осторожное масштабирование, но реальная прибыль проекта ещё не подтверждена.';
    }
    const proposed=Math.max(0,Math.round(c.budgetMinor*factor));
    decisions.push({
      id:crypto.randomUUID(),generatedAt:now.toISOString(),campaignId:c.id,campaignName:c.name,channel:c.channel,
      action,confidence,currentBudgetMinor:c.budgetMinor,proposedBudgetMinor:proposed,budgetDeltaMinor:proposed-c.budgetMinor,
      reason,evidence:{
        spendMinor:c.spentMinor,leads:c.leads,qualifiedLeads:c.qualifiedLeads,wonDeals:Math.max(c.wonDeals,econ.wonDeals),
        attributedRevenueMinor:c.attributedRevenueMinor,actualProjectRevenueMinor:econ.actualRevenueMinor,
        actualProjectProfitMinor:econ.actualProfitMinor,roas:roas==null?null:Math.round(roas*100)/100,
        costPerQualifiedLeadMinor:cpql,leadQualityPercent:Math.round(quality*10)/10
      },status:'proposed',executionScope:'internal_plan_only',providerExecution:c.providerCampaignId?'pending_provider_sync':'pending_connection'
    });
  }
  const run:MaksterAutopilotRun={
    id:crypto.randomUUID(),generatedAt:now.toISOString(),currency,mode:'recommend_only',decisions:decisions.map(x=>x.id),
    summary:{
      scale:decisions.filter(x=>x.action==='scale').length,hold:decisions.filter(x=>x.action==='hold').length,
      reduce:decisions.filter(x=>x.action==='reduce').length,pause:decisions.filter(x=>x.action==='pause').length,
      proposedBudgetBeforeMinor:decisions.reduce((s,x)=>s+x.currentBudgetMinor,0),
      proposedBudgetAfterMinor:decisions.reduce((s,x)=>s+x.proposedBudgetMinor,0)
    }
  };
  return {run,decisions};
}

export function autopilotApprovalForDecision(d:MaksterAutopilotDecision):MaksterOfficeApproval{
  return createOfficeApproval({
    kind:'campaign_budget',
    title:`Autopilot ${d.action.toUpperCase()} · ${d.campaignName}`,
    detail:`${d.reason} Budget ${d.currentBudgetMinor} → ${d.proposedBudgetMinor} minor units. Confidence ${d.confidence}%.`,
    amountMinor:d.proposedBudgetMinor,entityType:'campaign',entityId:d.campaignId,requestedBy:'Growth Director'
  });
}

export function executeApprovedAutopilotDecision(
  decision:MaksterAutopilotDecision,
  campaign:MaksterOfficeCampaign,
  approval:MaksterOfficeApproval
){
  if(approval.status!=='approved')throw new Error('autopilot_owner_approval_required');
  if(decision.status!=='approved'&&decision.status!=='proposed')throw new Error('autopilot_decision_not_executable');
  if(decision.action==='pause')campaign.status='paused';
  else {
    campaign.budgetMinor=decision.proposedBudgetMinor;
    if(campaign.status==='draft')campaign.status='planned';
  }
  campaign.updatedAt=nowIso();
  decision.status='executed';decision.executedAt=nowIso();
  return {campaign,decision};
}
