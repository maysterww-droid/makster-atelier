
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildOwnerFinanceReport, buildFinanceTrend } from '../dist/packages/owner-operations/src/index.js';

function state(){
  return {
    version:'4.9.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],
    projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],
    decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],
    cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}
function project(id,title,contract=1000000,received=300000,target='2026-09-20T08:00:00Z'){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage:'production',client:{name:title+' Client'},money:{currency:'EUR',contractValueMinor:contract,receivedMinor:received},targetInstallationAt:target});
  return p;
}

test('monthly P&L uses explicit revenue recognition instead of inventing contract revenue',()=>{
  let p=project('49000000-0000-4000-8000-000000000001','Finance Job');
  p=e.addProjectCostEntry(p,{category:'labor',basis:'estimate',description:'Labor estimate',amountMinor:200000,createdBy:'owner'}).snapshot;
  p=e.addProjectCostEntry(p,{category:'labor',basis:'actual',description:'Labor actual',amountMinor:100000,createdBy:'owner'}).snapshot;
  // force actual entry into target month
  p.costEntries[p.costEntries.length-1].createdAt='2026-09-10T12:00:00Z';
  const s=state();
  s.financeLedgerEntries=[{id:'r',type:'revenue_recognition',category:'project_revenue',amountMinor:500000,currency:'EUR',effectiveAt:'2026-09-15T12:00:00Z',projectId:p.projectId,source:'manual',createdBy:'owner',createdAt:'2026-09-15T12:00:00Z'}];
  s.fixedMonthlyCosts=[{id:'rent',category:'rent',amountMinor:100000,currency:'EUR'}];
  const r=buildOwnerFinanceReport([p],s,'EUR','2026-09',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.period.basis,'recognized_revenue');
  assert.equal(r.pnl.revenueActualMinor,500000);
  assert.equal(r.pnl.cogsActualMinor,100000);
  assert.equal(r.pnl.grossProfitActualMinor,400000);
  assert.equal(r.pnl.operatingProfitActualMinor,300000);
});

test('without period receipts or recognition, actual monthly revenue is zero while forecast remains contract-based',()=>{
  const p=project('49000000-0000-4000-8000-000000000011','No Fake Revenue',1200000,800000);
  const r=buildOwnerFinanceReport([p],state(),'EUR','2026-09',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.pnl.revenueActualMinor,0);
  assert.equal(r.pnl.revenueForecastMinor,1200000);
  assert.equal(r.period.basis,'cash_receipts_fallback');
});

test('working capital, break-even and runway are calculated independently',()=>{
  let p=project('49000000-0000-4000-8000-000000000021','Working Capital',2000000,500000);
  p=e.addProjectCostEntry(p,{category:'material',basis:'estimate',description:'Materials',amountMinor:800000,createdBy:'owner'}).snapshot;
  const s=state();
  s.fixedMonthlyCosts=[{id:'f',category:'rent+admin',amountMinor:200000,currency:'EUR'}];
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:600000,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  s.cashEvents=[
    {id:'out',type:'outflow',category:'supplier',amountMinor:200000,currency:'EUR',dueAt:'2026-09-15T00:00:00Z',status:'committed'},
    {id:'in',type:'inflow',category:'client_payment',amountMinor:100000,currency:'EUR',dueAt:'2026-09-18T00:00:00Z',status:'planned'}
  ];
  const r=buildOwnerFinanceReport([p],s,'EUR','2026-09',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.workingCapital.accountsReceivableMinor,1500000);
  assert.equal(r.liquidity.treasuryMinor,600000);
  assert.equal(r.liquidity.net30Minor,-100000);
  assert.ok(r.breakEven.breakEvenRevenueMinor>0);
  assert.ok(r.liquidity.runwayMonths>0);
});

test('project profitability ranking separates high and low margin jobs',()=>{
  let high=project('49000000-0000-4000-8000-000000000031','High Margin',1000000,500000);
  high=e.addProjectCostEntry(high,{category:'labor',basis:'estimate',description:'Cost',amountMinor:200000,createdBy:'owner'}).snapshot;
  let low=project('49000000-0000-4000-8000-000000000032','Low Margin',1000000,500000);
  low=e.addProjectCostEntry(low,{category:'labor',basis:'estimate',description:'Cost',amountMinor:900000,createdBy:'owner'}).snapshot;
  const r=buildOwnerFinanceReport([low,high],state(),'EUR','2026-09',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.projects[0].projectId,high.projectId);
  assert.equal(r.ranking.bestMarginProjectId,high.projectId);
  assert.equal(r.ranking.worstMarginProjectId,low.projectId);
  assert.ok(r.alerts.some(x=>x.code==='PROJECT_LOW_MARGIN'&&x.projectId===low.projectId));
});

test('finance trend returns requested number of months',()=>{
  const p=project('49000000-0000-4000-8000-000000000041','Trend');
  const trend=buildFinanceTrend([p],state(),'EUR','2026-09',6);
  assert.ok(['4.9.0','5.0.0'].includes(trend.version));
  assert.equal(trend.months.length,6);
  assert.equal(trend.months.at(-1).month,'2026-09');
});
