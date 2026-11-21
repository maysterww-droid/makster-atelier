import { randomUUID } from 'node:crypto';
import { mm, } from '../../project-model/src/index.js';
function measured(valueMm, confidence) {
    return {
        value: valueMm === null ? null : mm(valueMm),
        state: valueMm === null ? 'unknown' : confidence >= 0.85 ? 'observed' : 'estimated',
    };
}
function makeModules(intent) {
    if (!intent.moduleCount)
        return [];
    const byIndex = new Map(intent.modules.map((module) => [module.moduleIndex, module]));
    const totalWidthMm10 = intent.dimensionsMm.width === null ? null : Math.round(intent.dimensionsMm.width * 10);
    const baseWidthMm10 = totalWidthMm10 === null ? null : Math.floor(totalWidthMm10 / intent.moduleCount);
    const remainder = totalWidthMm10 === null || baseWidthMm10 === null ? 0 : totalWidthMm10 - baseWidthMm10 * intent.moduleCount;
    return Array.from({ length: intent.moduleCount }, (_, zeroIndex) => {
        const index = zeroIndex + 1;
        const requested = byIndex.get(index);
        const contents = [];
        if (requested?.drawerCount) {
            contents.push({ id: randomUUID(), kind: 'drawer_stack', count: requested.drawerCount, frontMode: 'external' });
        }
        if (requested?.shelfCount) {
            contents.push({ id: randomUUID(), kind: 'shelf_stack', count: requested.shelfCount, adjustable: true });
        }
        if (requested?.railCount) {
            contents.push({ id: randomUUID(), kind: 'clothes_rail', count: requested.railCount });
        }
        if (contents.length === 0)
            contents.push({ id: randomUUID(), kind: 'open_space', label: 'Уточнить наполнение' });
        const width = baseWidthMm10 === null
            ? { mode: 'ratio', ratio: 1 }
            : {
                mode: 'fixed',
                value: {
                    value: (baseWidthMm10 + (zeroIndex < remainder ? 1 : 0)),
                    state: 'observed',
                },
            };
        return {
            id: randomUUID(),
            kind: requested?.kind ?? 'open',
            name: `Секция ${index}`,
            width,
            contents,
        };
    });
}
function materialSelection(request) {
    return {
        id: randomUUID(),
        role: request.role,
        source: 'manual',
        ...(request.manufacturer ? { manufacturer: request.manufacturer } : {}),
        ...(request.code ? { code: request.code } : {}),
        ...(request.name ? { name: request.name } : {}),
    };
}
export function compileIntentToChangeSet(project, intent) {
    const patches = [];
    if (intent.projectType)
        patches.push({ op: 'set', path: '/projectType', value: intent.projectType });
    if (intent.titleSuggestion && project.title === 'Новый проект') {
        patches.push({ op: 'set', path: '/title', value: intent.titleSuggestion });
    }
    const newMaterials = intent.materials.map(materialSelection);
    if (newMaterials.length > 0) {
        patches.push({ op: 'set', path: '/selections/materials', value: [...project.selections.materials, ...newMaterials] });
    }
    const shouldCreateFurniture = project.furniture.length === 0 && (intent.projectType !== null ||
        intent.dimensionsMm.width !== null ||
        intent.moduleCount !== null);
    if (shouldCreateFurniture) {
        const furniture = {
            id: randomUUID(),
            kind: intent.projectType === 'mixed' || intent.projectType === null ? 'custom' : intent.projectType,
            name: intent.titleSuggestion ?? 'Мебель 1',
            transform: {
                position: { x: mm(0), y: mm(0), z: mm(0) },
                rotationZDeg: 0,
            },
            dimensions: {
                width: measured(intent.dimensionsMm.width, intent.confidence),
                height: measured(intent.dimensionsMm.height, intent.confidence),
                depth: measured(intent.dimensionsMm.depth, intent.confidence),
            },
            mounting: intent.projectType === 'wardrobe' || intent.projectType === 'built_in' ? 'built_in' : 'freestanding',
            construction: {
                carcassThickness: { value: mm(18), state: 'confirmed' },
                backPanel: { mode: 'overlay', thickness: { value: mm(3), state: 'confirmed' } },
                plinth: { mode: 'separate', height: { value: mm(80), state: 'confirmed' } },
            },
            modules: makeModules(intent),
            fronts: [],
        };
        patches.push({ op: 'add', path: '/furniture/-', value: furniture });
    }
    else if (project.furniture[0]) {
        const base = '/furniture/0';
        if (intent.dimensionsMm.width !== null)
            patches.push({ op: 'set', path: `${base}/dimensions/width`, value: measured(intent.dimensionsMm.width, intent.confidence) });
        if (intent.dimensionsMm.height !== null)
            patches.push({ op: 'set', path: `${base}/dimensions/height`, value: measured(intent.dimensionsMm.height, intent.confidence) });
        if (intent.dimensionsMm.depth !== null)
            patches.push({ op: 'set', path: `${base}/dimensions/depth`, value: measured(intent.dimensionsMm.depth, intent.confidence) });
        if (intent.moduleCount !== null)
            patches.push({ op: 'set', path: `${base}/modules`, value: makeModules(intent) });
    }
    for (const note of intent.notes) {
        patches.push({
            op: 'add',
            path: '/notes/-',
            value: { id: randomUUID(), text: note, authorType: 'agent', authorId: 'intake-agent', createdAt: new Date().toISOString() },
        });
    }
    return {
        changeId: randomUUID(),
        projectId: project.projectId,
        basedOnRevision: project.revision,
        source: 'ai',
        reason: intent.summary,
        confidence: intent.confidence,
        patches,
    };
}
