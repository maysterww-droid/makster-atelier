
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildBomAllocationPlan, compareSupplierQuotesForShortage, buildPaymentCalendar } from '../dist/packages/owner-operations/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});
function project(id,title){
  const p=pm.createEmptyProjectModel({projectId:id,title,projectType:'kitchen',currency:'EUR'});
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
  return p;
}

test('BOM allocation gives free stock to earlier queue position first',()=>{
  const a=project('41000000-0000-4000-8000-000000000001','Job A');
  const b=project('41000000-0000-4000-8000-000000000002','Job B');
  const ea=new e.MaksterEngineeringCompiler().compile(a), eb=new e.MaksterEngineeringCompiler().compile(b);
  const reqsA=e.buildPurchasingReport(a,ea).requirements.filter(x=>x.code==='W980');
  const reqsB=e.buildPurchasingReport(b,eb).requirements.filter(x=>x.code==='W980');
  const reqA={quantity:reqsA.reduce((s,x)=>s+x.quantity,0)},reqB={quantity:reqsB.reduce((s,x)=>s+x.quantity,0)};
  assert.ok(reqA.quantity>0&&reqB.quantity>0);
  const stock=reqA.quantity+reqB.quantity/2;
  const allReqs=[...e.buildPurchasingReport(a,ea).requirements,...e.buildPurchasingReport(b,eb).requirements];
  const warehouseItems=[{id:'w',sku:'W980',name:'EGGER W980',unit:'m2',onHand:stock,currency:'EUR',updatedAt:new Date().toISOString()}];
  let n=0;
  for(const req of allReqs){
    const sku=req.code?.trim()||req.sourceKey||req.description;
    if(sku==='W980'||warehouseItems.some(x=>x.sku===sku))continue;
    const total=allReqs.filter(x=>(x.code?.trim()||x.sourceKey||x.description)===sku).reduce((s,x)=>s+Number(x.quantity),0);
    warehouseItems.push({id:'x'+(++n),sku,name:sku,unit:req.unit,onHand:total,currency:'EUR',updatedAt:new Date().toISOString()});
  }
  const state={version:'4.1.0',warehouseItems,warehouseReservations:[],suppliers:[],supplierQuotes:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
  const plan=buildBomAllocationPlan([{project:a,engineering:ea,queuePosition:1},{project:b,engineering:eb,queuePosition:2}],state);
  const da=plan.demands.find(x=>x.projectId===a.projectId&&x.sku==='W980');
  const db=plan.demands.find(x=>x.projectId===b.projectId&&x.sku==='W980');
  assert.equal(da.shortage,0);
  assert.ok(db.shortage>0);
  assert.ok(plan.blockedProjectIds.includes(b.projectId));
  assert.ok(plan.canFullyAllocateProjectIds.includes(a.projectId));
});

test('existing reservation is protected and counted before new free allocation',()=>{
  const a=project('41000000-0000-4000-8000-000000000011','Job A');
  const ea=new e.MaksterEngineeringCompiler().compile(a);
  const reqTotal=e.buildPurchasingReport(a,ea).requirements.filter(x=>x.code==='W980').reduce((s,x)=>s+x.quantity,0);
  const state={version:'4.1.0',warehouseItems:[{id:'w',sku:'W980',name:'EGGER W980',unit:'m2',onHand:reqTotal,currency:'EUR',updatedAt:new Date().toISOString()}],warehouseReservations:[{id:'r',itemId:'w',projectId:a.projectId,quantity:reqTotal/2,priority:1,status:'reserved',createdAt:new Date().toISOString()}],suppliers:[],supplierQuotes:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
  const plan=buildBomAllocationPlan([{project:a,engineering:ea,queuePosition:1}],state);
  const d=plan.demands.find(x=>x.sku==='W980');
  assert.equal(d.existingReserved,Number((reqTotal/2).toFixed(3)));
  assert.equal(d.shortage,0);
});

test('real supplier quotes choose cheapest, fastest and balanced optimal',()=>{
  const state={version:'4.1.0',warehouseItems:[],warehouseReservations:[],suppliers:[
    {id:'fast',name:'Fast',currency:'EUR',leadTimeDays:2,reliabilityPct:96,defectPct:1,paymentTermsDays:14,priceIndex:108,active:true,updatedAt:new Date().toISOString()},
    {id:'cheap',name:'Cheap',currency:'EUR',leadTimeDays:8,reliabilityPct:90,defectPct:3,paymentTermsDays:14,priceIndex:82,active:true,updatedAt:new Date().toISOString()},
    {id:'balanced',name:'Balanced',currency:'EUR',leadTimeDays:4,reliabilityPct:99,defectPct:.5,paymentTermsDays:30,priceIndex:94,active:true,updatedAt:new Date().toISOString()}
  ],supplierQuotes:[
    {id:'q1',supplierId:'fast',currency:'EUR',lines:[{sku:'BLUM-X',quantity:20,unit:'pcs',unitPriceMinor:700}],leadTimeDays:2,deliveryCostMinor:1000,createdAt:new Date().toISOString()},
    {id:'q2',supplierId:'cheap',currency:'EUR',lines:[{sku:'BLUM-X',quantity:20,unit:'pcs',unitPriceMinor:500}],leadTimeDays:8,deliveryCostMinor:1000,createdAt:new Date().toISOString()},
    {id:'q3',supplierId:'balanced',currency:'EUR',lines:[{sku:'BLUM-X',quantity:20,unit:'pcs',unitPriceMinor:570}],leadTimeDays:4,deliveryCostMinor:500,createdAt:new Date().toISOString()}
  ],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
  const shortage={sku:'BLUM-X',shortage:20,unit:'pcs'};
  assert.equal(compareSupplierQuotesForShortage(state,shortage,'cheapest')[0].supplierName,'Cheap');
  assert.equal(compareSupplierQuotesForShortage(state,shortage,'fastest')[0].supplierName,'Fast');
  assert.equal(compareSupplierQuotesForShortage(state,shortage,'optimal')[0].supplierName,'Balanced');
});

test('payment calendar merges client receivable, purchase order and manual cash events',()=>{
  let p=pm.createEmptyProjectModel({projectId:'41000000-0000-4000-8000-000000000099',title:'Calendar Job',projectType:'other',currency:'EUR'});
  p=e.updateJobControl(p,{stage:'production',client:{name:'Client'},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:300000},targetInstallationAt:'2026-09-20T08:00:00Z'});
  p.purchaseOrders=[{id:'po',supplierName:'Supplier',status:'ordered',currency:'EUR',lines:[{id:'l',kind:'material',description:'Panels',quantity:1,unit:'service',unitPriceMinor:200000,receivedQuantity:0}],createdBy:'buyer',createdAt:'2026-09-01T00:00:00Z',orderedAt:'2026-09-05T00:00:00Z',expectedAt:'2026-09-12T00:00:00Z',sourceRevision:p.revision}];
  const state={version:'4.1.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],cashEvents:[{id:'rent',type:'outflow',category:'rent',amountMinor:50000,currency:'EUR',dueAt:'2026-09-10T00:00:00Z',status:'committed',counterparty:'Landlord'}],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
  const rows=buildPaymentCalendar([p],state,'EUR');
  assert.equal(rows.length,3);
  assert.equal(rows[0].counterparty,'Landlord');
  assert.equal(rows[1].counterparty,'Supplier');
  assert.equal(rows[2].counterparty,'Client');
  assert.equal(rows[2].runningNetMinor,450000);
});
