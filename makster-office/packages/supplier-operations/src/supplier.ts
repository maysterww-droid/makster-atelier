import { createHash, randomUUID } from 'node:crypto';
import type { BuiltProductionPack } from '../../production-pack/src/types.js';
import {
  SUPPLIER_OPERATIONS_VERSION,
  type CreateSupplierOrderInput,
  type PartReceivingBalance,
  type ReceiptLineInput,
  type ReceivingSummary,
  type ReworkPack,
  type ReworkReason,
  type SupplierOrder,
  type SupplierOrderLine,
  type SupplierReceipt,
  type SupplierStatusUpdate,
} from './types.js';

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(value); value = ''; }
    else value += ch;
  }
  out.push(value);
  return out;
}

function sha256(text: string): string { return createHash('sha256').update(text, 'utf8').digest('hex'); }

function cutlistLines(pack: BuiltProductionPack): SupplierOrderLine[] {
  const raw = pack.files['cutlist.csv'];
  if (!raw) throw new Error('production_pack_missing_cutlist');
  const lines = raw.trim().split(/\r?\n/);
  const header = parseCsvLine(lines.shift() ?? '');
  const idx = Object.fromEntries(header.map((name, i) => [name, i])) as Record<string, number>;
  const required = ['part_id','name','qty','length_mm','width_mm','thickness_mm','material'];
  for (const key of required) if (idx[key] == null) throw new Error(`cutlist_missing_column:${key}`);
  return lines.filter(Boolean).map((line, rowIndex) => {
    const c = parseCsvLine(line);
    const partId = c[idx.part_id!]!;
    return {
      lineId: `${pack.manifest.packId}:line:${rowIndex + 1}`,
      partId,
      partName: c[idx.name!]!,
      quantity: Number(c[idx.qty!] ?? 0),
      lengthMm: Number(c[idx.length_mm!] ?? 0),
      widthMm: Number(c[idx.width_mm!] ?? 0),
      thicknessMm: Number(c[idx.thickness_mm!] ?? 0),
      material: c[idx.material!]!,
      services: [...pack.manifest.services],
      labelPrefix: partId,
    };
  });
}

export function productionPackManifestSha256(pack: BuiltProductionPack): string {
  return sha256(JSON.stringify(pack.manifest));
}

export function createSupplierOrder(input: CreateSupplierOrderInput): SupplierOrder {
  if (input.pack.manifest.route !== 'outsource') throw new Error('supplier_order_requires_outsource_pack');
  if (!input.pack.manifest.ready) throw new Error(`production_pack_not_ready:${input.pack.manifest.blockers.map(b => b.code).join('|')}`);
  if (!input.pack.manifest.outsourcePreset) throw new Error('outsource_preset_missing');
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    orderVersion: SUPPLIER_OPERATIONS_VERSION,
    orderId: input.orderId ?? randomUUID(),
    projectId: input.pack.manifest.projectId,
    revision: input.pack.manifest.revision,
    productionPackId: input.pack.manifest.packId,
    productionPackManifestSha256: productionPackManifestSha256(input.pack),
    outsourcePreset: input.pack.manifest.outsourcePreset,
    supplier: input.supplier,
    currency: input.currency,
    ...(input.quotedPrice != null ? { quotedPrice: input.quotedPrice } : {}),
    ...(input.promisedAt ? { promisedAt: input.promisedAt } : {}),
    ...(input.supplierReference ? { supplierReference: input.supplierReference } : {}),
    status: 'draft',
    createdAt,
    ...(input.notes ? { notes: input.notes } : {}),
    lines: cutlistLines(input.pack),
  };
}

const STATUS_TRANSITIONS: Record<SupplierOrder['status'], SupplierOrder['status'][]> = {
  draft: ['draft','sent','cancelled'],
  sent: ['sent','accepted','cancelled'],
  accepted: ['accepted','in_production','ready','cancelled'],
  in_production: ['in_production','ready','cancelled'],
  ready: ['ready','partially_received','received','cancelled'],
  partially_received: ['partially_received','received','cancelled'],
  received: ['received'],
  cancelled: ['cancelled'],
};

export function updateSupplierOrderStatus(order: SupplierOrder, update: SupplierStatusUpdate): SupplierOrder {
  if (!STATUS_TRANSITIONS[order.status].includes(update.status)) throw new Error(`invalid_supplier_status_transition:${order.status}->${update.status}`);
  const at = update.at ?? new Date().toISOString();
  const next: SupplierOrder = {
    ...order,
    status: update.status,
    ...(update.quotedPrice != null ? { quotedPrice: update.quotedPrice } : {}),
    ...(update.promisedAt ? { promisedAt: update.promisedAt } : {}),
    ...(update.supplierReference ? { supplierReference: update.supplierReference } : {}),
    ...(update.note ? { notes: [order.notes, update.note].filter(Boolean).join('\n') } : {}),
  };
  if (update.status === 'sent') next.sentAt = at;
  if (update.status === 'accepted') next.acceptedAt = at;
  if (update.status === 'ready') next.readyAt = at;
  if (update.status === 'received') next.receivedAt = at;
  return next;
}

