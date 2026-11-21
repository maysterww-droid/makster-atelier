import { createHash, randomUUID } from 'node:crypto';
import { buildCommercialPackage } from '../../commercial-engine/src/engine.js';
import { CHANGE_INTELLIGENCE_VERSION } from './types.js';
function canonical(v) { if (Array.isArray(v))
    return '[' + v.map(canonical).join(',') + ']'; if (v && typeof v === 'object') {
    const o = v;
    return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
} return JSON.stringify(v); }
function sha(v) { return createHash('sha256').update(canonical(v)).digest('hex'); }
function delta(before, after) { return { before, after, delta: after - before }; }
function mm10Text(v) { return typeof v === 'number' ? `${(v / 10).toFixed(v % 10 ? 1 : 0)} mm` : String(v ?? '—'); }
function valueText(path, v) { if (v === undefined)
    return '—'; if (/dimensions\/(width|height|depth)|carcassThickness|backPanel\/thickness|groove(Inset|Depth|Clearance)|\/width\/value\/value$/.test(path))
    return mm10Text(v); if (Array.isArray(v))
    return v.join(', '); return typeof v === 'object' ? JSON.stringify(v) : String(v); }
function category(path) { if (path.includes('/dimensions/'))
    return 'dimensions'; if (path.includes('/construction/'))
    return 'construction'; if (path.includes('/modules/'))
    return path.includes('/contents/') ? 'contents' : 'modules'; if (path.includes('/fronts/'))
    return 'fronts'; if (path.includes('/selections/materials/'))
    return 'materials'; if (path.includes('/selections/hardware/'))
    return 'hardware'; if (path.includes('/style/'))
    return 'style'; return 'other'; }
