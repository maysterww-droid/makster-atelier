import { createHash, randomUUID } from 'node:crypto';
import { createSupplierOrder, receivingSummary } from '../../supplier-operations/src/index.js';
import { PROCUREMENT_INTELLIGENCE_VERSION } from './types.js';
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function clamp100(value) { return Math.max(0, Math.min(100, value)); }
function round2(value) { return Math.round(value * 100) / 100; }
function includesAll(haystack, needles) { return needles.every(x => haystack.includes(x)); }
export function productionPackManifestFingerprint(pack) {
    return sha256(JSON.stringify(pack.manifest));
}
export function eligibleSuppliersForPack(pack, suppliers, currency, deliveryRequired = false) {
    if (pack.manifest.route !== 'outsource')
        return [];
    return suppliers.filter(s => s.active
        && s.currencies.includes(currency)
        && includesAll(s.services, pack.manifest.services)
        && (!deliveryRequired || s.deliveryModes.some(m => m !== 'pickup')));
}
export function createSupplierRfq(input) {
    if (input.pack.manifest.route !== 'outsource')
        throw new Error('rfq_requires_outsource_pack');
    if (!input.pack.manifest.ready)
        throw new Error('rfq_requires_ready_production_pack');
    if (!input.pack.manifest.outsourcePreset)
        throw new Error('rfq_missing_outsource_preset');
    const eligible = eligibleSuppliersForPack(input.pack, input.suppliers, input.currency, input.deliveryRequired ?? false);
    if (eligible.length === 0)
        throw new Error('rfq_has_no_eligible_suppliers');
    return {
        procurementVersion: PROCUREMENT_INTELLIGENCE_VERSION,
        rfqId: input.rfqId ?? randomUUID(),
        projectId: input.pack.manifest.projectId,
        revision: input.pack.manifest.revision,
        productionPackId: input.pack.manifest.packId,
        productionPackManifestSha256: productionPackManifestFingerprint(input.pack),
        outsourcePreset: input.pack.manifest.outsourcePreset,
        services: [...input.pack.manifest.services],
        currency: input.currency,
        invitedSupplierIds: eligible.map(s => s.id).filter((id) => Boolean(id)),
        requestedAt: input.requestedAt ?? new Date().toISOString(),
        ...(input.responseDeadline ? { responseDeadline: input.responseDeadline } : {}),
        deliveryRequired: input.deliveryRequired ?? false,
        ...(input.notes ? { notes: input.notes } : {}),
    };
}
export function validateQuote(rfq, quote, supplier) {
    const errors = [];
    if (quote.rfqId !== rfq.rfqId)
        errors.push('quote_rfq_mismatch');
    if (supplier.id !== quote.supplierId)
        errors.push('quote_supplier_mismatch');
    if (!rfq.invitedSupplierIds.includes(quote.supplierId))
        errors.push('supplier_not_invited');
    if (quote.currency !== rfq.currency)
        errors.push('quote_currency_mismatch');
    if (!(quote.basePrice >= 0) || !(quote.deliveryPrice >= 0) || quote.totalPrice !== round2(quote.basePrice + quote.deliveryPrice))
        errors.push('quote_total_invalid');
    if (!Number.isFinite(quote.leadDays) || quote.leadDays <= 0)
        errors.push('quote_lead_days_invalid');
    if (!includesAll(quote.services, rfq.services))
        errors.push('quote_services_incomplete');
    if (!includesAll(supplier.services, rfq.services))
        errors.push('supplier_capability_incomplete');
    if (!supplier.deliveryModes.includes(quote.deliveryMode))
        errors.push('quote_delivery_mode_unsupported');
    if (rfq.deliveryRequired && quote.deliveryMode === 'pickup')
        errors.push('delivery_required');
    if (supplier.minimumOrder != null && quote.totalPrice < supplier.minimumOrder)
        errors.push('below_supplier_minimum_order');
    return [...new Set(errors)];
}
export function calculateSupplierPerformance(input) {
    const orders = input.orders.filter(o => o.supplier.id === input.supplierId && ['received', 'partially_received', 'ready'].includes(o.status));
    let completedOrders = 0;
    let onTimeOrders = 0;
    let receivedUnits = 0;
    let problemUnits = 0;
    let reworkOrders = 0;
    for (const order of orders) {
        const receipts = input.receiptsByOrder.get(order.orderId) ?? [];
        const summary = receivingSummary(order, receipts);
        if (summary.totalAccepted > 0 || summary.complete)
            completedOrders += 1;
        if (order.promisedAt && order.readyAt && new Date(order.readyAt).getTime() <= new Date(order.promisedAt).getTime())
            onTimeOrders += 1;
        receivedUnits += summary.totalAccepted + summary.totalProblem;
        problemUnits += summary.totalProblem;
        if (summary.totalProblem > 0)
            reworkOrders += 1;
    }
    const onTimeRate = completedOrders ? onTimeOrders / completedOrders : 0.8;
    const problemRate = receivedUnits ? problemUnits / receivedUnits : 0.02;
    const reworkRate = completedOrders ? reworkOrders / completedOrders : 0.1;
    // Conservative score: quality problems weigh most, then on-time performance, then rework frequency.
    const qualityScore = clamp100(100 * (0.55 * (1 - problemRate) + 0.35 * onTimeRate + 0.10 * (1 - reworkRate)));
    return { supplierId: input.supplierId, completedOrders, onTimeOrders, receivedUnits, problemUnits, reworkOrders, onTimeRate: round2(onTimeRate), problemRate: round2(problemRate), reworkRate: round2(reworkRate), qualityScore: round2(qualityScore) };
}
export const STRATEGY_WEIGHTS = {
    balanced: { price: 0.35, leadTime: 0.20, quality: 0.25, serviceFit: 0.10, logistics: 0.10 },
    cheapest: { price: 0.65, leadTime: 0.10, quality: 0.10, serviceFit: 0.10, logistics: 0.05 },
    fastest: { price: 0.15, leadTime: 0.55, quality: 0.15, serviceFit: 0.10, logistics: 0.05 },
    quality_first: { price: 0.15, leadTime: 0.15, quality: 0.50, serviceFit: 0.10, logistics: 0.10 },
};
export function compareSupplierQuotes(input) {
    const strategy = input.strategy ?? 'balanced';
    const weights = STRATEGY_WEIGHTS[strategy];
    const supplierMap = new Map(input.suppliers.map(s => [s.id, s]));
    const perfMap = new Map((input.performance ?? []).map(p => [p.supplierId, p]));
    const submitted = input.quotes.filter(q => q.status === 'submitted');
    const eligiblePrices = submitted.map(q => q.totalPrice).filter(p => p > 0);
    const eligibleLeads = submitted.map(q => q.leadDays).filter(d => d > 0);
    const minPrice = Math.min(...eligiblePrices, Infinity);
    const minLead = Math.min(...eligibleLeads, Infinity);
    const ranking = submitted.map(q => {
        const supplier = supplierMap.get(q.supplierId);
        const perf = perfMap.get(q.supplierId) ?? { supplierId: q.supplierId, completedOrders: 0, onTimeOrders: 0, receivedUnits: 0, problemUnits: 0, reworkOrders: 0, onTimeRate: 0.8, problemRate: 0.02, reworkRate: 0.1, qualityScore: 86 };
        const warnings = [];
        if (!supplier)
            warnings.push('supplier_profile_missing');
        const errors = supplier ? validateQuote(input.rfq, q, supplier) : ['supplier_profile_missing'];
        warnings.push(...errors);
        if (perf.completedOrders < 3)
            warnings.push('limited_quality_history');
        const matched = input.rfq.services.filter(s => q.services.includes(s)).length;
        const priceScore = Number.isFinite(minPrice) && q.totalPrice > 0 ? clamp100(100 * minPrice / q.totalPrice) : 0;
        const leadScore = Number.isFinite(minLead) && q.leadDays > 0
            ? clamp100(100 / (1 + 0.05 * Math.max(0, q.leadDays - minLead)))
            : 0;
        const serviceFit = input.rfq.services.length ? clamp100(100 * matched / input.rfq.services.length) : 100;
        const logistics = input.rfq.deliveryRequired ? (q.deliveryMode === 'pickup' ? 0 : 100) : (q.deliveryMode === 'supplier_delivery' ? 100 : q.deliveryMode === 'carrier' ? 90 : 85);
        const total = priceScore * weights.price + leadScore * weights.leadTime + perf.qualityScore * weights.quality + serviceFit * weights.serviceFit + logistics * weights.logistics;
        return {
            quoteId: q.quoteId, supplierId: q.supplierId, supplierName: supplier?.name ?? q.supplierId, strategy,
            totalScore: round2(errors.length ? Math.min(total, 49.99) : total),
            components: { price: round2(priceScore), leadTime: round2(leadScore), quality: round2(perf.qualityScore), serviceFit: round2(serviceFit), logistics: round2(logistics) },
            facts: { totalPrice: q.totalPrice, leadDays: q.leadDays, qualityScore: perf.qualityScore, completedOrders: perf.completedOrders, servicesMatched: matched, servicesRequired: input.rfq.services.length, deliveryMode: q.deliveryMode },
            warnings: [...new Set(warnings)], eligible: errors.length === 0,
        };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.totalScore - a.totalScore || a.facts.totalPrice - b.facts.totalPrice);
    const recommended = ranking.find(r => r.eligible);
    return {
        procurementVersion: PROCUREMENT_INTELLIGENCE_VERSION,
        comparisonId: input.comparisonId ?? randomUUID(),
        rfqId: input.rfq.rfqId,
        strategy,
        weights,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        ranking,
        ...(recommended ? { recommendedQuoteId: recommended.quoteId } : {}),
    };
}
export function assertRfqMatchesPack(rfq, pack) {
    if (rfq.productionPackId !== pack.manifest.packId)
        throw new Error('rfq_pack_id_mismatch');
    if (rfq.projectId !== pack.manifest.projectId || rfq.revision !== pack.manifest.revision)
        throw new Error('rfq_revision_mismatch');
    if (rfq.productionPackManifestSha256 !== productionPackManifestFingerprint(pack))
        throw new Error('rfq_pack_manifest_drift');
}
export function awardSupplierQuote(input) {
    assertRfqMatchesPack(input.rfq, input.pack);
    const errors = validateQuote(input.rfq, input.quote, input.supplier);
    if (errors.length)
        throw new Error(`quote_not_awardable:${errors.join('|')}`);
    if (input.quote.status !== 'submitted')
        throw new Error(`quote_not_awardable_status:${input.quote.status}`);
    return createSupplierOrder({
        pack: input.pack,
        supplier: input.supplier,
        currency: input.quote.currency,
        quotedPrice: input.quote.totalPrice,
        ...(input.quote.promisedAt ? { promisedAt: input.quote.promisedAt } : {}),
        supplierReference: `RFQ ${input.rfq.rfqId} / Quote ${input.quote.quoteId}`,
        notes: `Awarded via Makster Procurement ${PROCUREMENT_INTELLIGENCE_VERSION}. Delivery: ${input.quote.deliveryMode}.`,
        ...(input.orderId ? { orderId: input.orderId } : {}),
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    });
}
