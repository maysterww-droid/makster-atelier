
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { OwnerOperationsState,ProductionOperation,ProductionOperationStatus,WorkCenterKind } from './types.js';
import { buildProductionCapacityPlan } from './production-capacity.js';

const kindOrder:WorkCenterKind[]=['cutting','edging','drilling','assembly','installation'];
const isoDate=(x:string)=>x.slice(0,10);
const addDays=(d:string,days:number)=>{
  const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10);
};
const daysBetween=(a:string,b:string)=>Math.max(0,Math.ceil((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000));

export function syncProductionOperations(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState,
  now=new Date()
){
  const plan=buildProductionCapacityPlan(rows,state,now);
  const existing=new Map((state.productionOperations??[]).map(x=>[`${x.projectId}:${x.centerKind}`,x]));
  const operations:ProductionOperation[]=[];
  for(const s of plan.schedule){
    const key=`${s.projectId}:${s.centerKind}`;
    const old=existing.get(key);
    const base:ProductionOperation={
      id:old?.id??crypto.randomUUID(),projectId:s.projectId,projectTitle:s.projectTitle,queuePosition:s.queuePosition,
      centerKind:s.centerKind,centerName:s.centerName,sequence:kindOrder.indexOf(s.centerKind)+1,
      status:old?.status??'planned',plannedStart:s.startDate,plannedFinish:s.finishDate,plannedHours:s.hours,
      sourcePlanGeneratedAt:plan.generatedAt,updatedAt:new Date().toISOString()
    };
    operations.push({...base,
      ...(old?.assignee?{assignee:old.assignee}:{}),
      ...(old?.actualStart?{actualStart:old.actualStart}:{}),
      ...(old?.actualFinish?{actualFinish:old.actualFinish}:{}),
      ...(old?.actualHours!=null?{actualHours:old.actualHours}:{}),
      ...(old?.blockedReason?{blockedReason:old.blockedReason}:{}),
      ...(old?.blockedAt?{blockedAt:old.blockedAt}:{})
    });
  }
  // Preserve completed/skipped history for projects that have left active scheduling.
  for(const old of state.productionOperations??[]){
    if(!operations.some(x=>x.id===old.id)&&['completed','skipped'].includes(old.status))operations.push(old);
  }
  // Planned -> ready only if all previous project operations completed/skipped.
  for(const op of operations){
    if(op.status!=='planned')continue;
    const previous=operations.filter(x=>x.projectId===op.projectId&&x.sequence<op.sequence);
    if(previous.every(x=>['completed','skipped'].includes(x.status)))op.status='ready';
  }
  return {plan,operations};
}

export function operationDelayDays(op:ProductionOperation,now=new Date()){
  const today=now.toISOString().slice(0,10);
  if(op.status==='completed'&&op.actualFinish){
    return Math.max(0,daysBetween(op.plannedFinish,isoDate(op.actualFinish)));
  }
  if(op.status==='blocked'){
    const from=op.blockedAt?isoDate(op.blockedAt):op.plannedStart;
    return Math.max(1,daysBetween(from,today)+1);
  }
  if(op.status==='in_progress'&&today>op.plannedFinish)return daysBetween(op.plannedFinish,today);
  if(['planned','ready'].includes(op.status)&&today>op.plannedStart)return daysBetween(op.plannedStart,today);
  return 0;
}

export function buildOperationsControlTower(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState,
  now=new Date()
){
  const synced=syncProductionOperations(rows,state,now);
  const operations=synced.operations;

  // Recalculate an execution-aware schedule. Every operation is constrained by:
  // 1) its original plan,
  // 2) the previous operation of the same project,
  // 3) the previous job on the same shared work center,
  // 4) its own real execution delay/blocker.
  const adjusted=new Map<string,{start:string;finish:string;delayDays:number}>();
  const centerFinish=new Map<WorkCenterKind,string>();
  const projectFinish=new Map<string,string>();
  const activeSorted=operations
    .filter(x=>rows.some(r=>r.project.projectId===x.projectId))
    .slice()
    .sort((a,b)=>a.queuePosition-b.queuePosition||a.sequence-b.sequence);

  for(const op of activeSorted){
    const duration=Math.max(0,daysBetween(op.plannedStart,op.plannedFinish));
    let start=op.plannedStart;
    const prevProject=projectFinish.get(op.projectId);
    const prevCenter=centerFinish.get(op.centerKind);
    if(prevProject&&addDays(prevProject,1)>start)start=addDays(prevProject,1);
    if(prevCenter&&addDays(prevCenter,1)>start)start=addDays(prevCenter,1);

    let finish=addDays(start,duration);
    if(op.status==='completed'&&op.actualFinish){
      const actual=isoDate(op.actualFinish);
      if(actual>finish)finish=actual;
    }else{
      const ownDelay=operationDelayDays(op,now);
      if(ownDelay>0)finish=addDays(finish,ownDelay);
    }

    const delayDays=Math.max(0,daysBetween(op.plannedFinish,finish));
    adjusted.set(op.id,{start,finish,delayDays});
    projectFinish.set(op.projectId,finish);
    centerFinish.set(op.centerKind,finish);
  }

  const projectRows=rows.map(row=>{
    const ops=operations.filter(x=>x.projectId===row.project.projectId).sort((a,b)=>a.sequence-b.sequence);
    const adjustedOps=ops.map(op=>({op,a:adjusted.get(op.id)})).filter(x=>x.a);
    const maxDelay=Math.max(0,...adjustedOps.map(x=>x.a!.delayDays));
    const cap=synced.plan.projectSummary.find(x=>x.projectId===row.project.projectId);
    const install=ops.find(x=>x.centerKind==='installation');
    const recalculatedFinish=install?adjusted.get(install.id)?.finish??cap?.installationFinish??null:cap?.installationFinish??null;
    const target=row.project.jobControl?.targetInstallationAt?.slice(0,10)??null;
    const buffer=target&&recalculatedFinish?Math.floor((Date.parse(target+'T23:59:59Z')-Date.parse(recalculatedFinish+'T23:59:59Z'))/86400000):null;
    const current=ops.find(x=>['in_progress','blocked','ready'].includes(x.status))??ops.find(x=>x.status==='planned')??ops.at(-1);
    const blockers=ops.filter(x=>x.status==='blocked');
    return {
      projectId:row.project.projectId,projectTitle:row.project.title,queuePosition:row.queuePosition,
      currentOperation:current?.centerKind??null,currentStatus:current?.status??'completed',
      completedOperations:ops.filter(x=>x.status==='completed').length,totalOperations:ops.length,
      blockerCount:blockers.length,blockers:blockers.map(x=>x.blockedReason??'Blocked'),
      executionDelayDays:maxDelay,baselineInstallationFinish:cap?.installationFinish??null,
      recalculatedInstallationFinish:recalculatedFinish,targetInstallationAt:target,daysBuffer:buffer,
      risk:buffer==null?(blockers.length?'high':'normal'):buffer<0?'late':buffer<=2?'tight':blockers.length?'high':'normal'
    };
  }).sort((a,b)=>a.queuePosition-b.queuePosition);

  const today=now.toISOString().slice(0,10);
  const tomorrow=addDays(today,1);
  const weekEnd=addDays(today,7);
  const activeOps=operations.filter(x=>!['completed','skipped'].includes(x.status));
  const projectedOperations=activeOps.map(op=>({
    ...op,
    recalculatedStart:adjusted.get(op.id)?.start??op.plannedStart,
    recalculatedFinish:adjusted.get(op.id)?.finish??op.plannedFinish,
    cascadeDelayDays:adjusted.get(op.id)?.delayDays??0
  }));
  const board={
    today:projectedOperations.filter(x=>x.recalculatedStart<=today&&x.recalculatedFinish>=today),
    tomorrow:projectedOperations.filter(x=>x.recalculatedStart<=tomorrow&&x.recalculatedFinish>=tomorrow),
    thisWeek:projectedOperations.filter(x=>x.recalculatedStart<=weekEnd&&x.recalculatedFinish>=today),
    blocked:projectedOperations.filter(x=>x.status==='blocked'),
    inProgress:projectedOperations.filter(x=>x.status==='in_progress'),
    ready:projectedOperations.filter(x=>x.status==='ready')
  };

  return {
    version:'5.0.0',generatedAt:new Date().toISOString(),operations:projectedOperations,projects:projectRows,board,
    summary:{
      activeProjects:projectRows.length,
      lateProjects:projectRows.filter(x=>x.risk==='late').length,
      tightProjects:projectRows.filter(x=>x.risk==='tight').length,
      blockedProjects:projectRows.filter(x=>x.blockerCount>0).length,
      operationsInProgress:board.inProgress.length,
      operationsReady:board.ready.length,
      blockedOperations:board.blocked.length,
      cascadeDelayedOperations:projectedOperations.filter(x=>x.cascadeDelayDays>0).length
    }
  };
}

export function transitionProductionOperation(
  op:ProductionOperation,
  action:'start'|'complete'|'block'|'unblock'|'skip'|'assign',
  input:{assignee?:string;actualHours?:number;reason?:string;at?:string}={}
){
  const at=input.at??new Date().toISOString();
  const next:ProductionOperation={...op,updatedAt:at};
  if(action==='assign'){
    if(!input.assignee?.trim())throw new Error('production_assignee_required');
    next.assignee=input.assignee.trim();
  }else if(action==='start'){
    if(op.status!=='ready')throw new Error('production_operation_not_startable');
    next.status='in_progress';next.actualStart=op.actualStart??at;if(input.assignee)next.assignee=input.assignee;
    delete next.blockedReason;delete next.blockedAt;
  }else if(action==='complete'){
    if(!['in_progress','ready'].includes(op.status))throw new Error('production_operation_not_completable');
    next.status='completed';next.actualStart=op.actualStart??at;next.actualFinish=at;
    if(input.actualHours!=null)next.actualHours=input.actualHours;
    delete next.blockedReason;delete next.blockedAt;
  }else if(action==='block'){
    if(['completed','skipped'].includes(op.status))throw new Error('production_operation_closed');
    if(!input.reason?.trim())throw new Error('production_block_reason_required');
    next.status='blocked';next.blockedReason=input.reason.trim();next.blockedAt=at;
    if(input.assignee)next.assignee=input.assignee;
  }else if(action==='unblock'){
    if(op.status!=='blocked')throw new Error('production_operation_not_blocked');
    next.status=op.actualStart?'in_progress':'ready';delete next.blockedReason;delete next.blockedAt;
  }else if(action==='skip'){
    if(op.status==='completed')throw new Error('production_operation_completed');
    next.status='skipped';next.actualFinish=at;
  }
  return next;
}
