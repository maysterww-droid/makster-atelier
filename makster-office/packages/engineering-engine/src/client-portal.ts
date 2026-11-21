
import type {
  ClientApprovalKind, ClientApprovalRequest, ClientPortalState, ProjectModelV1
} from '../../project-model/src/types.js';
import { sha256TextPure } from './client-share.js';

function uuid():string{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.floor(Math.random()*16),v=c==='x'?r:(r&3)|8;return v.toString(16)
  })
}

export interface ClientPortalApprovalView {
  id:string;
  kind:ClientApprovalKind;
  title:string;
  description:string;
  status:ClientApprovalRequest['status'];
  requestedAt:string;
  sourceRevision:number;
  clientAmountMinor?:number;
  responseComment?:string;
}

export interface ClientPortalView {
  version:'3.4.0';
  projectId:string;
  revision:number;
  enabled:boolean;
  title:string;
  welcomeText?:string;
  projectStage:string;
  stageProgressPercent:number;
  client:{
    name?:string;
    company?:string;
    objectAddress?:string;
  };
  commercial?:{
    currency:string;
    contractValueMinor?:number;
    receivedMinor?:number;
    outstandingMinor?:number;
  };
  targetDates?:{
    deliveryAt?:string;
    installationAt?:string;
  };
  milestones?:Array<{title:string;status:string;dueAt?:string;completedAt?:string}>;
  approvals:ClientPortalApprovalView[];
  pendingApprovalCount:number;
  /** Intentionally public-safe summary. */
  projectSummary:{
    furnitureCount:number;
    roomCount:number;
    signedHandover:boolean;
  };
}

const STAGES=['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'];

export function projectClientApprovalFingerprint(project:ProjectModelV1):string{
  return sha256TextPure(JSON.stringify({
    schemaVersion:project.schemaVersion,
    projectType:project.projectType,
    site:project.site,
    furniture:project.furniture,
    selections:project.selections,
    constraints:project.constraints
  }));
}


export function buildClientPortalView(project:ProjectModelV1):ClientPortalView{
  const portal=project.clientPortal??{
    enabled:false,showContractValue:true,showPayments:true,showTargetDates:true,showMilestones:true,updatedAt:new Date().toISOString()
  };
  const job=project.jobControl;
  const contract=job?.money.contractValueMinor??0;
  const received=job?.money.receivedMinor??0;
  const stage=job?.stage??'lead';
  const stageIndex=Math.max(0,STAGES.indexOf(stage));
  const approvals=(project.clientApprovals??[]).filter(x=>x.status!=='cancelled').map(x=>({
    id:x.id,kind:x.kind,title:x.title,description:x.description,status:x.status,
    requestedAt:x.requestedAt,sourceRevision:x.sourceRevision,
    ...(x.clientAmountMinor!=null?{clientAmountMinor:x.clientAmountMinor}:{}),
    ...(x.responseComment?{responseComment:x.responseComment}:{})
  }));

  return {
    version:'3.4.0',projectId:project.projectId,revision:project.revision,enabled:portal.enabled,
    title:portal.publicTitle||project.title,
    ...(portal.welcomeText?{welcomeText:portal.welcomeText}:{}),
    projectStage:stage,stageProgressPercent:Math.round(stageIndex/(STAGES.length-1)*100),
    client:{
      ...(job?.client.name?{name:job.client.name}:{}),
      ...(job?.client.company?{company:job.client.company}:{}),
      ...(job?.client.objectAddress?{objectAddress:job.client.objectAddress}:{})
    },
    ...((portal.showContractValue||portal.showPayments)?{
      commercial:{
        currency:job?.money.currency??project.currency,
        ...(portal.showContractValue?{contractValueMinor:contract}:{}),
        ...(portal.showPayments?{receivedMinor:received,outstandingMinor:Math.max(0,contract-received)}:{})
      }
    }:{}),
    ...(portal.showTargetDates?{targetDates:{
      ...(job?.targetDeliveryAt?{deliveryAt:job.targetDeliveryAt}:{}),
      ...(job?.targetInstallationAt?{installationAt:job.targetInstallationAt}:{})
    }}:{}),
    ...(portal.showMilestones?{milestones:(job?.milestones??[]).map(m=>({
      title:m.title,status:m.status,...(m.dueAt?{dueAt:m.dueAt}:{}),...(m.completedAt?{completedAt:m.completedAt}:{})
    }))}:{}),
    approvals,pendingApprovalCount:approvals.filter(x=>x.status==='pending').length,
    projectSummary:{
      furnitureCount:project.furniture.length,
      roomCount:project.site.rooms.length,
      signedHandover:Boolean(project.installationHandover)
    }
  };
}

