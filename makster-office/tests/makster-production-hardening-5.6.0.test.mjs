
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultRolePolicies,roleCan,buildProductionReadiness,buildApplicationBackupPayload,makeBackupManifest,validateBackupPayload
} from '../dist/packages/owner-operations/src/index.js';

function state(){
 return {version:'5.6.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],officeLeads:[],officeCampaigns:[],officeContent:[],officeApprovals:[],officeAgentRuns:[],officeCycles:[],officeOwnerBriefs:[],growthConnections:[],growthSyncSnapshots:[],officeAutopilotDecisions:[],officeAutopilotRuns:[],growthSpendGuardrails:[],growthProviderExecutions:[],growthAuditLog:[],growthInboundLeadEvents:[],creativeAssets:[],contentDraftSets:[],publishJobs:[],contentPerformance:[],pilotProjects:[],pilotRuns:[],rolePolicies:[],operationalIncidents:[],backupManifests:[],readinessSnapshots:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()}
}
const env=(overrides={})=>({nodeEnv:'production',hasSupabase:true,hasSupabaseServiceRole:true,hasGrowthExecutor:true,hasGrowthIngestSecret:true,hasOpenAI:true,hasPublicBaseUrl:true,...overrides});
const obs={requests:100,errors:0,p95Ms:40};

test('role matrix keeps finance and approvals away from ordinary viewer',()=>{
 const s=state();s.rolePolicies=defaultRolePolicies();
 assert.equal(roleCan('viewer','finance.write',s),false);
 assert.equal(roleCan('finance','finance.write',s),true);
 assert.equal(roleCan('marketing','approvals.decide',s),false);
 assert.equal(roleCan('owner','approvals.decide',s),true);
});

test('release gate remains closed in local/dev conditions',()=>{
 const s=state();s.rolePolicies=defaultRolePolicies();
 const r=buildProductionReadiness({projects:[],state:s,env:env({nodeEnv:'development',hasSupabase:false,hasSupabaseServiceRole:false,hasPublicBaseUrl:false}),observability:{requests:0,errors:0,p95Ms:0}});
 assert.equal(r.releaseGateOpen,false);
 assert.ok(r.blockers.some(x=>x.includes('persistent shared database')));
 assert.ok(r.blockers.some(x=>x.includes('SUPABASE_SERVICE_ROLE_KEY')));
});

test('release gate can open only after roles, backup and three completed pilots',()=>{
 const s=state();s.rolePolicies=defaultRolePolicies();
 s.backupManifests=[{id:'b',generatedAt:'2026-09-07T00:00:00Z',mode:'application_export',organizationId:'o',projectCount:3,ownerStateVersion:'5.6.0',sha256:'a'.repeat(64),bytes:100,containsSecrets:false,restorableScope:'projects_and_owner_operations',note:'x'}];
 for(let i=0;i<3;i++)s.pilotProjects.push({id:'p'+i,projectId:'x'+i,title:'P'+i,startedAt:'2026-09-01T00:00:00Z',status:'completed',checkpoints:{leadLinked:true,commercialReady:true,procurementReady:true,productionTracked:true,installationTracked:true,finalPaymentReady:true,financeTracked:true,contentCandidate:true},blockers:[],score:100,updatedAt:'2026-09-07T00:00:00Z'});
 const r=buildProductionReadiness({projects:[],state:s,env:env(),observability:obs});
 assert.equal(r.releaseGateOpen,true);
 assert.equal(r.status,'production_ready');
 assert.ok(r.score>=90);
});

test('open critical incident closes production release gate',()=>{
 const s=state();s.rolePolicies=defaultRolePolicies();
 s.backupManifests=[{id:'b',generatedAt:'x',mode:'application_export',organizationId:'o',projectCount:3,ownerStateVersion:'5.6.0',sha256:'a'.repeat(64),bytes:100,containsSecrets:false,restorableScope:'projects_and_owner_operations',note:'x'}];
 for(let i=0;i<3;i++)s.pilotProjects.push({id:'p'+i,projectId:'x'+i,title:'P',startedAt:'x',status:'completed',checkpoints:{leadLinked:true,commercialReady:true,procurementReady:true,productionTracked:true,installationTracked:true,finalPaymentReady:true,financeTracked:true,contentCandidate:true},blockers:[],score:100,updatedAt:'x'});
 s.operationalIncidents=[{id:'i',severity:'critical',component:'database',code:'DB_DOWN',message:'Database unavailable',status:'open',firstSeenAt:'x',lastSeenAt:'x'}];
 const r=buildProductionReadiness({projects:[],state:s,env:env(),observability:obs});
 assert.equal(r.releaseGateOpen,false);
 assert.ok(r.blockers.some(x=>x.includes('critical/high incident')));
});

test('application backup validates explicit 5.6 recovery format',()=>{
 const s=state(),built=buildApplicationBackupPayload({organizationId:'org',projects:[],ownerState:s});
 const parsed=JSON.parse(built.json),v=validateBackupPayload(parsed);
 assert.equal(v.valid,true);assert.equal(v.ownerStateVersion,'5.6.0');
 const bad=validateBackupPayload({format:'wrong'});assert.equal(bad.valid,false);
});

test('backup manifest explicitly says it is not a managed database backup',()=>{
 const m=makeBackupManifest({organizationId:'o',projectCount:2,ownerStateVersion:'5.6.0',sha256:'a'.repeat(64),bytes:200});
 assert.equal(m.containsSecrets,false);assert.match(m.note,/does not replace managed PostgreSQL/i);
});
