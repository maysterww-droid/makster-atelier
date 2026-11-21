import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';
import {
  assertSupplierOrderMatchesPack,
  buildReworkPack,
  createReceipt,
  createSupplierOrder,
  receivingSummary,
  updateSupplierOrderStatus,
} from '../packages/supplier-operations/src/index.js';

async function project(): Promise<ProjectModelV1> {
  return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8')) as ProjectModelV1;
}

async function setup() {
  const p = await project();
  const engineering = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering, route:'outsource', outsourcePreset:'cutting_edging', packId:'supplier-pack-test', generatedAt:'2026-09-03T11:00:00Z' });
  const order = createSupplierOrder({ pack, supplier:{id:'sup-1',name:'Prague Cut Service'}, currency:'EUR', quotedPrice:428, promisedAt:'2026-09-08T12:00:00Z', orderId:'order-1', createdAt:'2026-09-03T11:01:00Z' });
  return {p,engineering,pack,order};
}

test('supplier order is bound to exact production pack manifest and revision', async () => {
  const {pack,order} = await setup();
  assert.equal(order.projectId,pack.manifest.projectId);
  assert.equal(order.revision,pack.manifest.revision);
  assert.equal(order.outsourcePreset,'cutting_edging');
  assert.ok(order.lines.length > 50);
  assert.doesNotThrow(()=>assertSupplierOrderMatchesPack(order,pack));
  const altered = structuredClone(pack);
  altered.manifest.warnings.push('changed after order');
  assert.throws(()=>assertSupplierOrderMatchesPack(order,altered),/supplier_order_pack_manifest_drift/);
});

test('supplier lifecycle prevents invalid state jumps', async () => {
  const {order} = await setup();
  assert.throws(()=>updateSupplierOrderStatus(order,{status:'received'}),/invalid_supplier_status_transition/);
  const sent = updateSupplierOrderStatus(order,{status:'sent',at:'2026-09-03T11:10:00Z'});
  const accepted = updateSupplierOrderStatus(sent,{status:'accepted',at:'2026-09-03T12:00:00Z',supplierReference:'CUT-778'});
  const doing = updateSupplierOrderStatus(accepted,{status:'in_production'});
  const ready = updateSupplierOrderStatus(doing,{status:'ready'});
  assert.equal(ready.status,'ready');
  assert.equal(ready.supplierReference,'CUT-778');
});

test('receiving tracks accepted, damaged and missing quantities per part', async () => {
  const {order} = await setup();
  const qty2 = order.lines.find(l=>l.quantity===2)!;
  const qty1 = order.lines.find(l=>l.quantity===1)!;
  const receipt = createReceipt({
    order,
    receivedBy:'worker-1',
    receivedAt:'2026-09-08T14:00:00Z',
    lines:[
      {partId:qty2.partId,quantity:1,disposition:'accepted'},
      {partId:qty2.partId,quantity:1,disposition:'damaged',note:'edge chipped'},
      {partId:qty1.partId,quantity:1,disposition:'missing'},
    ],
    receiptId:'receipt-1',
  });
  const summary = receivingSummary(order,[receipt]);
  const b2 = summary.balances.find(b=>b.partId===qty2.partId)!;
  const b1 = summary.balances.find(b=>b.partId===qty1.partId)!;
  assert.equal(b2.ordered,2);
  assert.equal(b2.accepted,1);
  assert.equal(b2.damaged,1);
  assert.equal(b2.outstanding,1);
  assert.equal(b1.missing,1);
  assert.equal(b1.outstanding,1);
  assert.equal(summary.complete,false);
  assert.equal(summary.status,'partially_received');
});

test('replacement receipt can complete a previously damaged part', async () => {
  const {order} = await setup();
  const line = order.lines.find(l=>l.quantity===2)!;
  const r1 = createReceipt({order,receivedBy:'w',lines:[{partId:line.partId,quantity:1,disposition:'accepted'},{partId:line.partId,quantity:1,disposition:'damaged'}],receiptId:'r1'});
  const r2 = createReceipt({order,existingReceipts:[r1],receivedBy:'w',lines:[{partId:line.partId,quantity:1,disposition:'accepted'}],receiptId:'r2'});
  const b = receivingSummary(order,[r1,r2]).balances.find(x=>x.partId===line.partId)!;
  assert.equal(b.accepted,2);
  assert.equal(b.damaged,1);
  assert.equal(b.outstanding,0);
  assert.equal(b.complete,true);
});

test('rework pack contains only outstanding parts, not the whole order', async () => {
  const {order} = await setup();
  const problemA = order.lines.find(l=>l.quantity===2)!;
  const problemB = order.lines.find(l=>l.quantity===1 && l.partId!==problemA.partId)!;
  const goodLines = order.lines.filter(l=>l.partId!==problemA.partId && l.partId!==problemB.partId).map(l=>({partId:l.partId,quantity:l.quantity,disposition:'accepted' as const}));
  const receipt = createReceipt({order,receivedBy:'receiver',lines:[...goodLines,{partId:problemA.partId,quantity:1,disposition:'accepted'},{partId:problemA.partId,quantity:1,disposition:'damaged'},{partId:problemB.partId,quantity:1,disposition:'missing'}]});
  const rework = buildReworkPack(order,[receipt],'2026-09-08T15:00:00Z');
  assert.equal(rework.lines.length,2);
  assert.equal(rework.lines.reduce((s,l)=>s+l.quantity,0),2);
  assert.ok(rework.lines.some(l=>l.partId===problemA.partId && l.reasons.includes('damaged')));
  assert.ok(rework.lines.some(l=>l.partId===problemB.partId && l.reasons.includes('missing')));
});

test('cannot accept more good parts than ordered', async () => {
  const {order} = await setup();
  const line = order.lines.find(l=>l.quantity===1)!;
  assert.throws(()=>createReceipt({order,receivedBy:'receiver',lines:[{partId:line.partId,quantity:2,disposition:'accepted'}]}),/accepted_quantity_exceeds_order/);
});
