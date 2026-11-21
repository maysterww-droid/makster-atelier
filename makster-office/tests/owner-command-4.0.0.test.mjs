
import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildOwnerCommandCenter, supplierRanking } from '../dist/packages/owner-operations/src/index.js';
import { OwnerOperationsStore } from '../dist/apps/core-api/src/owner-operations-store.js';

test('warehouse reservation hard-lock protects stock assigned to earlier jobs',()=>{
  const path='/tmp/makster-owner-store-test.json';if(existsSync(path))unlinkSync(path);
  const store=new OwnerOperationsStore(path);
  const item=store.addWarehouseItem({sku:'BLUM-110',name:'Blum hinge',manufacturer:'Blum',unit:'pcs',onHand:40,minStock:5,unitCostMinor:350,currency:'EUR'});
  const r=store.reserve({itemId:item.id,projectId:'project-A',quantity:30,priority:1});
  assert.equal(r.status,'reserved');
  assert.throws(()=>store.reserve({itemId:item.id,projectId:'project-B',quantity:15,priority:2}),/insufficient_available_stock/);
  assert.throws(()=>store.adjustWarehouseItem(item.id,-15),/consume_reserved_stock/);
  const state=store.get();
  const reserved=state.warehouseReservations.filter(x=>x.status==='reserved').reduce((s,x)=>s+x.quantity,0);
  assert.equal(reserved,30);
  assert.equal(state.warehouseItems[0].onHand,40);
  unlinkSync(path);
});

test('supplier intelligence separates fastest cheapest and optimal',()=>{
  const suppliers=[
    {id:'1',name:'Fast',currency:'EUR',leadTimeDays:2,reliabilityPct:96,defectPct:1,paymentTermsDays:14,priceIndex:108,active:true,updatedAt:new Date().toISOString()},
    {id:'2',name:'Cheap',currency:'EUR',leadTimeDays:8,reliabilityPct:90,defectPct:3,paymentTermsDays:14,priceIndex:82,active:true,updatedAt:new Date().toISOString()},
    {id:'3',name:'Balanced',currency:'EUR',leadTimeDays:4,reliabilityPct:98,defectPct:1,paymentTermsDays:30,priceIndex:94,active:true,updatedAt:new Date().toISOString()}
  ];
  assert.equal(supplierRanking(suppliers,'fastest')[0].name,'Fast');
  assert.equal(supplierRanking(suppliers,'cheapest')[0].name,'Cheap');
  assert.equal(supplierRanking(suppliers,'optimal')[0].name,'Balanced');
});

test('owner command center aggregates queue, break-even and cash forecast',()=>{
  let a=pm.createEmptyProjectModel({projectId:'40000000-0000-4000-8000-000000000001',title:'Kitchen A',projectType:'kitchen',currency:'EUR'});
  a=e.updateJobControl(a,{stage:'production',client:{name:'A'},money:{currency:'EUR',contractValueMinor:1500000,receivedMinor:700000,committedPurchaseMinor:300000,actualCostMinor:200000},targetInstallationAt:'2026-09-14T08:00:00Z'});
  let b=pm.createEmptyProjectModel({projectId:'40000000-0000-4000-8000-000000000002',title:'Wardrobe B',projectType:'wardrobe',currency:'EUR'});
  b=e.updateJobControl(b,{stage:'purchasing',client:{name:'B'},money:{currency:'EUR',contractValueMinor:900000,receivedMinor:300000,committedPurchaseMinor:100000,actualCostMinor:50000},targetInstallationAt:'2026-09-10T08:00:00Z'});
  const state={version:'4.0.0',warehouseItems:[],warehouseReservations:[],suppliers:[],cashEvents:[{id:'c',type:'outflow',category:'rent',amountMinor:200000,currency:'EUR',dueAt:'2026-09-08T12:00:00Z',status:'committed'}],fixedMonthlyCosts:[{id:'f',category:'Rent',amountMinor:200000,currency:'EUR'}],updatedAt:new Date().toISOString()};
  const r=buildOwnerCommandCenter([a,b],state,'EUR');
  assert.equal(r.activeProjectCount,2);
  assert.equal(r.financials.contractTotalMinor,2400000);
  assert.equal(r.financials.receivedTotalMinor,1000000);
  assert.equal(r.financials.committedPurchasesMinor,400000);
  assert.equal(r.financials.uncommittedReceivedMinor,600000);
  assert.equal(r.queue[0].title,'Wardrobe B');
  assert.ok(r.breakEven.fixedMonthlyMinor===200000);
});
