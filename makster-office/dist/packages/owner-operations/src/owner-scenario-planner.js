import { buildPredictiveOwnerControl } from './predictive-owner-control.js';
function clone(x) { return structuredClone(x); }
function tomorrowISO(now) { const d = new Date(now); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString(); }
function scenarioScore(r) {
    const cashPenalty = Math.min(30, r.cashGapMinor / 100000);
    const marginPenalty = Math.min(20, r.marginLeakageMinor / 100000);
    return Number((100 - r.riskScore - r.scheduleRiskProjects * 6 - r.criticalActions * 7 - r.highActions * 3 - cashPenalty - marginPenalty).toFixed(2));
}
function applyScenario(rows, state, scenario, now) {
    const s = clone(state), r = clone(rows);
    if (scenario.queueOrder?.length) {
        const pos = new Map(scenario.queueOrder.map((id, i) => [id, i + 1]));
        r.forEach(x => x.queuePosition = pos.get(x.project.projectId) ?? (scenario.queueOrder.length + x.queuePosition));
        r.sort((a, b) => a.queuePosition - b.queuePosition).forEach((x, i) => x.queuePosition = i + 1);
    }
    if (scenario.extraCapacityHoursPerDay) {
        for (const [kindRaw, extraRaw] of Object.entries(scenario.extraCapacityHoursPerDay)) {
            const kind = kindRaw, extra = Number(extraRaw) || 0;
            if (extra <= 0)
                continue;
            const existing = s.productionWorkCenters.find(x => x.kind === kind);
            if (existing)
                existing.dailyCapacityHours += extra;
            else
                s.productionWorkCenters.push({
                    id: `scenario-${kind}`, name: `${kind} + scenario`, kind, dailyCapacityHours: (kind === 'assembly' || kind === 'installation' ? 16 : 8) + extra,
                    active: true, workdays: [1, 2, 3, 4, 5], updatedAt: now.toISOString()
                });
        }
    }
    for (const a of scenario.acceleratedReceivables ?? []) {
        if (a.amountMinor <= 0)
            continue;
        const row = r.find(x => x.project.projectId === a.projectId);
        if (row?.project.jobControl) {
            const money = row.project.jobControl.money;
            const contract = money.contractValueMinor ?? 0, received = money.receivedMinor ?? 0;
            const collectible = Math.min(a.amountMinor, Math.max(0, contract - received));
            money.receivedMinor = received + collectible;
            if (collectible <= 0)
                continue;
            s.cashEvents.push({
                id: `scenario-receivable:${scenario.id}:${a.projectId}`, type: 'inflow', category: 'client_payment',
                amountMinor: collectible, currency: 'EUR', dueAt: a.dueAt, status: 'planned', projectId: a.projectId,
                counterparty: 'Scenario accelerated client payment', source: 'manual', note: `Scenario ${scenario.name}`
            });
        }
    }
    if ((scenario.cashInjectionMinor ?? 0) > 0) {
        s.cashEvents.push({
            id: `scenario-injection:${scenario.id}`, type: 'inflow', category: 'other', amountMinor: scenario.cashInjectionMinor,
            currency: 'EUR', dueAt: scenario.cashInjectionDate ?? tomorrowISO(now), status: 'planned', counterparty: 'Owner financing',
            source: 'manual', note: `Scenario ${scenario.name}`
        });
    }
    for (const [projectId, amount] of Object.entries(scenario.projectExtraCostMinor ?? {})) {
        if (amount <= 0)
            continue;
        const x = r.find(y => y.project.projectId === projectId);
        if (!x)
            continue;
        const p = x.project;
        p.jobControl ??= undefined;
        p.costEntries ??= [];
        p.costEntries.push({
            id: `scenario-cost:${scenario.id}:${projectId}`, category: 'other', basis: 'actual', description: `Scenario extra cost: ${scenario.name}`,
            amountMinor: amount, currency: p.currency, createdBy: 'scenario', createdAt: now.toISOString(), sourceRevision: p.revision
        });
    }
    return { rows: r, state: s };
}
function resultFromPredictive(scenario, p, baseline) {
    const raw = {
        riskScore: p.riskScore, overallRisk: p.overallRisk, cashGapMinor: p.cashGapMinor, firstCashGapAt: p.firstCashGapAt,
        scheduleRiskProjects: p.summary.projectsAtScheduleRisk, criticalActions: p.summary.criticalActions,
        highActions: p.summary.highActions, marginLeakageMinor: p.summary.projectedMarginLeakageMinor
    };
    const score = scenarioScore(raw);
    return {
        version: '5.0.0', scenario, ...raw, score,
        improvement: {
            riskScoreDelta: baseline ? baseline.riskScore - raw.riskScore : 0,
            cashGapDeltaMinor: baseline ? baseline.cashGapMinor - raw.cashGapMinor : 0,
            scheduleRiskDelta: baseline ? baseline.scheduleRiskProjects - raw.scheduleRiskProjects : 0,
            criticalActionsDelta: baseline ? baseline.criticalActions - raw.criticalActions : 0,
            marginLeakageDeltaMinor: baseline ? baseline.marginLeakageMinor - raw.marginLeakageMinor : 0
        },
        predictive: p
    };
}
export function evaluateOwnerScenario(rows, state, scenario, currency = 'EUR', now = new Date(), baseline) {
    const applied = applyScenario(rows, state, scenario, now);
    const p = buildPredictiveOwnerControl(applied.rows, applied.state, currency, now);
    return resultFromPredictive(scenario, p, baseline);
}
export function buildOwnerScenarioPlanner(rows, state, currency = 'EUR', now = new Date()) {
    const baselineScenario = { id: 'baseline', name: 'Baseline', description: 'Текущее состояние без изменений.' };
    const baseline = evaluateOwnerScenario(rows, state, baselineScenario, currency, now);
    const predictive = baseline.predictive;
    const gap = predictive.cashGapMinor;
    const rawGapAt = predictive.firstCashGapAt ?? tomorrowISO(now);
    const gapDate = new Date(rawGapAt);
    gapDate.setUTCDate(gapDate.getUTCDate() - 1);
    const gapAt = gapDate.toISOString();
    const receivableCandidates = predictive.projects
        .filter(x => x.cashExposureMinor > 0)
        .sort((a, b) => b.cashExposureMinor - a.cashExposureMinor);
    let remaining = gap;
    const accelerated = [];
    for (const x of receivableCandidates) {
        if (remaining <= 0)
            break;
        const amount = Math.min(remaining, x.cashExposureMinor);
        accelerated.push({ projectId: x.projectId, amountMinor: amount, dueAt: gapAt });
        remaining -= amount;
    }
    const atRisk = predictive.projects.filter(x => x.scheduleRisk !== 'normal').sort((a, b) => b.score - a.score);
    const rescueOrder = [
        ...atRisk.map(x => x.projectId),
        ...rows.sort((a, b) => a.queuePosition - b.queuePosition).map(x => x.project.projectId).filter(id => !atRisk.some(r => r.projectId === id))
    ];
    const capacityNeeds = {};
    for (const a of predictive.actions.filter(x => x.kind === 'add_capacity')) {
        const kind = String(a.evidence.bottleneck ?? 'assembly');
        capacityNeeds[kind] = Math.max(capacityNeeds[kind] ?? 0, Math.max(2, Math.ceil(a.hoursImpact ?? 2)));
    }
    const candidates = [
        {
            id: 'cash-protection', name: 'Cash Protection',
            description: 'Ускорить клиентские поступления до первой даты кассового разрыва.',
            acceleratedReceivables: accelerated
        },
        {
            id: 'capacity-relief', name: 'Capacity Relief',
            description: 'Добавить мощность на текущих bottleneck-участках.',
            extraCapacityHoursPerDay: Object.keys(capacityNeeds).length ? capacityNeeds : { assembly: 4, installation: 4 }
        },
        {
            id: 'priority-rescue', name: 'Priority Rescue',
            description: 'Поднять TIGHT/LATE проекты вверх очереди без изменения денег.',
            queueOrder: rescueOrder
        },
        {
            id: 'balanced-rescue', name: 'Balanced Rescue',
            description: 'Комбинация ускоренного cash collection, дополнительной мощности и приоритетной очереди.',
            acceleratedReceivables: accelerated,
            extraCapacityHoursPerDay: Object.keys(capacityNeeds).length ? capacityNeeds : { assembly: 4, installation: 4 },
            queueOrder: rescueOrder
        }
    ];
    const results = candidates.map(x => evaluateOwnerScenario(rows, state, x, currency, now, baseline));
    const all = [baseline, ...results].sort((a, b) => b.score - a.score || a.riskScore - b.riskScore || a.cashGapMinor - b.cashGapMinor);
    const best = all[0];
    const reason = best.scenario.id === 'baseline'
        ? 'Текущий план уже лучше автоматически сгенерированных вмешательств.'
        : `Лучший рассчитанный вариант: risk ${best.riskScore}/100, cash gap ${best.cashGapMinor}, schedule-risk projects ${best.scheduleRiskProjects}.`;
    return {
        version: '5.0.0', generatedAt: new Date().toISOString(), baseline, scenarios: results,
        recommendedScenarioId: best.scenario.id, recommendedReason: reason
    };
}
