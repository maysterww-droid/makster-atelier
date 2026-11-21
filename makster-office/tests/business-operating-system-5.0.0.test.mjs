
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildBusinessOperatingSystem, validateBusinessProjectClose } from '../dist/packages/owner-operations/src/index.js';

function state(){
  return {
    version:'5.0.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],
    projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],
    decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],
    cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}
function project(id,title,stage='production',contract=1000000,received=300000){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage,client:{name:title+' Client'},money:{currency:'EUR',contractValueMinor:contract,receivedMinor:received},targetInstallationAt:'2026-09-25T08:00:00Z'});
  return p;
}

test('Business Truth detects CLOSED project with unpaid client balance',()=>{
  const p=project('50000000-0000-4000-8000-000000000001','Bad Closed','closed',1000000,700000);
  p.installationHandover={id:'h',status:'signed',signedBy:'client',signedAt:'2026-09-20T12:00:00Z',sourceRevision:p.revision};
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  const r=buildBusinessOperatingSystem([{project:p,engineering:eng,queuePosition:9999}],[p],s,'EUR','2026-09',new Date('2026-09-21T00:00:00Z'));
  assert.ok(r.truthIssues.some(x=>x.code==='CLOSED_WITH_CLIENT_BALANCE'));
  assert.equal(r.summary.criticalTruthIssues,1);
  assert.ok(r.healthScore<100);
});

test('Close Gate refuses signed project until final client balance is paid',()=>{
  const p=project('50000000-0000-4000-8000-000000000011','Close Gate','final_payment',1000000,900000);
  p.installationHandover={id:'h',status:'signed',signedBy:'client',signedAt:'2026-09-20T12:00:00Z',sourceRevision:p.revision};
  const g=validateBusinessProjectClose(p,state());
  assert.equal(g.canClose,false);
  assert.ok(g.blockers.includes('final_client_balance_outstanding'));
});

test('Close Gate allows a fully paid signed no-furniture project with no open obligations',()=>{
  const p=project('50000000-0000-4000-8000-000000000021','Ready Close','final_payment',1000000,1000000);
  p.installationHandover={id:'h',status:'signed',signedBy:'client',signedAt:'2026-09-20T12:00:00Z',sourceRevision:p.revision};
  const g=validateBusinessProjectClose(p,state());
  assert.equal(g.canClose,true);
  assert.deepEqual(g.blockers,[]);
});

test('Furniture project cannot close without production execution history',()=>{
  const p=project('50000000-0000-4000-8000-000000000031','Missing Production','final_payment',1000000,1000000);
  p.furniture=[{
    id:'50000000-0000-4000-8000-000000000032',kind:'other',name:'Cabinet',
    transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},
    dimensions:{width:{value:pm.mm(600),state:'confirmed'},height:{value:pm.mm(900),state:'confirmed'},depth:{value:pm.mm(500),state:'confirmed'}},
    mounting:'base_supported',construction:{carcassThickness:{value:pm.mm(18),state:'confirmed'},backPanel:{mode:'none'},plinth:{mode:'none'}},modules:[],fronts:[]
  }];
  p.installationHandover={id:'h',status:'signed',signedBy:'client',signedAt:'2026-09-20T12:00:00Z',sourceRevision:p.revision};
  const g=validateBusinessProjectClose(p,state());
  assert.equal(g.canClose,false);
  assert.ok(g.blockers.includes('production_execution_missing'));
});

test('Business OS aggregates multiple projects into one company operating snapshot',()=>{
  const a=project('50000000-0000-4000-8000-000000000041','A','production',2000000,500000);
  const b=project('50000000-0000-4000-8000-000000000042','B','closed',1000000,1000000);
  b.installationHandover={id:'h',status:'signed',signedBy:'client',signedAt:'2026-09-20T12:00:00Z',sourceRevision:b.revision};
  const ea=new e.MaksterEngineeringCompiler().compile(a),eb=new e.MaksterEngineeringCompiler().compile(b),s=state();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:500000,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  const r=buildBusinessOperatingSystem([{project:a,engineering:ea,queuePosition:1},{project:b,engineering:eb,queuePosition:9999}],[a,b],s,'EUR','2026-09',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.version,'5.0.0');
  assert.equal(r.summary.totalProjects,2);
  assert.equal(r.summary.activeProjects,1);
  assert.equal(r.summary.closedProjects,1);
  assert.equal(r.company.contractBacklogMinor,3000000);
  assert.equal(r.company.treasuryMinor,500000);
});
