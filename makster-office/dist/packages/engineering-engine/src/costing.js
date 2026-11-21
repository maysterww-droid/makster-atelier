function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r & 3) | 8; return v.toString(16); }); }
function activeOrders(project) {
    return (project.purchaseOrders ?? []).filter(o => !['draft', 'cancelled'].includes(o.status));
}
function orderCommitted(project) {
    return activeOrders(project).reduce((sum, o) => sum + o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * l.quantity, 0), 0);
}
function orderActual(project) {
    return activeOrders(project).reduce((sum, o) => sum + o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * Math.min(l.quantity, l.receivedQuantity ?? 0), 0), 0);
}
function pct(value, base) { return base > 0 ? Number((value / base * 100).toFixed(1)) : 0; }
export function buildCostingReport(project) {
    const entries = project.costEntries ?? [];
    const manualEstimateMinor = entries.filter(x => x.basis === 'estimate').reduce((s, x) => s + x.amountMinor, 0);
    const manualActualMinor = entries.filter(x => x.basis === 'actual').reduce((s, x) => s + x.amountMinor, 0);
    const purchasingCommittedMinor = orderCommitted(project);
    const purchasingActualMinor = orderActual(project);
    const totalEstimateMinor = purchasingCommittedMinor + manualEstimateMinor;
    const totalActualMinor = purchasingActualMinor + manualActualMinor;
    const remainingForecastMinor = Math.max(0, totalEstimateMinor - totalActualMinor);
    const contractValueMinor = project.jobControl?.money.contractValueMinor ?? 0;
    const forecastMarginMinor = contractValueMinor - totalEstimateMinor;
    const actualMarginMinor = contractValueMinor - totalActualMinor;
    const cats = ['material', 'hardware', 'appliance', 'labor', 'installation', 'transport', 'subcontract', 'overhead', 'other'];
    const purchaseByCat = new Map();
    for (const c of cats)
        purchaseByCat.set(c, { estimate: 0, actual: 0 });
    for (const o of activeOrders(project))
        for (const l of o.lines) {
            const cat = l.kind === 'material' ? 'material' : l.kind === 'hardware' ? 'hardware' : l.kind === 'appliance' ? 'appliance' : l.kind === 'service' ? 'subcontract' : 'other';
            const bucket = purchaseByCat.get(cat);
            bucket.estimate += (l.unitPriceMinor ?? 0) * l.quantity;
            bucket.actual += (l.unitPriceMinor ?? 0) * Math.min(l.quantity, l.receivedQuantity ?? 0);
        }
    const categories = cats.map(category => {
        const p = purchaseByCat.get(category);
        const estimateMinor = p.estimate + entries.filter(x => x.category === category && x.basis === 'estimate').reduce((s, x) => s + x.amountMinor, 0);
        const actualMinor = p.actual + entries.filter(x => x.category === category && x.basis === 'actual').reduce((s, x) => s + x.amountMinor, 0);
        return { category, estimateMinor, actualMinor, varianceMinor: actualMinor - estimateMinor };
    });
    return {
        version: '3.2.0', projectId: project.projectId, revision: project.revision,
        currency: project.jobControl?.money.currency ?? project.currency,
        contractValueMinor, purchasingCommittedMinor, purchasingActualMinor, manualEstimateMinor, manualActualMinor,
        totalEstimateMinor, totalActualMinor, remainingForecastMinor,
        forecastMarginMinor, forecastMarginPercent: pct(forecastMarginMinor, contractValueMinor),
        actualMarginMinor, actualMarginPercent: pct(actualMarginMinor, contractValueMinor),
        estimateVarianceMinor: totalActualMinor - totalEstimateMinor, categories, entries
    };
}
function syncJobActual(snapshot) {
    if (!snapshot.jobControl)
        return;
    const report = buildCostingReport(snapshot);
    snapshot.jobControl.money.committedPurchaseMinor = report.purchasingCommittedMinor;
    snapshot.jobControl.money.actualCostMinor = report.totalActualMinor;
    snapshot.jobControl.updatedAt = new Date().toISOString();
}
export function addProjectCostEntry(project, input) {
    if (!input.description.trim())
        throw new Error('cost_description_required');
    if (!Number.isFinite(input.amountMinor) || input.amountMinor < 0)
        throw new Error('cost_amount_invalid');
    const snapshot = structuredClone(project);
    snapshot.costEntries ??= [];
    const entry = {
        id: uuid(), category: input.category, basis: input.basis, description: input.description.trim(),
        amountMinor: Math.round(input.amountMinor), currency: snapshot.jobControl?.money.currency ?? snapshot.currency,
        source: 'manual', createdBy: input.createdBy.trim() || 'owner', createdAt: new Date().toISOString(),
        ...(input.note ? { note: input.note } : {})
    };
    snapshot.costEntries.push(entry);
    snapshot.revision = project.revision + 1;
    syncJobActual(snapshot);
    return { snapshot, entry, report: buildCostingReport(snapshot) };
}
export function deleteProjectCostEntry(project, id) {
    const snapshot = structuredClone(project);
    const before = (snapshot.costEntries ?? []).length;
    snapshot.costEntries = (snapshot.costEntries ?? []).filter(x => x.id !== id);
    if (snapshot.costEntries.length === before)
        throw new Error('cost_entry_not_found');
    snapshot.revision = project.revision + 1;
    syncJobActual(snapshot);
    return { snapshot, report: buildCostingReport(snapshot) };
}
