
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import {
  syncProductionOperations,buildOperationsControlTower,transitionProductionOperation
} from '../dist/packages/owner-operations/src/index.js';

function state(){
  return {
    version:'4.7.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],
    treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],productionOperations:[],
    cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}
function project(id,title,target='2026-09-25T08:00:00Z'){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage:'production',client:{name:title},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:300000},targetInstallationAt:target});
  return p;
}

test('operation sync creates five ordered work-center operations and first is READY',()=>{
  const p=project('47000000-0000-4000-8000-000000000001','Job A');
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const synced=syncProductionOperations([{project:p,engineering:eng,queuePosition:1}],state(),new Date('2026-09-07T08:00:00Z'));
  const ops=synced.operations.filter(x=>x.projectId===p.projectId).sort((a,b)=>a.sequence-b.sequence);
  assert.deepEqual(ops.map(x=>x.centerKind),['cutting','edging','drilling','assembly','installation']);
  assert.equal(ops[0].status,'ready');
  assert.ok(ops.slice(1).every(x=>x.status==='planned'));
});

test('blocked production fact survives resync and delays recalculated installation finish',()=>{
  const p=project('47000000-0000-4000-8000-000000000011','Blocked Job','2026-09-20T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  const initial=syncProductionOperations([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T08:00:00Z'));
  let first=initial.operations.find(x=>x.centerKind==='cutting');
  first=transitionProductionOperation(first,'block',{reason:'Material not delivered',assignee:'Petr',at:'2026-09-07T09:00:00Z'});
  s.productionOperations=initial.operations.map(x=>x.id===first.id?first:x);

  const resynced=syncProductionOperations([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-10T08:00:00Z'));
  const same=resynced.operations.find(x=>x.id===first.id);
  assert.equal(same.status,'blocked');
  assert.equal(same.blockedReason,'Material not delivered');
  assert.equal(same.assignee,'Petr');

  const tower=buildOperationsControlTower([{project:p,engineering:eng,queuePosition:1}],{...s,productionOperations:resynced.operations},new Date('2026-09-10T08:00:00Z'));
  const row=tower.projects[0];
  assert.ok(row.executionDelayDays>=1);
  assert.ok(row.recalculatedInstallationFinish>row.baselineInstallationFinish);
  assert.equal(tower.summary.blockedOperations,1);
});

test('transition rules prevent starting a downstream PLANNED operation',()=>{
  const p=project('47000000-0000-4000-8000-000000000021','Guard Job');
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const synced=syncProductionOperations([{project:p,engineering:eng,queuePosition:1}],state(),new Date('2026-09-07T08:00:00Z'));
  const edging=synced.operations.find(x=>x.centerKind==='edging');
  assert.equal(edging.status,'planned');
  assert.throws(()=>transitionProductionOperation(edging,'start',{assignee:'Jan'}),/not_startable/);
});

test('completion keeps actual time for Capacity Intelligence learning',()=>{
  const p=project('47000000-0000-4000-8000-000000000031','Actual Job');
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const synced=syncProductionOperations([{project:p,engineering:eng,queuePosition:1}],state(),new Date('2026-09-07T08:00:00Z'));
  let cutting=synced.operations.find(x=>x.centerKind==='cutting');
  cutting=transitionProductionOperation(cutting,'start',{assignee:'Operator',at:'2026-09-07T08:00:00Z'});
  cutting=transitionProductionOperation(cutting,'complete',{actualHours:3.5,at:'2026-09-07T12:00:00Z'});
  assert.equal(cutting.status,'completed');
  assert.equal(cutting.actualHours,3.5);
  assert.equal(cutting.actualStart,'2026-09-07T08:00:00Z');
  assert.equal(cutting.actualFinish,'2026-09-07T12:00:00Z');
});


test('delay on queue #1 shared Cutting center cascades into queue #2 schedule',()=>{
  const a=project('47000000-0000-4000-8000-000000000041','First Job','2026-09-30T08:00:00Z');
  const b=project('47000000-0000-4000-8000-000000000042','Second Job','2026-10-10T08:00:00Z');
  const ea=new e.MaksterEngineeringCompiler().compile(a),eb=new e.MaksterEngineeringCompiler().compile(b),s=state();
  const rows=[{project:a,engineering:ea,queuePosition:1},{project:b,engineering:eb,queuePosition:2}];
  const initial=syncProductionOperations(rows,s,new Date('2026-09-07T08:00:00Z'));
  let cuttingA=initial.operations.find(x=>x.projectId===a.projectId&&x.centerKind==='cutting');
  cuttingA=transitionProductionOperation(cuttingA,'block',{reason:'Saw breakdown',at:'2026-09-07T09:00:00Z'});
  s.productionOperations=initial.operations.map(x=>x.id===cuttingA.id?cuttingA:x);
  const tower=buildOperationsControlTower(rows,s,new Date('2026-09-10T08:00:00Z'));
  const cuttingB=tower.operations.find(x=>x.projectId===b.projectId&&x.centerKind==='cutting');
  assert.ok(cuttingB.cascadeDelayDays>0);
  assert.ok(cuttingB.recalculatedStart>cuttingB.plannedStart);
  assert.ok(tower.summary.cascadeDelayedOperations>0);
});
