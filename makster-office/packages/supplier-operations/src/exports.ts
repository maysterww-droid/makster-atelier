import type { SupplierOrder, ReceivingSummary, ReworkPack } from './types.js';

function csvCell(v: unknown): string { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }
function csv(rows: unknown[][]): string { return rows.map(r=>r.map(csvCell).join(',')).join('\n')+'\n'; }

export function supplierOrderCsv(order: SupplierOrder): string {
  return csv([
    ['part_id','part_name','qty','length_mm','width_mm','thickness_mm','material','services','label_prefix'],
    ...order.lines.map(l=>[l.partId,l.partName,l.quantity,l.lengthMm,l.widthMm,l.thicknessMm,l.material,l.services.join('|'),l.labelPrefix]),
  ]);
}

export function receivingSummaryCsv(summary: ReceivingSummary): string {
  return csv([
    ['part_id','part_name','ordered','accepted','damaged','missing','rejected_other','outstanding','complete'],
    ...summary.balances.map(b=>[b.partId,b.partName,b.ordered,b.accepted,b.damaged,b.missing,b.rejectedOther,b.outstanding,b.complete]),
  ]);
}

export function reworkCsv(rework: ReworkPack): string {
  return csv([
    ['part_id','part_name','qty','reasons'],
    ...rework.lines.map(l=>[l.partId,l.partName,l.quantity,l.reasons.join('|')]),
  ]);
}
