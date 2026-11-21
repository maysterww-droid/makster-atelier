
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type {
  MaksterBackupManifest,MaksterPermission,MaksterReadinessSnapshot,MaksterRolePolicy,MaksterSystemRole,
  OwnerOperationsState
} from './types.js';

const nowIso=()=>new Date().toISOString();

export const DEFAULT_ROLE_POLICIES:Record<MaksterSystemRole,MaksterPermission[]>={
  owner:['projects.read','projects.write','engineering.write','commercial.write','procurement.write','production.write','installation.write','finance.read','finance.write','marketing.write','approvals.decide','system.admin','backup.export','backup.restore_validate'],
  admin:['projects.read','projects.write','engineering.write','commercial.write','procurement.write','production.write','installation.write','finance.read','finance.write','marketing.write','approvals.decide','system.admin','backup.export','backup.restore_validate'],
  sales:['projects.read','projects.write','commercial.write'],
  designer:['projects.read','projects.write','engineering.write'],
  engineer:['projects.read','projects.write','engineering.write','production.write'],
  procurement:['projects.read','procurement.write'],
  production:['projects.read','production.write'],
  installer:['projects.read','installation.write'],
  finance:['projects.read','finance.read','finance.write'],
  marketing:['projects.read','marketing.write'],
  viewer:['projects.read']
};

export function defaultRolePolicies():MaksterRolePolicy[]{
  const at=nowIso();
  return (Object.keys(DEFAULT_ROLE_POLICIES) as MaksterSystemRole[]).map(role=>({
    id:crypto.randomUUID(),role,permissions:[...DEFAULT_ROLE_POLICIES[role]],updatedAt:at
  }));
}

export function roleCan(role:MaksterSystemRole,permission:MaksterPermission,state?:OwnerOperationsState){
  const custom=state?.rolePolicies.find(x=>x.role===role);
  const permissions=custom?.permissions??DEFAULT_ROLE_POLICIES[role]??[];
  return permissions.includes(permission);
}