function label(path, before, after) {
    const parts = path.split('/').filter(Boolean);
    const project = after;
    const fIndex = parts.indexOf('furniture');
    let f;
    let m;
    let c;
    if (fIndex >= 0) {
        f = project.furniture.find(x => x.id === parts[fIndex + 1]) ?? before.furniture.find(x => x.id === parts[fIndex + 1]);
        const mi = parts.indexOf('modules');
        if (mi >= 0 && f)
            m = f.modules.find((x) => x.id === parts[mi + 1]);
        const ci = parts.indexOf('contents');
        if (ci >= 0 && m)
            c = m.contents.find((x) => x.id === parts[ci + 1]);
    }
    const prop = parts.at(-1) ?? 'change';
    const propName = { width: 'width', height: 'height', depth: 'depth', count: 'count', materialSelectionId: 'material', runnerHardwareSelectionId: 'runner', hingeSides: 'hinge sides', carcassThickness: 'carcass thickness', thickness: 'thickness', kind: 'type', name: 'name' };
    const chain = [f?.name, m?.name ?? (m ? `Module ${f.modules.indexOf(m) + 1}` : undefined), c ? (c.kind === 'drawer_stack' ? 'drawers' : c.kind === 'shelf_stack' ? 'shelves' : c.kind === 'clothes_rail' ? 'rail' : c.kind) : undefined, propName[prop] ?? prop.replaceAll('_', ' ')].filter(Boolean);
    return chain.length > 1 ? chain.join(' → ') : parts.slice(-3).join(' / ').replaceAll('_', ' ');
}
function facts(project) {
    const out = new Map();
    for (const f of project.furniture) {
        const fp = `/furniture/${f.id}`;
        out.set(`${fp}/name`, f.name);
        out.set(`${fp}/kind`, f.kind);
        for (const k of ['width', 'height', 'depth'])
            out.set(`${fp}/dimensions/${k}`, f.dimensions[k].value);
        out.set(`${fp}/construction/carcassThickness`, f.construction.carcassThickness.value);
        out.set(`${fp}/construction/backPanel/mode`, f.construction.backPanel.mode);
        out.set(`${fp}/construction/backPanel/thickness`, f.construction.backPanel.thickness?.value ?? null);
        for (const m of f.modules) {
            const mp = `${fp}/modules/${m.id}`;
            out.set(`${mp}/kind`, m.kind);
            out.set(`${mp}/name`, m.name ?? '');
            if (m.width.mode === 'fixed')
                out.set(`${mp}/width/value/value`, m.width.value.value);
            else if (m.width.mode === 'ratio')
                out.set(`${mp}/width/ratio`, m.width.ratio);
            else {
                out.set(`${mp}/width/mode`, 'fill');
                out.set(`${mp}/width/min`, m.width.min?.value ?? null);
                out.set(`${mp}/width/max`, m.width.max?.value ?? null);
            }
            for (const c of m.contents) {
                const cp = `${mp}/contents/${c.id}`;
                out.set(`${cp}/kind`, c.kind);
                if ('count' in c)
                    out.set(`${cp}/count`, c.count);
                if (c.kind === 'drawer_stack')
                    out.set(`${cp}/runnerHardwareSelectionId`, c.runnerHardwareSelectionId ?? null);
            }
        }
        for (const fr of f.fronts) {
            const p = `${fp}/fronts/${fr.id}`;
            out.set(`${p}/kind`, fr.kind);
            out.set(`${p}/count`, fr.count);
            out.set(`${p}/materialSelectionId`, fr.materialSelectionId ?? null);
            out.set(`${p}/hingeSides`, fr.hingeSides ?? []);
        }
    }
    for (const m of project.selections.materials) {
        const p = `/selections/materials/${m.id}`;
        out.set(`${p}/name`, m.name);
        out.set(`${p}/code`, m.code ?? null);
        out.set(`${p}/thickness`, m.thickness?.value ?? null);
    }
    for (const h of project.selections.hardware) {
        const p = `/selections/hardware/${h.id}`;
        out.set(`${p}/name`, h.name);
        out.set(`${p}/code`, h.code ?? null);
        out.set(`${p}/role`, h.role);
    }
    return out;
}
function compareFacts(a, b) { const A = facts(a), B = facts(b), keys = new Set([...A.keys(), ...B.keys()]), changes = []; for (const path of [...keys].sort()) {
    const av = A.get(path), bv = B.get(path);
    if (canonical(av) === canonical(bv))
        continue;
    const kind = !A.has(path) ? 'added' : !B.has(path) ? 'removed' : 'changed';
    const cat = category(path);
    const productionImpact = cat !== 'style' && !path.endsWith('/name');
    const commercialImpact = ['dimensions', 'construction', 'modules', 'contents', 'fronts', 'materials', 'hardware'].includes(cat);
    const customerVisible = ['dimensions', 'modules', 'contents', 'fronts', 'materials', 'hardware', 'style'].includes(cat);
    changes.push({ path, category: cat, kind, label: label(path, a, b), ...(A.has(path) ? { before: av, beforeText: valueText(path, av) } : {}), ...(B.has(path) ? { after: bv, afterText: valueText(path, bv) } : {}), customerVisible, productionImpact, commercialImpact });
} return changes; }
function partSignature(p) { return canonical({ quantity: p.quantity, materialSelectionId: p.materialSelectionId, length: p.length, width: p.width, thickness: p.thickness, grainDirection: p.grainDirection, edges: p.edges, estimated: p.estimated }); }
function hardwareSignature(h) { return canonical({ quantity: h.quantity, hardwareSelectionId: h.hardwareSelectionId, role: h.role, name: h.name, unit: h.unit, length: h.length, estimated: h.estimated }); }
function changedIds(a, b, sig) { const A = new Map(a.map(x => [x.id, x])), B = new Map(b.map(x => [x.id, x])); return { added: [...B.keys()].filter(k => !A.has(k)).sort(), removed: [...A.keys()].filter(k => !B.has(k)).sort(), changed: [...A.keys()].filter(k => B.has(k) && sig(A.get(k)) !== sig(B.get(k))).sort() }; }
function commercial(before, after) { if (!before || !after)
    return { available: false }; const a = before.estimate.totals, b = after.estimate.totals; const A = new Map(before.estimate.lines.map(x => [x.id, x])), B = new Map(after.estimate.lines.map(x => [x.id, x])); const lineChanges = [...new Set([...A.keys(), ...B.keys()])].map(id => { const x = A.get(id), y = B.get(id); return { id, category: y?.category ?? x?.category ?? 'other', name: y?.label ?? x?.label ?? id, beforeAmountMinor: x?.totalCostMinor ?? 0, afterAmountMinor: y?.totalCostMinor ?? 0, deltaMinor: (y?.totalCostMinor ?? 0) - (x?.totalCostMinor ?? 0), beforeQuantity: x?.quantity ?? 0, afterQuantity: y?.quantity ?? 0 }; }).filter(x => x.deltaMinor !== 0 || x.beforeQuantity !== x.afterQuantity).sort((x, y) => Math.abs(y.deltaMinor) - Math.abs(x.deltaMinor)); return { available: true, currency: before.quote.currency, lineChanges, costBasisMinor: delta(a.totalCostMinor, b.totalCostMinor), netSalesMinor: delta(a.netSalesMinor, b.netSalesMinor), customerTotalMinor: delta(before.quote.totalAmountMinor, after.quote.totalAmountMinor), grossProfitMinor: delta(a.profitMinor, b.profitMinor), grossMarginBps: delta(a.marginBps, b.marginBps), priceChangePercentBps: a.netSalesMinor ? Math.round((b.netSalesMinor - a.netSalesMinor) * 10000 / a.netSalesMinor) : 0 }; }
