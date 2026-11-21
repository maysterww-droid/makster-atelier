import { toMm } from '../../project-model/src/types.js';
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r & 3) | 8; return v.toString(16); }); }
function materialLabel(project, id) {
    const m = id ? project.selections.materials.find(x => x.id === id) : undefined;
    return m ? [m.manufacturer, m.code, m.name].filter(Boolean).join(' · ') || m.id : 'UNRESOLVED PANEL MATERIAL';
}
function hardwareLabel(project, id, fallback = 'Hardware') {
    const h = id ? project.selections.hardware.find(x => x.id === id) : undefined;
    return h ? [h.manufacturer, h.code, h.name].filter(Boolean).join(' · ') || fallback : fallback;
}
export function buildPurchasingReport(project, eng) {
    const requirements = [];
    for (const item of eng.bom) {
        if (item.kind === 'panel_material') {
            requirements.push({
                id: `material:${item.materialSelectionId ?? 'unresolved'}:${Number(item.thickness)}`,
                kind: 'material',
                sourceKey: `material:${item.materialSelectionId ?? 'unresolved'}:${Number(item.thickness)}`,
                description: `${materialLabel(project, item.materialSelectionId)} · ${toMm(item.thickness)} mm`,
                quantity: Number((item.totalAreaMm2 / 1_000_000).toFixed(3)),
                unit: 'm2',
                ...(item.materialSelectionId ? { code: project.selections.materials.find(x => x.id === item.materialSelectionId)?.code } : {}),
                ...(item.materialSelectionId ? { manufacturer: project.selections.materials.find(x => x.id === item.materialSelectionId)?.manufacturer } : {})
            });
        }
        else if (item.kind === 'hardware') {
            requirements.push({
                id: `hardware:${item.hardwareSelectionId ?? item.role}:${item.name}`,
                kind: 'hardware',
                sourceKey: `hardware:${item.hardwareSelectionId ?? item.role}:${item.name}`,
                description: hardwareLabel(project, item.hardwareSelectionId, item.name),
                quantity: item.quantity,
                unit: item.unit
            });
        }
    }
    let maksterApplianceCount = 0, customerApplianceCount = 0, undecidedApplianceCount = 0;
    for (const f of project.furniture) {
        for (const m of f.modules) {
            const apps = [...(m.kitchen?.appliances ?? []), ...(m.kitchen?.appliance ? [m.kitchen.appliance] : [])];
            apps.forEach((a, index) => {
                const mode = a.procurementMode ?? 'undecided';
                if (mode === 'makster_supplied')
                    maksterApplianceCount++;
                else if (mode === 'customer_supplied')
                    customerApplianceCount++;
                else
                    undecidedApplianceCount++;
                if (mode !== 'makster_supplied')
                    return;
                const purchasePrice = a.pricing?.verified === true && a.pricing?.purchasePrice != null ? Math.round(a.pricing.purchasePrice * 100) : undefined;
                requirements.push({
                    id: `appliance:${f.id}:${m.id}:${index}`,
                    kind: 'appliance', sourceKey: `appliance:${f.id}:${m.id}:${index}`,
                    description: [a.kind, a.manufacturer, a.model].filter(Boolean).join(' · '),
                    quantity: 1, unit: 'pcs', procurementMode: mode,
                    ...(a.manufacturer ? { manufacturer: a.manufacturer } : {}),
                    ...(a.model ? { code: a.model } : {}),
                    ...(purchasePrice != null ? { suggestedUnitPriceMinor: purchasePrice, priceVerified: true } : {}),
                    ...(f.id ? { furnitureId: f.id } : {}), ...(m.id ? { moduleId: m.id } : {}),
                    ...(a.catalogRecordId ? { applianceCatalogRecordId: a.catalogRecordId } : {})
                });
            });
        }
    }
    const orders = (project.purchaseOrders ?? []).filter(o => o.status !== 'cancelled');
    const orderValue = (o) => o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * l.quantity, 0);
    const receivedValue = (o) => o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * Math.min(l.quantity, l.receivedQuantity ?? 0), 0);
    const orderedValueMinor = orders.filter(o => ['ordered', 'partially_received', 'received'].includes(o.status)).reduce((s, o) => s + orderValue(o), 0);
    const receivedValueMinor = orders.reduce((s, o) => s + receivedValue(o), 0);
    const openOrderValueMinor = Math.max(0, orderedValueMinor - receivedValueMinor);
    return {
        version: '3.1.0', projectId: project.projectId, revision: project.revision,
        requirementCount: requirements.length,
        unresolvedRequirementCount: requirements.filter(x => x.kind === 'material' && x.description.startsWith('UNRESOLVED')).length +
            requirements.filter(x => x.kind === 'appliance' && x.suggestedUnitPriceMinor == null).length,
        maksterApplianceCount, customerApplianceCount, undecidedApplianceCount,
        orderCount: orders.length, orderedValueMinor, receivedValueMinor, openOrderValueMinor,
        requirements, orders: project.purchaseOrders ?? []
    };
}
function syncCommitted(snapshot) {
    if (!snapshot.jobControl)
        return;
    const active = (snapshot.purchaseOrders ?? []).filter(o => !['cancelled', 'draft'].includes(o.status));
    snapshot.jobControl.money.committedPurchaseMinor = active.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * l.quantity, 0), 0);
    const purchasingActual = active.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * Math.min(l.quantity, l.receivedQuantity ?? 0), 0), 0);
    const manualActual = (snapshot.costEntries ?? []).filter(x => x.basis === 'actual').reduce((s, x) => s + x.amountMinor, 0);
    snapshot.jobControl.money.actualCostMinor = purchasingActual + manualActual;
    snapshot.jobControl.updatedAt = new Date().toISOString();
}
export function createPurchaseOrder(project, input) {
    if (!input.supplierName.trim())
        throw new Error('purchase_supplier_required');
    if (!input.lines.length)
        throw new Error('purchase_order_lines_required');
    const snapshot = structuredClone(project);
    snapshot.purchaseOrders ??= [];
    const order = {
        id: uuid(), supplierName: input.supplierName.trim(), status: 'draft', currency: (input.currency ?? project.currency),
        lines: input.lines.map(l => ({ id: uuid(), ...l, quantity: Math.max(0, Number(l.quantity) || 0), receivedQuantity: Math.max(0, Number(l.receivedQuantity ?? 0) || 0) })),
        createdBy: input.createdBy.trim() || 'buyer', createdAt: new Date().toISOString(), sourceRevision: project.revision,
        ...(input.note ? { note: input.note } : {}), ...(input.expectedAt ? { expectedAt: input.expectedAt } : {})
    };
    snapshot.purchaseOrders.push(order);
    snapshot.revision = project.revision + 1;
    syncCommitted(snapshot);
    return { snapshot, order };
}
export function updatePurchaseOrderStatus(project, id, input) {
    const snapshot = structuredClone(project), order = snapshot.purchaseOrders?.find(o => o.id === id);
    if (!order)
        throw new Error('purchase_order_not_found');
    if (order.status === 'cancelled')
        throw new Error('purchase_order_cancelled');
    const now = new Date().toISOString();
    order.status = input.status;
    if (input.supplierReference != null)
        order.supplierReference = input.supplierReference;
    if (input.expectedAt)
        order.expectedAt = input.expectedAt;
    if (input.status === 'approved') {
        order.approvedBy = input.actor;
        order.approvedAt = now;
    }
    if (input.status === 'ordered')
        order.orderedAt = now;
    if (input.status === 'received') {
        order.receivedAt = now;
        for (const l of order.lines)
            l.receivedQuantity = l.quantity;
    }
    snapshot.revision = project.revision + 1;
    syncCommitted(snapshot);
    return { snapshot, order };
}
export function receivePurchaseLine(project, orderId, lineId, quantity) {
    const snapshot = structuredClone(project), order = snapshot.purchaseOrders?.find(o => o.id === orderId);
    if (!order)
        throw new Error('purchase_order_not_found');
    const line = order.lines.find(l => l.id === lineId);
    if (!line)
        throw new Error('purchase_line_not_found');
    line.receivedQuantity = Math.max(0, Math.min(line.quantity, Number(quantity) || 0));
    const all = order.lines.every(l => (l.receivedQuantity ?? 0) >= l.quantity);
    const any = order.lines.some(l => (l.receivedQuantity ?? 0) > 0);
    order.status = all ? 'received' : any ? 'partially_received' : order.status;
    if (all)
        order.receivedAt = new Date().toISOString();
    snapshot.revision = project.revision + 1;
    syncCommitted(snapshot);
    return { snapshot, order };
}
