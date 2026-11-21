import { buildPurchasingReport } from '../../engineering-engine/src/purchasing.js';
function key(v) { return String(v ?? '').trim().toLowerCase(); }
function reqSku(req) {
    return req.code?.trim() || req.sourceKey || req.description;
}
export function buildBomAllocationPlan(projects, state) {
    const available = new Map();
    const itemsBySku = new Map();
    for (const item of state.warehouseItems) {
        itemsBySku.set(key(item.sku), item);
        const activeReserved = state.warehouseReservations.filter(r => r.itemId === item.id && r.status === 'reserved').reduce((s, r) => s + r.quantity, 0);
        available.set(item.id, Math.max(0, item.onHand - activeReserved));
    }
    const demands = [];
    for (const row of [...projects].sort((a, b) => a.queuePosition - b.queuePosition)) {
        const report = buildPurchasingReport(row.project, row.engineering);
        const grouped = new Map();
        for (const req of report.requirements) {
            const sku = reqSku(req), unit = req.unit, gk = `${key(sku)}|${unit}`;
            const prev = grouped.get(gk);
            if (prev)
                prev.required += Number(req.quantity);
            else
                grouped.set(gk, { sku, description: req.description, unit, required: Number(req.quantity) });
        }
        for (const req of grouped.values()) {
            const item = itemsBySku.get(key(req.sku));
            const existingReserved = item ? state.warehouseReservations.filter(r => r.itemId === item.id && r.projectId === row.project.projectId && r.status === 'reserved').reduce((s, r) => s + r.quantity, 0) : 0;
            const need = Math.max(0, req.required - existingReserved);
            const free = item ? (available.get(item.id) ?? 0) : 0;
            const allocated = Math.min(need, free);
            if (item)
                available.set(item.id, free - allocated);
            demands.push({
                projectId: row.project.projectId, projectTitle: row.project.title, queuePosition: row.queuePosition,
                sku: req.sku, description: req.description, unit: req.unit, required: Number(req.required.toFixed(3)),
                existingReserved: Number(existingReserved.toFixed(3)), allocatedFromFreeStock: Number(allocated.toFixed(3)),
                shortage: Number(Math.max(0, need - allocated).toFixed(3))
            });
        }
    }
    const grouped = new Map();
    for (const d of demands)
        grouped.set(d.projectId, (grouped.get(d.projectId) ?? true) && d.shortage <= 1e-9);
    return {
        version: '5.0.0', demands,
        shortageCount: demands.filter(x => x.shortage > 1e-9).length,
        totalShortageQuantity: Number(demands.reduce((s, x) => s + x.shortage, 0).toFixed(3)),
        canFullyAllocateProjectIds: [...grouped].filter(([, ok]) => ok).map(([id]) => id),
        blockedProjectIds: [...grouped].filter(([, ok]) => !ok).map(([id]) => id)
    };
}
export function compareSupplierQuotesForShortage(state, shortage, strategy = 'optimal') {
    const supplierById = new Map(state.suppliers.map(s => [s.id, s]));
    const candidates = (state.supplierQuotes ?? []).flatMap(q => {
        const supplier = supplierById.get(q.supplierId);
        if (!supplier || !supplier.active)
            return [];
        const line = q.lines.find(l => key(l.sku) === key(shortage.sku));
        if (!line || line.quantity < shortage.shortage)
            return [];
        const itemCost = Math.round(line.unitPriceMinor * shortage.shortage);
        const totalCost = itemCost + (q.deliveryCostMinor ?? 0);
        const lead = q.leadTimeDays || supplier.leadTimeDays;
        return [{ quoteId: q.id, supplierId: supplier.id, supplierName: supplier.name, sku: shortage.sku,
                quantity: shortage.shortage, unit: shortage.unit, unitPriceMinor: line.unitPriceMinor,
                deliveryCostMinor: q.deliveryCostMinor ?? 0, totalCostMinor: totalCost, leadTimeDays: lead,
                reliabilityPct: supplier.reliabilityPct, defectPct: supplier.defectPct, validUntil: q.validUntil ?? null }];
    });
    if (!candidates.length)
        return [];
    const minCost = Math.min(...candidates.map(x => x.totalCostMinor)), maxCost = Math.max(...candidates.map(x => x.totalCostMinor));
    const minLead = Math.min(...candidates.map(x => x.leadTimeDays)), maxLead = Math.max(...candidates.map(x => x.leadTimeDays));
    const scored = candidates.map(x => {
        const priceScore = maxCost === minCost ? 100 : 100 - (x.totalCostMinor - minCost) / (maxCost - minCost) * 100;
        const speedScore = maxLead === minLead ? 100 : 100 - (x.leadTimeDays - minLead) / (maxLead - minLead) * 100;
        const reliabilityScore = Math.max(0, Math.min(100, x.reliabilityPct - x.defectPct * 2));
        const score = Number((priceScore * .35 + speedScore * .25 + reliabilityScore * .40).toFixed(1));
        return { ...x, priceScore: Number(priceScore.toFixed(1)), speedScore: Number(speedScore.toFixed(1)), reliabilityScore, score };
    });
    return scored.sort((a, b) => strategy === 'cheapest' ? a.totalCostMinor - b.totalCostMinor :
        strategy === 'fastest' ? a.leadTimeDays - b.leadTimeDays : b.score - a.score);
}
export function buildPaymentCalendar(projects, state, currency = 'EUR') {
    const rows = [];
    for (const e of state.cashEvents.filter(x => x.currency === currency && x.status !== 'cancelled')) {
        rows.push({ date: e.dueAt, type: e.type, category: e.category, amountMinor: e.amountMinor,
            ...(e.projectId ? { projectId: e.projectId } : {}), ...(e.counterparty ? { counterparty: e.counterparty } : {}), source: 'cash_event' });
    }
    const awardPoIds = new Set(state.cashEvents.filter(x => x.source === 'procurement_award' && x.sourceId).map(x => x.sourceId));
    for (const p of projects) {
        const job = p.jobControl, contract = job?.money.contractValueMinor ?? 0, received = job?.money.receivedMinor ?? 0;
        const outstanding = Math.max(0, contract - received);
        const clientDue = job?.targetInstallationAt ?? job?.targetDeliveryAt;
        if (outstanding > 0 && clientDue)
            rows.push({ date: clientDue, type: 'inflow', category: 'client_receivable', amountMinor: outstanding, projectId: p.projectId, counterparty: job?.client.name, source: 'project' });
        for (const o of p.purchaseOrders ?? []) {
            if (awardPoIds.has(o.id))
                continue;
            if (!['approved', 'ordered', 'partially_received'].includes(o.status))
                continue;
            const remaining = o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * Math.max(0, l.quantity - (l.receivedQuantity ?? 0)), 0);
            const due = o.expectedAt ?? o.orderedAt;
            if (remaining > 0 && due)
                rows.push({ date: due, type: 'outflow', category: 'supplier', amountMinor: remaining, projectId: p.projectId, counterparty: o.supplierName, source: 'purchase_order' });
        }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'outflow' ? -1 : 1));
    let running = 0;
    return rows.map(x => ({ ...x, runningNetMinor: (running += x.type === 'inflow' ? x.amountMinor : -x.amountMinor) }));
}
