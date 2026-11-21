
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfficeCampaign,createOfficeLead,buildGrowthAutopilot,autopilotApprovalForDecision,executeApprovedAutopilotDecision} from '../dist/packages/owner-operations/src/index.js';

function state(){
 return {version:'5.3.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],officeLeads:[],officeCampaigns:[],officeContent:[],officeApprovals:[],officeAgentRuns:[],officeCycles:[],officeOwnerBriefs:[],growthConnections:[],growthSyncSnapshots:[],officeAutopilotDecisions:[],officeAutopilotRuns:[],growthSpendGuardrails:[],growthProviderExecutions:[],growthAuditLog:[],growthInboundLeadEvents:[],creativeAssets:[],contentDraftSets:[],publishJobs:[],contentPerformance:[],pilotProjects:[],pilotRuns:[],rolePolicies:[],operationalIncidents:[],backupManifests:[],readinessSnapshots:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()}
}

test('Autopilot PAUSEs meaningful spend with zero qualified leads',()=>{
 const s=state(),c=createOfficeCampaign({name:'Weak Meta',channel:'facebook_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 Object.assign(c,{status:'active',spentMinor:40000,leads:10,qualifiedLeads:0,attributedRevenueMinor:0});s.officeCampaigns=[c];
 const r=buildGrowthAutopilot(s,'EUR',new Date('2026-09-07T00:00:00Z'));
 assert.equal(r.decisions[0].action,'pause');
 assert.equal(r.decisions[0].proposedBudgetMinor,0);
 assert.ok(r.decisions[0].confidence>=80);
});

test('Autopilot SCALEs campaign when real project profit is strong',()=>{
 const s=state(),c=createOfficeCampaign({name:'Google Profit',channel:'google_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 Object.assign(c,{status:'active',spentMinor:30000,leads:8,qualifiedLeads:4,wonDeals:1,attributedRevenueMinor:500000});s.officeCampaigns=[c];
 const l=createOfficeLead({name:'Client',source:'google_ads',currency:'EUR',campaignId:c.id});l.status='won';l.actualRevenueMinor=1200000;l.actualProfitMinor=300000;s.officeLeads=[l];
 const d=buildGrowthAutopilot(s,'EUR').decisions[0];
 assert.equal(d.action,'scale');
 assert.equal(d.proposedBudgetMinor,125000);
 assert.equal(d.evidence.actualProjectProfitMinor,300000);
});

test('Autopilot HOLDs campaign with no spend instead of guessing',()=>{
 const s=state(),c=createOfficeCampaign({name:'New TikTok',channel:'tiktok_ads',objective:'leads',market:'CZ',budgetMinor:50000,currency:'EUR'});c.status='planned';s.officeCampaigns=[c];
 const d=buildGrowthAutopilot(s,'EUR').decisions[0];
 assert.equal(d.action,'hold');
 assert.equal(d.approvalId,undefined);
});

test('Owner approval is required before internal campaign plan changes',()=>{
 const s=state(),c=createOfficeCampaign({name:'Scale',channel:'instagram_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 Object.assign(c,{status:'active',spentMinor:25000,leads:8,qualifiedLeads:4,attributedRevenueMinor:200000});s.officeCampaigns=[c];
 const d=buildGrowthAutopilot(s,'EUR').decisions[0],a=autopilotApprovalForDecision(d);
 assert.throws(()=>executeApprovedAutopilotDecision(d,c,a),/owner_approval_required/);
 a.status='approved';
 const x=executeApprovedAutopilotDecision(d,c,a);
 assert.equal(x.decision.status,'executed');
 assert.equal(x.campaign.budgetMinor,d.proposedBudgetMinor);
 assert.equal(x.decision.executionScope,'internal_plan_only');
});

test('PAUSE approval pauses internal campaign but flags provider execution boundary',()=>{
 const s=state(),c=createOfficeCampaign({name:'Meta',channel:'facebook_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
 c.providerCampaignId='meta-1';Object.assign(c,{status:'active',spentMinor:50000,leads:3,qualifiedLeads:0});s.officeCampaigns=[c];
 const d=buildGrowthAutopilot(s,'EUR').decisions[0],a=autopilotApprovalForDecision(d);a.status='approved';
 const x=executeApprovedAutopilotDecision(d,c,a);
 assert.equal(x.campaign.status,'paused');
 assert.equal(x.decision.providerExecution,'pending_provider_sync');
});
