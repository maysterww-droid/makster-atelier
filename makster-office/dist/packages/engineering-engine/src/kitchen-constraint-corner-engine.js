const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
function runRect(plan, side) {
    const r = plan.runs.find(x => x.side === side);
    if (!r)
        return;
    const w = r.lengthMm, d = r.depthMm, W = plan.roomWidthMm, D = plan.roomDepthMm;
    if (side === 'south')
        return { x: 0, y: 0, w, d };
    if (side === 'north')
        return { x: 0, y: D - d, w, d };
    if (side === 'east')
        return { x: W - d, y: 0, w: d, d: w };
    if (side === 'west')
        return { x: 0, y: 0, w: d, d: w };
    if (side === 'island')
        return { x: (W - w) / 2, y: (D - d) / 2, w, d };
}
function cornerSides(at) {
    if (at === 'south_east')
        return ['south', 'east'];
    if (at === 'north_east')
        return ['north', 'east'];
    if (at === 'north_west')
        return ['north', 'west'];
    return ['south', 'west'];
}
function chooseCorner(req, plan) {
    const [a, b] = cornerSides(req.at);
    const ra = plan.runs.find(r => r.side === a), rb = plan.runs.find(r => r.side === b);
    if (!ra || !rb)
        return;
    const access = Math.max(0, Math.min(ra.depthMm, rb.depthMm));
    const min = req.minAccessMm ?? 450;
    const preferred = req.preferred;
    const auto = access >= 600 ? 'carousel' : access >= 500 ? 'lemans' : 'blind';
    const strategy = preferred ?? auto;
    const id = strategy === 'blind' ? 'corner.base.blind' : strategy === 'carousel' ? 'corner.base.carousel' : strategy === 'lemans' ? 'corner.base.lemans' : 'corner.base.diagonal';
    return { at: req.at, strategy, accessMm: access, libraryModuleId: id };
}
export function evaluateKitchenConstraints(plan, input = {}) {
    const issues = [];
    const rects = plan.runs.map(r => ({ id: r.id, rect: runRect(plan, r.side) })).filter(x => x.rect);
    for (const o of input.obstacles ?? []) {
        const c = o.clearanceMm ?? 0;
        const or = { x: o.xMm - c, y: o.yMm - c, w: o.widthMm + 2 * c, d: o.depthMm + 2 * c };
        for (const r of rects)
            if (intersects(or, r.rect))
                issues.push({ code: 'OBSTACLE_COLLISION', severity: 'blocking', message: `${o.kind} ${o.id} conflicts with kitchen run ${r.id}.` });
    }
    for (const z of input.openingZones ?? []) {
        const zr = { x: z.xMm, y: z.yMm, w: z.widthMm, d: z.depthMm };
        for (const r of rects)
            if (intersects(zr, r.rect))
                issues.push({ code: 'OPENING_ZONE_COLLISION', severity: 'blocking', message: `Opening zone ${z.id} (${z.owner}) conflicts with kitchen run ${r.id}.` });
    }
    const corners = [];
    for (const req of input.corners ?? []) {
        const d = chooseCorner(req, plan);
        if (!d) {
            issues.push({ code: 'CORNER_STRATEGY_UNAVAILABLE', severity: 'blocking', message: `Corner ${req.at} has no two adjoining runs.` });
            continue;
        }
        corners.push(d);
        if (d.accessMm < (req.minAccessMm ?? 450))
            issues.push({ code: 'CORNER_ACCESS_TOO_SMALL', severity: 'blocking', message: `Corner ${req.at} has ${d.accessMm} mm access.` });
    }
    const blocking = issues.filter(i => i.severity === 'blocking').length;
    return { issues, corners, score: Math.max(0, 100 - blocking * 25 - issues.length * 5), ready: plan.ready && blocking === 0 };
}
