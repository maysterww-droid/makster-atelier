// Recovered verbatim marketing-only exports from Makster AI 5.6.
// Source SHA256: 9bbfb7c526590c2a24d153a13835e0f513e5f95b8993d96399d47d9ba2d664e7
export const MAKSTER_OFFICE_AGENTS = [
    { name: 'Growth Director', department: 'growth', mission: 'Оркестрирует полный growth-cycle и отвечает за итоговый Owner Brief.' },
    { name: 'Analytics Agent', department: 'analytics', mission: 'Считает воронку, CAC/ROAS, эффективность каналов и отклонения.' },
    { name: 'Audience Agent', department: 'audience', mission: 'Определяет сегменты, рынки, ICP и приоритетные аудитории.' },
    { name: 'Creative Strategist', department: 'creative', mission: 'Формирует креативную идею, офферы и гипотезы.' },
    { name: 'Content Agent', department: 'content', mission: 'Готовит посты, кейсы, email, landing copy и сценарии.' },
    { name: 'Google Ads Agent', department: 'ads', mission: 'Планирует Google Ads, ключевые запросы и search intent.' },
    { name: 'Meta Ads Agent', department: 'ads', mission: 'Планирует Facebook Ads и Meta targeting.' },
    { name: 'Instagram Growth Agent', department: 'ads', mission: 'Ведёт Instagram как отдельный бизнес-канал.' },
    { name: 'TikTok Growth Agent', department: 'ads', mission: 'Планирует TikTok Ads и короткий видеоконтент.' },
    { name: 'Lead Qualification Agent', department: 'sales_bridge', mission: 'Квалифицирует лиды и передаёт готовые в Sales/Projects.' },
    { name: 'Partner Acquisition Agent', department: 'sales_bridge', mission: 'Ищет архитекторов, дизайнеров и B2B-партнёров.' },
    { name: 'Owner Brief Agent', department: 'owner_brief', mission: 'Собирает решения, риски и approvals владельца.' },
];

const nowIso = () => new Date().toISOString();

export function createOfficeCampaign(input) {
    if (!input.name.trim())
        throw new Error('office_campaign_name_required');
    if (!Number.isFinite(input.budgetMinor) || input.budgetMinor < 0)
        throw new Error('office_campaign_budget_invalid');
    const now = nowIso();
    return {
        id: crypto.randomUUID(), name: input.name.trim(), channel: input.channel, objective: input.objective, market: input.market.trim() || 'CZ',
        status: 'draft', budgetMinor: input.budgetMinor, spentMinor: 0, currency: input.currency,
        impressions: 0, clicks: 0, leads: 0, qualifiedLeads: 0, wonDeals: 0, attributedRevenueMinor: 0,
        ...(input.startAt ? { startAt: input.startAt } : {}), ...(input.endAt ? { endAt: input.endAt } : {}),
        createdBy: input.createdBy ?? 'owner', createdAt: now, updatedAt: now
    };
}

export function createOfficeApproval(input) {
    return {
        id: crypto.randomUUID(), kind: input.kind, title: input.title, detail: input.detail,
        ...(input.amountMinor != null ? { amountMinor: input.amountMinor } : {}), ...(input.currency ? { currency: input.currency } : {}),
        entityType: input.entityType, entityId: input.entityId, status: 'pending', requestedBy: input.requestedBy, requestedAt: nowIso()
    };
}

