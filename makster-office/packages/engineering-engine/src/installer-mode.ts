
import type { InstallationSiteIssue, ProjectModelV1 } from '../../project-model/src/types.js';
import { analyzeInstallationCollisions } from './installation-collision-check.js';
import { analyzeRoomMeasurementCompleteness } from './room-measurement-completeness.js';

export interface InstallerTaskView {
  id: string;
  source: 'site_task' | 'site_issue' | 'measurement' | 'collision';
  status: 'open' | 'done' | 'blocked' | 'review';
  title: string;
  detail: string;
  targetFurnitureId?: string;
  targetModuleId?: string;
}

export interface InstallerModeReport {
  version:'2.9.1';
  projectId:string;
  revision:number;
  status:'READY_FOR_INSTALL'|'INSTALL_IN_PROGRESS'|'BLOCKED';
  openTaskCount:number;
  completedTaskCount:number;
  openIssueCount:number;
  blockingIssueCount:number;
  tasks:InstallerTaskView[];
}

export function buildInstallerModeReport(project:ProjectModelV1):InstallerModeReport{
  const tasks:InstallerTaskView[]=[];
  for(const d of project.installationDecisions??[]){
    if(d.kind!=='site_task'||d.status==='cancelled')continue;
    tasks.push({
      id:d.id,source:'site_task',status:d.status==='completed'?'done':'open',title:d.title,detail:d.detail,
      ...(d.targetFurnitureId?{targetFurnitureId:d.targetFurnitureId}:{}),
      ...(d.targetModuleId?{targetModuleId:d.targetModuleId}:{})
    });
  }
  for(const i of project.installationSiteIssues??[]){
    if(i.status==='cancelled')continue;
    tasks.push({
      id:i.id,source:'site_issue',
      status:i.status==='resolved'?'done':i.severity==='blocking'?'blocked':'review',
      title:i.title,detail:i.detail,
      ...(i.targetFurnitureId?{targetFurnitureId:i.targetFurnitureId}:{}),
      ...(i.targetModuleId?{targetModuleId:i.targetModuleId}:{})
    });
  }

  const measurement=analyzeRoomMeasurementCompleteness(project);
  for(const i of measurement.items.filter(x=>x.status==='missing')){
    tasks.push({id:`measurement:${i.id}`,source:'measurement',status:'blocked',title:i.title,detail:i.detail});
  }

  const collisions=analyzeInstallationCollisions(project);
  for(const i of collisions.items.filter(x=>x.severity==='blocking')){
    tasks.push({
      id:`collision:${i.id}`,source:'collision',status:'blocked',title:i.title,detail:i.detail,
      ...(i.furnitureId?{targetFurnitureId:i.furnitureId}:{}),
      ...(i.moduleId?{targetModuleId:i.moduleId}:{})
    });
  }

  for(const c of project.installationChangeRequests??[]){
    if(c.status==='rejected'||c.status==='applied')continue;
    tasks.push({
      id:c.id,source:'site_issue',status:c.status==='proposed'?'review':'open',
      title:`Site change: ${c.title}`,
      detail:`${c.reason} · ${c.status==='proposed'?'Ожидает утверждения конструктора.':'Утверждено, ожидает применения.'}`,
      ...(c.targetFurnitureId?{targetFurnitureId:c.targetFurnitureId}:{})
    });
  }

  const openTaskCount=tasks.filter(x=>x.source==='site_task'&&x.status==='open').length;
  const completedTaskCount=tasks.filter(x=>x.source==='site_task'&&x.status==='done').length;
  const openIssueCount=(project.installationSiteIssues??[]).filter(x=>x.status==='open').length;
  const blockingIssueCount=(project.installationSiteIssues??[]).filter(x=>x.status==='open'&&x.severity==='blocking').length
    + tasks.filter(x=>(x.source==='measurement'||x.source==='collision')&&x.status==='blocked').length;

  const status=blockingIssueCount>0?'BLOCKED':openTaskCount>0||openIssueCount>0?'INSTALL_IN_PROGRESS':'READY_FOR_INSTALL';
  return {version:'2.9.1',projectId:project.projectId,revision:project.revision,status,openTaskCount,completedTaskCount,openIssueCount,blockingIssueCount,tasks};
}

export interface ReportSiteIssueRequest {
  severity:'info'|'warning'|'blocking';
  title:string;
  detail:string;
  reportedBy:string;
  targetFurnitureId?:string;
  targetModuleId?:string;
}

function uuid():string{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.floor(Math.random()*16),v=c==='x'?r:(r&0x3)|0x8;return v.toString(16);
  });
}

export function reportInstallationSiteIssue(project:ProjectModelV1,req:ReportSiteIssueRequest){
  if(!req.title.trim()||!req.detail.trim())throw new Error('site_issue_title_and_detail_required');
  if(!req.reportedBy.trim())throw new Error('site_issue_reporter_required');
  const snapshot=structuredClone(project);
  snapshot.installationSiteIssues??=[];
  const issue:InstallationSiteIssue={
    id:uuid(),status:'open',severity:req.severity,title:req.title.trim(),detail:req.detail.trim(),
    reportedBy:req.reportedBy.trim(),reportedAt:new Date().toISOString(),sourceRevision:project.revision,
    ...(req.targetFurnitureId?{targetFurnitureId:req.targetFurnitureId}:{}),
    ...(req.targetModuleId?{targetModuleId:req.targetModuleId}:{})
  };
  snapshot.installationSiteIssues.push(issue);
  snapshot.revision=project.revision+1;
  snapshot.notes.push({id:uuid(),authorType:'system',createdAt:new Date().toISOString(),text:`INSTALLATION_SITE_ISSUE_V1:${JSON.stringify(issue)}`});
  return {snapshot,issue};
}

export function resolveInstallationSiteIssue(project:ProjectModelV1,issueId:string,resolvedBy:string){
  if(!resolvedBy.trim())throw new Error('site_issue_resolver_required');
  const snapshot=structuredClone(project);
  const issue=snapshot.installationSiteIssues?.find(x=>x.id===issueId);
  if(!issue)throw new Error('site_issue_not_found');
  if(issue.status==='cancelled')throw new Error('site_issue_cancelled');
  issue.status='resolved';issue.resolvedAt=new Date().toISOString();
  snapshot.revision=project.revision+1;
  snapshot.notes.push({id:uuid(),authorType:'system',createdAt:new Date().toISOString(),text:`INSTALLATION_SITE_ISSUE_RESOLVED_V1:${issue.id}:${resolvedBy.trim()}`});
  return {snapshot,issue};
}
