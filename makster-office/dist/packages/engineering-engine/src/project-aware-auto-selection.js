import { toMm } from '../../project-model/src/types.js';
import { autoSelectHardware, autoSelectAppliances } from './catalog-auto-selection.js';
function measured(v) {
    return v?.value == null ? undefined : toMm(v.value);
}
function frontThickness(project, front) {
    if (!front?.materialSelectionId)
        return;
    const mat = project.selections.materials.find(m => m.id === front.materialSelectionId);
    return measured(mat?.thickness);
}
function frontsForModule(item, module) {
    return item.fronts.filter(f => f.moduleIds.includes(module.id));
}
function assignedRunnerContext(project, module) {
    const drawers = module.contents.filter((x) => x.kind === 'drawer_stack');
    for (const d of drawers) {
        if (!d.runnerHardwareSelectionId)
            continue;
        const sel = project.selections.hardware.find(h => h.id === d.runnerHardwareSelectionId);
        const tech = sel?.technical;
        if (tech?.kind === 'blum_runner' || tech?.kind === 'gtv_modern_slide') {
            const nominalLengthMm = measured(tech.nominalLength);
            return nominalLengthMm == null ? {} : { desiredNominalLengthMm: nominalLengthMm };
        }
    }
    return {};
}
function applianceContext(module) {
    const specs = [...(module.kitchen?.appliances ?? []), ...(module.kitchen?.appliance ? [module.kitchen.appliance] : [])];
    return specs.map(a => {
        const s = a.requiredSpace;
        const width = measured(s?.width), height = measured(s?.height), depth = measured(s?.depth);
        const kind = a.kind === 'fridge' ? 'fridge' : a.kind === 'dishwasher' ? 'dishwasher' : a.kind === 'oven' ? 'oven' : a.kind === 'hob' ? 'hob' : a.kind === 'hood' ? 'hood' : a.kind === 'microwave' ? 'microwave' : a.kind === 'sink' ? 'sink' : 'other';
        return { a, kind, width, height, depth };
    });
}
export function analyzeProjectCatalogSelections(project) {
    const recommendations = [];
    const issues = [];
    for (const item of project.furniture) {
        for (const module of item.modules) {
            const fronts = frontsForModule(item, module);
            const hinged = fronts.find(f => f.kind === 'hinged');
            if (hinged) {
                const thickness = frontThickness(project, hinged);
                const context = { role: 'hinge', maxResults: 3, requireProductionDrilling: false };
                if (thickness != null)
                    context.frontThicknessMm = thickness;
                const result = autoSelectHardware(context);
                recommendations.push({
                    furnitureId: item.id, moduleId: module.id, ...(module.libraryModuleId ? { moduleLibraryId: module.libraryModuleId } : {}),
                    target: 'hinge', targetRefId: hinged.id, context, result,
                    note: thickness == null ? 'Front thickness is not confirmed; hinge fit remains partially UNKNOWN.' : `Front thickness read from ProjectModel: ${thickness} mm.`,
                });
            }
            if (module.contents.some((x) => x.kind === 'drawer_stack')) {
                const runnerCtx = { role: 'runner', maxResults: 3, ...assignedRunnerContext(project, module) };
                const result = autoSelectHardware(runnerCtx);
                const drawerTarget = module.contents.find((x) => x.kind === 'drawer_stack');
                recommendations.push({
                    furnitureId: item.id, moduleId: module.id, ...(module.libraryModuleId ? { moduleLibraryId: module.libraryModuleId } : {}),
                    target: 'runner', ...(drawerTarget?.id ? { targetRefId: drawerTarget.id } : {}), context: runnerCtx, result,
                    note: runnerCtx.desiredNominalLengthMm == null
                        ? 'No confirmed runner nominal length exists in ProjectModel; Makster does not derive one from cabinet depth.'
                        : `Runner nominal length read from assigned technical selection: ${runnerCtx.desiredNominalLengthMm} mm.`,
                });
            }
            for (const [applianceIndex, ap] of applianceContext(module).entries()) {
                const context = { kind: ap.kind, maxResults: 3 };
                if (ap.width != null)
                    context.nicheWidthMm = ap.width;
                if (ap.height != null)
                    context.nicheHeightMm = ap.height;
                if (ap.depth != null)
                    context.nicheDepthMm = ap.depth;
                const result = autoSelectAppliances(context);
                recommendations.push({
                    furnitureId: item.id, moduleId: module.id, ...(module.libraryModuleId ? { moduleLibraryId: module.libraryModuleId } : {}),
                    target: 'appliance', applianceIndex, context, result,
                    note: (ap.width == null && ap.height == null && ap.depth == null)
                        ? `${ap.a.kind} has no confirmed requiredSpace; selection is advisory only.`
                        : `${ap.a.kind} niche context read from requiredSpace in ProjectModel.`,
                });
            }
        }
    }
    if (!recommendations.length)
        issues.push('No hinge, drawer, or appliance targets were found in this project revision.');
    const readyCount = recommendations.filter(r => r.result.ready).length;
    return {
        version: '2.7.5',
        projectId: project.projectId,
        revision: project.revision,
        recommendations,
        readyCount,
        reviewCount: recommendations.length - readyCount,
        issues,
    };
}
