
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { OwnerOperationsState, ProductionWorkCenter, WorkCenterKind } from './types.js';

export interface ProjectWorkload {
  projectId:string;
  projectTitle:string;
  queuePosition:number;
  hours:Record<WorkCenterKind,number>;
  totalHours:number;
}
export interface CapacityScheduleRow {
  projectId:string;
  projectTitle:string;
  queuePosition:number;
  centerKind:WorkCenterKind;
  centerName:string;
  hours:number;
  startDate:string;
  finishDate:string;
}
export interface ProductionCapacityPlan {
  version:'5.0.0';
  generatedAt:string;
  workload:ProjectWorkload[];
  schedule:CapacityScheduleRow[];
  projectSummary:Array<{
    projectId:string;projectTitle:string;queuePosition:number;totalHours:number;
    productionStart:string;productionFinish:string;installationFinish:string;
    targetInstallationAt?:string;daysBuffer:number|null;risk:'normal'|'tight'|'late';
  }>;
  centerUtilization:Array<{centerKind:WorkCenterKind;centerName:string;scheduledHours:number;dailyCapacityHours:number}>;
}

const kinds:WorkCenterKind[]=['cutting','edging','drilling','assembly','installation'];

export function defaultProductionWorkCenters(now=new Date()):ProductionWorkCenter[]{
  const iso=now.toISOString();
  return [
    {id:'wc-cutting',name:'Cutting',kind:'cutting',dailyCapacityHours:8,active:true,workdays:[1,2,3,4,5],updatedAt:iso},
    {id:'wc-edging',name:'Edging',kind:'edging',dailyCapacityHours:8,active:true,workdays:[1,2,3,4,5],updatedAt:iso},
    {id:'wc-drilling',name:'Drilling',kind:'drilling',dailyCapacityHours:8,active:true,workdays:[1,2,3,4,5],updatedAt:iso},
    {id:'wc-assembly',name:'Assembly',kind:'assembly',dailyCapacityHours:16,active:true,workdays:[1,2,3,4,5],updatedAt:iso},
    {id:'wc-installation',name:'Installation',kind:'installation',dailyCapacityHours:16,active:true,workdays:[1,2,3,4,5],updatedAt:iso},
  ];
}
function round(v:number){return Number(Math.max(0,v).toFixed(2))}
export function estimateProjectWorkload(project:ProjectModelV1,engineering:EngineeringCompileResult,state:OwnerOperationsState,queuePosition:number):ProjectWorkload{
  const partQty=engineering.parts.reduce((s,p)=>s+p.quantity,0);
  const edgedSides=engineering.parts.reduce((s,p)=>s+p.edges.length*p.quantity,0);
  const machining=engineering.machining.length;
  const furniture=engineering.stats.furnitureCount;
  const modules=engineering.stats.moduleCount;
  const base:Record<WorkCenterKind,number>={
    cutting:round(.055*partQty+.35),
    edging:round(.035*edgedSides+.25),
    drilling:round(.035*machining+.25),
    assembly:round(1.45*furniture+.42*modules+.05*partQty),
    installation:round(1.75*furniture+.55*modules)
  };
  for(const k of kinds){
    const samples=(state.productionTimeEntries??[]).filter(x=>x.centerKind===k&&x.plannedHours>0&&x.actualHours>=0);
    const ratios=samples.map(x=>x.actualHours/x.plannedHours).filter(x=>Number.isFinite(x)&&x>=.25&&x<=4);
    if(ratios.length){
      const raw=ratios.reduce((s,x)=>s+x,0)/ratios.length,confidence=Math.min(1,ratios.length/8);
      base[k]=round(base[k]*(1+(raw-1)*confidence));
    }
  }
  for(const o of state.projectCapacityOverrides??[]){
    if(o.projectId===project.projectId)base[o.centerKind]=round(o.hours);
  }
  return {projectId:project.projectId,projectTitle:project.title,queuePosition,hours:base,totalHours:round(kinds.reduce((s,k)=>s+base[k],0))};
}
function dateOnly(d:Date){return d.toISOString().slice(0,10)}
function nextWorkday(date:Date,days:number[]){
  const d=new Date(date);d.setUTCHours(0,0,0,0);
  while(!days.includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);
  return d;
}
function addWorkingHours(start:Date,hours:number,center:ProductionWorkCenter){
  let d=nextWorkday(start,center.workdays),remaining=hours;
  if(remaining<=0)return d;
  while(remaining>center.dailyCapacityHours+1e-9){
    remaining-=center.dailyCapacityHours;d.setUTCDate(d.getUTCDate()+1);d=nextWorkday(d,center.workdays);
  }
  return d;
}
function nextDayStart(date:Date,center:ProductionWorkCenter){
  const d=new Date(date);d.setUTCDate(d.getUTCDate()+1);return nextWorkday(d,center.workdays);
}

