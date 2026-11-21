import { createOfficeLead } from './makster-ai-office.js';
const nowIso = () => new Date().toISOString();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function makeConfiguredProviderAdapter(connection) {
    const provider = connection?.provider ?? 'google_ads';
    // 5.4 intentionally does not pretend that an account ID alone is OAuth connectivity.
    // A real provider adapter must be injected once account authorization exists.
    return {
        provider,
        status: 'ready_for_connection',
        async execute() {
            throw new Error('growth_provider_not_connected');
        }
    };
}
export function defaultGrowthGuardrail(currency = 'EUR') {
    return {
        id: crypto.randomUUID(), currency,
        dailySpendLimitMinor: 100000, // EUR 1,000/day default safety ceiling
        monthlySpendLimitMinor: 1000000, // EUR 10,000/month
        maxBudgetIncreasePercent: 35,
        maxBudgetDecreasePercent: 80,
        allowPause: true, requireOwnerApproval: true, enabled: true, updatedAt: nowIso()
    };
}
export function resolveGrowthGuardrail(state, provider, currency) {
    return state.growthSpendGuardrails.find(x => x.enabled && x.currency === currency && x.provider === provider)
        ?? state.growthSpendGuardrails.find(x => x.enabled && x.currency === currency && !x.provider)
        ?? defaultGrowthGuardrail(currency);
}
export function evaluateGrowthExecutionGuardrails(input) {
    const now = input.now ?? new Date(), policy = resolveGrowthGuardrail(input.state, input.provider, input.currency);
    const reasons = [];
    const current = input.campaign.budgetMinor, target = input.decision.proposedBudgetMinor;
    const changePct = current > 0 ? ((target - current) / current) * 100 : (target > 0 ? 100 : 0);
    const day = now.toISOString().slice(0, 10), month = day.slice(0, 7);
    const providerCampaigns = input.state.officeCampaigns.filter(c => {
        if (c.currency !== input.currency)
            return false;
        if (input.provider === 'meta_ads')
            return c.channel === 'facebook_ads' || c.channel === 'instagram_ads';
        if (input.provider === 'google_ads')
            return c.channel === 'google_ads';
        return c.channel === 'tiktok_ads';
    });
    const activeMonthlyBudget = providerCampaigns.reduce((s, c) => s + (c.status === 'active' || c.id === input.campaign.id ? c.budgetMinor : 0), 0)
        - input.campaign.budgetMinor + target;
    const dailyProjected = Math.ceil(Math.max(0, activeMonthlyBudget) / 30);
    const monthSpend = input.state.growthSyncSnapshots.filter(x => x.provider === input.provider && x.capturedAt.slice(0, 7) === month)
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    // snapshots are cumulative per provider campaign; keep the latest actual spend as evidence.
    const latestByCampaign = new Map();
    for (const x of monthSpend)
        latestByCampaign.set(x.providerCampaignId, x.spendMinor);
    const spentMonth = [...latestByCampaign.values()].reduce((s, x) => s + x, 0);
    const monthlyProjected = Math.max(spentMonth, Math.max(0, activeMonthlyBudget));
    if (policy.requireOwnerApproval && !['approved', 'executed'].includes(input.decision.status))
        reasons.push('owner_approval_required');
    if (input.decision.action === 'pause' && !policy.allowPause)
        reasons.push('pause_not_allowed_by_policy');
    if (changePct > policy.maxBudgetIncreasePercent)
        reasons.push('budget_increase_exceeds_guardrail');
    if (changePct < 0 && Math.abs(changePct) > policy.maxBudgetDecreasePercent && input.decision.action !== 'pause')
        reasons.push('budget_decrease_exceeds_guardrail');
    if (dailyProjected > policy.dailySpendLimitMinor)
        reasons.push('daily_spend_limit_exceeded');
    if (monthlyProjected > policy.monthlySpendLimitMinor)
        reasons.push('monthly_spend_limit_exceeded');
    return {
        policy, allowed: reasons.length === 0, reasons,
        dailyProjectedMinor: Math.max(0, dailyProjected),
        monthlyProjectedMinor: Math.max(0, monthlyProjected),
        budgetChangePercent: Number(changePct.toFixed(1))
    };
}
export function createGrowthExecution(input) {
    if (!input.campaign.providerCampaignId)
        throw new Error('provider_campaign_not_mapped');
    const g = evaluateGrowthExecutionGuardrails({ state: input.state, decision: input.decision, campaign: input.campaign, provider: input.provider, currency: input.campaign.currency, now: input.now });
    const requestedAt = (input.now ?? new Date()).toISOString();
    return {
        id: crypto.randomUUID(), decisionId: input.decision.id, approvalId: input.approvalId, campaignId: input.campaign.id,
        provider: input.provider, providerCampaignId: input.campaign.providerCampaignId, requestedAction: input.decision.action,
        beforeBudgetMinor: input.campaign.budgetMinor, targetBudgetMinor: input.decision.proposedBudgetMinor, currency: input.campaign.currency,
        status: g.allowed ? 'queued' : 'blocked',
        idempotencyKey: `growth:${input.decision.id}:${input.campaign.providerCampaignId}:${input.decision.proposedBudgetMinor}`,
        guardrailCheck: { allowed: g.allowed, reasons: g.reasons, dailyProjectedMinor: g.dailyProjectedMinor, monthlyProjectedMinor: g.monthlyProjectedMinor, budgetChangePercent: g.budgetChangePercent },
        requestedBy: input.requestedBy, requestedAt
    };
}
export async function executeGrowthProviderMutation(execution, adapter) {
    if (execution.status === 'blocked')
        return execution;
    if (adapter.status !== 'connected') {
        execution.status = 'provider_not_connected';
        execution.error = 'growth_provider_not_connected';
        return execution;
    }
    execution.status = 'executing';
    try {
        const r = await adapter.execute({
            providerCampaignId: execution.providerCampaignId, action: execution.requestedAction,
            targetBudgetMinor: execution.targetBudgetMinor, currency: execution.currency, idempotencyKey: execution.idempotencyKey
        });
        execution.status = 'executed';
        execution.providerRequestId = r.providerRequestId;
        execution.providerStatus = r.providerStatus;
        execution.executedAt = nowIso();
        return execution;
    }
    catch (e) {
        execution.status = 'failed';
        execution.error = e instanceof Error ? e.message : String(e);
        return execution;
    }
}
export function auditEntry(input) {
    return { id: crypto.randomUUID(), ...input, createdAt: nowIso() };
}
export function ingestGrowthLeadEvent(state, input) {
    const duplicate = state.growthInboundLeadEvents.find(x => x.provider === input.provider && x.providerLeadId === input.providerLeadId && x.status === 'ingested');
    if (duplicate) {
        const event = { id: crypto.randomUUID(), provider: input.provider, providerLeadId: input.providerLeadId,
            ...(input.providerCampaignId ? { providerCampaignId: input.providerCampaignId } : {}), receivedAt: input.receivedAt ?? nowIso(),
            status: 'duplicate', signatureVerified: input.signatureVerified, payload: input.payload, ...(input.sourceIp ? { sourceIp: input.sourceIp } : {}),
            ...(duplicate.leadId ? { leadId: duplicate.leadId } : {}) };
        return { event, lead: null };
    }
    if (!input.signatureVerified) {
        const event = { id: crypto.randomUUID(), provider: input.provider, providerLeadId: input.providerLeadId,
            ...(input.providerCampaignId ? { providerCampaignId: input.providerCampaignId } : {}), receivedAt: input.receivedAt ?? nowIso(),
            status: 'rejected', signatureVerified: false, payload: input.payload, ...(input.sourceIp ? { sourceIp: input.sourceIp } : {}), error: 'lead_signature_not_verified' };
        return { event, lead: null };
    }
    const campaign = input.providerCampaignId ? state.officeCampaigns.find(x => x.providerCampaignId === input.providerCampaignId) : undefined;
    const p = input.payload;
    const name = String(p.name ?? p.full_name ?? p.contact_name ?? '').trim();
    const email = String(p.email ?? '').trim();
    const phone = String(p.phone ?? p.phone_number ?? '').trim();
    if (!name && !email && !phone) {
        const event = { id: crypto.randomUUID(), provider: input.provider, providerLeadId: input.providerLeadId,
            ...(input.providerCampaignId ? { providerCampaignId: input.providerCampaignId } : {}), receivedAt: input.receivedAt ?? nowIso(),
            status: 'rejected', signatureVerified: true, payload: input.payload, ...(input.sourceIp ? { sourceIp: input.sourceIp } : {}), error: 'lead_contact_data_missing' };
        return { event, lead: null };
    }
    const source = input.provider === 'google_ads' ? 'google_ads' : input.provider === 'meta_ads' ? (campaign?.channel === 'instagram_ads' ? 'instagram_ads' : 'facebook_ads') : input.provider === 'tiktok_ads' ? 'tiktok_ads' : 'website';
    const lead = createOfficeLead({
        name: name || email || phone, source: source, currency: campaign?.currency ?? 'EUR',
        ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(campaign ? { campaignId: campaign.id } : {}),
        note: `Inbound ${input.provider} lead ${input.providerLeadId}`
    });
    lead.providerLeadId = input.providerLeadId;
    if (p.search_term)
        lead.searchTerm = String(p.search_term);
    if (p.landing_page)
        lead.landingPage = String(p.landing_page);
    const event = { id: crypto.randomUUID(), provider: input.provider, providerLeadId: input.providerLeadId,
        ...(input.providerCampaignId ? { providerCampaignId: input.providerCampaignId } : {}), receivedAt: input.receivedAt ?? nowIso(),
        status: 'ingested', leadId: lead.id, signatureVerified: true, payload: input.payload, ...(input.sourceIp ? { sourceIp: input.sourceIp } : {}) };
    return { event, lead };
}