export function compareRevisions(input) { if (input.beforeProject.projectId !== input.afterProject.projectId)
    throw new Error('change_compare_project_mismatch'); if (input.afterProject.revision <= input.beforeProject.revision)
    throw new Error('change_compare_revision_order_invalid'); const projectChanges = compareFacts(input.beforeProject, input.afterProject); const pd = changedIds(input.beforeEngineering.parts, input.afterEngineering.parts, partSignature); const hd = changedIds(input.beforeEngineering.hardware, input.afterEngineering.hardware, hardwareSignature); const eng = { panelPartCount: delta(input.beforeEngineering.stats.panelPartCount, input.afterEngineering.stats.panelPartCount), uniquePanelCount: delta(input.beforeEngineering.stats.uniquePanelCount, input.afterEngineering.stats.uniquePanelCount), totalPanelAreaMm2: delta(input.beforeEngineering.stats.totalPanelAreaMm2, input.afterEngineering.stats.totalPanelAreaMm2), hardwareRequirementCount: delta(input.beforeEngineering.stats.hardwareRequirementCount, input.afterEngineering.stats.hardwareRequirementCount), machiningOperationCount: delta(input.beforeEngineering.stats.machiningOperationCount, input.afterEngineering.stats.machiningOperationCount), warnings: delta(input.beforeEngineering.checks.warnings, input.afterEngineering.checks.warnings), errors: delta(input.beforeEngineering.checks.errors, input.afterEngineering.checks.errors), blocking: delta(input.beforeEngineering.checks.blocking, input.afterEngineering.checks.blocking), readyForProduction: { before: input.beforeEngineering.readyForProduction, after: input.afterEngineering.readyForProduction }, cncReady: { before: input.beforeEngineering.cncReady, after: input.afterEngineering.cncReady }, addedPartIds: pd.added, removedPartIds: pd.removed, changedPartIds: pd.changed, addedHardwareIds: hd.added, removedHardwareIds: hd.removed, changedHardwareIds: hd.changed }; const c = commercial(input.beforeQuote, input.afterQuote); const blockers = []; if (!input.afterEngineering.readyForProduction)
    blockers.push('AFTER_REVISION_NOT_PRODUCTION_READY'); if (input.afterQuote && !input.afterQuote.estimate.ready)
    blockers.push('AFTER_QUOTE_NOT_READY'); const payload = { projectId: input.afterProject.projectId, fromRevision: input.beforeProject.revision, toRevision: input.afterProject.revision, projectChanges, engineering: eng, commercial: c, blockers }; const changed = projectChanges.length > 0 || eng.addedPartIds.length + eng.removedPartIds.length + eng.changedPartIds.length + eng.addedHardwareIds.length + eng.removedHardwareIds.length + eng.changedHardwareIds.length > 0 || (c.available && c.netSalesMinor?.delta !== 0); return { changeVersion: CHANGE_INTELLIGENCE_VERSION, reportId: input.reportId ?? randomUUID(), projectId: input.afterProject.projectId, fromRevision: input.beforeProject.revision, toRevision: input.afterProject.revision, generatedAt: input.generatedAt ?? new Date().toISOString(), status: blockers.length ? 'blocked' : changed ? 'changed' : 'no_change', projectChanges, engineering: eng, commercial: c, summary: { projectChanges: projectChanges.length, productionChanges: projectChanges.filter(x => x.productionImpact).length, customerVisibleChanges: projectChanges.filter(x => x.customerVisible).length, commercialChanges: c.available ? (c.lineChanges?.length ?? 0) : projectChanges.filter(x => x.commercialImpact).length }, blockers, fingerprintSha256: sha(payload) }; }