export function updateClientPortal(project:ProjectModelV1,input:Partial<Omit<ClientPortalState,'updatedAt'>>){
  const snapshot=structuredClone(project);
  const current=snapshot.clientPortal??{
    enabled:false,showContractValue:true,showPayments:true,showTargetDates:true,showMilestones:true,updatedAt:new Date().toISOString()
  };
  snapshot.clientPortal={...current,...input,updatedAt:new Date().toISOString()};
  snapshot.revision=project.revision+1;
  return snapshot;
}

export function createClientApprovalRequest(project:ProjectModelV1,input:{
  kind:ClientApprovalKind;title:string;description:string;requestedBy:string;
  clientAmountMinor?:number;targetIds?:string[]
}){
  if(!input.title.trim()||!input.description.trim())throw new Error('client_approval_title_description_required');
  const snapshot=structuredClone(project);snapshot.clientApprovals??=[];
  const request:ClientApprovalRequest={
    id:uuid(),kind:input.kind,title:input.title.trim(),description:input.description.trim(),
    status:'pending',requestedBy:input.requestedBy.trim()||'designer',requestedAt:new Date().toISOString(),
    sourceRevision:project.revision,contentFingerprint:projectClientApprovalFingerprint(project),
    ...(input.clientAmountMinor!=null?{clientAmountMinor:Math.round(input.clientAmountMinor)}:{}),
    ...(input.targetIds?.length?{targetIds:[...input.targetIds]}:{})
  };
  snapshot.clientApprovals.push(request);
  snapshot.revision=project.revision+1;
  return {snapshot,request};
}

export function respondToClientApproval(project:ProjectModelV1,id:string,input:{
  approved:boolean;respondedBy:string;comment?:string
}){
  const snapshot=structuredClone(project);
  const req=snapshot.clientApprovals?.find(x=>x.id===id);
  if(!req)throw new Error('client_approval_not_found');
  if(req.status!=='pending')throw new Error('client_approval_not_pending');
  req.status=input.approved?'approved':'changes_requested';
  req.respondedBy=input.respondedBy.trim()||'client';
  req.respondedAt=new Date().toISOString();
  req.responseComment=input.comment?.trim()||undefined;
  if(input.approved)req.approvedRevision=req.sourceRevision;
  snapshot.revision=project.revision+1;
  return {snapshot,request:req};
}

export function cancelClientApproval(project:ProjectModelV1,id:string){
  const snapshot=structuredClone(project);
  const req=snapshot.clientApprovals?.find(x=>x.id===id);
  if(!req)throw new Error('client_approval_not_found');
  if(req.status==='approved')throw new Error('approved_client_decision_cannot_be_silently_cancelled');
  req.status='cancelled';
  snapshot.revision=project.revision+1;
  return {snapshot,request:req};
}

export function latestApprovedDesignRevision(project:ProjectModelV1):number|undefined{
  return (project.clientApprovals??[])
    .filter(x=>x.kind==='design'&&x.status==='approved'&&x.approvedRevision!=null)
    .sort((a,b)=>(b.respondedAt??'').localeCompare(a.respondedAt??''))[0]?.approvedRevision;
}

export function currentDesignApprovalStatus(project:ProjectModelV1):'approved'|'missing'|'stale'|'legacy'{
  const latest=(project.clientApprovals??[])
    .filter(x=>x.kind==='design'&&x.status==='approved')
    .sort((a,b)=>(b.respondedAt??'').localeCompare(a.respondedAt??''))[0];
  if(!latest)return 'missing';
  if(!latest.contentFingerprint)return 'legacy';
  return latest.contentFingerprint===projectClientApprovalFingerprint(project)?'approved':'stale';
}
