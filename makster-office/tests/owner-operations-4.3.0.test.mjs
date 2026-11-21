
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildCapacityLearning, buildCashGapForecast, buildReplenishmentPlan, buildProductionCapacityPlan } from '../dist/packages/owner-operations/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});
function state(){
  return {version:'4.3.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
}
function project(){
  let p=pm.createEmptyProjectModel({projectId:'43000000-0000-4000-8000-000000000001',title:'Learning Kitchen',projectType:'kitchen',currency:'EUR'});
  p.selections.materials=[
    {id:'43000000-0000-4000-8000-000000000010',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'White',thickness:M(18),grainDirection:'none'},
    {id:'43000000-0000-4000-8000-000000000011',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-E',name:'Edge',thickness:M(.8),grainDirection:'none'}
  ];
  p.furniture=[{id:'43000000-0000-4000-8000-000000000020',kind:'kitchen',name:'Base',transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',construction:{carcassThickness:M(18),defaultCarcassMaterialSelectionId:p.selections.materials[0].id,defaultEdgeMaterialSelectionId:p.selections.materials[1].id,backPanel:{mode:'none'},plinth:{mode:'none'}},modules:[{id:'43000000-0000-4000-8000-000000000021',kind:'base',width:{mode:'fixed',value:M(600)},contents:[],kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}}],fronts:[]}];
  return p;
}
test('capacity learning gains confidence gradually and changes future planning',()=>{
  const p=project(),eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  const base=buildProductionCapacityPlan([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T08:00:00Z'));
  const baseAssembly=base.workload[0].hours.assembly;
  for(let i=0;i<8;i++)s.productionTimeEntries.push({id:String(i),projectId:'old'+i,centerKind:'assembly',plannedHours:10,actualHours:15,completedAt:'2026-08-01T00:00:00Z',recordedBy:'owner'});
  const learning=buildCapacityLearning(s).centers.find(x=>x.centerKind==='assembly');
  assert.equal(learning.status,'trusted');
  assert.equal(learning.learnedMultiplier,1.5);
  const learned=buildProductionCapacityPlan([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T08:00:00Z'));
  assert.equal(learned.workload[0].hours.assembly,Number((baseAssembly*1.5).toFixed(2)));
});

test('cash-gap forecast detects first negative balance and exact gap',()=>{
  const s=state();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:100000,asOf:'2026-09-06T00:00:00Z',updatedAt:'2026-09-06T00:00:00Z'}];
  s.cashEvents=[
    {id:'1',type:'outflow',category:'rent',amountMinor:60000,currency:'EUR',dueAt:'2026-09-10T00:00:00Z',status:'committed'},
    {id:'2',type:'outflow',category:'supplier',amountMinor:70000,currency:'EUR',dueAt:'2026-09-11T00:00:00Z',status:'committed'},
    {id:'3',type:'inflow',category:'client_payment',amountMinor:50000,currency:'EUR',dueAt:'2026-09-12T00:00:00Z',status:'planned'}
  ];
  const f=buildCashGapForecast([],s,'EUR');
  assert.equal(f.firstCashGapAt,'2026-09-11T00:00:00Z');
  assert.equal(f.cashGapMinor,30000);
  assert.equal(f.status,'gap');
});

test('replenishment combines minimum stock and BOM shortage',()=>{
  const p=project(),eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  const reqs=e.buildPurchasingReport(p,eng).requirements.filter(x=>x.code==='W980');
  const total=reqs.reduce((sum,x)=>sum+x.quantity,0);
  s.warehouseItems=[{id:'w',sku:'W980',name:'EGGER W980',unit:'m2',onHand:Math.max(0,total-1),minStock:2,currency:'EUR',updatedAt:new Date().toISOString()}];
  const plan=buildReplenishmentPlan([{project:p,engineering:eng,queuePosition:1}],s);
  const row=plan.items.find(x=>x.sku==='W980');
  assert.ok(row);
  assert.ok(row.recommendedOrderQuantity>=2);
  assert.equal(row.reason,'bom_shortage');
});
