
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOfficeCampaign,createOfficeLead,buildMaksterOfficeDashboard,runMaksterOfficeCycle
} from '../dist/packages/owner-operations/src/index.js';

function state(){
  return {
    version:'5.1.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],
    projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],
    decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],
    officeLeads:[],officeCampaigns:[],officeContent:[],officeApprovals:[],officeAgentRuns:[],
    officeCycles:[],officeOwnerBriefs:[],growthConnections:[],growthSyncSnapshots:[],officeAutopilotDecisions:[],officeAutopilotRuns:[],growthSpendGuardrails:[],growthProviderExecutions:[],growthAuditLog:[],growthInboundLeadEvents:[],creativeAssets:[],contentDraftSets:[],publishJobs:[],contentPerformance:[],pilotProjects:[],pilotRuns:[],rolePolicies:[],operationalIncidents:[],backupManifests:[],readinessSnapshots:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}

test('AI Office exposes all 12 agents and separate advertising channels',()=>{
  const s=state();
  s.officeCampaigns=[
    {...createOfficeCampaign({name:'Google',channel:'google_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'}),status:'active',spentMinor:50000,leads:5,qualifiedLeads:3,wonDeals:1,attributedRevenueMinor:500000,impressions:10000,clicks:500},
    {...createOfficeCampaign({name:'Instagram',channel:'instagram_ads',objective:'leads',market:'CZ',budgetMinor:80000,currency:'EUR'}),status:'active',spentMinor:40000,leads:4,qualifiedLeads:2,wonDeals:0,attributedRevenueMinor:0,impressions:15000,clicks:600}
  ];
  const d=buildMaksterOfficeDashboard([],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  assert.equal(d.agents.length,12);
  assert.ok(d.channels.some(x=>x.channel==='google_ads'));
  assert.ok(d.channels.some(x=>x.channel==='instagram_ads'));
  assert.equal(d.summary.activeCampaigns,2);
  assert.equal(d.summary.roas,5.56);
});

test('Growth Cycle follows owner-approval safety and returns Owner Brief',()=>{
  const s=state();
  const r=runMaksterOfficeCycle(s,{market:'CZ',currency:'EUR',monthlyBudgetMinor:150000,goal:'Qualified furniture leads'});
  assert.equal(r.runs.length,12);
  assert.equal(r.cycle.status,'awaiting_approval');
  assert.ok(r.approvals.some(x=>x.kind==='campaign_budget'&&x.status==='pending'));
  assert.equal(r.brief.metrics.pendingApprovals,r.approvals.length);
});

test('lead pipeline supports value, qualification and future Project bridge',()=>{
  const s=state();
  const lead=createOfficeLead({name:'Architect Studio',company:'Studio A',source:'instagram_ads',currency:'EUR',estimatedValueMinor:2500000});
  s.officeLeads=[lead];
  const d=buildMaksterOfficeDashboard([],s,'EUR');
  assert.equal(d.summary.leads,1);
  assert.equal(d.summary.openPipelineMinor,2500000);
  assert.equal(d.summary.convertedProjects,0);
});

test('weak live campaign is surfaced to Growth Director for approval',()=>{
  const s=state();
  const c=createOfficeCampaign({name:'Weak Meta',channel:'facebook_ads',objective:'leads',market:'CZ',budgetMinor:100000,currency:'EUR'});
  Object.assign(c,{status:'active',spentMinor:80000,leads:0,attributedRevenueMinor:0});
  s.officeCampaigns=[c];
  const r=runMaksterOfficeCycle(s,{market:'CZ',currency:'EUR',monthlyBudgetMinor:0});
  assert.ok(r.approvals.some(x=>x.entityId===c.id&&x.kind==='campaign_launch'));
});
