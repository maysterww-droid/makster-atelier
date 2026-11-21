import { mm } from '../../project-model/src/types.js';
function deepClone(v) { return structuredClone(v); }
function hardwareSelectionFrom(record, id) {
    const base = {
        id,
        role: record.role,
        source: 'manual',
        catalogRecordId: record.id,
        catalogTrust: record.trust,
        catalogSource: record.source,
        manufacturer: record.manufacturer,
        ...(record.code ? { code: record.code } : {}),
        name: record.family,
        note: `Makster Catalog ${record.id} · ${record.trust} · source ${record.source}`,
    };
    if (record.id === 'blum-clip-top-blumotion-110-overlay') {
        base.technical = { kind: 'blum_hinge', system: 'clip_top_blumotion', application: 'overlay', openingAngleDeg: 110 };
    }
    else if (record.id === 'blum-movento-760h-550') {
        base.technical = { kind: 'blum_runner', system: 'movento', nominalLength: { value: mm(550), state: 'confirmed' }, capacityKg: 40 };
    }
    else if (record.id === 'blum-legrabox-750-550') {
        base.technical = { kind: 'blum_runner', system: 'legrabox', nominalLength: { value: mm(550), state: 'confirmed' }, capacityKg: 40 };
    }
    return base;
}
export function applyApprovedCatalogAssignment(project, req) {
    const snapshot = deepClone(project);
    const r = req.recommendation;
    const furniture = snapshot.furniture.find(f => f.id === r.furnitureId);
    if (!furniture)
        throw new Error('assignment_furniture_not_found');
    const module = furniture.modules.find(m => m.id === r.moduleId);
    if (!module)
        throw new Error('assignment_module_not_found');
    const candidate = r.result.candidates.find(c => c.record.id === req.candidateId);
    if (!candidate)
        throw new Error('assignment_candidate_not_in_recommendation');
    if (candidate.compatibilityStatus === 'incompatible')
        throw new Error('assignment_candidate_incompatible');
    if (r.target === 'hinge' || r.target === 'runner') {
        if (!req.selectionId)
            throw new Error('assignment_selection_id_required');
        const record = candidate.record;
        const selection = hardwareSelectionFrom(record, req.selectionId);
        snapshot.selections.hardware.push(selection);
        if (r.target === 'hinge') {
            const front = furniture.fronts.find(f => f.id === r.targetRefId);
            if (!front)
                throw new Error('assignment_front_not_found');
            front.hingeHardwareSelectionId = req.selectionId;
        }
        else {
            let found = false;
            for (const e of module.contents) {
                if (e.kind === 'drawer_stack' && (!r.targetRefId || e.id === r.targetRefId)) {
                    e.runnerHardwareSelectionId = req.selectionId;
                    found = true;
                    break;
                }
            }
            if (!found)
                throw new Error('assignment_drawer_stack_not_found');
        }
    }
    else {
        const record = candidate.record;
        const all = [...(module.kitchen?.appliances ?? [])];
        const legacy = module.kitchen?.appliance;
        if (!module.kitchen)
            throw new Error('assignment_kitchen_module_required');
        if (all.length) {
            const i = r.applianceIndex ?? 0;
            if (!all[i])
                throw new Error('assignment_appliance_index_not_found');
            all[i] = { ...all[i], manufacturer: record.manufacturer, model: record.model, installation: record.installation, catalogRecordId: record.id, catalogTrust: record.trust, catalogSource: record.source,
                ...(record.priceTier ? { priceTier: record.priceTier } : {}),
                ...((record.productionPolicy?.fitModeDefault && !all[i].fitMode) ? { fitMode: record.productionPolicy.fitModeDefault } : {}),
                ...((record.productionPolicy?.cutoutExecutionDefault && !all[i].cutoutExecution) ? { cutoutExecution: record.productionPolicy.cutoutExecutionDefault } : {}),
                ...(req.applianceProcurementMode ? { procurementMode: req.applianceProcurementMode } : {}),
                ...(req.appliancePriceTier ? { priceTier: req.appliancePriceTier } : {}),
                ...(req.appliancePricing ? { pricing: req.appliancePricing } : {}) };
            module.kitchen.appliances = all;
        }
        else if (legacy) {
            module.kitchen.appliance = { ...legacy, manufacturer: record.manufacturer, model: record.model, installation: record.installation, catalogRecordId: record.id, catalogTrust: record.trust, catalogSource: record.source,
                ...(record.priceTier ? { priceTier: record.priceTier } : {}),
                ...((record.productionPolicy?.fitModeDefault && !legacy.fitMode) ? { fitMode: record.productionPolicy.fitModeDefault } : {}),
                ...((record.productionPolicy?.cutoutExecutionDefault && !legacy.cutoutExecution) ? { cutoutExecution: record.productionPolicy.cutoutExecutionDefault } : {}),
                ...(req.applianceProcurementMode ? { procurementMode: req.applianceProcurementMode } : {}),
                ...(req.appliancePriceTier ? { priceTier: req.appliancePriceTier } : {}),
                ...(req.appliancePricing ? { pricing: req.appliancePricing } : {}) };
        }
        else {
            throw new Error('assignment_appliance_target_not_found');
        }
    }
    snapshot.revision = project.revision + 1;
    snapshot.notes.push({
        id: req.selectionId ?? `${project.projectId.slice(0, 8)}-0000-4000-8000-${String(snapshot.notes.length + 1).padStart(12, '0')}`,
        text: `Catalog assignment approved by ${req.approvedBy}: ${r.target} -> ${req.candidateId}`,
        authorType: 'system',
        createdAt: new Date().toISOString(),
    });
    return {
        snapshot,
        assignment: {
            target: r.target, furnitureId: r.furnitureId, moduleId: r.moduleId, candidateId: req.candidateId,
            ...(req.selectionId ? { selectionId: req.selectionId } : {}), approvedBy: req.approvedBy,
        },
    };
}
