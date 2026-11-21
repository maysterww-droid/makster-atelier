import { buildCostingReport } from '../../engineering-engine/src/costing.js';
const pct = (a, b) => b > 0 ? Number((a / b * 100).toFixed(1)) : 0;
const monthBounds = (month) => {
    if (!/^\d{4}-\d{2}$/.test(month))
        throw new Error('finance_month_invalid');
    const [y, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 1));
    return { from, to, fromIso: from.toISOString(), toIso: to.toISOString() };
};
const inPeriod = (date, from, to) => {
    if (!date)
        return false;
    const t = Date.parse(date);
    return Number.isFinite(t) && t >= from.getTime() && t < to.getTime();
};
const poLineTotal = (o) => o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * l.quantity, 0);
const poReceivedTotal = (o) => o.lines.reduce((s, l) => s + (l.unitPriceMinor ?? 0) * Math.min(l.quantity, l.receivedQuantity ?? 0), 0);
function recognizedRevenue(projects, state, currency, from, to) {
    const explicit = state.financeLedgerEntries.filter(x => x.currency === currency && x.type === 'revenue_recognition' && inPeriod(x.effectiveAt, from, to));
    if (explicit.length)
        return { amount: explicit.reduce((s, x) => s + x.amountMinor, 0), basis: 'recognized_revenue' };
    const cash = state.cashEvents.filter(x => x.currency === currency && x.type === 'inflow' && x.category === 'client_payment' && x.status === 'received' && inPeriod(x.dueAt, from, to));
    if (cash.length)
        return { amount: cash.reduce((s, x) => s + x.amountMinor, 0), basis: 'cash_receipts_fallback' };
    // Last-resort fallback: received amount delta cannot be inferred from cumulative project state, so do not invent monthly revenue.
    return { amount: 0, basis: 'cash_receipts_fallback' };
}
function actualProjectCostInPeriod(project, from, to) {
    const entries = (project.costEntries ?? []).filter(x => x.basis === 'actual' && inPeriod(x.createdAt, from, to)).reduce((s, x) => s + x.amountMinor, 0);
    const po = (project.purchaseOrders ?? []).filter(x => x.status === 'received' && inPeriod(x.receivedAt, from, to)).reduce((s, o) => s + poReceivedTotal(o), 0);
    return entries + po;
}
function forecastProjectCostForPeriod(project, from, to) {
    const target = project.jobControl?.targetInstallationAt ?? project.jobControl?.targetDeliveryAt;
    if (!target || !inPeriod(target, from, to))
        return 0;
    return buildCostingReport(project).totalEstimateMinor;
}
function futureClientReceivable(project) {
    const c = project.jobControl?.money.contractValueMinor ?? 0, r = project.jobControl?.money.receivedMinor ?? 0;
    return Math.max(0, c - r);
}
function outstandingPurchasePayable(project) {
    return (project.purchaseOrders ?? []).filter(o => ['approved', 'ordered', 'partially_received'].includes(o.status)).reduce((s, o) => {
        const total = poLineTotal(o), received = poReceivedTotal(o);
        return s + Math.max(0, total - received);
    }, 0);
}
function projectProfitability(project) {
    const c = buildCostingReport(project), contract = c.contractValueMinor, received = project.jobControl?.money.receivedMinor ?? 0;
    const forecastProfit = contract - c.totalEstimateMinor, actualProfit = contract - c.totalActualMinor;
    const score = Math.round(Math.max(-100, Math.min(100, c.forecastMarginPercent * 1.5 +
        pct(received, contract) * .35 -
        (futureClientReceivable(project) > contract * .5 ? 10 : 0))));
    return {
        projectId: project.projectId, title: project.title, client: project.jobControl?.client.name ?? '',
        contractValueMinor: contract, receivedMinor: received, accountsReceivableMinor: Math.max(0, contract - received),
        forecastCostMinor: c.totalEstimateMinor, actualCostMinor: c.totalActualMinor,
        forecastProfitMinor: forecastProfit, actualProfitMinor: actualProfit,
        forecastMarginPercent: c.forecastMarginPercent, actualMarginPercent: c.actualMarginPercent,
        cashConversionPercent: pct(received, contract), stage: project.jobControl?.stage ?? 'lead', rankScore: score
    };
}
export function buildOwnerFinanceReport(projects, state, currency = 'EUR', month = new Date().toISOString().slice(0, 7), now = new Date()) {
    const { from, to, fromIso, toIso } = monthBounds(month);
    const settings = state.financeSettings.find(x => x.currency === currency);
    const targetGross = settings?.targetGrossMarginPercent ?? 35;
    const targetOperating = settings?.targetOperatingMarginPercent ?? 15;
    const taxReservePct = settings?.taxReservePercent ?? 20;
    const runwaySafety = settings?.runwaySafetyMonths ?? 3;
    const proj = projects.filter(p => (p.jobControl?.money.currency ?? p.currency) === currency);
    const revenue = recognizedRevenue(proj, state, currency, from, to);
    const revenueForecast = proj.filter(p => {
        const target = p.jobControl?.targetInstallationAt ?? p.jobControl?.targetDeliveryAt;
        return target && inPeriod(target, from, to);
    }).reduce((s, p) => s + (p.jobControl?.money.contractValueMinor ?? 0), 0);
    const cogsActual = proj.reduce((s, p) => s + actualProjectCostInPeriod(p, from, to), 0);
    const cogsForecast = proj.reduce((s, p) => s + forecastProjectCostForPeriod(p, from, to), 0);
    const fixedCosts = state.fixedMonthlyCosts.filter(x => x.currency === currency);
    const fixedMonthly = fixedCosts.reduce((s, x) => s + x.amountMinor, 0);
    const fixedCategories = new Set(fixedCosts.map(x => x.category.trim().toLowerCase()));
    const variableLedger = state.financeLedgerEntries.filter(x => x.currency === currency && ['operating_expense', 'payroll'].includes(x.type) && inPeriod(x.effectiveAt, from, to));
    const variableActual = variableLedger.reduce((s, x) => s + x.amountMinor, 0);
    const variableForecast = state.cashEvents.filter(x => x.currency === currency && x.type === 'outflow' && ['planned', 'committed', 'received'].includes(x.status) && inPeriod(x.dueAt, from, to) && x.category !== 'supplier' && !fixedCategories.has(x.category.trim().toLowerCase())).reduce((s, x) => s + x.amountMinor, 0);
    const grossActual = revenue.amount - cogsActual, grossForecast = revenueForecast - cogsForecast;
    const opActual = grossActual - fixedMonthly - variableActual;
    const opForecast = grossForecast - fixedMonthly - variableForecast;
    const taxReserve = Math.max(0, Math.round(opForecast * taxReservePct / 100));
    const netAfterTax = opForecast - taxReserve;
    const projectRows = proj.map(projectProfitability).sort((a, b) => b.rankScore - a.rankScore || b.forecastProfitMinor - a.forecastProfitMinor);
    const ar = projectRows.reduce((s, x) => s + x.accountsReceivableMinor, 0);
    const supplierCashPayables = state.cashEvents.filter(x => x.currency === currency && x.type === 'outflow' && x.category === 'supplier' && ['planned', 'committed'].includes(x.status));
    const supplierCashPoIds = new Set(supplierCashPayables.filter(x => x.source === 'procurement_award' && x.sourceId).map(x => x.sourceId));
    const poPayables = proj.reduce((s, p) => s + (p.purchaseOrders ?? []).filter(o => !supplierCashPoIds.has(o.id) && ['approved', 'ordered', 'partially_received'].includes(o.status)).reduce((z, o) => z + Math.max(0, poLineTotal(o) - poReceivedTotal(o)), 0), 0);
    const ap = supplierCashPayables.reduce((s, x) => s + x.amountMinor, 0) + poPayables;
    const overdueReceivables = proj.reduce((s, p) => {
        const due = p.jobControl?.targetInstallationAt ?? p.jobControl?.targetDeliveryAt;
        return s + (due && Date.parse(due) < now.getTime() ? futureClientReceivable(p) : 0);
    }, 0);
    const today = now.getTime(), d30 = today + 30 * 86400000;
    const due30 = state.cashEvents.filter(x => x.currency === currency && x.type === 'outflow' && ['planned', 'committed'].includes(x.status) && Date.parse(x.dueAt) >= today && Date.parse(x.dueAt) <= d30).reduce((s, x) => s + x.amountMinor, 0);
    const in30 = state.cashEvents.filter(x => x.currency === currency && x.type === 'inflow' && ['planned', 'committed'].includes(x.status) && Date.parse(x.dueAt) >= today && Date.parse(x.dueAt) <= d30).reduce((s, x) => s + x.amountMinor, 0);
    const supplierDue30 = state.cashEvents.filter(x => x.currency === currency && x.type === 'outflow' && x.category === 'supplier' && ['planned', 'committed'].includes(x.status) && Date.parse(x.dueAt) >= today && Date.parse(x.dueAt) <= d30).reduce((s, x) => s + x.amountMinor, 0);
    const treasury = state.treasuryBalances.filter(x => x.currency === currency).sort((a, b) => b.asOf.localeCompare(a.asOf))[0]?.openingBalanceMinor ?? 0;
    const burn = Math.max(0, fixedMonthly + supplierDue30 + variableForecast - in30);
    const runway = burn > 0 ? Number((treasury / burn).toFixed(2)) : null;
    const runwayStatus = runway == null ? 'unknown' : runway < 1 ? 'critical' : runway < runwaySafety ? 'watch' : 'strong';
    const totalContract = projectRows.reduce((s, x) => s + x.contractValueMinor, 0);
    const totalReceived = projectRows.reduce((s, x) => s + x.receivedMinor, 0);
    const backlogProfit = projectRows.reduce((s, x) => s + x.forecastProfitMinor, 0);
    const actualCost = projectRows.reduce((s, x) => s + x.actualCostMinor, 0);
    const weightedContribution = totalContract > 0 ? pct(backlogProfit, totalContract) : targetGross;
    const contribution = Math.max(1, weightedContribution);
    const breakEvenRevenue = Math.round(fixedMonthly / (contribution / 100));
    const contractedThisMonth = revenueForecast;
    const revenueGap = Math.max(0, breakEvenRevenue - contractedThisMonth);
    const alerts = [];
    if (runwayStatus === 'critical')
        alerts.push({ severity: 'critical', code: 'RUNWAY_LT_1_MONTH', message: `Cash runway below one month: ${runway ?? 0} months.` });
    else if (runwayStatus === 'watch')
        alerts.push({ severity: 'high', code: 'RUNWAY_BELOW_SAFETY', message: `Cash runway ${runway} months is below safety target ${runwaySafety}.` });
    if (revenueGap > 0)
        alerts.push({ severity: 'high', code: 'BREAK_EVEN_GAP', message: `Break-even revenue gap for ${month}: ${revenueGap} minor units.` });
    if (opForecast < 0)
        alerts.push({ severity: 'critical', code: 'FORECAST_OPERATING_LOSS', message: `Forecast operating result for ${month} is negative by ${Math.abs(opForecast)} minor units.` });
    if (pct(grossForecast, revenueForecast) < targetGross && revenueForecast > 0)
        alerts.push({ severity: 'medium', code: 'GROSS_MARGIN_BELOW_TARGET', message: `Forecast gross margin below target ${targetGross}%.` });
    if (pct(opForecast, revenueForecast) < targetOperating && revenueForecast > 0)
        alerts.push({ severity: 'medium', code: 'OPERATING_MARGIN_BELOW_TARGET', message: `Forecast operating margin below target ${targetOperating}%.` });
    for (const x of projectRows.filter(x => x.forecastMarginPercent < 15 && x.contractValueMinor > 0).slice(0, 5))
        alerts.push({ severity: 'high', code: 'PROJECT_LOW_MARGIN', message: `${x.title}: forecast margin ${x.forecastMarginPercent}%.`, projectId: x.projectId });
    const best = projectRows.slice().sort((a, b) => b.forecastMarginPercent - a.forecastMarginPercent)[0];
    const worst = projectRows.slice().sort((a, b) => a.forecastMarginPercent - b.forecastMarginPercent)[0];
    const arTop = projectRows.slice().sort((a, b) => b.accountsReceivableMinor - a.accountsReceivableMinor)[0];
    const profitTop = projectRows.slice().sort((a, b) => b.forecastProfitMinor - a.forecastProfitMinor)[0];
    const rows = [
        { category: 'Revenue', actualMinor: revenue.amount, forecastMinor: revenueForecast, varianceMinor: revenue.amount - revenueForecast },
        { category: 'Project COGS', actualMinor: cogsActual, forecastMinor: cogsForecast, varianceMinor: cogsActual - cogsForecast },
        { category: 'Gross Profit', actualMinor: grossActual, forecastMinor: grossForecast, varianceMinor: grossActual - grossForecast },
        { category: 'Fixed Operating Expenses', actualMinor: fixedMonthly, forecastMinor: fixedMonthly, varianceMinor: 0 },
        { category: 'Variable Operating Expenses', actualMinor: variableActual, forecastMinor: variableForecast, varianceMinor: variableActual - variableForecast },
        { category: 'Operating Profit', actualMinor: opActual, forecastMinor: opForecast, varianceMinor: opActual - opForecast }
    ];
    return {
        version: '5.0.0', generatedAt: new Date().toISOString(), currency,
        period: { month, from: fromIso, to: toIso, basis: revenue.basis },
        pnl: {
            revenueActualMinor: revenue.amount, revenueForecastMinor: revenueForecast,
            cogsActualMinor: cogsActual, cogsForecastMinor: cogsForecast,
            grossProfitActualMinor: grossActual, grossProfitForecastMinor: grossForecast,
            grossMarginActualPercent: pct(grossActual, revenue.amount), grossMarginForecastPercent: pct(grossForecast, revenueForecast),
            fixedOperatingExpensesMinor: fixedMonthly, variableOperatingExpensesActualMinor: variableActual,
            variableOperatingExpensesForecastMinor: variableForecast, operatingProfitActualMinor: opActual,
            operatingProfitForecastMinor: opForecast, operatingMarginActualPercent: pct(opActual, revenue.amount),
            operatingMarginForecastPercent: pct(opForecast, revenueForecast), taxReserveMinor: taxReserve,
            netAfterTaxReserveMinor: netAfterTax, rows
        },
        workingCapital: { accountsReceivableMinor: ar, accountsPayableMinor: ap, netWorkingCapitalMinor: ar - ap, overdueReceivablesMinor: overdueReceivables, supplierDue30Minor: supplierDue30 },
        liquidity: { treasuryMinor: treasury, committedCashOut30Minor: due30, expectedCashIn30Minor: in30, net30Minor: in30 - due30, monthlyBurnMinor: burn, runwayMonths: runway, runwayStatus },
        breakEven: { fixedMonthlyMinor: fixedMonthly, contributionMarginPercent: contribution, breakEvenRevenueMinor: breakEvenRevenue, contractedRevenueMinor: contractedThisMonth, revenueGapMinor: revenueGap, achieved: contractedThisMonth >= breakEvenRevenue },
        backlog: { contractedMinor: totalContract, receivedMinor: totalReceived, outstandingMinor: Math.max(0, totalContract - totalReceived), forecastProfitMinor: backlogProfit, actualCostMinor: actualCost },
        projects: projectRows,
        ranking: { bestMarginProjectId: best?.projectId ?? null, worstMarginProjectId: worst?.projectId ?? null, highestReceivableProjectId: arTop?.projectId ?? null, highestProfitProjectId: profitTop?.projectId ?? null },
        alerts
    };
}
export function buildFinanceTrend(projects, state, currency = 'EUR', endMonth = new Date().toISOString().slice(0, 7), months = 6) {
    const [ey, em] = endMonth.split('-').map(Number);
    const rows = [];
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(ey, em - 1 - i, 1));
        const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const r = buildOwnerFinanceReport(projects, state, currency, month, d);
        rows.push({ month, revenueActualMinor: r.pnl.revenueActualMinor, revenueForecastMinor: r.pnl.revenueForecastMinor, operatingProfitActualMinor: r.pnl.operatingProfitActualMinor, operatingProfitForecastMinor: r.pnl.operatingProfitForecastMinor, grossMarginForecastPercent: r.pnl.grossMarginForecastPercent });
    }
    return { version: '5.0.0', currency, months: rows };
}