export function runMaksterOfficeCycle(state, input) {
    const now = nowIso(), currency = input.currency ?? 'EUR', market = input.market ?? 'CZ';
    const cycle = {
        id: crypto.randomUUID(), title: input.title ?? `Growth Cycle ${now.slice(0, 10)}`, market, currency,
        monthlyBudgetMinor: Math.max(0, input.monthlyBudgetMinor ?? 0), status: 'awaiting_approval',
        goal: input.goal ?? 'Generate qualified furniture leads and partner opportunities.',
        createdBy: input.createdBy ?? 'owner', createdAt: now, updatedAt: now
    };
    const active = state.officeCampaigns.filter(x => x.status === 'active' && x.currency === currency);
    const leads = state.officeLeads.filter(x => x.currency === currency);
    const spend = active.reduce((s, x) => s + x.spentMinor, 0);
    const attributed = active.reduce((s, x) => s + x.attributedRevenueMinor, 0);
    const weak = active.filter(x => x.spentMinor > 0 && (x.leads === 0 || x.attributedRevenueMinor < x.spentMinor));
    const strong = active.filter(x => x.spentMinor > 0 && x.attributedRevenueMinor >= x.spentMinor * 3);
    const runs = MAKSTER_OFFICE_AGENTS.map((a, idx) => {
        let summary = '';
        const output = { market, currency };
        if (a.name === 'Analytics Agent') {
            summary = `Active campaigns ${active.length}; spend ${spend}; attributed revenue ${attributed}; leads ${leads.length}.`;
            Object.assign(output, { activeCampaigns: active.length, spendMinor: spend, attributedRevenueMinor: attributed, leadCount: leads.length });
        }
        else if (a.name === 'Audience Agent') {
            summary = `Prioritize premium custom furniture clients and architecture/design partners in ${market}.`;
            Object.assign(output, { segments: ['premium residential', 'architects', 'interior designers', 'developers'], market });
        }
        else if (a.name === 'Creative Strategist') {
            summary = 'Creative direction: real Makster projects, before/after visual stories, engineering precision and premium execution.';
            Object.assign(output, { pillars: ['real projects', 'visualization', 'engineering precision', 'premium installation'] });
        }
        else if (a.name === 'Content Agent') {
            summary = 'Prepared a content queue focused on case studies, workshop proof, material expertise and partner acquisition.';
            Object.assign(output, { recommendedFormats: ['case_study', 'reel', 'post', 'partner_email'] });
        }
        else if (a.name.includes('Google Ads')) {
            summary = 'Google: prioritize high-intent custom kitchen / wardrobe / bespoke furniture searches.';
            Object.assign(output, { channel: 'google_ads', objective: 'leads' });
        }
        else if (a.name.includes('Meta Ads')) {
            summary = 'Facebook: remarketing, homeowner audiences and project case-study ads.';
            Object.assign(output, { channel: 'facebook_ads', objective: 'remarketing' });
        }
        else if (a.name.includes('Instagram')) {
            summary = 'Instagram: separate business channel with portfolio, Reels, paid lead campaigns and designer outreach.';
            Object.assign(output, { channel: 'instagram_ads', objective: 'leads' });
        }
        else if (a.name.includes('TikTok')) {
            summary = 'TikTok: short visual transformations, workshop/process content and paid testing.';
            Object.assign(output, { channel: 'tiktok_ads', objective: 'awareness' });
        }
        else if (a.name === 'Lead Qualification Agent') {
            summary = `${leads.filter(x => x.status === 'new').length} new lead(s) require qualification and value scoring.`;
            Object.assign(output, { newLeads: leads.filter(x => x.status === 'new').map(x => x.id) });
        }
        else if (a.name === 'Partner Acquisition Agent') {
            summary = 'Continue B2B pipeline for architects, designers, project managers and fit-out partners.';
            Object.assign(output, { partnerTypes: ['architect', 'interior_designer', 'project_manager', 'developer'] });
        }
        else if (a.name === 'Owner Brief Agent') {
            summary = `Owner attention: ${weak.length} weak campaign(s), ${strong.length} strong campaign(s), ${state.officeApprovals.filter(x => x.status === 'pending').length} pending approval(s).`;
            Object.assign(output, { weakCampaignIds: weak.map(x => x.id), strongCampaignIds: strong.map(x => x.id) });
        }
        else {
            summary = 'Growth Director assembled Analytics → Audience → Creative → Content → Ads → Sales Bridge → Owner Brief.';
            Object.assign(output, { sequence: ['analytics', 'audience', 'creative', 'content', 'ads', 'sales_bridge', 'owner_brief'] });
        }
        return { id: crypto.randomUUID(), cycleId: cycle.id, agent: a.name, department: a.department, status: 'completed', summary, output, startedAt: now, completedAt: new Date(Date.parse(now) + idx * 1000).toISOString() };
    });
    const approvals = [];
    if (cycle.monthlyBudgetMinor > 0)
        approvals.push(createOfficeApproval({
            kind: 'campaign_budget', title: `Growth budget · ${market}`, detail: `Approve monthly AI Office growth budget ${cycle.monthlyBudgetMinor} minor units.`,
            amountMinor: cycle.monthlyBudgetMinor, currency, entityType: 'cycle', entityId: cycle.id, requestedBy: 'Growth Director'
        }));
    for (const c of weak)
        approvals.push(createOfficeApproval({
            kind: 'campaign_launch', title: `Pause/rework weak campaign · ${c.name}`, detail: 'Campaign is spending without sufficient return. Owner approval required before changing live campaign state.',
            entityType: 'campaign', entityId: c.id, requestedBy: 'Growth Director'
        }));
    const brief = {
        id: crypto.randomUUID(), cycleId: cycle.id, generatedAt: now,
        headline: `Makster AI Office · ${market} Growth Brief`,
        summary: `${active.length} active campaign(s), ${leads.length} lead(s), ${state.officeApprovals.filter(x => x.status === 'pending').length + approvals.length} approval(s) requiring owner attention.`,
        metrics: { activeCampaigns: active.length, spendMinor: spend, leads: leads.length, qualifiedLeads: leads.filter(x => ['qualified', 'measurement_booked', 'proposal', 'negotiation', 'won'].includes(x.status)).length, wonDeals: leads.filter(x => x.status === 'won').length, attributedRevenueMinor: attributed, pendingApprovals: state.officeApprovals.filter(x => x.status === 'pending').length + approvals.length },
        priorities: [
            'Protect spend behind Owner Approval.',
            'Move qualified leads into Sales / Makster Project as quickly as possible.',
            'Scale channels only after lead quality and attributed revenue are visible.'
        ],
        risks: [
            ...(weak.length ? [`${weak.length} campaign(s) show weak return.`] : []),
            ...(leads.filter(x => x.status === 'new').length ? [`${leads.filter(x => x.status === 'new').length} new lead(s) still unqualified.`] : [])
        ]
    };
    return { cycle, runs, approvals, brief };
}