export function requote(input) { const next = buildCommercialPackage({ project: input.afterProject, engineering: input.afterEngineering, pricing: input.pricing, quoteTerms: input.quoteTerms, ...(input.productionPack ? { productionPack: input.productionPack } : {}), estimateVersion: input.quoteVersion ?? input.basePackage.quote.quoteVersion + 1, quoteVersion: input.quoteVersion ?? input.basePackage.quote.quoteVersion + 1, ...(input.quoteId ? { quoteId: input.quoteId } : {}), ...(input.packageId ? { packageId: input.packageId } : {}), ...(input.generatedAt ? { generatedAt: input.generatedAt } : {}) }); return { commercialPackage: next, supersedesQuoteId: input.basePackage.quote.quoteId, fromRevision: input.basePackage.quote.revision, toRevision: input.afterProject.revision }; }
export function buildCustomerChangeSummary(report, beforeQuote, afterQuote) { return { reportId: report.reportId, projectId: report.projectId, fromRevision: report.fromRevision, toRevision: report.toRevision, currency: beforeQuote.quote.currency, changes: report.projectChanges.filter(x => x.customerVisible).map(x => ({ label: x.label, ...(x.beforeText ? { beforeText: x.beforeText } : {}), ...(x.afterText ? { afterText: x.afterText } : {}) })), previousTotalMinor: beforeQuote.quote.totalAmountMinor, newTotalMinor: afterQuote.quote.totalAmountMinor, deltaMinor: afterQuote.quote.totalAmountMinor - beforeQuote.quote.totalAmountMinor }; }
export function customerChangeSummaryHtml(s) { const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); const money = (v) => `${(v / 100).toFixed(2)} ${s.currency}`; const rows = s.changes.map(c => `<tr><td>${esc(c.label)}</td><td>${esc(c.beforeText ?? '—')}</td><td>${esc(c.afterText ?? '—')}</td></tr>`).join(''); return `<!doctype html><html><head><meta charset="utf-8"><title>Change R${s.fromRevision} to R${s.toRevision}</title><style>body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#171717}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:700}</style></head><body><h1>Project change summary</h1><p>Revision ${s.fromRevision} → ${s.toRevision}</p><table><thead><tr><th>Change</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table><p>Previous total: <strong>${money(s.previousTotalMinor)}</strong></p><p>New total: <strong>${money(s.newTotalMinor)}</strong></p><p class="total">Price change: ${s.deltaMinor >= 0 ? '+' : ''}${money(s.deltaMinor)}</p><p>This document contains customer-facing changes only.</p></body></html>`; }
