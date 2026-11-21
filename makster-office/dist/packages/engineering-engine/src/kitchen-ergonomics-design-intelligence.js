import { toMm } from '../../project-model/src/types.js';
const D = {
    minPrepSurfaceMm: 400,
    preferredPrepSurfaceMm: 800,
    maxSinkDishwasherDistanceMm: 1200,
    minApplianceOpeningClearanceMm: 600,
    minFridgeOpeningClearanceMm: 900,
    minWorkTriangleLegMm: 1200,
    maxWorkTriangleLegMm: 2700,
    maxWorkTrianglePerimeterMm: 7900,
    minWallBottomZMm: 1350,
    maxWallBottomZMm: 1650,
};
function clamp(n) { return Math.max(0, Math.min(100, Math.round(n * 10) / 10)); }
function fn(p) { return p.module.kitchen?.function; }
function isSink(p) { return p.module.libraryModuleId === 'base.sink' || fn(p) === 'sink'; }
function isDishwasher(p) { return p.module.libraryModuleId === 'base.dishwasher' || fn(p) === 'dishwasher'; }
function isCooking(p) { return p.module.libraryModuleId === 'base.oven_hob' || p.module.libraryModuleId === 'tall.oven' || fn(p) === 'hob' || fn(p) === 'oven'; }
function isFridge(p) { return p.module.libraryModuleId === 'tall.fridge' || fn(p) === 'fridge'; }
function centre(p) { return p.xMm + p.widthMm / 2; }
function localDistance(a, b) { return Math.abs(centre(a) - centre(b)); }
function bestPrepSurface(plan) {
    let best = { available: false, widthMm: 0 };
    for (const run of plan.runs) {
        const ps = [...run.floorPlacements].sort((a, b) => a.xMm - b.xMm);
        const sink = ps.find(isSink);
        const cooking = ps.find(isCooking);
        if (!sink || !cooking)
            continue;
        const left = Math.min(sink.xMm + sink.widthMm, cooking.xMm + cooking.widthMm);
        const right = Math.max(sink.xMm, cooking.xMm);
        const gap = Math.max(0, right - left);
        if (gap > best.widthMm)
            best = { available: true, side: run.side, betweenModuleIds: [sink.module.id, cooking.module.id], widthMm: gap };
    }
    return best;
}
function frontOpeningDepth(front, p) {
    if (!front)
        return Math.min(600, p.widthMm);
    if (front.kind === 'drawer_front')
        return 500;
    if (front.kind === 'hinged')
        return Math.min(650, p.widthMm);
    return 0;
}
function openingEnvelopes(plan, rules) {
    const out = [];
    for (const run of plan.runs) {
        for (const p of run.floorPlacements) {
            let kind = null;
            let clearance = rules.minApplianceOpeningClearanceMm;
            if (isDishwasher(p))
                kind = 'dishwasher';
            else if (isFridge(p)) {
                kind = 'fridge';
                clearance = rules.minFridgeOpeningClearanceMm;
            }
            else if (isCooking(p) && p.module.kitchen?.appliances?.some(a => a.kind === 'oven'))
                kind = 'oven';
            else {
                const front = run.floorFronts.find(f => f.moduleIds.includes(p.module.id));
                const depth = frontOpeningDepth(front, p);
                if (depth > 0) {
                    kind = 'front';
                    clearance = depth;
                }
            }
            if (kind)
                out.push({ moduleId: p.module.id, side: run.side, kind, startMm: p.xMm, endMm: p.xMm + p.widthMm, requiredClearanceMm: clearance });
        }
    }
    return out;
}
function opposite(a, b) {
    return (a === 'south' && b === 'north') || (a === 'north' && b === 'south') || (a === 'east' && b === 'west') || (a === 'west' && b === 'east');
}
function nominalAisle(plan, a, b) {
    const ra = plan.runs.find(r => r.side === a), rb = plan.runs.find(r => r.side === b);
    if (!ra || !rb)
        return undefined;
    if ((a === 'south' || a === 'north') && opposite(a, b)) {
        return plan.roomDepthMm - ra.depthMm - rb.depthMm;
    }
    if ((a === 'east' || a === 'west') && opposite(a, b)) {
        return plan.roomWidthMm - ra.depthMm - rb.depthMm;
    }
    return undefined;
}
export function evaluateKitchenErgonomics(plan, custom = {}) {
    const r = { ...D, ...custom };
    const issues = [];
    const prep = bestPrepSurface(plan);
    if (prep.available && prep.widthMm < r.minPrepSurfaceMm)
        issues.push({ code: 'PREP_SURFACE_TOO_SMALL', severity: 'blocking', message: `Continuous prep surface between sink and cooking is ${prep.widthMm} mm; configured minimum is ${r.minPrepSurfaceMm} mm.`, ...(prep.side ? { side: prep.side } : {}), measuredMm: prep.widthMm, thresholdMm: r.minPrepSurfaceMm });
    else if (prep.available && prep.widthMm < r.preferredPrepSurfaceMm)
        issues.push({ code: 'PREP_SURFACE_PREFERRED_NOT_MET', severity: 'warning', message: `Continuous prep surface is ${prep.widthMm} mm; preferred target is ${r.preferredPrepSurfaceMm} mm.`, ...(prep.side ? { side: prep.side } : {}), measuredMm: prep.widthMm, thresholdMm: r.preferredPrepSurfaceMm });
    for (const run of plan.runs) {
        const sink = run.floorPlacements.find(isSink), dw = run.floorPlacements.find(isDishwasher);
        if (sink && dw) {
            const d = localDistance(sink, dw);
            if (d > r.maxSinkDishwasherDistanceMm)
                issues.push({ code: 'DISHWASHER_TOO_FAR_FROM_SINK', severity: 'warning', message: `Dishwasher is ${Math.round(d)} mm from sink centre; configured maximum is ${r.maxSinkDishwasherDistanceMm} mm.`, side: run.side, moduleId: dw.module.id, relatedModuleId: sink.module.id, measuredMm: Math.round(d), thresholdMm: r.maxSinkDishwasherDistanceMm });
        }
        if (run.wallTransform) {
            const z = toMm(run.wallTransform.position.z);
            if (z < r.minWallBottomZMm || z > r.maxWallBottomZMm)
                issues.push({ code: 'WALL_CABINET_HEIGHT_OUT_OF_RANGE', severity: 'warning', message: `Wall cabinet bottom is at ${z} mm; configured ergonomic range is ${r.minWallBottomZMm}-${r.maxWallBottomZMm} mm.`, side: run.side, measuredMm: z });
        }
    }
    if (plan.workTriangle.available) {
        for (const leg of plan.workTriangle.legsMm) {
            if (leg < r.minWorkTriangleLegMm)
                issues.push({ code: 'WORK_TRIANGLE_LEG_TOO_SHORT', severity: 'warning', message: `Work-triangle leg is ${leg} mm; configured minimum is ${r.minWorkTriangleLegMm} mm.`, measuredMm: leg, thresholdMm: r.minWorkTriangleLegMm });
            if (leg > r.maxWorkTriangleLegMm)
                issues.push({ code: 'WORK_TRIANGLE_LEG_TOO_LONG', severity: 'warning', message: `Work-triangle leg is ${leg} mm; configured maximum is ${r.maxWorkTriangleLegMm} mm.`, measuredMm: leg, thresholdMm: r.maxWorkTriangleLegMm });
        }
        if ((plan.workTriangle.perimeterMm ?? 0) > r.maxWorkTrianglePerimeterMm) {
            const perimeter = plan.workTriangle.perimeterMm;
            issues.push({ code: 'WORK_TRIANGLE_PERIMETER_TOO_LONG', severity: 'warning', message: `Work-triangle perimeter is ${perimeter} mm; configured maximum is ${r.maxWorkTrianglePerimeterMm} mm.`, measuredMm: perimeter, thresholdMm: r.maxWorkTrianglePerimeterMm });
        }
    }
    const env = openingEnvelopes(plan, r);
    // For opposite runs, use known aisle when the base-layout room dimensions have been propagated by callers.
    for (let i = 0; i < env.length; i++)
        for (let j = i + 1; j < env.length; j++) {
            const a = env[i], b = env[j];
            if (!opposite(a.side, b.side))
                continue;
            const aisle = nominalAisle(plan, a.side, b.side);
            if (aisle == null)
                continue;
            if (a.requiredClearanceMm + b.requiredClearanceMm > aisle) {
                issues.push({ code: a.kind === 'fridge' || b.kind === 'fridge' ? 'FRIDGE_OPENING_CONFLICT' : 'APPLIANCE_OPENING_CONFLICT', severity: 'blocking', message: `Opposing opening envelopes require ${a.requiredClearanceMm + b.requiredClearanceMm} mm, but aisle is ${aisle} mm.`, moduleId: a.moduleId, relatedModuleId: b.moduleId, measuredMm: aisle, thresholdMm: a.requiredClearanceMm + b.requiredClearanceMm });
            }
        }
    const blocking = issues.filter(i => i.severity === 'blocking').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const safety = clamp(100 - blocking * 40 - warnings * 3);
    const workflow = clamp(100 - issues.filter(i => i.code.startsWith('WORK_TRIANGLE') || i.code === 'DISHWASHER_TOO_FAR_FROM_SINK').length * 10);
    const prepScore = !prep.available ? 70 : clamp((prep.widthMm / r.preferredPrepSurfaceMm) * 100);
    const access = clamp(100 - issues.filter(i => i.code.includes('OPENING_CONFLICT')).length * 35);
    const vertical = clamp(100 - issues.filter(i => i.code === 'WALL_CABINET_HEIGHT_OUT_OF_RANGE').length * 20);
    const total = clamp(safety * .35 + workflow * .25 + prepScore * .2 + access * .15 + vertical * .05);
    const reasons = [
        prep.available ? `Best continuous prep surface: ${prep.widthMm} mm.` : 'No same-run sink-to-cooking prep surface was derived.',
        plan.workTriangle.available ? `Actual work triangle perimeter: ${plan.workTriangle.perimeterMm} mm.` : 'Work triangle is unavailable until sink, cooking and fridge all have real placements.',
        blocking ? `${blocking} blocking ergonomic conflict(s).` : 'No blocking ergonomic conflicts.',
        warnings ? `${warnings} ergonomic warning(s).` : 'No ergonomic warnings.',
    ];
    return { planId: plan.planId, ready: plan.ready && blocking === 0, score: { safety, workflow, prepSurface: prepScore, applianceAccess: access, verticalReach: vertical, total }, prepSurface: prep, openingEnvelopes: env, issues, reasons };
}
