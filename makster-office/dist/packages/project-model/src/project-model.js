import { randomUUID } from 'node:crypto';
import { PROJECT_SCHEMA_VERSION, mm, } from './types.js';
export function createEmptyProjectModel(input) {
    return {
        schemaVersion: PROJECT_SCHEMA_VERSION,
        projectId: input.projectId,
        revision: 1,
        title: input.title,
        locale: input.locale ?? 'ru-CZ',
        currency: input.currency ?? 'EUR',
        unitSystem: 'metric',
        geometryUnit: '0.1mm',
        coordinateSystem: {
            handedness: 'right',
            x: 'right',
            y: 'forward',
            z: 'up',
        },
        projectType: input.projectType ?? 'mixed',
        site: { rooms: [] },
        furniture: [],
        selections: { materials: [], hardware: [] },
        constraints: [],
        facts: [],
        notes: [
            {
                id: randomUUID(),
                text: 'Project created in Makster Core.',
                authorType: 'system',
                createdAt: new Date().toISOString(),
            },
        ],
        installationDecisions: [],
        installationSiteIssues: [],
        installationChangeRequests: [],
        asBuiltRecords: [],
        installationPunchItems: [],
        jobControl: {
            stage: 'lead',
            client: {},
            money: { currency: input.currency ?? 'EUR' },
            milestones: [],
            updatedAt: new Date().toISOString(),
        },
        purchaseOrders: [],
        costEntries: [],
        clientApprovals: [],
        clientPortal: {
            enabled: false,
            showContractValue: true,
            showPayments: true,
            showTargetDates: true,
            showMilestones: true,
            updatedAt: new Date().toISOString(),
        },
        clientShareLinks: [],
    };
}
/**
 * Runtime semantic validation. JSON Schema remains the wire-level contract; this
 * validator checks invariants that are awkward to express in JSON Schema.
 */