export function buildProductionReadiness(input:{
  projects:ProjectModelV1[];
  state:OwnerOperationsState;
  env:{
    nodeEnv?:string;
    hasSupabase:boolean;
    hasSupabaseServiceRole:boolean;
    hasGrowthExecutor:boolean;
    hasGrowthIngestSecret:boolean;
    hasOpenAI:boolean;
    hasPublicBaseUrl:boolean;
  };
  observability:{requests:number;errors:number;p95Ms:number};
}):MaksterReadinessSnapshot{
  const checks:MaksterReadinessSnapshot['checks']=[];
  const push=(id:string,category:any,label:string,status:any,detail:string,critical:boolean)=>checks.push({id,category,label,status,detail,critical});

  push('persistent_db','database','Persistent production database',
    input.env.hasSupabase?'pass':'fail',
    input.env.hasSupabase?'Supabase persistence configured.':'Runtime is using memory/file persistence; production requires persistent shared database.',true);

  push('service_role','security','Server-side database mutation credential',
    input.env.hasSupabaseServiceRole?'pass':'fail',
    input.env.hasSupabaseServiceRole?'Service-role credential is server-side configured.':'SUPABASE_SERVICE_ROLE_KEY not configured.',true);

  push('production_env','operations','Production runtime mode',
    input.env.nodeEnv==='production'?'pass':'warn',
    input.env.nodeEnv==='production'?'NODE_ENV=production.':'NODE_ENV is not production.',false);

  push('public_base_url','operations','Public application base URL',
    input.env.hasPublicBaseUrl?'pass':'warn',
    input.env.hasPublicBaseUrl?'Public base URL configured.':'Public application URL not configured.',false);

  const policies=input.state.rolePolicies.length;
  push('role_policy','auth','Role permission matrix persisted',
    policies>=10?'pass':'fail',
    policies>=10?`${policies} persisted role policies available.`:'Role matrix exists in code but has not been bootstrapped into organization state.',
    true);

  const pilot=input.state.pilotProjects.filter(x=>x.status!=='removed');
  const completedPilot=pilot.filter(x=>x.score===100||x.status==='completed');
  push('real_pilot','pilot','Real project pilot',
    completedPilot.length>=3?'pass':pilot.length>=1?'warn':'fail',
    `${pilot.length} pilot project(s), ${completedPilot.length} fully complete. Target before production: at least 3 complete end-to-end jobs.`,true);

  const manifests=input.state.backupManifests;
  push('backup_export','backup','Application recovery export verified',
    manifests.length>0?'pass':'fail',
    manifests.length?`${manifests.length} recovery export manifest(s) recorded.`:'No verified application recovery export has been generated.',true);

  push('observability','observability','API observability',
    input.observability.requests>0?'pass':'warn',
    `${input.observability.requests} requests observed; ${input.observability.errors} errors; p95 ${input.observability.p95Ms} ms.`,true);

  const openIncidents=input.state.operationalIncidents.filter(x=>x.status!=='resolved'&&(x.severity==='critical'||x.severity==='high'));
  push('critical_incidents','operations','Critical/high incidents closed',
    openIncidents.length===0?'pass':'fail',
    openIncidents.length?`${openIncidents.length} critical/high incident(s) remain open.`:'No open critical/high incidents.',true);

  const activeGrowth=input.state.officeCampaigns.some(x=>x.status==='active');
  push('growth_security','integrations','Growth webhook/provider security',
    !activeGrowth||input.env.hasGrowthIngestSecret?'pass':'warn',
    activeGrowth?(input.env.hasGrowthIngestSecret?'Signed lead-ingestion secret configured.':'Active marketing exists but lead-ingestion HMAC secret is absent.'):'No active external growth campaign requires live ingestion.',false);

  push('provider_executor','integrations','External provider executor',
    input.env.hasGrowthExecutor?'pass':'warn',
    input.env.hasGrowthExecutor?'Growth provider executor configured.':'External advertising execution remains connection-ready only.',false);

  push('ai_provider','integrations','AI provider',
    input.env.hasOpenAI?'pass':'warn',
    input.env.hasOpenAI?'OpenAI provider configured.':'Deterministic fallback only; AI provider key not configured.',false);

  const truthProblems=input.state.growthProviderExecutions.filter(x=>x.status==='failed').length;
  push('failed_provider_actions','operations','Failed provider actions reviewed',
    truthProblems===0?'pass':'warn',
    truthProblems?`${truthProblems} failed provider execution(s) exist.`:'No failed provider executions.',false);

  const criticalFails=checks.filter(x=>x.critical&&x.status==='fail');
  const criticalWarns=checks.filter(x=>x.critical&&x.status==='warn');
  const score=Math.max(0,100-checks.reduce((s,x)=>s+(x.status==='fail'?(x.critical?18:8):x.status==='warn'?(x.critical?8:3):0),0));
  const releaseGateOpen=criticalFails.length===0&&criticalWarns.length===0;
  const status:MaksterReadinessSnapshot['status']=releaseGateOpen&&score>=90?'production_ready'
    :criticalFails.length===0&&score>=75?'release_candidate'
    :pilot.length>0?'pilot_ready':'development';

  return {
    id:crypto.randomUUID(),generatedAt:nowIso(),score,status,releaseGateOpen,
    blockers:criticalFails.map(x=>x.detail),
    warnings:checks.filter(x=>x.status==='warn').map(x=>x.detail),
    checks
  };
}

export function buildApplicationBackupPayload(input:{
  organizationId:string;
  projects:ProjectModelV1[];
  ownerState:OwnerOperationsState;
}){
  const sanitizedState=structuredClone(input.ownerState);
  // This state model intentionally contains opaque connection refs only, never OAuth/provider access tokens.
  const payload={
    format:'makster_application_backup_5_6',
    generatedAt:nowIso(),
    organizationId:input.organizationId,
    projects:input.projects,
    ownerOperations:sanitizedState
  };
  const json=JSON.stringify(payload);
  return {payload,json};
}

export function makeBackupManifest(input:{
  organizationId:string;projectCount:number;ownerStateVersion:string;sha256:string;bytes:number
}):MaksterBackupManifest{
  return {
    id:crypto.randomUUID(),generatedAt:nowIso(),mode:'application_export',organizationId:input.organizationId,
    projectCount:input.projectCount,ownerStateVersion:input.ownerStateVersion,sha256:input.sha256,bytes:input.bytes,
    containsSecrets:false,restorableScope:'projects_and_owner_operations',
    note:'Application-level recovery export. This does not replace managed PostgreSQL point-in-time backup.'
  };
}

export function validateBackupPayload(input:any){
  const errors:string[]=[];
  if(!input||typeof input!=='object')errors.push('backup_payload_not_object');
  if(input?.format!=='makster_application_backup_5_6')errors.push('backup_format_invalid');
  if(!Array.isArray(input?.projects))errors.push('backup_projects_missing');
  if(!input?.ownerOperations||typeof input.ownerOperations!=='object')errors.push('backup_owner_operations_missing');
  return {version:'5.6.0',valid:errors.length===0,errors,projectCount:Array.isArray(input?.projects)?input.projects.length:0,ownerStateVersion:String(input?.ownerOperations?.version??'unknown')};
}