export function buildProductionCapacityPlan(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState,
  startAt=new Date()
):ProductionCapacityPlan{
  const defaults=defaultProductionWorkCenters(startAt);
  const custom=state.productionWorkCenters??[];
  const centers=defaults.map(d=>custom.find(x=>x.kind===d.kind)??d).filter(x=>x.active);
  const byKind=new Map(centers.map(x=>[x.kind,x]));
  const workloads=rows.sort((a,b)=>a.queuePosition-b.queuePosition).map(x=>estimateProjectWorkload(x.project,x.engineering,state,x.queuePosition));
  const centerFree=new Map<WorkCenterKind,Date>();
  for(const k of kinds)centerFree.set(k,new Date(startAt));
  const schedule:CapacityScheduleRow[]=[];

  for(const row of rows.sort((a,b)=>a.queuePosition-b.queuePosition)){
    const w=workloads.find(x=>x.projectId===row.project.projectId)!;
    let projectReady=new Date(startAt);
    for(const k of kinds){
      const center=byKind.get(k);if(!center)continue;
      const cf=centerFree.get(k)??new Date(startAt);
      const start=new Date(Math.max(projectReady.getTime(),cf.getTime()));
      const startWork=nextWorkday(start,center.workdays);
      const finish=addWorkingHours(startWork,w.hours[k],center);
      schedule.push({projectId:w.projectId,projectTitle:w.projectTitle,queuePosition:w.queuePosition,centerKind:k,centerName:center.name,hours:w.hours[k],startDate:dateOnly(startWork),finishDate:dateOnly(finish)});
      centerFree.set(k,nextDayStart(finish,center));
      projectReady=nextDayStart(finish,center);
    }
  }

  const projectSummary=workloads.map(w=>{
    const s=schedule.filter(x=>x.projectId===w.projectId);
    const first=s[0]?.startDate??dateOnly(startAt),last=s.at(-1)?.finishDate??first;
    const p=rows.find(x=>x.project.projectId===w.projectId)!.project;
    const target=p.jobControl?.targetInstallationAt;
    const buffer=target?Math.floor((Date.parse(target)-Date.parse(last+'T23:59:59Z'))/86400000):null;
    const risk:'normal'|'tight'|'late'=buffer==null?'normal':buffer<0?'late':buffer<=2?'tight':'normal';
    return {projectId:w.projectId,projectTitle:w.projectTitle,queuePosition:w.queuePosition,totalHours:w.totalHours,productionStart:first,productionFinish:s.find(x=>x.centerKind==='assembly')?.finishDate??last,installationFinish:last,...(target?{targetInstallationAt:target}:{}),daysBuffer:buffer,risk};
  });
  const centerUtilization=centers.map(c=>({centerKind:c.kind,centerName:c.name,scheduledHours:round(schedule.filter(x=>x.centerKind===c.kind).reduce((s,x)=>s+x.hours,0)),dailyCapacityHours:c.dailyCapacityHours}));
  return {version:'5.0.0',generatedAt:new Date().toISOString(),workload:workloads,schedule,projectSummary,centerUtilization};
}
