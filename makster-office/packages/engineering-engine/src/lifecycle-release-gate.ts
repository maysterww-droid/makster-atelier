
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from './types.js';
import { analyzeProductionReadiness } from './production-readiness.js';
import { buildPurchasingReport } from './purchasing.js';
import { buildCostingReport } from './costing.js';
import { buildInstallationCloseoutReport } from './installation-closeout.js';
import { buildJobControlReport } from './job-control.js';
import { currentDesignApprovalStatus } from './client-portal.js';

export type LifecycleGateStatus='pass'|'warning'|'fail'|'not_applicable';

export interface LifecycleGateItem {
  code:string;
  title:string;
  status:LifecycleGateStatus;
  detail:string;
  evidence?:Record<string,unknown>;
}

export interface ProjectLifecycleReleaseGateReport {
  version:'3.5.0';
  projectId:string;
  revision:number;
  releaseState:'DRAFT'|'DESIGN_APPROVED'|'PRODUCTION_READY'|'INSTALLATION_READY'|'HANDOVER_READY'|'CLOSED';
  overallStatus:'GREEN'|'AMBER'|'RED';
  passCount:number;
  warningCount:number;
  failCount:number;
  nextCriticalAction:string;
  gates:LifecycleGateItem[];
}

function gate(code:string,title:string,status:LifecycleGateStatus,detail:string,evidence?:Record<string,unknown>):LifecycleGateItem{
  return {code,title,status,detail,...(evidence?{evidence}:{})};
}

