import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';
import { createReceipt, createSupplierOrder, updateSupplierOrderStatus } from '../packages/supplier-operations/src/index.js';
import {
  assertRfqMatchesPack,
  awardSupplierQuote,
  calculateSupplierPerformance,
  compareSupplierQuotes,
  createSupplierRfq,
  eligibleSuppliersForPack,
  type SupplierCapabilityProfile,
  type SupplierQuote,
} from '../packages/procurement-intelligence/src/index.js';

async function setup() {
  const p = JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8')) as ProjectModelV1;
  const engineering = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering, route:'outsource', outsourcePreset:'cutting_edging', packId:'proc-pack-1', generatedAt:'2026-09-03T12:00:00Z' });
  const suppliers: SupplierCapabilityProfile[] = [
    {id:'s1',name:'Prague Cut Service',active:true,currencies:['EUR','CZK'],services:['cutting','edging'],deliveryModes:['pickup','supplier_delivery'],minimumOrder:100,typicalLeadDays:5},
    {id:'s2',name:'QuickPanel',active:true,currencies:['EUR'],services:['cutting','edging','drilling'],deliveryModes:['supplier_delivery'],minimumOrder:100,typicalLeadDays:2},
    {id:'s3',name:'Budget Board',active:true,currencies:['EUR'],services:['cutting','edging'],deliveryModes:['pickup'],minimumOrder:100,typicalLeadDays:7},
    {id:'s4',name:'Cut Only',active:true,currencies:['EUR'],services:['cutting'],deliveryModes:['pickup']},
  ];
  const rfq = createSupplierRfq({pack,suppliers,currency:'EUR',rfqId:'rfq-1',requestedAt:'2026-09-03T12:01:00Z'});
  const quotes: SupplierQuote[] = [
    {procurementVersion:'1.2.0',quoteId:'q1',rfqId:'rfq-1',supplierId:'s1',status:'submitted',currency:'EUR',basePrice:410,deliveryPrice:18,totalPrice:428,leadDays:5,services:['cutting','edging'],deliveryMode:'supplier_delivery',submittedAt:'2026-09-03T13:00:00Z'},
    {procurementVersion:'1.2.0',quoteId:'q2',rfqId:'rfq-1',supplierId:'s2',status:'submitted',currency:'EUR',basePrice:445,deliveryPrice:20,totalPrice:465,leadDays:2,services:['cutting','edging'],deliveryMode:'supplier_delivery',submittedAt:'2026-09-03T13:10:00Z'},
    {procurementVersion:'1.2.0',quoteId:'q3',rfqId:'rfq-1',supplierId:'s3',status:'submitted',currency:'EUR',basePrice:397,deliveryPrice:0,totalPrice:397,leadDays:7,services:['cutting','edging'],deliveryMode:'pickup',submittedAt:'2026-09-03T13:20:00Z'},
  ];
  const performance = [
    {supplierId:'s1',completedOrders:12,onTimeOrders:11,receivedUnits:800,problemUnits:8,reworkOrders:1,onTimeRate:0.92,problemRate:0.01,reworkRate:0.08,qualityScore:96},
    {supplierId:'s2',completedOrders:8,onTimeOrders:7,receivedUnits:520,problemUnits:18,reworkOrders:2,onTimeRate:0.88,problemRate:0.03,reworkRate:0.25,qualityScore:91},
    {supplierId:'s3',completedOrders:14,onTimeOrders:9,receivedUnits:1000,problemUnits:45,reworkOrders:5,onTimeRate:0.64,problemRate:0.05,reworkRate:0.36,qualityScore:82},
  ];
  return {p,engineering,pack,suppliers,rfq,quotes,performance};
}

test('RFQ invites only suppliers capable of all requested services', async () => {
  const {pack,suppliers} = await setup();
  const eligible = eligibleSuppliersForPack(pack,suppliers,'EUR');
  assert.deepEqual(eligible.map(s=>s.id),['s1','s2','s3']);
  const rfq = createSupplierRfq({pack,suppliers,currency:'EUR',rfqId:'rfq-x'});
  assert.deepEqual(rfq.invitedSupplierIds,['s1','s2','s3']);
});

test('RFQ is bound to exact production pack revision and manifest', async () => {
  const {pack,rfq} = await setup();
  assert.doesNotThrow(()=>assertRfqMatchesPack(rfq,pack));
  const altered = structuredClone(pack);
  altered.manifest.warnings.push('changed');
  assert.throws(()=>assertRfqMatchesPack(rfq,altered),/rfq_pack_manifest_drift/);
});

test('balanced strategy recommends strong value instead of simply cheapest or fastest', async () => {
  const {rfq,quotes,suppliers,performance} = await setup();
  const comparison = compareSupplierQuotes({rfq,quotes,suppliers,performance,strategy:'balanced',comparisonId:'cmp-1',generatedAt:'2026-09-03T14:00:00Z'});
  assert.equal(comparison.ranking[0]?.supplierId,'s1');
  assert.equal(comparison.recommendedQuoteId,'q1');
  assert.ok(comparison.ranking[0]!.components.quality > comparison.ranking[2]!.components.quality);
});

test('cheapest and fastest strategies select different suppliers transparently', async () => {
  const {rfq,quotes,suppliers,performance} = await setup();
  const cheapest = compareSupplierQuotes({rfq,quotes,suppliers,performance,strategy:'cheapest'});
  const fastest = compareSupplierQuotes({rfq,quotes,suppliers,performance,strategy:'fastest'});
  assert.equal(cheapest.ranking[0]?.supplierId,'s3');
  assert.equal(fastest.ranking[0]?.supplierId,'s2');
});

test('delivery-required RFQ excludes pickup-only supplier', async () => {
  const {pack,suppliers} = await setup();
  const rfq = createSupplierRfq({pack,suppliers,currency:'EUR',deliveryRequired:true,rfqId:'rfq-delivery'});
  assert.deepEqual(rfq.invitedSupplierIds,['s1','s2']);
});

test('awarding a quote creates supplier order from exact pack and quote price', async () => {
  const {pack,rfq,quotes,suppliers} = await setup();
  const order = awardSupplierQuote({pack,rfq,quote:quotes[0]!,supplier:suppliers[0]!,orderId:'award-order'});
  assert.equal(order.orderId,'award-order');
  assert.equal(order.quotedPrice,428);
  assert.equal(order.supplier.id,'s1');
  assert.match(order.supplierReference ?? '',/RFQ rfq-1/);
});

test('historical receiving data produces supplier quality performance', async () => {
  const {pack,suppliers} = await setup();
  let order = createSupplierOrder({pack,supplier:suppliers[0]!,currency:'EUR',orderId:'hist-1',promisedAt:'2026-09-08T12:00:00Z'});
  order = updateSupplierOrderStatus(order,{status:'sent',at:'2026-09-03T12:00:00Z'});
  order = updateSupplierOrderStatus(order,{status:'accepted',at:'2026-09-03T12:10:00Z'});
  order = updateSupplierOrderStatus(order,{status:'ready',at:'2026-09-08T10:00:00Z'});
  const allGood = order.lines.map(l=>({partId:l.partId,quantity:l.quantity,disposition:'accepted' as const}));
  const receipt = createReceipt({order,receivedBy:'u',lines:allGood,receiptId:'hist-r1'});
  const perf = calculateSupplierPerformance({supplierId:'s1',orders:[order],receiptsByOrder:new Map([[order.orderId,[receipt]]])});
  assert.equal(perf.completedOrders,1);
  assert.equal(perf.onTimeOrders,1);
  assert.equal(perf.problemUnits,0);
  assert.ok(perf.qualityScore > 90);
});
