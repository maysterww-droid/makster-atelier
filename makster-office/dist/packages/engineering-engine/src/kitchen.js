import { mm, } from '../../project-model/src/types.js';
import { resolveKitchenLibraryModule } from './kitchen-module-library.js';
import { compileWardrobe } from './wardrobe.js';
import { wardrobeRulesV05 } from './rules.js';
import { deterministicId, requireMeasured } from './utils.js';
export const KITCHEN_RULESET_ID = 'kitchen-pro-engineering-v2.9.1';
const defaultHeight = (module, furnitureHeight) => {
    if (module.height?.value != null)
        return module.height.value;
    if (module.kitchen?.type === 'base')
        return mm(720);
    if (module.kitchen?.type === 'wall')
        return mm(900);
    return furnitureHeight;
};
const defaultDepth = (module, furnitureDepth) => {
    if (module.depth?.value != null)
        return module.depth.value;
    if (module.kitchen?.type === 'wall')
        return mm(330);
    return furnitureDepth || mm(560);
};
function fixedWidth(module) {
    return module.width.mode === 'fixed' ? module.width.value.value : null;
}
function materialGrain(materials, id) {
    return id ? materials.get(id)?.grainDirection ?? 'none' : 'none';
}
function materialThickness(materials, id, fallback) {
    return id ? materials.get(id)?.thickness?.value ?? fallback : fallback;
}
function edgeAll(edgeId) {
    return ['top', 'right', 'bottom', 'left'].map(side => ({ side, ...(edgeId ? { materialSelectionId: edgeId } : {}), thickness: mm(0.8) }));
}
function applianceSpaceMm10(value) {
    return value?.value == null ? null : Number(value.value);
}
function cloneFrontsForModule(furniture, module) {
    return furniture.fronts
        .filter(front => front.moduleIds.includes(module.id))
        .map(front => {
        const modulePosition = front.moduleIds.indexOf(module.id);
        const cloned = structuredClone(front);
        cloned.moduleIds = [module.id];
        const pairedDouble = front.moduleIds.length === 1 && front.count === 2 && front.split === 'vertical';
        cloned.count = pairedDouble ? 2 : 1;
        if (pairedDouble) {
            cloned.hingeSides = front.hingeSides?.length === 2 ? structuredClone(front.hingeSides) : ['left', 'right'];
        }
        else {
            const side = front.hingeSides?.[modulePosition];
            if (side)
                cloned.hingeSides = [side];
            else
                delete cloned.hingeSides;
        }
        return cloned;
    });
}
function issue(out, furniture, module, code, severity, category, message, targetId, metadata) {
    out.push({
        id: deterministicId('issue', code, targetId ?? module?.id ?? furniture.id),
        code, severity, category, message, furnitureId: furniture.id,
        ...(module ? { moduleId: module.id } : {}),
        ...(targetId ? { targetId } : {}),
        ...(metadata ? { metadata } : {}),
    });
}
function applianceList(module) {
    const multi = module.kitchen?.appliances ?? [];
    if (multi.length)
        return multi;
    return module.kitchen?.appliance ? [module.kitchen.appliance] : [];
}
function hasConfirmedEnvelope(appliance) {
    const dims = appliance.requiredSpace;
    return !!dims && [dims.width, dims.height, dims.depth].every(d => d?.value != null && d.state === 'confirmed');
}
function validateAppliance(issues, furniture, module, appliance, moduleWidth, moduleHeight, moduleDepth, carcass) {
    if (!appliance.requiredSpace)
        return;
    const reservationMode = appliance.kind === 'dishwasher' || appliance.kind === 'fridge';
    const worktopMode = appliance.installation === 'worktop' || appliance.kind === 'hob';
    const availableW = reservationMode ? Number(moduleWidth) : Number(moduleWidth) - 2 * Number(carcass);
    const availableH = worktopMode ? Number(moduleHeight) : Number(moduleHeight);
    const availableD = worktopMode ? Number(moduleDepth) : Number(moduleDepth);
    const requiredW = applianceSpaceMm10(appliance.requiredSpace.width);
    const requiredH = applianceSpaceMm10(appliance.requiredSpace.height);
    const requiredD = applianceSpaceMm10(appliance.requiredSpace.depth);
    const fit = (requiredW == null || requiredW <= availableW) && (requiredH == null || requiredH <= availableH) && (requiredD == null || requiredD <= availableD);
    if (!fit) {
        issue(issues, furniture, module, 'KITCHEN_APPLIANCE_DOES_NOT_FIT', 'blocking', 'geometry', `${appliance.manufacturer ?? ''} ${appliance.model ?? appliance.kind}`.trim() + ' does not fit the configured kitchen section', module.id, { applianceKind: appliance.kind, availableMm: { width: availableW / 10, height: availableH / 10, depth: availableD / 10 }, requiredMm: { width: requiredW == null ? null : requiredW / 10, height: requiredH == null ? null : requiredH / 10, depth: requiredD == null ? null : requiredD / 10 } });
    }
}
function compileWorktop(parts, machining, issues, materials, furniture, module, moduleIndex, moduleWidth, moduleDepth) {
    const spec = module.kitchen?.worktop;
    if (!spec?.enabled)
        return;
    const materialId = spec.materialSelectionId ?? furniture.construction.defaultCarcassMaterialSelectionId;
    const thickness = spec.thickness?.value ?? materialThickness(materials, materialId, mm(38));
    const depth = spec.depth?.value ?? (Number(moduleDepth) + Number(spec.frontOverhang?.value ?? mm(40)));
    const id = deterministicId(furniture.id, module.id, 'worktop');
    parts.push({
        id, furnitureId: furniture.id, moduleId: module.id, kind: 'worktop', name: `M${moduleIndex + 1} worktop`, quantity: 1,
        ...(materialId ? { materialSelectionId: materialId } : {}), length: moduleWidth, width: depth, thickness,
        grainDirection: materialGrain(materials, materialId), edges: edgeAll(furniture.construction.defaultEdgeMaterialSelectionId), estimated: false,
        tags: ['kitchen-worktop'],
    });
    if (!spec.materialSelectionId) {
        issue(issues, furniture, module, 'KITCHEN_WORKTOP_MATERIAL_FALLBACK', 'warning', 'material', 'Worktop uses the furniture fallback material; assign a dedicated worktop material before purchase.', id);
    }
    for (const cutout of spec.cutouts ?? [])
        compileCutout(machining, issues, furniture, module, id, cutout, moduleWidth, depth);
    const trim = spec.wallTrim;
    if (trim?.enabled) {
        const trimMaterialId = trim.materialSelectionId ?? materialId;
        const trimHeight = trim.height?.value;
        const trimDepth = trim.depth?.value;
        if (trimHeight == null || trimDepth == null || trim.height?.state !== 'confirmed' || trim.depth?.state !== 'confirmed') {
            // Run-level validation is emitted once by compileKitchen; do not duplicate one blocker per module segment.
        }
        else {
            parts.push({
                id: deterministicId(furniture.id, module.id, 'worktop-wall-trim'), furnitureId: furniture.id, moduleId: module.id, kind: 'custom',
                name: `M${moduleIndex + 1} worktop wall trim`, quantity: 1, ...(trimMaterialId ? { materialSelectionId: trimMaterialId } : {}),
                length: moduleWidth, width: trimHeight, thickness: trimDepth, grainDirection: materialGrain(materials, trimMaterialId),
                edges: edgeAll(furniture.construction.defaultEdgeMaterialSelectionId), estimated: false, tags: ['kitchen-worktop-wall-trim', 'wall-side-plinth'],
            });
        }
    }
}
function compileCutout(machining, issues, furniture, module, worktopPartId, cutout, worktopWidth, worktopDepth) {
    const execution = cutout.execution ?? ((cutout.kind === 'sink' || cutout.kind === 'hob') ? 'on_site' : 'workshop');
    if (execution === 'on_site') {
        const sizeText = cutout.width?.value != null && cutout.depth?.value != null
            ? ` ${Number(cutout.width.value) / 10}×${Number(cutout.depth.value) / 10} mm`
            : '';
        issue(issues, furniture, module, 'KITCHEN_CUTOUT_ON_SITE', 'info', 'manufacturing', `${cutout.kind} cutout${sizeText} is intentionally executed on site; no workshop/CNC cutout is emitted.`, cutout.id);
        return;
    }
    if ((cutout.kind === 'sink' || cutout.kind === 'hob') && execution === 'workshop' && cutout.verifiedForCnc !== true) {
        issue(issues, furniture, module, 'KITCHEN_CUTOUT_CNC_VERIFICATION_REQUIRED', 'blocking', 'manufacturing', `${cutout.kind} cutout defaults to on-site fitting. Workshop/CNC execution requires explicit verifiedForCnc=true.`, cutout.id);
        return;
    }
    if (!cutout.width || !cutout.depth || cutout.width.value == null || cutout.depth.value == null) {
        issue(issues, furniture, module, 'KITCHEN_CUTOUT_DIMENSIONS_REQUIRED', 'blocking', 'construction', `${cutout.kind} workshop cutout requires confirmed width and depth.`, cutout.id);
        return;
    }
    const width = requireMeasured('kitchen.cutout.width', cutout.width);
    const depth = requireMeasured('kitchen.cutout.depth', cutout.depth);
    const x = cutout.offsetX?.value ?? ((Number(worktopWidth) - Number(width)) / 2);
    const y = cutout.offsetY?.value ?? ((Number(worktopDepth) - Number(depth)) / 2);
    if (Number(x) < 0 || Number(y) < 0 || Number(x) + Number(width) > Number(worktopWidth) || Number(y) + Number(depth) > Number(worktopDepth)) {
        issue(issues, furniture, module, 'KITCHEN_CUTOUT_OUTSIDE_WORKTOP', 'blocking', 'geometry', `${cutout.kind} cutout exceeds the worktop envelope`, cutout.id);
        return;
    }
    machining.push({
        id: deterministicId(furniture.id, module.id, cutout.id, 'cutout'), furnitureId: furniture.id, moduleId: module.id, targetPartId: worktopPartId,
        kind: 'cutout', face: 'top', x, y, length: width, toolWidth: depth, reference: 'worktop-left/front', estimated: !cutout.verifiedForCnc,
        verificationSource: cutout.verifiedForCnc ? 'manual_verified' : 'estimated', note: `${cutout.kind} worktop cutout ${Number(width) / 10}×${Number(depth) / 10} mm`,
    });
    if (!cutout.verifiedForCnc)
        issue(issues, furniture, module, 'KITCHEN_CUTOUT_CNC_VERIFICATION_REQUIRED', 'warning', 'manufacturing', `${cutout.kind} cutout is production-defined but not CNC-verified; manual workshop is allowed, automated/outsource drilling remains HOLD.`, cutout.id);
}
function compilePlinth(parts, hardware, issues, materials, hardwareSelections, furniture, module, moduleIndex, moduleWidth) {
    const spec = module.kitchen?.plinth;
    if (!spec?.enabled || module.kitchen?.type !== 'base')
        return;
    const h = spec.height?.value ?? mm(100);
    const materialId = furniture.construction.plinth?.materialSelectionId ?? furniture.construction.defaultCarcassMaterialSelectionId;
    parts.push({
        id: deterministicId(furniture.id, module.id, 'plinth'), furnitureId: furniture.id, moduleId: module.id, kind: 'plinth', name: `M${moduleIndex + 1} plinth`, quantity: 1,
        ...(materialId ? { materialSelectionId: materialId } : {}), length: moduleWidth, width: h, thickness: materialThickness(materials, materialId, mm(18)), grainDirection: materialGrain(materials, materialId),
        edges: edgeAll(furniture.construction.defaultEdgeMaterialSelectionId), estimated: false, tags: ['kitchen-plinth'],
    });
    const legCount = spec.legCount ?? (Number(moduleWidth) > Number(mm(900)) ? 6 : 4);
    if (legCount <= 0)
        return;
    const selected = spec.legHardwareSelectionId ? hardwareSelections.get(spec.legHardwareSelectionId) : undefined;
    hardware.push({
        id: deterministicId(furniture.id, module.id, 'legs'), furnitureId: furniture.id, moduleId: module.id, role: 'leg',
        ...(selected ? { hardwareSelectionId: selected.id } : {}), name: selected?.name ?? 'Adjustable kitchen leg', quantity: legCount, unit: 'pcs', estimated: !selected,
    });
    if (!selected)
        issue(issues, furniture, module, 'KITCHEN_LEG_HARDWARE_UNRESOLVED', 'warning', 'hardware', 'Kitchen legs are counted but a concrete hardware selection is not assigned.', module.id, { legCount });
}
export function compileKitchen(project, furniture, manufacturingData) {
    const parts = [];
    const hardware = [];
    const machining = [];
    const issues = [];
    const materials = new Map(project.selections.materials.map(x => [x.id, x]));
    const hardwareSelections = new Map(project.selections.hardware.map(x => [x.id, x]));
    const totalWidth = requireMeasured('furniture.width', furniture.dimensions.width);
    const furnitureHeight = requireMeasured('furniture.height', furniture.dimensions.height);
    const furnitureDepth = requireMeasured('furniture.depth', furniture.dimensions.depth);
    const carcass = requireMeasured('carcassThickness', furniture.construction.carcassThickness);
    const widths = furniture.modules.map(fixedWidth);
    if (widths.some(x => x == null))
        issue(issues, furniture, undefined, 'KITCHEN_MODULE_WIDTH_NOT_FIXED', 'blocking', 'geometry', 'Kitchen Engineering requires fixed module widths.', furniture.id);
    else if (widths.reduce((a, b) => a + Number(b), 0) !== Number(totalWidth))
        issue(issues, furniture, undefined, 'MODULE_WIDTH_SUM_MISMATCH', 'blocking', 'geometry', 'Kitchen module widths must equal the furniture width.', furniture.id);
    if (!furniture.construction.defaultCarcassMaterialSelectionId)
        issue(issues, furniture, undefined, 'CARCASS_MATERIAL_UNRESOLVED', 'blocking', 'material', 'Kitchen carcass material must be selected before production.', furniture.id);
    const trimModule = furniture.modules.find(module => module.kitchen?.worktop?.wallTrim?.enabled);
    const trim = trimModule?.kitchen?.worktop?.wallTrim;
    if (trim && (trim.height?.value == null || trim.depth?.value == null || trim.height?.state !== 'confirmed' || trim.depth?.state !== 'confirmed'))
        issue(issues, furniture, trimModule, 'KITCHEN_WALL_TRIM_DIMENSIONS_REQUIRED', 'blocking', 'construction', 'Wall-side worktop plinth/upstand is present along the run, but its height and depth must be confirmed before production.', furniture.id);
    furniture.modules.forEach((sourceModule, index) => {
        const module = resolveKitchenLibraryModule(sourceModule);
        const width = fixedWidth(module);
        if (width == null)
            return;
        const k = module.kitchen;
        if (!k) {
            issue(issues, furniture, module, 'KITCHEN_MODULE_SPEC_REQUIRED', 'blocking', 'construction', `Kitchen module ${index + 1} has no kitchen construction spec.`, module.id);
            return;
        }
        const height = defaultHeight(module, furnitureHeight);
        const depth = defaultDepth(module, furnitureDepth);
        const applianceFunctions = new Set(['oven', 'dishwasher', 'fridge', 'hood', 'microwave', 'hob']);
        const appliances = applianceList(module);
        if (applianceFunctions.has(k.function) && appliances.length === 0) {
            issue(issues, furniture, module, 'KITCHEN_APPLIANCE_SPEC_REQUIRED', 'blocking', 'construction', `Kitchen ${k.function} module requires an explicit appliance specification before production.`, module.id);
        }
        for (const appliance of appliances) {
            const siteFit = appliance.fitMode === 'site_fit';
            if (!hasConfirmedEnvelope(appliance)) {
                if (siteFit) {
                    issue(issues, furniture, module, 'KITCHEN_APPLIANCE_SITE_FIT', 'warning', 'manufacturing', `Kitchen ${appliance.kind} is intentionally site-fit; known dimensions are checked now and missing envelope dimensions must be verified against the actual appliance during installation.`, module.id, { applianceKind: appliance.kind, manufacturer: appliance.manufacturer ?? null, model: appliance.model ?? null, fitMode: 'site_fit' });
                }
                else {
                    issue(issues, furniture, module, 'KITCHEN_APPLIANCE_ENVELOPE_REQUIRED', 'blocking', 'construction', `Kitchen ${appliance.kind} installation envelope (confirmed W×H×D) is required before production.`, module.id, { applianceKind: appliance.kind, manufacturer: appliance.manufacturer ?? null, model: appliance.model ?? null });
                }
            }
            validateAppliance(issues, furniture, module, appliance, width, height, depth, carcass);
        }
        const cutouts = k.worktop?.cutouts ?? [];
        if (k.function === 'sink' && k.worktop?.enabled && !cutouts.some(c => c.kind === 'sink'))
            issue(issues, furniture, module, 'KITCHEN_WORKTOP_CUTOUT_REQUIRED', 'blocking', 'construction', 'Kitchen sink module has a worktop but no configured sink cutout geometry.', module.id);
        if (appliances.some(a => a.kind === 'hob') && k.worktop?.enabled && !cutouts.some(c => c.kind === 'hob'))
            issue(issues, furniture, module, 'KITCHEN_HOB_CUTOUT_REQUIRED', 'blocking', 'construction', 'Kitchen hob requires an explicit worktop cutout geometry.', module.id);
        if (k.function !== 'dishwasher') {
            const clone = structuredClone(furniture);
            clone.dimensions = { width: { value: width, state: 'confirmed' }, height: { value: height, state: 'confirmed' }, depth: { value: depth, state: 'confirmed' } };
            clone.construction.plinth = { mode: 'none' };
            if (!k.hasBack)
                clone.construction.backPanel = { ...clone.construction.backPanel, mode: 'none' };
            else if (k.backPanelMode)
                clone.construction.backPanel = { ...clone.construction.backPanel, mode: k.backPanelMode };
            if (k.backPanelMode === 'groove') {
                const back = clone.construction.backPanel;
                if (back.grooveInset?.state !== 'confirmed' || back.grooveDepth?.state !== 'confirmed' || back.grooveClearance?.state !== 'confirmed')
                    issue(issues, furniture, module, 'KITCHEN_BACK_GROOVE_PARAMETERS_REQUIRED', 'blocking', 'manufacturing', 'Grooved kitchen back panel requires confirmed groove inset, depth and clearance before production.', module.id);
            }
            clone.modules = [structuredClone(module)];
            clone.modules[0].width = { mode: 'fixed', value: { value: width, state: 'confirmed' } };
            clone.fronts = cloneFrontsForModule(furniture, module);
            const r = compileWardrobe(project, clone, wardrobeRulesV05, manufacturingData);
            const removedKinds = new Set();
            if (!k.hasTop)
                removedKinds.add('top');
            if (!k.hasBottom)
                removedKinds.add('bottom');
            const kept = r.parts.filter(p => !removedKinds.has(p.kind)).map(part => ({ ...part, name: part.name.replace(/^M1\b/, `M${index + 1}`).replace(/^Front 1([LR]?)$/, `Front ${index + 1}$1`) }));
            const keptIds = new Set(kept.map(p => p.id));
            parts.push(...kept);
            hardware.push(...r.hardware);
            machining.push(...r.machining.filter(op => keptIds.has(op.targetPartId)));
            issues.push(...r.issues.filter(i => i.code !== 'MODULE_WIDTH_SUM_MISMATCH'));
        }
        if (k.type === 'wall') {
            const hanger = k.wallHangerHardwareSelectionId ? hardwareSelections.get(k.wallHangerHardwareSelectionId) : undefined;
            const qty = k.wallHangerCount ?? 2;
            if (qty > 0) {
                hardware.push({ id: deterministicId(furniture.id, module.id, 'wall-hangers'), furnitureId: furniture.id, moduleId: module.id, role: 'other',
                    ...(hanger ? { hardwareSelectionId: hanger.id } : {}), name: hanger?.name ?? 'Wall cabinet hanger', quantity: qty, unit: 'pcs', estimated: !hanger,
                    ...(hanger ? { note: 'Selected wall-hanger hardware is recorded in BOM; exact mounting profile must be manufacturer-verified before CNC release.' } : {}) });
                if (!hanger)
                    issue(issues, furniture, module, 'KITCHEN_WALL_HANGER_UNRESOLVED', 'blocking', 'hardware', 'Wall cabinet hanger hardware must be selected before production.', module.id);
                else if (hanger.machiningMethod === 'manual_template')
                    issue(issues, furniture, module, 'KITCHEN_WALL_HANGER_MANUAL_TEMPLATE', 'info', 'manufacturing', `Selected ${hanger.manufacturer ?? 'wall hanger'} is installed manually/template-based; no CNC mounting drilling is emitted.`, module.id, { hardwareSelectionId: hanger.id, name: hanger.name });
                else
                    issue(issues, furniture, module, 'KITCHEN_WALL_HANGER_PROFILE_UNVERIFIED', 'blocking', 'hardware', `Selected ${hanger.manufacturer ?? 'wall hanger'} has no verified Makster mounting profile; mounting drilling cannot be released.`, module.id, { hardwareSelectionId: hanger.id, name: hanger.name });
            }
        }
        compileWorktop(parts, machining, issues, materials, furniture, module, index, width, depth);
        compilePlinth(parts, hardware, issues, materials, hardwareSelections, furniture, module, index, width);
    });
    return { furnitureId: furniture.id, name: furniture.name, parts, hardware, machining, issues };
}
