
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOfficeCampaign,createOfficeLead,buildGrowthAutopilot,autopilotApprovalForDecision,executeApprovedAutopilotDecision,
  defaultGrowthGuardrail,evaluateGrowthExecutionGuardrails,createGrowthExecution,executeGrowthProviderMutation,ingestGrowthLeadEvent
} from '../dist/packages/owner-operations/src/index.js';

function state(){
 return {version:'5.4.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],officeLeads:[],officeCampaigns:[],officeContent:[],officeApprovals:[],officeAgentRuns:[],officeCycles:[],officeOwnerBriefs:[],growthConnections:[],growthSyncSnapshots:[],officeAutopilotDecisions:[],officeAutopilotRuns:[],growthSpendGuardrails:[],growthProviderExecutions:[],growthAuditLog:[],growthInboundLeadEvents:[],creativeAssets:[],contentDraftSets:[],publishJobs:[],contentPerformance:[],pilotProjects:[],pilotRuns:[],rolePolicies:[],operationalIncidents:[],backupManifests:[],readinessSnapshots:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()}
}
function approvedScaleState(){
 const s=state(),c=createOfficeCampaign({name:'Profitable Google',channel:'google_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 c.status='active';c.providerCampaignId='g-1';Object.assign(c,{spentMinor:30000,leads:10,qualifiedLeads:5,attributedRevenueMinor:500000});
 const l=createOfficeLead({name:'Won',source:'google_ads',currency:'EUR',campaignId:c.id});l.status='won';l.actualRevenueMinor=1500000;l.actualProfitMinor=300000;
 s.officeCampaigns=[c];s.officeLeads=[l];
 const d=buildGrowthAutopilot(s,'EUR').decisions[0];d.status='approved';
 return {s,c,d};
}

test('guardrail blocks an increase above configured max even after Owner approval',()=>{
 const {s,c,d}=approvedScaleState();
 s.growthSpendGuardrails=[{...defaultGrowthGuardrail('EUR'),maxBudgetIncreasePercent:10}];
 const g=evaluateGrowthExecutionGuardrails({state:s,decision:d,campaign:c,provider:'google_ads',currency:'EUR'});
 assert.equal(g.allowed,false);assert.ok(g.reasons.includes('budget_increase_exceeds_guardrail'));
});

test('guardrail checks projected daily and monthly portfolio limits',()=>{
 const {s,c,d}=approvedScaleState();
 s.growthSpendGuardrails=[{...defaultGrowthGuardrail('EUR'),dailySpendLimitMinor:1000,monthlySpendLimitMinor:110000,maxBudgetIncreasePercent:50}];
 const g=evaluateGrowthExecutionGuardrails({state:s,decision:d,campaign:c,provider:'google_ads',currency:'EUR'});
 assert.equal(g.allowed,false);
 assert.ok(g.reasons.includes('daily_spend_limit_exceeded'));
 assert.ok(g.reasons.includes('monthly_spend_limit_exceeded'));
});

test('execution is idempotency-shaped and refuses unconnected provider',async()=>{
 const {s,c,d}=approvedScaleState();s.growthSpendGuardrails=[{...defaultGrowthGuardrail('EUR'),maxBudgetIncreasePercent:50}];
 const x=createGrowthExecution({state:s,decision:d,campaign:c,approvalId:'a',provider:'google_ads',requestedBy:'owner'});
 assert.match(x.idempotencyKey,/growth:/);assert.equal(x.status,'queued');
 const done=await executeGrowthProviderMutation(x,{provider:'google_ads',status:'ready_for_connection',async execute(){throw new Error('should_not_run')}});
 assert.equal(done.status,'provider_not_connected');
});

test('connected adapter can confirm external mutation',async()=>{
 const {s,c,d}=approvedScaleState();s.growthSpendGuardrails=[{...defaultGrowthGuardrail('EUR'),maxBudgetIncreasePercent:50}];
 const x=createGrowthExecution({state:s,decision:d,campaign:c,approvalId:'a',provider:'google_ads',requestedBy:'owner'});
 const done=await executeGrowthProviderMutation(x,{provider:'google_ads',status:'connected',async execute(i){return {providerRequestId:'req-1',providerStatus:`confirmed:${i.targetBudgetMinor}`}}});
 assert.equal(done.status,'executed');assert.equal(done.providerRequestId,'req-1');
});

test('signed inbound event creates one CRM lead and duplicate event creates none',()=>{
 const s=state(),c=createOfficeCampaign({name:'Instagram',channel:'instagram_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 c.providerCampaignId='meta-1';s.officeCampaigns=[c];
 const first=ingestGrowthLeadEvent(s,{provider:'meta_ads',providerLeadId:'lead-1',providerCampaignId:'meta-1',signatureVerified:true,payload:{name:'Eva',email:'eva@example.com'}});
 assert.equal(first.event.status,'ingested');assert.equal(first.lead.campaignId,c.id);s.growthInboundLeadEvents.push(first.event);s.officeLeads.push(first.lead);
 const second=ingestGrowthLeadEvent(s,{provider:'meta_ads',providerLeadId:'lead-1',providerCampaignId:'meta-1',signatureVerified:true,payload:{name:'Eva'}});
 assert.equal(second.event.status,'duplicate');assert.equal(second.lead,null);
});

test('unverified inbound event is rejected before CRM creation',()=>{
 const r=ingestGrowthLeadEvent(state(),{provider:'website',providerLeadId:'x',signatureVerified:false,payload:{name:'Bad'}});
 assert.equal(r.event.status,'rejected');assert.equal(r.lead,null);assert.equal(r.event.error,'lead_signature_not_verified');
});
