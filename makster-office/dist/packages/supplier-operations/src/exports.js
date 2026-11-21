function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }
function csv(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'; }
export function supplierOrderCsv(order) {
    return csv([
        ['part_id', 'part_name', 'qty', 'length_mm', 'width_mm', 'thickness_mm', 'material', 'services', 'label_prefix'],
        ...order.lines.map(l => [l.partId, l.partName, l.quantity, l.lengthMm, l.widthMm, l.thicknessMm, l.material, l.services.join('|'), l.labelPrefix]),
    ]);
}
export function receivingSummaryCsv(summary) {
    return csv([
        ['part_id', 'part_name', 'ordered', 'accepted', 'damaged', 'missing', 'rejected_other', 'outstanding', 'complete'],
        ...summary.balances.map(b => [b.partId, b.partName, b.ordered, b.accepted, b.damaged, b.missing, b.rejectedOther, b.outstanding, b.complete]),
    ]);
}
export function reworkCsv(rework) {
    return csv([
        ['part_id', 'part_name', 'qty', 'reasons'],
        ...rework.lines.map(l => [l.partId, l.partName, l.quantity, l.reasons.join('|')]),
    ]);
}
