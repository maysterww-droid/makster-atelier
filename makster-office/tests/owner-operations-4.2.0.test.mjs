
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'node:fs';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import {
  buildProductionCapacityPlan,
  buildPaymentCalendar,
  buildOwnerCommandCenter
} from '../dist/packages/owner-operations/src/index.js';
import { OwnerOperationsStore } from '../dist/apps/core-api/src/owner-operations-store.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});

function furnitureProject(id,title,target){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'kitchen',currency:'EUR'});
  p.selections.materials=[
    {id:id.slice(0,-1)+'a',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'White',thickness:M(18),grainDirection:'none'},
    {id:id.slice(0,-1)+'b',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-E',name:'Edge',thickness:M(.8),grainDirection:'none'}
  ];
  p.furniture=[{
    id:id.slice(0,-1)+'c',kind:'kitchen',name:'Base 600',
    transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},
    dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',
    construction:{carcassThickness:M(18),defaultCarcassMaterialSelectionId:p.selections.materials[0].id,defaultEdgeMaterialSelectionId:p.selections.materials[1].id,backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:id.slice(0,-1)+'d',kind:'base',width:{mode:'fixed',value:M(600)},contents:[],kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}}],
    fronts:[]
  }];
  p=e.updateJobControl(p,{stage:'production',client:{name:title},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:400000},...(target?{targetInstallationAt:target}:{})});
  return p;
}
function state(){
  return {
    version:'4.2.0',
    warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],
    cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}

test('capacity planner serializes same work center by project queue',()=>{
  const a=furnitureProject('42000000-0000-4000-8000-000000000001','Kitchen A','2026-09-30T08:00:00Z');
  const b=furnitureProject('42000000-0000-4000-8000-000000000002','Kitchen B','2026-10-10T08:00:00Z');
  const ea=new e.MaksterEngineeringCompiler().compile(a),eb=new e.MaksterEngineeringCompiler().compile(b);
  const plan=buildProductionCapacityPlan([
    {project:a,engineering:ea,queuePosition:1},
    {project:b,engineering:eb,queuePosition:2}
  ],state(),new Date('2026-09-07T08:00:00Z'));

  assert.ok(['4.2.0','4.3.0','4.4.0','4.5.0','4.6.0','4.7.0','4.8.0','4.9.0','5.0.0'].includes(plan.version));
  const cutA=plan.schedule.find(x=>x.projectId===a.projectId&&x.centerKind==='cutting');
  const cutB=plan.schedule.find(x=>x.projectId===b.projectId&&x.centerKind==='cutting');
  assert.ok(cutA&&cutB);
  assert.ok(cutB.startDate>cutA.finishDate);
  assert.equal(plan.projectSummary[0].queuePosition,1);
  assert.equal(plan.projectSummary[1].queuePosition,2);
});

test('capacity override replaces formula estimate and exposes deadline risk',()=>{
  const p=furnitureProject('42000000-0000-4000-8000-000000000011','Rush Kitchen','2026-09-08T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const s=state();
  s.projectCapacityOverrides=[{id:'o',projectId:p.projectId,centerKind:'assembly',hours:24,note:'manual',updatedAt:new Date().toISOString()}];
  const plan=buildProductionCapacityPlan([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T08:00:00Z'));
  const workload=plan.workload[0];
  assert.equal(workload.hours.assembly,24);
  assert.equal(plan.projectSummary[0].risk,'late');
  assert.ok(plan.projectSummary[0].daysBuffer<0);
});

test('procurement-award cash commitment prevents Purchase Order double counting in payment calendar',()=>{
  let p=pm.createEmptyProjectModel({projectId:'42000000-0000-4000-8000-000000000021',title:'Award Job',projectType:'other',currency:'EUR'});
  p.purchaseOrders=[{
    id:'42000000-0000-4000-8000-000000000022',supplierName:'Supplier',status:'ordered',currency:'EUR',
    lines:[{id:'42000000-0000-4000-8000-000000000023',kind:'hardware',description:'Hinges',quantity:20,unit:'pcs',unitPriceMinor:500,receivedQuantity:0}],
    createdBy:'owner',createdAt:'2026-09-07T00:00:00Z',orderedAt:'2026-09-07T00:00:00Z',expectedAt:'2026-09-15T00:00:00Z',sourceRevision:p.revision
  }];
  const s=state();
  s.cashEvents=[{
    id:'cash',type:'outflow',category:'supplier',amountMinor:10000,currency:'EUR',
    dueAt:'2026-10-07T00:00:00Z',status:'committed',projectId:p.projectId,counterparty:'Supplier',
    source:'procurement_award',sourceId:p.purchaseOrders[0].id
  }];
  const rows=buildPaymentCalendar([p],s,'EUR');
  const supplierRows=rows.filter(x=>x.counterparty==='Supplier');
  assert.equal(supplierRows.length,1);
  assert.equal(supplierRows[0].amountMinor,10000);
  assert.equal(supplierRows[0].source,'cash_event');
});

test('owner command exposes company cash commitments separately from purchase commitments',()=>{
  let p=pm.createEmptyProjectModel({projectId:'42000000-0000-4000-8000-000000000031',title:'Money Job',projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage:'production',client:{name:'Client'},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:500000,committedPurchaseMinor:200000,actualCostMinor:100000}});
  const s=state();
  s.cashEvents=[{id:'c',type:'outflow',category:'supplier',amountMinor:180000,currency:'EUR',dueAt:'2026-09-20T00:00:00Z',status:'committed',source:'procurement_award',sourceId:'po'}];
  const r=buildOwnerCommandCenter([p],s,'EUR');
  assert.equal(r.financials.committedPurchasesMinor,200000);
  assert.equal(r.financials.committedCashOutMinor,180000);
});

test('file store persists procurement award lifecycle and capacity overrides',()=>{
  const path='/tmp/makster-owner-42.json';if(existsSync(path))unlinkSync(path);
  const store=new OwnerOperationsStore(path);
  const award=store.createProcurementAward({
    quoteId:'q',supplierId:'s',projectId:'p',sku:'BLUM-X',quantity:20,unit:'pcs',
    currency:'EUR',totalCostMinor:10000,paymentDueAt:'2026-10-01T00:00:00Z',
    expectedAt:'2026-09-15T00:00:00Z',awardedBy:'owner'
  });
  assert.equal(award.status,'pending_project_order');
  const done=store.updateProcurementAward(award.id,{status:'ordered',purchaseOrderId:'po',cashEventId:'cash'});
  assert.equal(done.status,'ordered');
  assert.equal(done.purchaseOrderId,'po');
  const ov=store.setCapacityOverride({projectId:'p',centerKind:'assembly',hours:18,note:'known from workshop'});
  assert.equal(ov.hours,18);
  const ov2=store.setCapacityOverride({projectId:'p',centerKind:'assembly',hours:20});
  assert.equal(ov2.id,ov.id);
  assert.equal(store.get().projectCapacityOverrides[0].hours,20);
  unlinkSync(path);
});
