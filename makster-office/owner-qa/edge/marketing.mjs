import {createHash,randomUUID}from'node:crypto';
import {MAKSTER_OFFICE_AGENTS,createOfficeCampaign,createOfficeApproval,runMaksterOfficeCycle}from'./marketing-history.mjs';
import {smmId}from'./smm-service.mjs';
const owned=x=>x?.smm?.scope==='MAKSTER_SMM_6'&&x.smm.brandId==='makster-atelier';
const tag=(kind,more={})=>({scope:'MAKSTER_SMM_6',brandId:'makster-atelier',kind,...more});
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const text=(s,max=2000)=>{if(typeof s!=='string'||!s.trim()||s.length>max)throw fail('MARKETING_TEXT_REQUIRED');return s.trim()};
const channels=['instagram_organic','facebook_organic','google_ads','facebook_ads','instagram_ads','tiktok_ads'];
const cents=v=>{const n=Number(v??0);if(!Number.isFinite(n)||n<0||n>1000000)throw fail('INVALID_PLANNED_BUDGET');return Math.round(n*100)};
export class MarketingService{
 constructor(store){this.store=store;}
 async read(base){const s=await this.store.get();const rows=k=>(s[k]||[]).filter(owned);const notes=rows('officeContent').filter(x=>['research','audience','idea'].includes(x.smm.kind));const campaigns=rows('officeCampaigns'),approvals=rows('officeApprovals'),runs=rows('officeAgentRuns');
 const brief={headline:'MAKSTER ATELIER · Owner Brief',source:'REAL_STATE_RULES_NO_AI',generatedAt:new Date().toISOString(),summary:`В медиатеке ${base.media.length} изображений. Подготовлено фотопубликаций: ${base.drafts.filter(d=>d.smm.kind==='PHOTO_DRAFT').length}. Кампаний в плане: ${campaigns.length}. Ожидают решения: ${approvals.filter(x=>x.status==='pending').length}.`,priorities:[...(approvals.some(x=>x.status==='pending')?['Рассмотреть запросы маркетинговых бюджетов; решение не запускает расходы.']:[]),...(!notes.some(x=>x.smm.kind==='research')?['Добавить проверяемые источники в Research Desk.']:[]),'Подготовить материалы по действующему графику; публикатором остаётся ChatGPT + Metricool.'],risks:['Live AI и автоматический поиск не подключены.','Видео: вертикальный производственный сервис пока не подключён.'],metrics:{media:base.media.length,preparedPhotos:base.drafts.filter(d=>d.smm.kind==='PHOTO_DRAFT').length,scheduledPlatformEntries:base.calendar.filter(p=>p.providerStatus==='PENDING').length,publishedPlatformEntries:base.calendar.filter(p=>p.status==='published').length,calendarErrors:base.calendar.filter(p=>p.status==='failed').length,campaigns:campaigns.length,pendingApprovals:approvals.filter(x=>x.status==='pending').length,plannedBudgetMinor:campaigns.reduce((a,c)=>a+c.budgetMinor,0),actualAdSpendMinor:null,leads:null}};
 return {version:'6.1.0-owner-qa',ai:'MOCK_TEMPLATE_NO_PAID_CALLS',research:'MANUAL_SOURCES_NO_AUTOMATIC_RESEARCH',externalExecution:'OFF',agents:MAKSTER_OFFICE_AGENTS.map(a=>({...a,mission:a.name==='Lead Qualification Agent'?'Готовит критерии квалификации маркетинговых обращений; интеграция с другими продуктами выключена.':a.mission,runs:runs.filter(r=>r.agent===a.name).length,mode:'MOCK_TEMPLATE'})),notes,campaigns,approvals,runs,cycles:rows('officeCycles'),brief,savedBriefs:rows('officeOwnerBriefs'),audit:rows('growthAuditLog').slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,200)};
 }
 async action(input,key,base){if(!input||typeof input!=='object')throw fail('INVALID_MARKETING_ACTION');const s=await this.store.get();const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex'),id=smmId('marketing:'+key),prior=s.officeContent.find(x=>owned(x)&&x.id===id);
 if(prior){if(prior.smm.digest!==digest)throw fail('IDEMPOTENCY_CONFLICT',409);return {ok:true,reused:true,...prior.smm.result};}
 const now=new Date().toISOString(),records=[],put=(table,value)=>records.push({table,value}),result={kind:input.kind};
 if(['research','audience','idea'].includes(input.kind)){
  const title=text(input.title,180),body=text(input.body,5000);let sourceUrl='';if(input.sourceUrl){let u;try{u=new URL(input.sourceUrl)}catch{throw fail('HTTPS_SOURCE_REQUIRED')}if(u.protocol!=='https:'||u.username||u.password)throw fail('HTTPS_SOURCE_REQUIRED');sourceUrl=u.href;}
  if(input.kind==='research'&&!sourceUrl)throw fail('RESEARCH_SOURCE_REQUIRED');
  if(input.projectId&&!base.media.some(m=>m.projectId===input.projectId))throw fail('UNKNOWN_MEDIA_PROJECT');
  const note={id:smmId(id+':note'),title,body,status:input.kind==='idea'?'idea':'owner_note',createdAt:now,updatedAt:now,smm:tag(input.kind,{sourceUrl,sourceMode:'OWNER_PROVIDED_UNVERIFIED',projectId:input.projectId||null,ai:'NOT_USED'})};put('officeContent',note);result.id=note.id;
 }else if(input.kind==='verify_source'){
  const note=s.officeContent.find(n=>owned(n)&&n.id===input.noteId&&n.smm.kind==='research');if(!note||!note.smm.sourceUrl)throw fail('RESEARCH_SOURCE_NOT_FOUND',404);put('officeContent',{...note,updatedAt:now,smm:{...note.smm,verificationStatus:'OWNER_CONFIRMED',verifiedAt:now,verificationMethod:'OWNER_MANUAL_REVIEW'}});result.id=note.id;
 }else if(input.kind==='campaign'){
  const name=text(input.title,180),goal=text(input.goal,1500);if(!channels.includes(input.channel))throw fail('INVALID_MARKETING_CHANNEL');
  const campaign=createOfficeCampaign({name,channel:input.channel,objective:'leads',market:'CZ',budgetMinor:cents(input.budgetEuro),currency:'EUR',createdBy:'owner'});
  campaign.id=smmId(id+':campaign');campaign.smm=tag('marketing_campaign',{goal,metricsSource:'NONE',execution:'INTERNAL_PLAN_ONLY'});
  put('officeCampaigns',campaign);result.id=campaign.id;
 }else if(input.kind==='budget_request'){
  const campaign=s.officeCampaigns.find(c=>owned(c)&&c.id===input.campaignId);if(!campaign)throw fail('CAMPAIGN_NOT_FOUND',404);
  if(s.officeApprovals.some(a=>owned(a)&&a.entityId===campaign.id&&a.status==='pending'))throw fail('BUDGET_ALREADY_PENDING',409);
  const approval=createOfficeApproval({kind:'campaign_budget',title:'Маркетинговый бюджет · '+campaign.name,detail:'Согласование внутреннего плана. Расходы и запуск рекламы выключены.',entityType:'campaign',entityId:campaign.id,requestedBy:'owner',amountMinor:campaign.budgetMinor,currency:'EUR'});
  approval.id=smmId(id+':approval');approval.smm=tag('marketing_approval',{execution:'OFF'});put('officeApprovals',approval);result.id=approval.id;
 }else if(input.kind==='decision'){
  const approval=s.officeApprovals.find(a=>owned(a)&&a.id===input.approvalId);if(!approval)throw fail('APPROVAL_NOT_FOUND',404);if(approval.status!=='pending')throw fail('APPROVAL_ALREADY_DECIDED',409);if(!['approved','rejected'].includes(input.decision))throw fail('INVALID_DECISION');
  put('officeApprovals',{...approval,status:input.decision,decidedBy:'owner',decidedAt:now});result.id=approval.id;result.decision=input.decision;
 }else if(input.kind==='cycle'){
  const goal=text(input.goal,1500);const historical=runMaksterOfficeCycle({...s,officeCampaigns:s.officeCampaigns.filter(owned),officeApprovals:s.officeApprovals.filter(owned),officeLeads:[]},{goal,market:'CZ',currency:'EUR',monthlyBudgetMinor:0,createdBy:'owner'});
  historical.cycle.id=smmId(id+':cycle');historical.cycle.status='completed';historical.cycle.smm=tag('marketing_cycle',{mode:'MOCK_TEMPLATE',goal,externalExecution:'OFF',cost:0});put('officeCycles',historical.cycle);
  const activeNotes=s.officeContent.filter(x=>owned(x)&&['research','audience','idea'].includes(x.smm.kind));
  for(const [i,r]of historical.runs.entries())put('officeAgentRuns',{...r,id:smmId(id+':run:'+i),cycleId:historical.cycle.id,startedAt:now,completedAt:now,smm:tag('marketing_run',{mode:'MOCK_TEMPLATE',cost:0,goal,sourceNoteIds:activeNotes.map(n=>n.id)}),output:{...r.output,ownerGoal:goal,sourceNotes:activeNotes.map(n=>({id:n.id,title:n.title,body:n.body,sourceUrl:n.smm.sourceUrl})),limitations:'Шаблон исторического модуля; LLM, автоматический поиск и внешние действия не выполнялись.'}});
  result.id=historical.cycle.id;result.agentRuns=historical.runs.length;
  const m=await this.read(base);put('officeOwnerBriefs',{id:smmId(id+':brief'),cycleId:historical.cycle.id,...m.brief,smm:tag('marketing_brief')});
 }else if(input.kind==='brief'){
  const m=await this.read(base);const b={id:smmId(id+':brief'),...m.brief,smm:tag('marketing_brief')};put('officeOwnerBriefs',b);result.id=b.id;
 }else throw fail('MARKETING_ACTION_DISABLED',404);
 put('growthAuditLog',{id:randomUUID(),category:'marketing',action:'marketing.'+input.kind+(input.kind==='decision'?'.'+input.decision:''),entityId:result.id,actor:'owner',createdAt:now,status:'info',detail:'Сохранено в Office. Внешние действия OFF. AI-затраты $0.',smm:tag('audit')});
 put('officeContent',{id,title:'Operation receipt',createdAt:now,updatedAt:now,smm:tag('marketing_receipt',{digest,result})});await this.store.applySmmRecords(records);return{ok:true,...result};
 }
}
