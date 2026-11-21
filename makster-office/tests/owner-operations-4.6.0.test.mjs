
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import {
  buildOwnerScenarioPlanner,createDecisionPlanFromScenario,decisionPlanSummary,refreshDecisionPlanStatus,
  buildOwnerCommandCenter
} from '../dist/packages/owner-operations/src/index.js';
import { OwnerOperationsStore } from '../dist/apps/core-api/src/owner-operations-store.js';
import { existsSync,unlinkSync } from 'node:fs';

function state(){
  return {version:'4.6.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
}
function project(id,title,target){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage:'production',client:{name:title},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:200000},targetInstallationAt:target});
  return p;
}

test('Cash Protection Decision Plan keeps collection as external action',()=>{
  const p=project('46000000-0000-4000-8000-000000000001','Cash Job','2026-09-30T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:50000,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  s.cashEvents=[{id:'x',type:'outflow',category:'supplier',amountMinor:100000,currency:'EUR',dueAt:'2026-09-09T00:00:00Z',status:'committed'}];
  const planner=buildOwnerScenarioPlanner([{project:p,engineering:eng,queuePosition:1}],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  const selected=planner.scenarios.find(x=>x.scenario.id==='cash-protection');
  const plan=createDecisionPlanFromScenario(selected,planner.baseline,'owner');
  const item=plan.items.find(x=>x.type==='collect_client_payment');
  assert.ok(item);
  assert.equal(item.externalAction,true);
  assert.equal(item.status,'pending_approval');
  item.status='approved';item.approvedBy='owner';item.approvedAt=new Date().toISOString();
  refreshDecisionPlanStatus(plan);
  assert.equal(decisionPlanSummary(plan).externalApproved,1);
  assert.equal(p.jobControl.money.receivedMinor,200000);
});

test('file store persists approved queue priority and Owner Command honors it',()=>{
  const path='/tmp/makster-decision-46.json';if(existsSync(path))unlinkSync(path);
  const store=new OwnerOperationsStore(path);
  const a=project('46000000-0000-4000-8000-000000000011','A','2026-10-01T08:00:00Z');
  const b=project('46000000-0000-4000-8000-000000000012','B','2026-10-02T08:00:00Z');
  store.setQueuePriority({projectId:b.projectId,priority:1,sourcePlanId:'plan'});
  store.setQueuePriority({projectId:a.projectId,priority:2,sourcePlanId:'plan'});
  const r=buildOwnerCommandCenter([a,b],store.get(),'EUR');
  assert.equal(r.queue[0].projectId,b.projectId);
  assert.equal(r.queue[1].projectId,a.projectId);
  unlinkSync(path);
});

test('Decision Plan status moves through draft, partial and completed',()=>{
  const plan={
    id:'p',scenarioId:'s',scenarioName:'Scenario',baselineRiskScore:80,scenarioRiskScore:40,
    baselineCashGapMinor:100000,scenarioCashGapMinor:0,createdBy:'owner',createdAt:new Date().toISOString(),status:'draft',
    items:[
      {id:'1',type:'capacity_change',title:'Capacity',description:'x',requiresApproval:true,externalAction:false,status:'pending_approval',payload:{}},
      {id:'2',type:'collect_client_payment',title:'Cash',description:'x',requiresApproval:true,externalAction:true,status:'pending_approval',payload:{}}
    ]
  };
  plan.items[0].status='approved';refreshDecisionPlanStatus(plan);
  assert.equal(plan.status,'in_execution');
  plan.items[0].status='applied';plan.items[1].status='ready_external';refreshDecisionPlanStatus(plan);
  assert.equal(plan.status,'completed');
});
