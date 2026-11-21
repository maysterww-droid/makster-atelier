
import type { JobControlState, JobMilestone, JobStage, ProjectModelV1 } from '../../project-model/src/types.js';
import { analyzeProductionReadiness } from './production-readiness.js';
import { buildInstallationCloseoutReport } from './installation-closeout.js';
import type { EngineeringCompileResult } from './types.js';
import { currentDesignApprovalStatus } from './client-portal.js';

const ORDER:JobStage[]=['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'];
function uuid():string{return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16),v=c==='x'?r:(r&3)|8;return v.toString(16)})}
function money(job:JobControlState){return job.money;}

export interface JobControlReport {
  version:'3.0.0';
  projectId:string;
  revision:number;
  stage:JobStage;
  stageIndex:number;
  progressPercent:number;
  nextAction:string;
  blockers:string[];
  warnings:string[];
  commercial:{
    contractValueMinor:number;
    receivedMinor:number;
    outstandingMinor:number;
    committedPurchaseMinor:number;
    actualCostMinor:number;
    estimatedMarginMinor:number;
    receivedPercent:number;
  };
  milestones:JobMilestone[];
}

function ensureJob(project:ProjectModelV1):JobControlState{
  return project.jobControl??{
    stage:'lead',client:{},money:{currency:project.currency},milestones:[],updatedAt:new Date().toISOString()
  };
}

export function buildJobControlReport(project:ProjectModelV1,engineering?:EngineeringCompileResult|null):JobControlReport{
  const job=ensureJob(project), blockers:string[]=[], warnings:string[]=[];
  const m=money(job);
  const contract=m.contractValueMinor??0,received=m.receivedMinor??0,committed=m.committedPurchaseMinor??0,actual=m.actualCostMinor??0;
  const outstanding=Math.max(0,contract-received);
  const receivedPercent=contract>0?Math.round(received/contract*100):0;
  const stageIndex=Math.max(0,ORDER.indexOf(job.stage));

  const requiresClient=['client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].includes(job.stage);
  if(requiresClient&&!job.client.name)blockers.push('Client name is missing.');
  const designApprovalStatus=currentDesignApprovalStatus(project);
  const requiresDesignApproval=['contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].includes(job.stage);
  if(requiresDesignApproval&&designApprovalStatus==='missing')blockers.push('Client design approval is missing.');
  if(requiresDesignApproval&&designApprovalStatus==='stale')blockers.push('Project design changed after client approval. New approval is required.');
  if(requiresDesignApproval&&designApprovalStatus==='legacy')blockers.push('Legacy client design approval has no technical fingerprint. Re-approval is required.');
  const pendingClientApprovals=(project.clientApprovals??[]).filter(x=>x.status==='pending').length;
  if(pendingClientApprovals>0)warnings.push(`${pendingClientApprovals} client approval request(s) are still pending.`);
  if(['contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].includes(job.stage)&&contract<=0)
    blockers.push('Contract value is not recorded.');
  if(['purchasing','production','delivery','installation','handover','final_payment','warranty','closed'].includes(job.stage)&&received<=0)
    blockers.push('No payment/deposit is recorded.');

  if(engineering && ['production','delivery','installation','handover','final_payment','warranty','closed'].includes(job.stage)){
    const readiness=analyzeProductionReadiness(project,engineering);
    if(!readiness.productionReady)blockers.push(`Technical Production Readiness is ${readiness.status}.`);
    if(!readiness.cncReady)warnings.push('CNC readiness is still HOLD.');
  }

  if(['handover','final_payment','warranty','closed'].includes(job.stage)){
    const closeout=buildInstallationCloseoutReport(project);
    if(closeout.status!=='SIGNED')blockers.push(`Installation handover is ${closeout.status}.`);
  }
  if(['warranty','closed'].includes(job.stage)&&outstanding>0)blockers.push(`Outstanding client balance remains: ${outstanding} minor units.`);

  let nextAction='Continue current job stage.';
  if(blockers.length)nextAction=blockers[0]!;
  else {
    const map:Partial<Record<JobStage,string>>={
      lead:'Schedule measurement / qualify the lead.',
      measurement:'Complete room measurements.',
      design:'Finish design and engineering review.',
      client_approval:'Capture client approval.',
      contract:'Issue/sign contract.',
      deposit:'Record deposit payment.',
      purchasing:'Place approved supplier/material orders.',
      production:'Release the approved Revision to production.',
      delivery:'Plan delivery to site.',
      installation:'Execute Installer Mode tasks.',
      handover:'Close punch list and sign handover.',
      final_payment:'Collect remaining balance.',
      warranty:'Enter warranty/service period.',
      closed:'Job is closed.'
    };
    nextAction=map[job.stage]??nextAction;
  }

  return {
    version:'3.0.0',projectId:project.projectId,revision:project.revision,stage:job.stage,stageIndex,
    progressPercent:Math.round(stageIndex/(ORDER.length-1)*100),nextAction,blockers,warnings,
    commercial:{
      contractValueMinor:contract,receivedMinor:received,outstandingMinor:outstanding,
      committedPurchaseMinor:committed,actualCostMinor:actual,
      estimatedMarginMinor:contract-(actual>0?actual:committed),receivedPercent
    },
    milestones:job.milestones
  };
}

export function updateJobControl(project:ProjectModelV1,input:{
  stage?:JobStage;client?:Partial<JobControlState['client']>;money?:Partial<JobControlState['money']>;
  targetDeliveryAt?:string|null;targetInstallationAt?:string|null
}){
  const snapshot=structuredClone(project);
  const current=ensureJob(snapshot);
  snapshot.jobControl={
    ...current,
    ...(input.stage?{stage:input.stage}:{}),
    client:{...current.client,...(input.client??{})},
    money:{...current.money,...(input.money??{}),currency:current.money.currency||project.currency},
    ...(input.targetDeliveryAt===null?{targetDeliveryAt:undefined}:input.targetDeliveryAt?{targetDeliveryAt:input.targetDeliveryAt}:{}),
    ...(input.targetInstallationAt===null?{targetInstallationAt:undefined}:input.targetInstallationAt?{targetInstallationAt:input.targetInstallationAt}:{}),
    updatedAt:new Date().toISOString()
  };
  snapshot.revision=project.revision+1;
  return snapshot;
}

export function setJobMilestone(project:ProjectModelV1,input:{code:string;title:string;status:JobMilestone['status'];note?:string;dueAt?:string}){
  const snapshot=structuredClone(project),job=ensureJob(snapshot);snapshot.jobControl={...job,milestones:[...job.milestones],updatedAt:new Date().toISOString()};
  let m=snapshot.jobControl.milestones.find(x=>x.code===input.code);
  if(!m){
    m={id:uuid(),code:input.code,title:input.title,status:input.status};
    snapshot.jobControl.milestones.push(m);
  }
  m.title=input.title;m.status=input.status;
  if(input.note!=null)m.note=input.note;
  if(input.dueAt)m.dueAt=input.dueAt;
  if(input.status==='done'&&!m.completedAt)m.completedAt=new Date().toISOString();
  if(input.status!=='done')delete m.completedAt;
  snapshot.revision=project.revision+1;
  return snapshot;
}
