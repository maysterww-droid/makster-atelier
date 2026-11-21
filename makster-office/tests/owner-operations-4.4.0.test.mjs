
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildPredictiveOwnerControl } from '../dist/packages/owner-operations/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});
function baseState(){
  return {version:'4.4.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
}
function project(id,title,target){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'kitchen',currency:'EUR'});
  p.selections.materials=[
    {id:id.slice(0,-1)+'a',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'White',thickness:M(18),grainDirection:'none'},
    {id:id.slice(0,-1)+'b',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-E',name:'Edge',thickness:M(.8),grainDirection:'none'}
  ];
  p.furniture=[{id:id.slice(0,-1)+'c',kind:'kitchen',name:'Base',transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',construction:{carcassThickness:M(18),defaultCarcassMaterialSelectionId:p.selections.materials[0].id,defaultEdgeMaterialSelectionId:p.selections.materials[1].id,backPanel:{mode:'none'},plinth:{mode:'none'}},modules:[{id:id.slice(0,-1)+'d',kind:'base',width:{mode:'fixed',value:M(600)},contents:[],kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}}],fronts:[]}];
  p=e.updateJobControl(p,{stage:'production',client:{name:title},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:200000},targetInstallationAt:target});
  return p;
}

test('predictive control converts cash gap into collection action',()=>{
  const p=project('44000000-0000-4000-8000-000000000001','Cash Job','2026-09-30T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=baseState();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:50000,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  s.cashEvents=[{id:'x',type:'outflow',category:'supplier',amountMinor:100000,currency:'EUR',dueAt:'2026-09-09T00:00:00Z',status:'committed'}];
  const r=buildPredictiveOwnerControl([{project:p,engineering:eng,queuePosition:1}],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  assert.equal(r.overallRisk,'critical');
  const a=r.actions.find(x=>x.kind==='collect_cash');
  assert.ok(a);
  assert.equal(a.financialImpactMinor,50000);
});

test('predictive control turns BOM shortage into dated procurement action',()=>{
  const p=project('44000000-0000-4000-8000-000000000011','Shortage Job','2026-09-20T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=baseState();
  s.suppliers=[{id:'s',name:'Supplier',currency:'EUR',leadTimeDays:4,reliabilityPct:98,defectPct:1,paymentTermsDays:30,priceIndex:95,active:true,updatedAt:new Date().toISOString()}];
  s.supplierQuotes=[{id:'q',supplierId:'s',currency:'EUR',lines:[{sku:'W980',quantity:50,unit:'m2',unitPriceMinor:1000}],leadTimeDays:4,createdAt:new Date().toISOString()}];
  const r=buildPredictiveOwnerControl([{project:p,engineering:eng,queuePosition:1}],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  const a=r.actions.find(x=>x.kind==='expedite_procurement'&&x.sku==='W980');
  assert.ok(a);
  assert.equal(a.supplierName,'Supplier');
  assert.ok(a.dueAt);
});

test('late capacity and weak margin elevate project risk',()=>{
  let p=project('44000000-0000-4000-8000-000000000021','Risk Job','2026-09-07T08:00:00Z');
  p=e.addProjectCostEntry(p,{category:'labor',basis:'estimate',description:'estimate',amountMinor:900000,createdBy:'owner'}).snapshot;
  p=e.addProjectCostEntry(p,{category:'labor',basis:'actual',description:'actual',amountMinor:950000,createdBy:'owner'}).snapshot;
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=baseState();
  const r=buildPredictiveOwnerControl([{project:p,engineering:eng,queuePosition:1}],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  const pr=r.projects[0];
  assert.ok(pr.score>=50);
  assert.ok(r.actions.some(x=>x.kind==='add_capacity'));
  assert.ok(r.actions.some(x=>x.kind==='protect_margin'));
});
