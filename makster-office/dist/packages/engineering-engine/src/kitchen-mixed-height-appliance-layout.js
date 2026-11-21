import { mm, toMm, } from '../../project-model/src/types.js';
import { KITCHEN_MODULE_LIBRARY } from './kitchen-module-library.js';
import { composeKitchenRun, } from './kitchen-run-composer.js';
const DEFAULT_BASE_HEIGHT = 720;
const DEFAULT_TALL_HEIGHT = 2100;
const DEFAULT_WALL_HEIGHT = 900;
const DEFAULT_WALL_BOTTOM = 1450;
const DEFAULT_WALL_DEPTH = 330;
const DEFAULT_WORKTOP_TOP = 910;
const DEFAULT_HOOD_CLEARANCE = 650;
function exact(widthMm) {
    return { mode: 'fixed', value: { value: mm(widthMm), state: 'confirmed' } };
}
function cloneWithGeometry(module, id, widthMm, heightMm, depthMm) {
    return {
        ...structuredClone(module),
        id,
        width: exact(widthMm),
        height: { value: mm(heightMm), state: 'confirmed' },
        depth: { value: mm(depthMm), state: 'confirmed' },
    };
}
function frontFor(runId, module, serial) {
    const fn = module.kitchen?.function;
    if (fn === 'open' || module.libraryModuleId?.startsWith('technical.'))
        return null;
    if (fn === 'dishwasher')
        return { id: `${runId}:front:${serial}`, moduleIds: [module.id], kind: 'fixed_panel', count: 1, split: 'none', opening: 'not_applicable' };
    if (fn === 'drawers')
        return { id: `${runId}:front:${serial}`, moduleIds: [module.id], kind: 'drawer_front', count: 3, split: 'horizontal', opening: 'not_applicable' };
    return { id: `${runId}:front:${serial}`, moduleIds: [module.id], kind: 'hinged', count: 1, split: 'none', opening: 'left' };
}
function applyApplianceBindings(module, bindings) {
    const binding = bindings?.find(b => b.libraryModuleId === module.libraryModuleId);
    if (!binding)
        return module;
    return {
        ...module,
        kitchen: { ...module.kitchen, appliances: structuredClone(binding.appliances) },
    };
}
function shiftTransformLocalX(transform, localXmm, zMm) {
    const p = structuredClone(transform.position);
    const dx = mm(localXmm);
    switch (transform.rotationZDeg) {
        case 0:
            p.x = (Number(p.x) + Number(dx));
            break;
        case 90:
            p.y = (Number(p.y) + Number(dx));
            break;
        case 180:
            p.x = (Number(p.x) - Number(dx));
            break;
        case 270:
            p.y = (Number(p.y) - Number(dx));
            break;
    }
    if (zMm != null)
        p.z = mm(zMm);
    return { position: p, rotationZDeg: transform.rotationZDeg };
}
function requiredFromBaseRun(run) {
    return run.composition.placements
        .filter(p => p.source === 'required' && !!p.module.libraryModuleId)
        .map(p => ({ libraryModuleId: p.module.libraryModuleId, widthMm: p.widthMm, ...(p.module.name ? { name: p.module.name } : {}) }));
}
function tallForSide(all, side) {
    if (side === 'island')
        return [];
    return (all ?? []).filter(r => (r.side ?? 'south') === side);
}
function totalReqWidth(reqs) {
    return reqs.reduce((sum, r) => sum + (r.widthMm ?? 600) * Math.max(1, Math.round(r.count ?? 1)), 0);
}
function mapComposition(composition, runId, offsetMm, heightMm, depthMm, bindings, serialStart = 1) {
    const placements = [];
    const fronts = [];
    let serial = serialStart;
    for (const p of composition.placements) {
        const id = `${runId}:module:${String(serial).padStart(3, '0')}`;
        let module = cloneWithGeometry(p.module, id, p.widthMm, heightMm, depthMm);
        module = applyApplianceBindings(module, bindings);
        placements.push({ xMm: offsetMm + p.xMm, widthMm: p.widthMm, module, source: p.source });
        const f = frontFor(runId, module, serial);
        if (f)
            fronts.push(f);
        serial++;
    }
    return { placements, fronts, nextSerial: serial };
}
function projectWallLayer(runId, basePlacements, baseOffsetMm, wallHeightMm, wallDepthMm, bindings) {
    const placements = [];
    const fronts = [];
    let serial = 1;
    for (const p of basePlacements) {
        const baseId = p.module.libraryModuleId;
        let wallId;
        if (baseId === 'base.oven_hob')
            wallId = 'wall.hood';
        else if (baseId === 'technical.base')
            wallId = 'technical.wall';
        else if (baseId === 'base.open')
            wallId = 'wall.open';
        else
            wallId = 'wall.storage';
        const d = KITCHEN_MODULE_LIBRARY[wallId];
        let module = {
            id: `${runId}:wall:module:${String(serial).padStart(3, '0')}`,
            libraryModuleId: wallId,
            kind: d.moduleKind,
            name: d.label,
            width: exact(p.widthMm),
            height: { value: mm(wallHeightMm), state: 'confirmed' },
            depth: { value: mm(wallDepthMm), state: 'confirmed' },
            contents: [],
            kitchen: { type: d.type, function: d.function, ...d.defaults },
            tags: ['kitchen-mixed-height', 'projected-wall', ...d.tags],
        };
        module = applyApplianceBindings(module, bindings);
        placements.push({ xMm: p.xMm - baseOffsetMm, widthMm: p.widthMm, module, source: 'projected_wall' });
        const f = frontFor(`${runId}:wall`, module, serial);
        if (f)
            fronts.push(f);
        serial++;
    }
    return { placements, fronts };
}
function pointFor(plan, side, centreMm, id) {
    const run = plan.runs.find(r => r.side === side);
    switch (side) {
        case 'south': return { xMm: centreMm, yMm: run.depthMm / 2, side, moduleId: id };
        case 'north': return { xMm: plan.roomWidthMm - centreMm, yMm: plan.roomDepthMm - run.depthMm / 2, side, moduleId: id };
        case 'east': return { xMm: plan.roomWidthMm - run.depthMm / 2, yMm: centreMm, side, moduleId: id };
        case 'west': return { xMm: run.depthMm / 2, yMm: plan.roomDepthMm - centreMm, side, moduleId: id };
        case 'island': return { xMm: (plan.roomWidthMm - run.lengthMm) / 2 + centreMm, yMm: plan.roomDepthMm / 2, side, moduleId: id };
    }
}
function workTriangle(basePlan, runs) {
    let sink;
    let cooking;
    let fridge;
    for (const run of runs) {
        for (const p of run.floorPlacements) {
            const id = p.module.libraryModuleId;
            const point = pointFor(basePlan, run.side, p.xMm + p.widthMm / 2, id ?? p.module.id);
            if (!sink && id === 'base.sink')
                sink = point;
            if (!cooking && (id === 'base.oven_hob' || id === 'tall.oven'))
                cooking = point;
            if (!fridge && id === 'tall.fridge')
                fridge = point;
        }
    }
    if (!sink || !cooking || !fridge) {
        return { available: false, ...(sink ? { sink } : {}), ...(cooking ? { cooking } : {}), ...(fridge ? { fridge } : {}), legsMm: [], note: 'Work triangle requires sink, cooking and refrigerator placements.' };
    }
    const dist = (a, b) => Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm);
    const legs = [dist(sink, cooking), dist(cooking, fridge), dist(fridge, sink)].map(Math.round);
    return { available: true, sink, cooking, fridge, legsMm: legs, perimeterMm: legs.reduce((a, b) => a + b, 0), note: 'Work triangle is derived from actual mixed-height floor placements.' };
}
export function planKitchenMixedHeight(input) {
    const issues = [];
    const baseH = Math.round(input.baseCabinetHeightMm ?? DEFAULT_BASE_HEIGHT);
    const tallH = Math.round(input.tallCabinetHeightMm ?? DEFAULT_TALL_HEIGHT);
    const wallH = Math.round(input.wallCabinetHeightMm ?? DEFAULT_WALL_HEIGHT);
    const wallBottom = Math.round(input.wallBottomZMm ?? DEFAULT_WALL_BOTTOM);
    const wallDepth = Math.round(input.wallDepthMm ?? DEFAULT_WALL_DEPTH);
    const worktopTop = Math.round(input.worktopTopZMm ?? DEFAULT_WORKTOP_TOP);
    const minHood = input.minHoodClearanceMm == null ? undefined : Math.round(input.minHoodClearanceMm);
    const createWall = input.createWallLayer !== false;
    const runs = [];
    for (const req of input.tallRequirements ?? []) {
        if (req.side === 'island')
            issues.push({ code: 'TALL_ON_ISLAND_NOT_SUPPORTED', severity: 'blocking', message: 'Tall cabinets are not supported on an island floor run.', side: 'island' });
        else if (req.side && !input.basePlan.runs.some(r => r.side === req.side))
            issues.push({ code: 'TALL_SIDE_NOT_IN_LAYOUT', severity: 'blocking', message: `Tall requirement targets ${req.side}, but the base layout has no such run.`, side: req.side });
    }
    for (const run of input.basePlan.runs) {
        const tallReqs = tallForSide(input.tallRequirements, run.side);
        const tallWidth = totalReqWidth(tallReqs);
        if (tallWidth > run.lengthMm) {
            issues.push({ code: 'TALL_REQUIREMENTS_OVERFLOW', severity: 'blocking', message: `Tall modules need ${tallWidth} mm on ${run.side}, but the run is ${run.lengthMm} mm.`, side: run.side });
        }
        const baseWidth = Math.max(0, run.lengthMm - tallWidth);
        const position = tallReqs.find(r => r.position)?.position ?? 'end';
        const baseOffset = position === 'start' ? tallWidth : 0;
        const tallOffset = position === 'start' ? 0 : baseWidth;
        const baseComposition = composeKitchenRun({
            runId: `${input.planId}:${run.side}:base`, widthMm: baseWidth, type: 'base',
            requirements: requiredFromBaseRun(run), ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
        });
        const tallComposition = tallWidth > 0 ? composeKitchenRun({
            runId: `${input.planId}:${run.side}:tall`, widthMm: tallWidth, type: 'tall',
            requirements: tallReqs.map(({ side: _s, position: _p, ...r }) => r), fillRemainingWithCabinets: false,
            ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
        }) : undefined;
        const baseMapped = mapComposition(baseComposition, `${input.planId}:${run.side}:floor`, baseOffset, baseH, run.depthMm, input.applianceBindings, 1);
        const tallMapped = tallComposition ? mapComposition(tallComposition, `${input.planId}:${run.side}:floor`, tallOffset, tallH, run.depthMm, input.applianceBindings, baseMapped.nextSerial) : { placements: [], fronts: [], nextSerial: baseMapped.nextSerial };
        const floorPlacements = [...baseMapped.placements, ...tallMapped.placements].sort((a, b) => a.xMm - b.xMm);
        const floorFronts = [...baseMapped.fronts, ...tallMapped.fronts];
        const projected = createWall && run.side !== 'island' && baseWidth > 0
            ? projectWallLayer(`${input.planId}:${run.side}`, baseMapped.placements, baseOffset, wallH, wallDepth, input.applianceBindings)
            : { placements: [], fronts: [] };
        const wallTransform = projected.placements.length ? shiftTransformLocalX(run.transform, baseOffset, wallBottom) : undefined;
        const hood = projected.placements.find(p => p.module.libraryModuleId === 'wall.hood');
        const hob = baseMapped.placements.find(p => p.module.libraryModuleId === 'base.oven_hob');
        if (hood && !hob)
            issues.push({ code: 'HOOD_WITHOUT_HOB', severity: 'warning', message: `Projected hood on ${run.side} has no hob below it.`, side: run.side, moduleId: hood.module.id });
        if (hood && hob) {
            const clearance = wallBottom - worktopTop;
            if (minHood != null && clearance < minHood)
                issues.push({ code: 'HOOD_CLEARANCE_TOO_SMALL', severity: 'blocking', message: `Hood clearance is ${clearance} mm; minimum configured clearance is ${minHood} mm.`, side: run.side, moduleId: hood.module.id });
        }
        runs.push({
            id: `${input.planId}:${run.side}`, side: run.side, transform: run.transform, lengthMm: run.lengthMm, depthMm: run.depthMm,
            floorPlacements, floorModules: floorPlacements.map(p => p.module), floorFronts,
            wallOffsetMm: baseOffset, wallLengthMm: baseWidth,
            ...(wallTransform ? { wallTransform } : {}), wallPlacements: projected.placements, wallModules: projected.placements.map(p => p.module), wallFronts: projected.fronts,
        });
    }
    for (const binding of input.applianceBindings ?? []) {
        const used = runs.some(r => [...r.floorModules, ...r.wallModules].some(m => m.libraryModuleId === binding.libraryModuleId));
        if (!used)
            issues.push({ code: 'APPLIANCE_BINDING_NOT_USED', severity: 'warning', message: `Appliance binding for ${binding.libraryModuleId} is not used by this layout.` });
    }
    const triangle = workTriangle(input.basePlan, runs);
    return { planId: input.planId, baseLayoutId: input.basePlan.layoutId, roomWidthMm: input.basePlan.roomWidthMm, roomDepthMm: input.basePlan.roomDepthMm, runs, workTriangle: triangle, issues, ready: input.basePlan.ready && !issues.some(i => i.severity === 'blocking') };
}
function furnitureFromLayer(template, id, name, transform, widthMm, heightMm, depthMm, modules, fronts, tags) {
    return {
        ...structuredClone(template), id, name, transform,
        dimensions: { width: { value: mm(widthMm), state: 'confirmed' }, height: { value: mm(heightMm), state: 'confirmed' }, depth: { value: mm(depthMm), state: 'confirmed' } },
        modules: structuredClone(modules), fronts: structuredClone(fronts),
        tags: [...new Set([...(template.tags ?? []), ...tags])],
    };
}
/** Materializes floor and elevated wall layers as independent furniture items, preserving one Engineering Engine as manufacturing authority. */
export function applyKitchenMixedHeightPlan(project, templateFurnitureId, plan) {
    const next = structuredClone(project);
    const index = next.furniture.findIndex(f => f.id === templateFurnitureId);
    if (index < 0)
        throw new Error(`Kitchen template furniture ${templateFurnitureId} was not found.`);
    const template = next.furniture[index];
    if (template.kind !== 'kitchen')
        throw new Error(`Furniture ${templateFurnitureId} is not a kitchen item.`);
    const generated = [];
    for (const run of plan.runs) {
        if (run.floorModules.length) {
            const maxH = Math.max(...run.floorModules.map(m => m.height?.value == null ? 720 : toMm(m.height.value)));
            generated.push(furnitureFromLayer(template, `${template.id}:mixed:${run.side}:floor`, `${template.name} · ${run.side} floor`, run.transform, run.lengthMm, maxH, run.depthMm, run.floorModules, run.floorFronts, ['kitchen-mixed-height', 'layer:floor', `run:${run.side}`]));
        }
        if (run.wallModules.length && run.wallTransform) {
            const wallH = Math.max(...run.wallModules.map(m => m.height?.value == null ? 900 : toMm(m.height.value)));
            const wallD = Math.max(...run.wallModules.map(m => m.depth?.value == null ? 330 : toMm(m.depth.value)));
            generated.push(furnitureFromLayer(template, `${template.id}:mixed:${run.side}:wall`, `${template.name} · ${run.side} wall`, run.wallTransform, run.wallLengthMm, wallH, wallD, run.wallModules, run.wallFronts, ['kitchen-mixed-height', 'layer:wall', `run:${run.side}`]));
        }
    }
    next.furniture.splice(index, 1, ...generated);
    next.revision += 1;
    next.notes.push({ id: `${plan.planId}:note`, text: `Kitchen Mixed Height & Appliance Layout: generated ${generated.length} furniture layer(s).`, authorType: 'system', createdAt: new Date(0).toISOString() });
    return next;
}
