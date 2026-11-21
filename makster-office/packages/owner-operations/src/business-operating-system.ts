
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import { buildProjectLifecycleReleaseGate } from '../../engineering-engine/src/lifecycle-release-gate.js';
import { buildInstallationCloseoutReport } from '../../engineering-engine/src/installation-closeout.js';
import { buildCostingReport } from '../../engineering-engine/src/costing.js';
import type { OwnerOperationsState } from './types.js';
import { buildOwnerCommandCenter } from './owner-command-center.js';
import { buildOperationsControlTower } from './operations-control-tower.js';
import { buildProcurementAutomationCenter } from './material-procurement-automation.js';
import { buildOwnerFinanceReport } from './owner-finance-intelligence.js';
import { buildPredictiveOwnerControl } from './predictive-owner-control.js';

export type BusinessTruthSeverity='critical'|'high'|'medium'|'low';
export interface BusinessTruthIssue{
  code:string;
  severity:BusinessTruthSeverity;
  projectId?:string;
  message:string;
  evidence?:Record<string,unknown>;
}
export interface BusinessProjectState{
  projectId:string;
  title:string;
  client:string;
  stage:string;
  revision:number;
  lifecycleState:string;
  lifecycleStatus:'GREEN'|'AMBER'|'RED';
  currentOperation:string|null;
  productionStatus:string;
  productionDelayDays:number;
  procurementShortages:number;
  openMaterialRfqs:number;
  contractValueMinor:number;
  receivedMinor:number;
  outstandingMinor:number;
  forecastCostMinor:number;
  actualCostMinor:number;
  forecastProfitMinor:number;
  forecastMarginPercent:number;
  closeReady:boolean;
  closeBlockers:string[];
  nextAction:string;
  truthIssues:number;
}
export interface BusinessOperatingSystemReport{
  version:'5.0.0';
  generatedAt:string;
  currency:string;
  healthScore:number;
  health:'green'|'amber'|'red';
  sourceOfTruth:{
    projectStage:'ProjectModel.jobControl.stage';
    technicalRevision:'ProjectModel.revision';
    productionExecution:'OwnerOperations.productionOperations';
    procurement:'ProjectModel.purchaseOrders + OwnerOperations.materialRfqs/procurementAwards';
    projectEconomics:'Engineering Costing';
    managementPnl:'Owner Finance Ledger + Project/Cash data';
    treasury:'OwnerOperations.treasuryBalances + cashEvents';
  };
  summary:{
    totalProjects:number;
    activeProjects:number;
    closedProjects:number;
    redLifecycleProjects:number;
    productionBlockedProjects:number;
    procurementBlockedProjects:number;
    financiallyUnpaidProjects:number;
    closeReadyProjects:number;
    truthIssueCount:number;
    criticalTruthIssues:number;
  };
  company:{
    contractBacklogMinor:number;
    outstandingClientMinor:number;
    forecastProfitMinor:number;
    treasuryMinor:number;
    accountsPayableMinor:number;
    accountsReceivableMinor:number;
    operatingProfitForecastMinor:number;
    runwayMonths:number|null;
    breakEvenGapMinor:number;
  };
  projects:BusinessProjectState[];
  truthIssues:BusinessTruthIssue[];
  nextOwnerActions:Array<{priority:number;severity:BusinessTruthSeverity;projectId?:string;title:string;reason:string}>;
}