export function buildProjectLifecycleReleaseGate(project:ProjectModelV1,engineering:EngineeringCompileResult):ProjectLifecycleReleaseGateReport{
  const gates:LifecycleGateItem[]=[];
  const readiness=analyzeProductionReadiness(project,engineering);
  const purchasing=buildPurchasingReport(project,engineering);
  const costing=buildCostingReport(project);
  const closeout=buildInstallationCloseoutReport(project);
  const job=buildJobControlReport(project,engineering);
  const design=currentDesignApprovalStatus(project);

  const roomCount=project.site.rooms.length;
  const furnitureCount=project.furniture.length;
  const confirmedRooms=project.site.rooms.filter(r=>
    r.dimensions?.width.state==='confirmed'&&r.dimensions?.depth.state==='confirmed'&&r.dimensions?.height.state==='confirmed'
  ).length;
  gates.push(gate(
    'MEASUREMENT','Measurement completeness',
    roomCount>0&&confirmedRooms===roomCount?'pass':'fail',
    roomCount===0?'No rooms are defined.':confirmedRooms===roomCount?'All room dimensions are confirmed.':`${confirmedRooms}/${roomCount} rooms have confirmed W/D/H.`,
    {roomCount,confirmedRooms}
  ));

  gates.push(gate(
    'DESIGN_APPROVAL','Client design approval',
    design==='approved'?'pass':'fail',
    design==='approved'?'Current technical design fingerprint is client-approved.':
      design==='stale'?'Technical project changed after approval. Re-approval is required.':
      design==='legacy'?'Legacy approval has no technical fingerprint. Re-approval is required.':
      'No valid design approval exists.',
    {designApprovalStatus:design}
  ));

  const contract=project.jobControl?.money.contractValueMinor??0;
  const received=project.jobControl?.money.receivedMinor??0;
  gates.push(gate(
    'COMMERCIAL','Commercial authorization',
    contract>0&&received>0?'pass':'fail',
    contract<=0?'Contract value is missing.':received<=0?'No deposit/payment has been recorded.':'Contract and payment authorization are recorded.',
    {contractValueMinor:contract,receivedMinor:received,outstandingMinor:Math.max(0,contract-received)}
  ));

  gates.push(gate(
    'ENGINEERING','Engineering / Production Readiness',
    readiness.productionReady?'pass':'fail',
    readiness.productionReady?'Production Readiness is RELEASED.':`Production Readiness is ${readiness.status}; ${readiness.blockers.length} blocker(s).`,
    {status:readiness.status,blockers:readiness.blockers.length,warnings:readiness.warnings.length,cncReady:readiness.cncReady}
  ));

  const meaningfulPurchasing=purchasing.requirementCount>0;
  const activeOrders=(project.purchaseOrders??[]).filter(o=>o.status!=='cancelled');
  const unreceivedOrders=activeOrders.filter(o=>o.status!=='received');
  gates.push(gate(
    'PURCHASING','Purchasing completeness',
    !meaningfulPurchasing?'not_applicable':purchasing.unresolvedRequirementCount>0?'fail':activeOrders.length===0?'fail':unreceivedOrders.length===0?'pass':'warning',
    !meaningfulPurchasing?'No purchasing requirements for this revision.':
      purchasing.unresolvedRequirementCount>0?`${purchasing.unresolvedRequirementCount} purchasing requirement(s) remain unresolved.`:
      activeOrders.length===0?'Purchasing requirements exist but no supplier orders were created.':
      unreceivedOrders.length===0?'All active supplier orders are fully received.':
      `${unreceivedOrders.length} supplier order(s) are not fully received.`,
    {requirements:purchasing.requirementCount,unresolved:purchasing.unresolvedRequirementCount,orders:activeOrders.length,openOrders:unreceivedOrders.length}
  ));

  const estimate=costing.totalEstimateMinor,actual=costing.totalActualMinor;
  const marginOk=contract>0&&costing.forecastMarginMinor>=0;
  gates.push(gate(
    'COSTING','Costing / margin control',
    contract<=0?'fail':estimate<=0?'warning':marginOk?'pass':'fail',
    contract<=0?'Contract value missing; margin cannot be controlled.':
      estimate<=0?'No project cost estimate is recorded.':
      marginOk?`Forecast margin ${costing.forecastMarginPercent}% (${costing.forecastMarginMinor} minor units).`:
      `Forecast margin is negative: ${costing.forecastMarginMinor} minor units.`,
    {estimateMinor:estimate,actualMinor:actual,forecastMarginMinor:costing.forecastMarginMinor,forecastMarginPercent:costing.forecastMarginPercent}
  ));

  const installerOpen=(project.installationDecisions??[]).filter(d=>d.kind==='site_task'&&d.status==='approved').length;
  const siteIssues=(project.installationSiteIssues??[]).filter(i=>i.status==='open').length;
  const pendingChanges=(project.installationChangeRequests??[]).filter(c=>c.status==='proposed'||c.status==='approved').length;
  gates.push(gate(
    'INSTALLATION','Installation execution',
    installerOpen===0&&siteIssues===0&&pendingChanges===0?'pass':'fail',
    installerOpen===0&&siteIssues===0&&pendingChanges===0?'No unresolved installation execution items.':
      `${installerOpen} open site task(s), ${siteIssues} open issue(s), ${pendingChanges} pending site change(s).`,
    {openSiteTasks:installerOpen,openSiteIssues:siteIssues,pendingSiteChanges:pendingChanges}
  ));

  gates.push(gate(
    'HANDOVER','Installation closeout / handover',
    closeout.status==='SIGNED'?'pass':closeout.status==='READY_TO_SIGN'?'warning':'fail',
    closeout.status==='SIGNED'?'Installation handover is signed.':
      closeout.status==='READY_TO_SIGN'?'Installation is ready for client handover signature.':
      `Closeout is NOT_READY; ${closeout.blockers.length} blocker(s).`,
    {closeoutStatus:closeout.status,openPunchCount:closeout.openPunchCount}
  ));

  const outstanding=Math.max(0,contract-received);
  gates.push(gate(
    'FINANCIAL_CLOSE','Final payment',
    contract<=0?'fail':outstanding===0?'pass':'warning',
    contract<=0?'Contract value is missing.':outstanding===0?'Client balance is fully paid.':`Outstanding client balance: ${outstanding} minor units.`,
    {contractValueMinor:contract,receivedMinor:received,outstandingMinor:outstanding}
  ));

  gates.push(gate(
    'JOB_LIFECYCLE','Job lifecycle',
    project.jobControl?.stage==='closed'?'pass':job.blockers.length?'fail':'warning',
    project.jobControl?.stage==='closed'?'Job Control stage is CLOSED.':job.blockers.length?`${job.blockers.length} Job Control blocker(s): ${job.blockers[0]}`:`Current stage: ${project.jobControl?.stage??'lead'}.`,
    {stage:project.jobControl?.stage??'lead',jobBlockers:job.blockers.length,jobWarnings:job.warnings.length}
  ));

  const failCount=gates.filter(x=>x.status==='fail').length;
  const warningCount=gates.filter(x=>x.status==='warning').length;
  const passCount=gates.filter(x=>x.status==='pass').length;

  let releaseState:ProjectLifecycleReleaseGateReport['releaseState']='DRAFT';
  if(design==='approved')releaseState='DESIGN_APPROVED';
  if(readiness.productionReady&&design==='approved'&&contract>0&&received>0)releaseState='PRODUCTION_READY';
  if(releaseState==='PRODUCTION_READY'&&unreceivedOrders.length===0&&purchasing.unresolvedRequirementCount===0)releaseState='INSTALLATION_READY';
  if(closeout.status==='READY_TO_SIGN'||closeout.status==='SIGNED')releaseState='HANDOVER_READY';
  if(closeout.status==='SIGNED'&&outstanding===0&&project.jobControl?.stage==='closed')releaseState='CLOSED';

  const overallStatus=failCount>0?'RED':warningCount>0?'AMBER':'GREEN';
  const firstFail=gates.find(x=>x.status==='fail');
  const firstWarn=gates.find(x=>x.status==='warning');
  const nextCriticalAction=firstFail?.detail??firstWarn?.detail??'Project lifecycle is fully green.';

  return {
    version:'3.5.0',projectId:project.projectId,revision:project.revision,
    releaseState,overallStatus,passCount,warningCount,failCount,nextCriticalAction,gates
  };
}
