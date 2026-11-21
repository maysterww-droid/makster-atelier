import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { CLIENT_CHANGE_ORDER_VERSION } from './types.js';
function canonical(v) { if (Array.isArray(v))
    return '[' + v.map(canonical).join(',') + ']'; if (v && typeof v === 'object') {
    const o = v;
    return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
} return JSON.stringify(v); }
export function sha256(v) { return createHash('sha256').update(typeof v === 'string' ? v : canonical(v)).digest('hex'); }
function assertMinor(v, name) { if (!Number.isSafeInteger(v) || v < 0)
    throw new Error(`${name}_must_be_nonnegative_integer_minor_units`); }
function makePublicReference(id) { return `MCO-${id.replaceAll('-', '').slice(0, 10).toUpperCase()}`; }
export function validatePaymentTemplate(template) {
    if (!Array.isArray(template) || template.length === 0)
        throw new Error('payment_template_required');
    const ids = new Set();
    let total = 0;
    for (const item of template) {
        if (!item.id || !item.label)
            throw new Error('payment_template_item_invalid');
        if (ids.has(item.id))
            throw new Error('payment_template_duplicate_id');
        ids.add(item.id);
        if (!Number.isInteger(item.shareBps) || item.shareBps < 0 || item.shareBps > 10000)
            throw new Error('payment_template_share_invalid');
        total += item.shareBps;
    }
    if (total !== 10000)
        throw new Error('payment_template_must_total_10000_bps');
}
function allocateByBps(totalMinor, template) {
    assertMinor(totalMinor, 'contract_total');
    validatePaymentTemplate(template);
    const base = template.map(x => Math.floor(totalMinor * x.shareBps / 10000));
    let remainder = totalMinor - base.reduce((a, b) => a + b, 0);
    const order = template.map((x, i) => ({ i, frac: (totalMinor * x.shareBps) % 10000 })).sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; k < remainder; k++)
        base[order[k % order.length].i] += 1;
    return base;
}
export function createCommercialContract(input) {
    assertMinor(input.agreedAmountMinor, 'agreed_amount');
    validatePaymentTemplate(input.paymentTemplate);
    const contractId = input.contractId ?? randomUUID();
    const now = input.now ?? new Date().toISOString();
    const amounts = allocateByBps(input.agreedAmountMinor, input.paymentTemplate);
    const paymentSchedule = input.paymentTemplate.map((t, i) => ({ installmentId: randomUUID(), label: t.label, amountMinor: amounts[i], status: 'scheduled', ...(t.dueTrigger ? { dueTrigger: t.dueTrigger } : {}) }));
    const core = { contractId, projectId: input.projectId, ...(input.organizationId ? { organizationId: input.organizationId } : {}), currency: input.currency, status: 'active', initialRevision: input.revision, initialQuoteId: input.quoteId, currentRevision: input.revision, currentQuoteId: input.quoteId, agreedAmountMinor: input.agreedAmountMinor, paymentTemplate: structuredClone(input.paymentTemplate), paymentSchedule, updatedAt: now };
    return { ...core, fingerprintSha256: sha256(core) };
}
export function markInstallmentPaid(contract, installmentId, paidAmountMinor, now = new Date().toISOString()) {
    const copy = structuredClone(contract);
    const item = copy.paymentSchedule.find(x => x.installmentId === installmentId);
    if (!item)
        throw new Error('payment_installment_not_found');
    if (item.status === 'waived')
        throw new Error('payment_installment_waived');
    const amount = paidAmountMinor ?? item.amountMinor;
    assertMinor(amount, 'paid_amount');
    if (amount !== item.amountMinor)
        throw new Error('partial_payment_not_supported_v1_8');
    item.status = 'paid';
    item.paidAmountMinor = amount;
    item.paidAt = now;
    copy.updatedAt = now;
    copy.fingerprintSha256 = sha256({ ...copy, fingerprintSha256: undefined });
    return copy;
}
export function rebalancePaymentSchedule(contract, newTotalMinor, now = new Date().toISOString()) {
    assertMinor(newTotalMinor, 'new_contract_total');
    const copy = structuredClone(contract);
    const paid = copy.paymentSchedule.filter(x => x.status === 'paid');
    const paidTotal = paid.reduce((s, x) => s + (x.paidAmountMinor ?? x.amountMinor), 0);
    if (newTotalMinor < paidTotal)
        throw new Error('new_contract_total_below_already_paid');
    const remaining = newTotalMinor - paidTotal;
    const openTemplate = copy.paymentTemplate.filter(t => { const inst = copy.paymentSchedule.find(x => x.label === t.label); return inst?.status !== 'paid'; });
    if (openTemplate.length === 0 && remaining !== 0)
        throw new Error('no_open_installments_for_contract_delta');
    if (openTemplate.length) {
        const weight = openTemplate.reduce((s, x) => s + x.shareBps, 0);
        const normalized = openTemplate.map((x, i) => ({ ...x, shareBps: i === openTemplate.length - 1 ? 10000 - Math.round(openTemplate.slice(0, -1).reduce((s, y) => s + y.shareBps, 0) * 10000 / weight) : Math.round(x.shareBps * 10000 / weight) }));
        const allocated = allocateByBps(remaining, normalized);
        for (let i = 0; i < openTemplate.length; i++) {
            const t = openTemplate[i];
            const inst = copy.paymentSchedule.find(x => x.label === t.label);
            if (inst)
                inst.amountMinor = allocated[i];
        }
    }
    copy.agreedAmountMinor = newTotalMinor;
    copy.updatedAt = now;
    copy.fingerprintSha256 = sha256({ ...copy, fingerprintSha256: undefined });
    return copy;
}
export function createClientChangeOrder(input) {
    const b = input.baseQuote.quote, n = input.newQuote.quote, r = input.report;
    if (b.projectId !== n.projectId || b.projectId !== r.projectId)
        throw new Error('change_order_project_mismatch');
    if (b.revision !== r.fromRevision || n.revision !== r.toRevision)
        throw new Error('change_order_revision_mismatch');
    if (!input.newQuote.estimate.ready)
        throw new Error('change_order_new_quote_not_ready');
    if (r.status === 'blocked')
        throw new Error('change_order_report_blocked');
    if (b.currency !== n.currency || b.currency !== input.summary.currency)
        throw new Error('change_order_currency_mismatch');
    const id = input.changeOrderId ?? randomUUID();
    const binding = { projectId: b.projectId, fromRevision: b.revision, toRevision: n.revision, baseQuoteId: b.quoteId, newQuoteId: n.quoteId, baseQuoteFingerprintSha256: b.quoteFingerprint, newQuoteFingerprintSha256: n.quoteFingerprint, changeReportId: r.reportId, changeReportFingerprintSha256: r.fingerprintSha256, currency: n.currency, previousTotalMinor: b.totalAmountMinor, newTotalMinor: n.totalAmountMinor, deltaMinor: n.totalAmountMinor - b.totalAmountMinor };
    return { changeOrderVersion: CLIENT_CHANGE_ORDER_VERSION, changeOrderId: id, publicReference: input.publicReference ?? makePublicReference(id), status: 'draft', binding, summary: structuredClone(input.summary), createdAt: input.createdAt ?? new Date().toISOString(), ...(input.validUntil ? { validUntil: input.validUntil } : {}) };
}
export function issueChangeOrderToken(order, now = new Date().toISOString()) {
    if (!['draft', 'sent'].includes(order.status))
        throw new Error('change_order_cannot_be_sent');
    const token = randomBytes(32).toString('base64url');
    const next = structuredClone(order);
    next.status = 'sent';
    next.sentAt = now;
    next.approvalTokenHashSha256 = sha256(token);
    return { order: next, token };
}
export function verifyChangeOrderToken(order, token, now = new Date().toISOString()) {
    if (!order.approvalTokenHashSha256)
        throw new Error('change_order_token_not_issued');
    const actual = Buffer.from(sha256(token), 'hex'), expected = Buffer.from(order.approvalTokenHashSha256, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        throw new Error('change_order_token_invalid');
    if (order.validUntil && Date.parse(now) > Date.parse(order.validUntil))
        throw new Error('change_order_expired');
}
export function viewClientChangeOrder(order, token, now = new Date().toISOString()) { verifyChangeOrderToken(order, token, now); if (['accepted', 'declined', 'superseded'].includes(order.status))
    return order; return { ...order, status: 'viewed', viewedAt: order.viewedAt ?? now }; }
export function decideClientChangeOrder(input) {
    const now = input.now ?? new Date().toISOString();
    verifyChangeOrderToken(input.order, input.token, now);
    if (!['sent', 'viewed'].includes(input.order.status))
        throw new Error('change_order_not_decidable');
    if (!input.clientName.trim())
        throw new Error('client_name_required');
    const acceptanceCore = { changeOrderId: input.order.changeOrderId, binding: input.order.binding, decision: input.decision, clientName: input.clientName.trim(), decidedAt: now };
    const next = structuredClone(input.order);
    next.status = input.decision === 'accepted' ? 'accepted' : 'declined';
    next.decidedAt = now;
    next.decision = { decision: input.decision, clientName: input.clientName.trim(), ...(input.clientEmail ? { clientEmail: input.clientEmail.trim() } : {}), ...(input.userAgent ? { userAgent: input.userAgent } : {}), ...(input.ip ? { ipHashSha256: sha256(input.ip) } : {}), acceptanceFingerprintSha256: sha256(acceptanceCore) };
    return next;
}
export function applyAcceptedChangeOrder(input) {
    const now = input.now ?? new Date().toISOString();
    const o = input.order;
    if (o.status !== 'accepted' || o.decision?.decision !== 'accepted')
        throw new Error('change_order_not_accepted');
    if (input.contract.projectId !== o.binding.projectId || input.contract.currentRevision !== o.binding.fromRevision || input.contract.currentQuoteId !== o.binding.baseQuoteId)
        throw new Error('contract_change_order_binding_mismatch');
    if (input.contract.currency !== o.binding.currency)
        throw new Error('contract_change_order_currency_mismatch');
    let contract = rebalancePaymentSchedule(input.contract, o.binding.newTotalMinor, now);
    contract.currentRevision = o.binding.toRevision;
    contract.currentQuoteId = o.binding.newQuoteId;
    contract.updatedAt = now;
    contract.fingerprintSha256 = sha256({ ...contract, fingerprintSha256: undefined });
    const authCore = { projectId: o.binding.projectId, revision: o.binding.toRevision, quoteId: o.binding.newQuoteId, changeOrderId: o.changeOrderId, contractId: contract.contractId, acceptedAt: now, agreedAmountMinor: o.binding.newTotalMinor, currency: o.binding.currency };
    const authorization = { authorizationId: randomUUID(), ...authCore, authorizationFingerprintSha256: sha256(authCore) };
    return { contract, authorization };
}
export function productionCommercialGate(input) {
    if (!input.contract)
        return { allowed: true, code: 'NO_COMMERCIAL_CONTRACT_GATE', message: 'No active commercial contract: legacy/uncontracted workflow.' };
    if (input.contract.status !== 'active')
        return { allowed: false, code: 'COMMERCIAL_CONTRACT_NOT_ACTIVE', message: 'Commercial contract is not active.' };
    if (input.contract.projectId !== input.projectId)
        return { allowed: false, code: 'COMMERCIAL_CONTRACT_PROJECT_MISMATCH', message: 'Commercial contract belongs to another project.' };
    if (input.contract.currentRevision !== input.revision)
        return { allowed: false, code: 'REVISION_NOT_CURRENTLY_CONTRACTED', message: `Revision ${input.revision} is not the currently agreed contract revision ${input.contract.currentRevision}.` };
    if (input.contract.currentRevision === input.contract.initialRevision && input.revision === input.contract.initialRevision)
        return { allowed: true, code: 'BASE_CONTRACT_ACCEPTED', message: 'Base contracted revision is eligible for production.' };
    if (!input.authorization || input.authorization.projectId !== input.projectId || input.authorization.revision !== input.revision || input.authorization.contractId !== input.contract.contractId)
        return { allowed: false, code: 'CLIENT_CHANGE_APPROVAL_REQUIRED', message: 'Client approval for this changed revision is required before manufacturing approval.' };
    return { allowed: true, code: 'CLIENT_CHANGE_APPROVED', message: 'Client-approved revision is eligible for manufacturing approval.' };
}
export function clientChangeOrderHtml(order) {
    const e = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const money = (v) => `${(v / 100).toFixed(2)} ${e(order.binding.currency)}`;
    const rows = order.summary.changes.map(c => `<tr><td>${e(c.label)}</td><td>${e(c.beforeText ?? '—')}</td><td>${e(c.afterText ?? '—')}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${e(order.publicReference)}</title><style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;color:#151515}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.price{font-size:24px;font-weight:700}.muted{color:#666}</style></head><body><h1>Project Change Order</h1><p>${e(order.publicReference)} · Revision ${order.binding.fromRevision} → ${order.binding.toRevision}</p><table><thead><tr><th>Change</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table><p>Previous total: <strong>${money(order.binding.previousTotalMinor)}</strong></p><p>New total: <strong>${money(order.binding.newTotalMinor)}</strong></p><p class="price">Change: ${order.binding.deltaMinor >= 0 ? '+' : ''}${money(order.binding.deltaMinor)}</p><p class="muted">Approval is bound to the exact project revision, change report and commercial quote fingerprints shown by Makster. Internal cost and profit data are not included.</p></body></html>`;
}
export function customerSafeChangeOrder(order) {
    return {
        changeOrderVersion: order.changeOrderVersion,
        changeOrderId: order.changeOrderId,
        publicReference: order.publicReference,
        status: order.status,
        binding: order.binding,
        summary: order.summary,
        createdAt: order.createdAt,
        ...(order.validUntil ? { validUntil: order.validUntil } : {}),
        ...(order.sentAt ? { sentAt: order.sentAt } : {}),
        ...(order.viewedAt ? { viewedAt: order.viewedAt } : {}),
        ...(order.decidedAt ? { decidedAt: order.decidedAt } : {}),
        ...(order.decision ? { decision: { decision: order.decision.decision, clientName: order.decision.clientName, ...(order.decision.clientEmail ? { clientEmail: order.decision.clientEmail } : {}), acceptanceFingerprintSha256: order.decision.acceptanceFingerprintSha256 } } : {})
    };
}
export function commercialContractHtml(contract, projectTitle = 'Makster project') {
    const e = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const money = (v) => `${(v / 100).toFixed(2)} ${e(contract.currency)}`;
    const rows = contract.paymentSchedule.map(x => `<tr><td>${e(x.label)}</td><td>${money(x.amountMinor)}</td><td>${e(x.status)}</td><td>${e(x.paidAt ?? '—')}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Commercial Contract Record</title><style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;color:#151515}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:24px;font-weight:700}.muted{color:#666}</style></head><body><h1>Commercial Contract Record</h1><p>${e(projectTitle)}</p><p>Contract: <strong>${e(contract.contractId)}</strong></p><p>Agreed Project Revision: <strong>${contract.currentRevision}</strong> · Quote: <strong>${e(contract.currentQuoteId)}</strong></p><p class="total">${money(contract.agreedAmountMinor)}</p><h2>Payment schedule</h2><table><thead><tr><th>Stage</th><th>Amount</th><th>Status</th><th>Paid at</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">This record binds the commercial amount and payment schedule to the exact Makster Project Revision and Quote. Jurisdiction-specific legal clauses, warranty wording and statutory consumer terms must be supplied by the organization’s approved legal template.</p></body></html>`;
}