export function validateProjectModel(model) {
    const errors = [];
    if (model.schemaVersion !== PROJECT_SCHEMA_VERSION) {
        errors.push(`Unsupported schemaVersion: ${model.schemaVersion}`);
    }
    if (!model.projectId)
        errors.push('projectId is required');
    if (!Number.isInteger(model.revision) || model.revision < 1) {
        errors.push('revision must be an integer >= 1');
    }
    if (model.geometryUnit !== '0.1mm')
        errors.push('geometryUnit must be 0.1mm');
    const roomIds = new Set(model.site.rooms.map((room) => room.id));
    const materialIds = new Set(model.selections.materials.map((item) => item.id));
    const hardwareIds = new Set(model.selections.hardware.map((item) => item.id));
    const furnitureIds = new Set();
    for (const item of model.furniture) {
        if (furnitureIds.has(item.id))
            errors.push(`Duplicate furniture id: ${item.id}`);
        furnitureIds.add(item.id);
        if (item.roomId && !roomIds.has(item.roomId)) {
            errors.push(`Furniture ${item.id} references missing room ${item.roomId}`);
        }
        const moduleIds = new Set();
        for (const module of item.modules) {
            if (moduleIds.has(module.id))
                errors.push(`Duplicate module id: ${module.id}`);
            moduleIds.add(module.id);
            if (module.libraryModuleId && !new Set(['base.storage', 'base.drawers', 'base.sink', 'base.oven_hob', 'base.dishwasher', 'base.open', 'wall.storage', 'wall.hood', 'wall.open', 'tall.pantry', 'tall.oven', 'tall.fridge', 'tall.open', 'technical.base', 'technical.wall', 'technical.tall']).has(module.libraryModuleId)) {
                errors.push(`Kitchen module ${module.id} references unknown library module ${module.libraryModuleId}`);
            }
            if (module.width.mode === 'ratio' && module.width.ratio <= 0) {
                errors.push(`Module ${module.id} ratio must be > 0`);
            }
            if (module.width.mode === 'fixed' && module.width.value.value !== null && module.width.value.value <= 0) {
                errors.push(`Module ${module.id} fixed width must be > 0`);
            }
            if (module.kitchen?.worktop?.wallTrim?.materialSelectionId && !materialIds.has(module.kitchen.worktop.wallTrim.materialSelectionId)) {
                errors.push(`Kitchen module ${module.id} references missing wall-trim material ${module.kitchen.worktop.wallTrim.materialSelectionId}`);
            }
            if (module.kitchen?.wallHangerHardwareSelectionId && !hardwareIds.has(module.kitchen.wallHangerHardwareSelectionId)) {
                errors.push(`Kitchen module ${module.id} references missing wall hanger hardware ${module.kitchen.wallHangerHardwareSelectionId}`);
            }
            if (module.kitchen?.wallHangerCount !== undefined && module.kitchen.wallHangerCount < 0) {
                errors.push(`Kitchen module ${module.id} wallHangerCount must be >= 0`);
            }
        }
        for (const module of item.modules) {
            for (const element of module.contents) {
                if (element.kind === 'drawer_stack') {
                    if (element.runnerHardwareSelectionId && !hardwareIds.has(element.runnerHardwareSelectionId)) {
                        errors.push(`Drawer stack ${element.id} references missing runner hardware ${element.runnerHardwareSelectionId}`);
                    }
                    for (const materialId of [element.drawerBox?.materialSelectionId, element.drawerBox?.bottomMaterialSelectionId].filter((id) => Boolean(id))) {
                        if (!materialIds.has(materialId))
                            errors.push(`Drawer stack ${element.id} references missing material ${materialId}`);
                    }
                }
                if (element.kind === 'clothes_rail' && element.railHardwareSelectionId && !hardwareIds.has(element.railHardwareSelectionId)) {
                    errors.push(`Clothes rail ${element.id} references missing hardware ${element.railHardwareSelectionId}`);
                }
            }
        }
        for (const front of item.fronts) {
            if (front.hingeSides && front.hingeSides.length !== front.count) {
                errors.push(`Front ${front.id} hingeSides length must equal front count`);
            }
            for (const moduleId of front.moduleIds) {
                if (!moduleIds.has(moduleId)) {
                    errors.push(`Front ${front.id} references missing module ${moduleId}`);
                }
            }
            if (front.materialSelectionId && !materialIds.has(front.materialSelectionId)) {
                errors.push(`Front ${front.id} references missing material ${front.materialSelectionId}`);
            }
            if (front.hingeHardwareSelectionId && !hardwareIds.has(front.hingeHardwareSelectionId)) {
                errors.push(`Front ${front.id} references missing hinge hardware ${front.hingeHardwareSelectionId}`);
            }
            if (front.handle?.hardwareSelectionId && !hardwareIds.has(front.handle.hardwareSelectionId)) {
                errors.push(`Front ${front.id} references missing handle hardware ${front.handle.hardwareSelectionId}`);
            }
        }
        const constructionMaterialIds = [
            item.construction.defaultCarcassMaterialSelectionId,
            item.construction.defaultFrontMaterialSelectionId,
            item.construction.defaultEdgeMaterialSelectionId,
            item.construction.backPanel.materialSelectionId,
            item.construction.plinth?.materialSelectionId,
        ].filter((id) => Boolean(id));
        for (const materialId of constructionMaterialIds) {
            if (!materialIds.has(materialId)) {
                errors.push(`Furniture ${item.id} references missing material ${materialId}`);
            }
        }
    }
    for (const hardware of model.selections.hardware) {
        if (hardware.technical?.kind === 'blum_hinge' && hardware.role !== 'hinge') {
            errors.push(`Hardware ${hardware.id} has blum_hinge technical data but role is ${hardware.role}`);
        }
        if (hardware.technical?.kind === 'blum_runner' && hardware.role !== 'runner') {
            errors.push(`Hardware ${hardware.id} has blum_runner technical data but role is ${hardware.role}`);
        }
    }
    for (const fact of model.facts) {
        if (fact.confidence < 0 || fact.confidence > 1) {
            errors.push(`Fact ${fact.path} confidence must be 0..1`);
        }
        if (!fact.path.startsWith('/'))
            errors.push(`Fact path must be a JSON Pointer: ${fact.path}`);
    }
    return { ok: errors.length === 0, errors };
}
export const defaultCarcassThickness = () => ({ value: mm(18), state: 'confirmed' });
