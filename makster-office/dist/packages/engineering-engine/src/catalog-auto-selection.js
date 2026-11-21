import { allHardwareCatalogRecords, allApplianceCatalogRecords, hardwareMayAuthorizeDrilling, } from './master-catalog.js';
import { evaluateHardwareCompatibility, evaluateApplianceCompatibility, } from './catalog-compatibility.js';
function preferredBoost(manufacturer, prefs) {
    if (!prefs?.length)
        return 0;
    const i = prefs.findIndex(x => x.toLowerCase() === manufacturer.toLowerCase());
    if (i < 0)
        return 0;
    return Math.max(2, 12 - i * 3);
}
function excluded(manufacturer, prefs) {
    return Boolean(prefs?.some(x => x.toLowerCase() === manufacturer.toLowerCase()));
}
function statusBoost(status) {
    if (status === 'compatible')
        return 20;
    if (status === 'conditional')
        return 8;
    if (status === 'unknown')
        return -12;
    return -100;
}
function clamp(n) { return Math.max(0, Math.min(100, Math.round(n * 10) / 10)); }
export function autoSelectHardware(input) {
    const rejected = [];
    const all = allHardwareCatalogRecords()
        .filter(r => r.role === input.role)
        .filter(r => !excluded(r.manufacturer, input.excludedManufacturers))
        .map(record => {
        const ctx = {
            role: input.role,
            ...(input.frontThicknessMm == null ? {} : { frontThicknessMm: input.frontThicknessMm }),
            ...(input.desiredNominalLengthMm == null ? {} : { desiredNominalLengthMm: input.desiredNominalLengthMm }),
            ...(input.expectedDynamicLoadKg == null ? {} : { expectedDynamicLoadKg: input.expectedDynamicLoadKg }),
            ...(input.requireProductionDrilling == null ? {} : { requireProductionDrilling: input.requireProductionDrilling }),
        };
        const comp = evaluateHardwareCompatibility(record, ctx);
        const prod = hardwareMayAuthorizeDrilling(record);
        const score = clamp(comp.score * 0.7 + statusBoost(comp.status) + preferredBoost(record.manufacturer, input.preferredManufacturers) + (prod ? 8 : 0));
        const reasons = [
            `Compatibility ${comp.status} ${comp.score}/100.`,
            ...(prod ? ['Trusted drilling profile available.'] : ['Production drilling not authorized by catalog trust.']),
            ...(preferredBoost(record.manufacturer, input.preferredManufacturers) > 0 ? [`${record.manufacturer} matches preferred brand order.`] : []),
        ];
        return { record, compatibilityStatus: comp.status, compatibilityScore: comp.score, selectionScore: score, productionReady: prod, reasons };
    });
    const viable = all.filter(c => {
        if (c.compatibilityStatus === 'incompatible') {
            rejected.push(c.record.id);
            return false;
        }
        if (input.requireProductionDrilling && (!c.productionReady || c.compatibilityStatus === 'unknown')) {
            rejected.push(c.record.id);
            return false;
        }
        return true;
    }).sort((a, b) => b.selectionScore - a.selectionScore || b.compatibilityScore - a.compatibilityScore || a.record.id.localeCompare(b.record.id));
    const max = Math.max(1, Math.min(5, input.maxResults ?? 3));
    const candidates = viable.slice(0, max);
    return {
        ready: candidates.length > 0,
        candidates,
        ...(candidates[0] ? { recommended: candidates[0] } : {}),
        rejectedCount: all.length - viable.length,
        issues: candidates.length ? [] : ['No compatible hardware candidate in the current verified catalog.'],
    };
}
export function autoSelectAppliances(input) {
    const all = allApplianceCatalogRecords()
        .filter(r => r.kind === input.kind)
        .filter(r => !excluded(r.manufacturer, input.excludedManufacturers))
        .map(record => {
        const ctx = {
            kind: input.kind,
            ...(input.nicheWidthMm == null ? {} : { nicheWidthMm: input.nicheWidthMm }),
            ...(input.nicheHeightMm == null ? {} : { nicheHeightMm: input.nicheHeightMm }),
            ...(input.nicheDepthMm == null ? {} : { nicheDepthMm: input.nicheDepthMm }),
            ...(input.ventilationAreaCm2 == null ? {} : { ventilationAreaCm2: input.ventilationAreaCm2 }),
        };
        const comp = evaluateApplianceCompatibility(record, ctx);
        const score = clamp(comp.score * 0.75 + statusBoost(comp.status) + preferredBoost(record.manufacturer, input.preferredManufacturers));
        const reasons = [
            `Compatibility ${comp.status} ${comp.score}/100.`,
            ...(preferredBoost(record.manufacturer, input.preferredManufacturers) > 0 ? [`${record.manufacturer} matches preferred brand order.`] : []),
            ...(comp.status === 'unknown' ? ['Verified installation data is incomplete; candidate is not treated as confirmed fit.'] : []),
        ];
        return { record, compatibilityStatus: comp.status, compatibilityScore: comp.score, selectionScore: score, productionReady: comp.status === 'compatible', reasons };
    });
    const viable = all.filter(c => c.compatibilityStatus !== 'incompatible')
        .sort((a, b) => b.selectionScore - a.selectionScore || b.compatibilityScore - a.compatibilityScore || a.record.id.localeCompare(b.record.id));
    const max = Math.max(1, Math.min(5, input.maxResults ?? 3));
    const candidates = viable.slice(0, max);
    return {
        ready: candidates.some(c => c.compatibilityStatus === 'compatible'),
        candidates,
        ...(candidates[0] ? { recommended: candidates[0] } : {}),
        rejectedCount: all.length - viable.length,
        issues: candidates.length ? [] : ['No compatible appliance candidate in the current verified catalog.'],
    };
}