function sumReceipt(receipts: SupplierReceipt[], partId: string, predicate: (line: ReceiptLineInput) => boolean): number {
  return receipts.flatMap(r => r.lines).filter(l => l.partId === partId && predicate(l)).reduce((s,l) => s + l.quantity, 0);
}

export function receivingSummary(order: SupplierOrder, receipts: SupplierReceipt[]): ReceivingSummary {
  const balances: PartReceivingBalance[] = order.lines.map(line => {
    const accepted = sumReceipt(receipts, line.partId, l => l.disposition === 'accepted');
    const damaged = sumReceipt(receipts, line.partId, l => l.disposition === 'damaged');
    const missing = sumReceipt(receipts, line.partId, l => l.disposition === 'missing');
    const rejectedOther = sumReceipt(receipts, line.partId, l => !['accepted','damaged','missing'].includes(l.disposition));
    const processedGoodOrBad = accepted + damaged + rejectedOther;
    const outstanding = Math.max(0, line.quantity - accepted);
    return {
      partId: line.partId,
      partName: line.partName,
      ordered: line.quantity,
      accepted,
      damaged,
      missing,
      rejectedOther,
      outstanding,
      complete: accepted >= line.quantity,
    };
  });
  const totalOrdered = balances.reduce((s,b) => s + b.ordered, 0);
  const totalAccepted = balances.reduce((s,b) => s + b.accepted, 0);
  const totalProblem = balances.reduce((s,b) => s + b.damaged + b.missing + b.rejectedOther, 0);
  const totalOutstanding = balances.reduce((s,b) => s + b.outstanding, 0);
  const complete = balances.every(b => b.complete);
  const status = complete ? 'received' : totalAccepted > 0 || receipts.length > 0 ? 'partially_received' : order.status;
  return { orderId: order.orderId, status, totalOrdered, totalAccepted, totalProblem, totalOutstanding, complete, balances };
}

export function validateReceipt(order: SupplierOrder, existingReceipts: SupplierReceipt[], receipt: SupplierReceipt): string[] {
  const errors: string[] = [];
  const orderMap = new Map(order.lines.map(l => [l.partId, l]));
  for (const line of receipt.lines) {
    const expected = orderMap.get(line.partId);
    if (!expected) { errors.push(`unknown_part:${line.partId}`); continue; }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) errors.push(`invalid_quantity:${line.partId}`);
    if (line.disposition === 'accepted') {
      const alreadyAccepted = existingReceipts.flatMap(r=>r.lines)
        .filter(l=>l.partId===line.partId && l.disposition === 'accepted')
        .reduce((s,l)=>s+l.quantity,0);
      const acceptedThisReceipt = receipt.lines.filter(l=>l.partId===line.partId && l.disposition === 'accepted').reduce((s,l)=>s+l.quantity,0);
      if (alreadyAccepted + acceptedThisReceipt > expected.quantity) errors.push(`accepted_quantity_exceeds_order:${line.partId}`);
    }
  }
  return [...new Set(errors)];
}

export function createReceipt(input: { order: SupplierOrder; existingReceipts?: SupplierReceipt[]; receivedBy: string; lines: ReceiptLineInput[]; note?: string; receiptId?: string; receivedAt?: string }): SupplierReceipt {
  const receipt: SupplierReceipt = {
    receiptId: input.receiptId ?? randomUUID(),
    orderId: input.order.orderId,
    receivedAt: input.receivedAt ?? new Date().toISOString(),
    receivedBy: input.receivedBy,
    lines: input.lines,
    ...(input.note ? { note: input.note } : {}),
  };
  const errors = validateReceipt(input.order, input.existingReceipts ?? [], receipt);
  if (errors.length) throw new Error(`invalid_receipt:${errors.join('|')}`);
  return receipt;
}

export function buildReworkPack(order: SupplierOrder, receipts: SupplierReceipt[], generatedAt = new Date().toISOString()): ReworkPack {
  const summary = receivingSummary(order, receipts);
  const receiptLines = receipts.flatMap(r => r.lines);
  const lines = summary.balances.filter(b => b.outstanding > 0).map(balance => {
    const reasons = [...new Set(receiptLines.filter(l => l.partId === balance.partId && l.disposition !== 'accepted').map(l => l.disposition as ReworkReason))];
    return { partId: balance.partId, partName: balance.partName, quantity: balance.outstanding, reasons: reasons.length ? reasons : ['missing' as ReworkReason] };
  });
  return {
    reworkVersion: SUPPLIER_OPERATIONS_VERSION,
    reworkId: randomUUID(),
    sourceOrderId: order.orderId,
    projectId: order.projectId,
    revision: order.revision,
    generatedAt,
    supplier: order.supplier,
    lines: lines.map(l => ({...l, reasons: [...l.reasons]})),
    ready: lines.length > 0,
  };
}

export function assertSupplierOrderMatchesPack(order: SupplierOrder, pack: BuiltProductionPack): void {
  if (order.productionPackId !== pack.manifest.packId) throw new Error('supplier_order_pack_id_mismatch');
  if (order.projectId !== pack.manifest.projectId || order.revision !== pack.manifest.revision) throw new Error('supplier_order_revision_mismatch');
  if (order.productionPackManifestSha256 !== productionPackManifestSha256(pack)) throw new Error('supplier_order_pack_manifest_drift');
}
