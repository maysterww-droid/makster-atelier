function asNumber(value) { return Number(value); }
export class SupabaseUnifiedBusinessStore {
    options;
    mode = 'supabase';
    constructor(options) {
        this.options = options;
    }
    headers(extra) { const h = { apikey: this.options.secretKey, 'content-type': 'application/json', ...(extra ?? {}) }; if (!this.options.secretKey.startsWith('sb_secret_'))
        h.authorization = `Bearer ${this.options.secretKey}`; return h; }
    async request(path, init = {}) {
        const response = await (this.options.fetchImpl ?? fetch)(`${this.options.url}/rest/v1/${path}`, { ...init, headers: this.headers(init.headers) });
        const text = await response.text();
        if (!response.ok)
            throw new Error(`supabase_business_${response.status}: ${text}`);
        return text ? JSON.parse(text) : undefined;
    }
    async rpc(name, body) { return this.request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }); }
    async insertIgnore(table, row, onConflict) {
        await this.request(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(row) });
    }
    async countProjectQuotes(projectId) {
        const rows = await this.request(`client_commercial_quotes?project_id=eq.${encodeURIComponent(projectId)}&select=id`, { method: 'GET' });
        return rows.length;
    }
    async saveCommercialPackage(input) {
        const { organizationId, built, context } = input;
        const e = built.estimate, q = built.quote, m = built.manifest;
        await this.insertIgnore('commercial_estimates', {
            id: e.estimateId, organization_id: organizationId, project_id: e.projectId, project_revision: e.revision, estimate_version: e.estimateVersion, currency: e.currency,
            pricing_profile_fingerprint_sha256: e.pricingProfileFingerprint, engineering_input_checksum: e.engineeringInputChecksum, ready: e.ready, estimate_fingerprint_sha256: e.estimateFingerprint,
            direct_cost_minor: e.totals.directCostMinor, overhead_minor: e.totals.overheadMinor, total_cost_minor: e.totals.totalCostMinor, net_sales_minor: e.totals.netSalesMinor, tax_minor: e.totals.taxMinor, gross_sales_minor: e.totals.grossSalesMinor, profit_minor: e.totals.profitMinor, margin_bps: e.totals.marginBps, markup_bps: e.totals.markupBps, estimate_json: e
        }, 'id');
        for (const line of e.lines)
            await this.insertIgnore('commercial_estimate_lines', { organization_id: organizationId, estimate_id: e.estimateId, line_key: line.id, category: line.category, label: line.label, quantity: line.quantity, unit: line.unit, unit_cost_minor: line.unitCostMinor, total_cost_minor: line.totalCostMinor, source: line.source, ...(line.sourceReference ? { source_reference: line.sourceReference } : {}), ...(line.targetId ? { target_id: line.targetId } : {}), ...(line.note ? { note: line.note } : {}) }, 'estimate_id,line_key');
        await this.insertIgnore('client_commercial_quotes', { id: q.quoteId, organization_id: organizationId, project_id: q.projectId, project_revision: q.revision, estimate_id: q.estimateId, quote_version: q.quoteVersion, client_name: q.clientName, currency: q.currency, issued_at: q.issuedAt, valid_until: q.validUntil, net_amount_minor: q.netAmountMinor, tax_minor: q.taxAmountMinor, total_amount_minor: q.totalAmountMinor, quote_fingerprint_sha256: q.quoteFingerprint, quote_json: q }, 'id');
        await this.insertIgnore('commercial_packages', { id: m.packageId, organization_id: organizationId, project_id: q.projectId, estimate_id: e.estimateId, quote_id: q.quoteId, manifest_json: m }, 'quote_id');
        await this.insertIgnore('commercial_package_snapshots', { quote_id: q.quoteId, organization_id: organizationId, project_id: q.projectId, package_json: built }, 'quote_id');
        await this.insertIgnore('commercial_quote_contexts', { quote_id: q.quoteId, organization_id: organizationId, project_id: q.projectId, context_json: context }, 'quote_id');
        await this.setQuoteStatus({ organizationId, quoteId: q.quoteId, status: input.status, createdAt: q.issuedAt });
    }
    async getCommercialPackage(quoteId) {
        const rows = await this.request(`commercial_package_snapshots?quote_id=eq.${encodeURIComponent(quoteId)}&select=package_json`, { method: 'GET' });
        return rows[0]?.package_json;
    }
    async listProjectQuotes(projectId) {
        const rows = await this.request(`client_commercial_quotes?project_id=eq.${encodeURIComponent(projectId)}&select=id&order=quote_version.asc`, { method: 'GET' });
        const result = [];
        for (const row of rows) {
            const built = await this.getCommercialPackage(row.id);
            if (!built)
                continue;
            const status = await this.getQuoteStatus(row.id) ?? 'draft';
            const lineage = await this.getQuoteLineage(row.id);
            result.push({ built, status, ...(lineage ? { lineage } : {}) });
        }
        return result;
    }
    async getQuoteStatus(quoteId) {
        const rows = await this.request(`client_quote_status_events?quote_id=eq.${encodeURIComponent(quoteId)}&select=status&order=created_at.desc&limit=1`, { method: 'GET' });
        return rows[0]?.status;
    }
    async setQuoteStatus(input) {
        await this.insertIgnore('client_quote_status_events', { organization_id: input.organizationId, quote_id: input.quoteId, status: input.status, ...(input.createdAt ? { created_at: input.createdAt } : {}) }, 'quote_id,status');
    }
    async getQuoteContext(quoteId) { const rows = await this.request(`commercial_quote_contexts?quote_id=eq.${encodeURIComponent(quoteId)}&select=context_json`, { method: 'GET' }); return rows[0]?.context_json; }
    async saveQuoteLineage(input) { await this.insertIgnore('commercial_quote_lineage', { quote_id: input.quoteId, organization_id: input.organizationId, project_id: input.projectId, supersedes_quote_id: input.lineage.supersedesQuoteId, change_report_id: input.lineage.changeReportId, created_at: input.lineage.createdAt }, 'quote_id'); }
    async getQuoteLineage(quoteId) { const rows = await this.request(`commercial_quote_lineage?quote_id=eq.${encodeURIComponent(quoteId)}&select=supersedes_quote_id,change_report_id,created_at`, { method: 'GET' }); const r = rows[0]; return r ? { supersedesQuoteId: r.supersedes_quote_id, changeReportId: r.change_report_id, createdAt: r.created_at } : undefined; }
    async saveChangeReport(input) { const r = input.report; await this.insertIgnore('change_impact_reports', { id: r.reportId, organization_id: input.organizationId, project_id: r.projectId, from_revision: r.fromRevision, to_revision: r.toRevision, ...(input.baseQuoteId ? { base_quote_id: input.baseQuoteId } : {}), ...(input.requoteId ? { requote_id: input.requoteId } : {}), status: r.status, fingerprint_sha256: r.fingerprintSha256, report_json: r, created_at: r.generatedAt }, 'id'); }
    async getChangeReport(reportId) { const rows = await this.request(`change_impact_reports?id=eq.${encodeURIComponent(reportId)}&select=report_json`, { method: 'GET' }); return rows[0]?.report_json; }
    contractFromRow(r) { return { contractId: r.id, projectId: r.project_id, ...(r.organization_id ? { organizationId: r.organization_id } : {}), currency: r.currency, status: r.status, initialRevision: asNumber(r.initial_revision), initialQuoteId: r.initial_quote_id, currentRevision: asNumber(r.current_revision), currentQuoteId: r.current_quote_id, agreedAmountMinor: asNumber(r.agreed_amount_minor), paymentTemplate: r.payment_template_json, paymentSchedule: r.payment_schedule_json, updatedAt: r.updated_at, fingerprintSha256: r.fingerprint_sha256 }; }
    async createContract(c) { await this.insertIgnore('project_commercial_contracts', { id: c.contractId, organization_id: c.organizationId, project_id: c.projectId, currency: c.currency, status: c.status, initial_revision: c.initialRevision, initial_quote_id: c.initialQuoteId, current_revision: c.currentRevision, current_quote_id: c.currentQuoteId, agreed_amount_minor: c.agreedAmountMinor, payment_template_json: c.paymentTemplate, payment_schedule_json: c.paymentSchedule, fingerprint_sha256: c.fingerprintSha256, updated_at: c.updatedAt }, 'id'); }
    async updateContract(c) { await this.request(`project_commercial_contracts?id=eq.${encodeURIComponent(c.contractId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: c.status, current_revision: c.currentRevision, current_quote_id: c.currentQuoteId, agreed_amount_minor: c.agreedAmountMinor, payment_template_json: c.paymentTemplate, payment_schedule_json: c.paymentSchedule, fingerprint_sha256: c.fingerprintSha256, updated_at: c.updatedAt }) }); }
    async getContractByProject(projectId) { const rows = await this.request(`project_commercial_contracts?project_id=eq.${encodeURIComponent(projectId)}&select=*`, { method: 'GET' }); return rows[0] ? this.contractFromRow(rows[0]) : undefined; }
    async getContractById(contractId) { const rows = await this.request(`project_commercial_contracts?id=eq.${encodeURIComponent(contractId)}&select=*`, { method: 'GET' }); return rows[0] ? this.contractFromRow(rows[0]) : undefined; }
    async orderFromRow(r) {
        const secret = await this.rpc('makster_change_order_secret_get_2_6', { p_change_order_id: r.id }).catch(() => []);
        return { changeOrderVersion: '1.8.0', changeOrderId: r.id, publicReference: r.public_reference, status: r.status, binding: r.binding_json, summary: r.summary_json, createdAt: r.created_at, ...(r.valid_until ? { validUntil: r.valid_until } : {}), ...(r.sent_at ? { sentAt: r.sent_at } : {}), ...(r.viewed_at ? { viewedAt: r.viewed_at } : {}), ...(r.decided_at ? { decidedAt: r.decided_at } : {}), ...(r.decision_json?.declinedReason ? { declinedReason: r.decision_json.declinedReason } : {}), ...(secret[0]?.approval_token_hash_sha256 ? { approvalTokenHashSha256: secret[0].approval_token_hash_sha256 } : {}), ...(r.decision_json?.decision ? { decision: r.decision_json.decision } : {}) };
    }
    publicOrderRow(organizationId, o) { return { id: o.changeOrderId, organization_id: organizationId, project_id: o.binding.projectId, public_reference: o.publicReference, status: o.status, from_revision: o.binding.fromRevision, to_revision: o.binding.toRevision, base_quote_id: o.binding.baseQuoteId, new_quote_id: o.binding.newQuoteId, change_report_id: o.binding.changeReportId, binding_json: o.binding, summary_json: o.summary, ...(o.decision || o.declinedReason ? { decision_json: { ...(o.decision ? { decision: o.decision } : {}), ...(o.declinedReason ? { declinedReason: o.declinedReason } : {}) } } : {}), created_at: o.createdAt, ...(o.sentAt ? { sent_at: o.sentAt } : {}), ...(o.viewedAt ? { viewed_at: o.viewedAt } : {}), ...(o.decidedAt ? { decided_at: o.decidedAt } : {}), ...(o.validUntil ? { valid_until: o.validUntil } : {}) }; }
    async createChangeOrder(input) { await this.insertIgnore('client_change_orders', this.publicOrderRow(input.organizationId, input.order), 'id'); if (input.order.approvalTokenHashSha256)
        await this.rpc('makster_change_order_secret_put_2_6', { p_change_order_id: input.order.changeOrderId, p_approval_token_hash_sha256: input.order.approvalTokenHashSha256 }); }
    async updateChangeOrder(input) { const o = input.order; await this.request(`client_change_orders?id=eq.${encodeURIComponent(o.changeOrderId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: o.status, ...(o.decision || o.declinedReason ? { decision_json: { ...(o.decision ? { decision: o.decision } : {}), ...(o.declinedReason ? { declinedReason: o.declinedReason } : {}) } } : { decision_json: null }), sent_at: o.sentAt ?? null, viewed_at: o.viewedAt ?? null, decided_at: o.decidedAt ?? null, valid_until: o.validUntil ?? null }) }); if (o.approvalTokenHashSha256)
        await this.rpc('makster_change_order_secret_put_2_6', { p_change_order_id: o.changeOrderId, p_approval_token_hash_sha256: o.approvalTokenHashSha256 }); }
    async getChangeOrder(changeOrderId) { const rows = await this.request(`client_change_orders?id=eq.${encodeURIComponent(changeOrderId)}&select=*`, { method: 'GET' }); return rows[0] ? this.orderFromRow(rows[0]) : undefined; }
    async listProjectChangeOrders(projectId) { const rows = await this.request(`client_change_orders?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=created_at.desc`, { method: 'GET' }); return Promise.all(rows.map(r => this.orderFromRow(r))); }
    async saveAuthorization(input) { const a = input.authorization; await this.insertIgnore('client_revision_authorizations', { id: a.authorizationId, organization_id: input.organizationId, project_id: a.projectId, revision: a.revision, quote_id: a.quoteId, change_order_id: a.changeOrderId, contract_id: a.contractId, accepted_at: a.acceptedAt, agreed_amount_minor: a.agreedAmountMinor, currency: a.currency, authorization_fingerprint_sha256: a.authorizationFingerprintSha256 }, 'project_id,revision'); }
    async getAuthorization(projectId, revision) { const rows = await this.request(`client_revision_authorizations?project_id=eq.${encodeURIComponent(projectId)}&revision=eq.${revision}&select=*`, { method: 'GET' }); const r = rows[0]; return r ? { authorizationId: r.id, projectId: r.project_id, revision: asNumber(r.revision), quoteId: r.quote_id, changeOrderId: r.change_order_id, contractId: r.contract_id, acceptedAt: r.accepted_at, agreedAmountMinor: asNumber(r.agreed_amount_minor), currency: r.currency, authorizationFingerprintSha256: r.authorization_fingerprint_sha256 } : undefined; }
    async applyAcceptedChangeOrderAtomic(input) { await this.rpc('makster_apply_client_change_order_acceptance_2_6', { p_organization_id: input.organizationId, p_order: this.publicOrderRow(input.organizationId, input.order), p_contract: input.contract, p_authorization: input.authorization, p_base_quote_id: input.baseQuoteId, p_new_quote_id: input.newQuoteId }); }
}
