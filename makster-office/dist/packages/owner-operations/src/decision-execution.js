function item(type, title, description, payload, opts = {}) {
    return {
        id: crypto.randomUUID(), type, title, description, requiresApproval: true,
        externalAction: Boolean(opts.externalAction), status: 'pending_approval', payload,
        ...(opts.projectId ? { projectId: opts.projectId } : {}),
        ...(opts.financialImpactMinor != null ? { financialImpactMinor: opts.financialImpactMinor } : {}),
        ...(opts.hoursImpact != null ? { hoursImpact: opts.hoursImpact } : {}),
        ...(opts.dueAt ? { dueAt: opts.dueAt } : {})
    };
}
function predictiveItem(a) {
    if (a.kind === 'collect_cash')
        return item('collect_client_payment', a.title, a.recommendedAction, { recommendedAction: a.recommendedAction, evidence: a.evidence }, { projectId: a.projectId, externalAction: true, financialImpactMinor: a.financialImpactMinor, dueAt: a.dueAt });
    if (a.kind === 'expedite_procurement')
        return item('procurement_award', a.title, a.recommendedAction, { sku: a.sku, supplierName: a.supplierName, evidence: a.evidence }, { projectId: a.projectId, externalAction: true, financialImpactMinor: a.financialImpactMinor, dueAt: a.dueAt });
    if (a.kind === 'protect_margin')
        return item('margin_review', a.title, a.recommendedAction, { evidence: a.evidence }, { projectId: a.projectId, externalAction: false, financialImpactMinor: a.financialImpactMinor });
    return null;
}
export function createDecisionPlanFromScenario(selected, baseline, createdBy = 'owner') {
    const items = [];
    const s = selected.scenario;
    if (s.queueOrder?.length) {
        s.queueOrder.forEach((projectId, index) => {
            items.push(item('queue_priority', `Очередь: проект ${projectId}`, `Установить приоритет очереди ${index + 1}.`, { projectId, priority: index + 1 }, { projectId, externalAction: false }));
        });
    }
    for (const [kindRaw, extraRaw] of Object.entries(s.extraCapacityHoursPerDay ?? {})) {
        const extra = Number(extraRaw) || 0;
        if (extra <= 0)
            continue;
        items.push(item('capacity_change', `Дополнительная мощность · ${kindRaw}`, `Добавить ${extra} ч/день на участке ${kindRaw}.`, { centerKind: kindRaw, extraHoursPerDay: extra }, { externalAction: false, hoursImpact: extra }));
    }
    for (const a of s.acceleratedReceivables ?? []) {
        items.push(item('collect_client_payment', `Ускорить оплату · ${a.projectId}`, `Получить ${a.amountMinor} minor units до ${a.dueAt.slice(0, 10)}.`, { projectId: a.projectId, amountMinor: a.amountMinor }, { projectId: a.projectId, externalAction: true, financialImpactMinor: a.amountMinor, dueAt: a.dueAt }));
    }
    if ((s.cashInjectionMinor ?? 0) > 0) {
        items.push(item('cash_injection', 'Дополнительное финансирование', `Внести ${s.cashInjectionMinor} minor units в компанию.`, { amountMinor: s.cashInjectionMinor, currency: selected.predictive.currency }, { externalAction: true, financialImpactMinor: s.cashInjectionMinor, dueAt: s.cashInjectionDate }));
    }
    // Add unresolved scenario predictive items, but avoid duplicating explicit cash/capacity/queue actions.
    for (const a of selected.predictive.actions) {
        const x = predictiveItem(a);
        if (!x)
            continue;
        const duplicate = items.some(i => i.type === x.type && i.projectId === x.projectId &&
            (i.type !== 'procurement_award' || String(i.payload.sku ?? '') === String(x.payload.sku ?? '')));
        if (!duplicate)
            items.push(x);
    }
    return {
        id: crypto.randomUUID(), scenarioId: s.id, scenarioName: s.name,
        baselineRiskScore: baseline.riskScore, scenarioRiskScore: selected.riskScore,
        baselineCashGapMinor: baseline.cashGapMinor, scenarioCashGapMinor: selected.cashGapMinor,
        createdBy, createdAt: new Date().toISOString(), status: 'draft', items
    };
}
export function decisionPlanSummary(plan) {
    const approved = plan.items.filter(x => x.status === 'approved' || x.status === 'applied' || x.status === 'ready_external').length;
    const rejected = plan.items.filter(x => x.status === 'rejected').length;
    const applied = plan.items.filter(x => x.status === 'applied').length;
    const externalReady = plan.items.filter(x => x.status === 'ready_external').length;
    const pending = plan.items.filter(x => x.status === 'pending_approval').length;
    return {
        total: plan.items.length, pending, approved, rejected, applied, externalReady,
        internalApplyable: plan.items.filter(x => !x.externalAction && x.status === 'approved').length,
        externalApproved: plan.items.filter(x => x.externalAction && x.status === 'approved').length
    };
}
export function refreshDecisionPlanStatus(plan) {
    const s = decisionPlanSummary(plan);
    if (s.total > 0 && s.applied + s.externalReady + s.rejected === s.total)
        plan.status = 'completed';
    else if (s.internalApplyable > 0 || s.externalApproved > 0 || s.applied > 0 || s.externalReady > 0)
        plan.status = 'in_execution';
    else if (s.pending === 0 && s.approved > 0)
        plan.status = 'approved';
    else if (s.approved > 0 || s.rejected > 0)
        plan.status = 'partially_approved';
    else
        plan.status = 'draft';
    return plan;
}
export function ownerQueuePriority(state, projectId) {
    return state.queuePriorityOverrides?.find(x => x.projectId === projectId)?.priority ?? null;
}