const severityWeight=(s:BusinessTruthSeverity)=>s==='critical'?25:s==='high'?15:s==='medium'?8:3;
const stageIndex=(s:string)=>['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].indexOf(s);

export function buildBusinessOperatingSystem(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  allProjects:ProjectModelV1[],
  state:OwnerOperationsState,
  currency='EUR',
  month=new Date().toISOString().slice(0,7),
  now=new Date()
):BusinessOperatingSystemReport{
  const activeRows=rows.filter(x=>x.project.jobControl?.stage!=='closed');
  const owner=buildOwnerCommandCenter(activeRows.map(x=>x.project),state,currency);
  const tower=buildOperationsControlTower(activeRows,state,now);
  const procurement=buildProcurementAutomationCenter(activeRows,state,now);
  const finance=buildOwnerFinanceReport(allProjects,state,currency,month,now);
  const predictive=buildPredictiveOwnerControl(activeRows,state,currency,now);
  const truthIssues:BusinessTruthIssue[]=[];
  const projects:BusinessProjectState[]=[];

  const allById=new Map(allProjects.map(p=>[p.projectId,p]));
  for(const p of allProjects){
    const engRow=rows.find(x=>x.project.projectId===p.projectId);
    const eng=engRow?.engineering;
    const lifecycle=eng?buildProjectLifecycleReleaseGate(p,eng):null;
    const closeout=buildInstallationCloseoutReport(p);
    const costing=buildCostingReport(p);
    const ops=tower.projects.find(x=>x.projectId===p.projectId);
    const pOps=state.productionOperations.filter(x=>x.projectId===p.projectId);
    const shortages=procurement.shortages.filter(x=>x.projectId===p.projectId);
    const openRfqs=state.materialRfqs.filter(x=>x.projectId===p.projectId&&!['awarded','closed'].includes(x.status));
    const contract=p.jobControl?.money.contractValueMinor??0,received=p.jobControl?.money.receivedMinor??0;
    const outstanding=Math.max(0,contract-received);
    const stage=p.jobControl?.stage??'lead';
    const blockers:string[]=[];

    if(stageIndex(stage)>=stageIndex('production')&&stage!=='closed'&&!eng){
      truthIssues.push({code:'PRODUCTION_WITHOUT_ENGINEERING',severity:'critical',projectId:p.projectId,message:`${p.title}: production/later stage has no compiled engineering context.`});
    }
    if(stage==='closed'&&outstanding>0){
      truthIssues.push({code:'CLOSED_WITH_CLIENT_BALANCE',severity:'critical',projectId:p.projectId,message:`${p.title}: CLOSED but client still owes ${outstanding} minor units.`,evidence:{contract,received,outstanding}});
    }
    const unfinishedOps=pOps.filter(x=>!['completed','skipped'].includes(x.status));
    const productionExecutionMissing=p.furniture.length>0&&pOps.length===0&&stageIndex(stage)>=stageIndex('production');
    if(stage==='closed'&&productionExecutionMissing){
      truthIssues.push({code:'CLOSED_WITHOUT_PRODUCTION_HISTORY',severity:'critical',projectId:p.projectId,message:`${p.title}: CLOSED furniture project has no production execution history.`});
    }
    if(stage==='closed'&&unfinishedOps.length){
      truthIssues.push({code:'CLOSED_WITH_OPEN_PRODUCTION',severity:'critical',projectId:p.projectId,message:`${p.title}: CLOSED with ${unfinishedOps.length} unfinished production operation(s).`});
    }
    if(stage==='closed'&&openRfqs.length){
      truthIssues.push({code:'CLOSED_WITH_OPEN_RFQ',severity:'high',projectId:p.projectId,message:`${p.title}: CLOSED with ${openRfqs.length} open material RFQ(s).`});
    }
    if(stageIndex(stage)>=stageIndex('handover')&&closeout.status!=='SIGNED'){
      truthIssues.push({code:'HANDOVER_STAGE_WITHOUT_SIGNATURE',severity:'high',projectId:p.projectId,message:`${p.title}: stage ${stage} but installation handover is not signed.`});
    }
    if(stageIndex(stage)>=stageIndex('installation')&&pOps.length&&pOps.find(x=>x.centerKind==='installation')?.status==='planned'){
      truthIssues.push({code:'INSTALLATION_STAGE_OPERATION_NOT_READY',severity:'medium',projectId:p.projectId,message:`${p.title}: Job stage is installation/later but installation operation is still PLANNED.`});
    }
    const projectCash=state.cashEvents.filter(x=>x.projectId===p.projectId&&x.type==='inflow'&&x.category==='client_payment'&&x.status==='received').reduce((s,x)=>s+x.amountMinor,0);
    if(projectCash>received){
      truthIssues.push({code:'CASH_RECEIPTS_EXCEED_PROJECT_RECEIVED',severity:'high',projectId:p.projectId,message:`${p.title}: received cash events exceed ProjectModel received amount.`,evidence:{cashEventsReceivedMinor:projectCash,projectReceivedMinor:received}});
    }
    if(costing.actualMarginMinor<0&&stage==='closed'){
      truthIssues.push({code:'CLOSED_NEGATIVE_MARGIN',severity:'medium',projectId:p.projectId,message:`${p.title}: closed with negative actual project margin ${costing.actualMarginMinor}.`});
    }

    if(closeout.status!=='SIGNED')blockers.push('Installation handover must be signed.');
    if(outstanding>0)blockers.push(`Final client balance ${outstanding} minor units remains.`);
    if(productionExecutionMissing)blockers.push('Production execution history is missing.');
    if(unfinishedOps.length)blockers.push(`${unfinishedOps.length} production operation(s) are unfinished.`);
    if(openRfqs.length)blockers.push(`${openRfqs.length} material RFQ(s) are still open.`);
    const openOrders=(p.purchaseOrders??[]).filter(x=>!['received','cancelled'].includes(x.status));
    if(openOrders.length)blockers.push(`${openOrders.length} purchase order(s) are not fully received/cancelled.`);
    const openPunch=(p.installationPunchItems??[]).filter(x=>x.status!=='closed').length;
    if(openPunch)blockers.push(`${openPunch} punch-list item(s) remain open.`);
    const openSite=(p.installationSiteIssues??[]).filter(x=>x.status==='open').length;
    if(openSite)blockers.push(`${openSite} installation site issue(s) remain open.`);

    const projectIssues=truthIssues.filter(x=>x.projectId===p.projectId);
    const closeReady=blockers.length===0&&stage!=='closed';
    let nextAction=lifecycle?.nextCriticalAction??'Compile engineering / continue project setup.';
    if(closeReady)nextAction='Project is operationally and financially ready to close.';
    else if(stage==='closed')nextAction=projectIssues.length?'Resolve cross-system truth inconsistencies.':'Project closed consistently.';
    else if(blockers.length&&stageIndex(stage)>=stageIndex('handover'))nextAction=blockers[0];

    projects.push({
      projectId:p.projectId,title:p.title,client:p.jobControl?.client.name??'',stage,revision:p.revision,
      lifecycleState:lifecycle?.releaseState??'DRAFT',lifecycleStatus:lifecycle?.overallStatus??'RED',
      currentOperation:ops?.currentOperation??null,productionStatus:ops?.currentStatus??(pOps.length?'planned':'not_scheduled'),
      productionDelayDays:ops?.executionDelayDays??0,procurementShortages:shortages.length,openMaterialRfqs:openRfqs.length,
      contractValueMinor:contract,receivedMinor:received,outstandingMinor:outstanding,
      forecastCostMinor:costing.totalEstimateMinor,actualCostMinor:costing.totalActualMinor,
      forecastProfitMinor:costing.forecastMarginMinor,forecastMarginPercent:costing.forecastMarginPercent,
      closeReady,closeBlockers:blockers,nextAction,truthIssues:projectIssues.length
    });
  }

  // Orphan owner-operation records must never silently survive their project.
  for(const op of state.productionOperations)if(!allById.has(op.projectId)){
    truthIssues.push({code:'ORPHAN_PRODUCTION_OPERATION',severity:'high',message:`Production operation ${op.id} points to missing project ${op.projectId}.`});
  }
  for(const r of state.materialRfqs)if(!allById.has(r.projectId)){
    truthIssues.push({code:'ORPHAN_MATERIAL_RFQ',severity:'high',message:`Material RFQ ${r.id} points to missing project ${r.projectId}.`});
  }
  for(const e of state.cashEvents.filter(x=>x.projectId))if(!allById.has(e.projectId!)){
    truthIssues.push({code:'ORPHAN_CASH_EVENT',severity:'high',message:`Cash event ${e.id} points to missing project ${e.projectId}.`});
  }

  const issuePenalty=Math.min(70,truthIssues.reduce((s,x)=>s+severityWeight(x.severity),0));
  const redLifecycle=projects.filter(x=>x.lifecycleStatus==='RED'&&x.stage!=='closed').length;
  const blocked=tower.summary.blockedProjects;
  const cashPenalty=finance.liquidity.runwayStatus==='critical'?20:finance.liquidity.runwayStatus==='watch'?8:0;
  const operatingPenalty=finance.pnl.operatingProfitForecastMinor<0?15:0;
  const healthScore=Math.max(0,100-issuePenalty-Math.min(20,redLifecycle*4)-Math.min(15,blocked*5)-cashPenalty-operatingPenalty);
  const health=healthScore>=80?'green':healthScore>=55?'amber':'red';

  const nextOwnerActions:Array<{priority:number;severity:BusinessTruthSeverity;projectId?:string;title:string;reason:string}>=[];
  for(const x of truthIssues.filter(x=>x.severity==='critical'||x.severity==='high'))nextOwnerActions.push({priority:x.severity==='critical'?1:2,severity:x.severity,projectId:x.projectId,title:x.code,reason:x.message});
  for(const a of predictive.actions.slice(0,12))nextOwnerActions.push({priority:a.severity==='critical'?1:a.severity==='high'?2:3,severity:a.severity,projectId:a.projectId,title:a.title,reason:a.recommendedAction});
  for(const p of projects.filter(x=>x.closeReady))nextOwnerActions.push({priority:3,severity:'low',projectId:p.projectId,title:`Close project · ${p.title}`,reason:'All 5.0 close gates are satisfied.'});
  nextOwnerActions.sort((a,b)=>a.priority-b.priority);

  return {
    version:'5.0.0',generatedAt:new Date().toISOString(),currency,healthScore,health,
    sourceOfTruth:{
      projectStage:'ProjectModel.jobControl.stage',technicalRevision:'ProjectModel.revision',
      productionExecution:'OwnerOperations.productionOperations',
      procurement:'ProjectModel.purchaseOrders + OwnerOperations.materialRfqs/procurementAwards',
      projectEconomics:'Engineering Costing',managementPnl:'Owner Finance Ledger + Project/Cash data',
      treasury:'OwnerOperations.treasuryBalances + cashEvents'
    },
    summary:{
      totalProjects:projects.length,activeProjects:projects.filter(x=>x.stage!=='closed').length,closedProjects:projects.filter(x=>x.stage==='closed').length,
      redLifecycleProjects:redLifecycle,productionBlockedProjects:tower.summary.blockedProjects,
      procurementBlockedProjects:new Set(procurement.shortages.map(x=>x.projectId)).size,
      financiallyUnpaidProjects:projects.filter(x=>x.outstandingMinor>0).length,
      closeReadyProjects:projects.filter(x=>x.closeReady).length,truthIssueCount:truthIssues.length,
      criticalTruthIssues:truthIssues.filter(x=>x.severity==='critical').length
    },
    company:{
      contractBacklogMinor:finance.backlog.contractedMinor,outstandingClientMinor:finance.backlog.outstandingMinor,
      forecastProfitMinor:finance.backlog.forecastProfitMinor,treasuryMinor:finance.liquidity.treasuryMinor,
      accountsPayableMinor:finance.workingCapital.accountsPayableMinor,accountsReceivableMinor:finance.workingCapital.accountsReceivableMinor,
      operatingProfitForecastMinor:finance.pnl.operatingProfitForecastMinor,runwayMonths:finance.liquidity.runwayMonths,
      breakEvenGapMinor:finance.breakEven.revenueGapMinor
    },
    projects:projects.sort((a,b)=>{
      const issue=b.truthIssues-a.truthIssues;if(issue)return issue;
      const close=Number(b.closeReady)-Number(a.closeReady);if(close)return close;
      return stageIndex(b.stage)-stageIndex(a.stage);
    }),
    truthIssues,nextOwnerActions:nextOwnerActions.slice(0,30)
  };
}

export function validateBusinessProjectClose(project:ProjectModelV1,state:OwnerOperationsState){
  const blockers:string[]=[];
  const contract=project.jobControl?.money.contractValueMinor??0,received=project.jobControl?.money.receivedMinor??0;
  const outstanding=Math.max(0,contract-received);
  const closeout=buildInstallationCloseoutReport(project);
  if(closeout.status!=='SIGNED')blockers.push('installation_handover_not_signed');
  if(outstanding>0)blockers.push('final_client_balance_outstanding');
  const allOps=state.productionOperations.filter(x=>x.projectId===project.projectId);
  const unfinished=allOps.filter(x=>!['completed','skipped'].includes(x.status));
  if(project.furniture.length>0&&allOps.length===0)blockers.push('production_execution_missing');
  if(unfinished.length)blockers.push('production_operations_unfinished');
  const openRfqs=state.materialRfqs.filter(x=>x.projectId===project.projectId&&!['awarded','closed'].includes(x.status));
  if(openRfqs.length)blockers.push('material_rfqs_open');
  const openOrders=(project.purchaseOrders??[]).filter(x=>!['received','cancelled'].includes(x.status));
  if(openOrders.length)blockers.push('purchase_orders_open');
  const openPunch=(project.installationPunchItems??[]).filter(x=>x.status!=='closed');
  if(openPunch.length)blockers.push('punch_list_open');
  const openSite=(project.installationSiteIssues??[]).filter(x=>x.status==='open');
  if(openSite.length)blockers.push('installation_site_issues_open');
  return {version:'5.0.0',projectId:project.projectId,canClose:blockers.length===0,blockers,evidence:{outstandingMinor:outstanding,unfinishedOperations:unfinished.length,openMaterialRfqs:openRfqs.length,openPurchaseOrders:openOrders.length,openPunchItems:openPunch.length,openSiteIssues:openSite.length,closeoutStatus:closeout.status}};
}
