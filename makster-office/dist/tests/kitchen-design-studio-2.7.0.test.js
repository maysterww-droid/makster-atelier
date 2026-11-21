import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProjectModel, validateProjectModel } from '../packages/project-model/src/index.js';
import { generateAndRankKitchenDesigns, materializeKitchenDesignVariant, MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
function generated() {
    return generateAndRankKitchenDesigns({
        optimizationId: 'studio-270-test', roomWidthMm: 4200, roomDepthMm: 3200, minAisleMm: 900, maxGeneratedVariants: 30, topN: 3,
        allowedKinds: ['straight', 'l_shape', 'parallel', 'u_shape', 'island'],
        requirements: [
            { libraryModuleId: 'base.sink', widthMm: 600 },
            { libraryModuleId: 'base.dishwasher', widthMm: 600 },
            { libraryModuleId: 'base.oven_hob', widthMm: 600 },
            { libraryModuleId: 'base.drawers', widthMm: 600 },
        ],
        tallRequirements: [{ libraryModuleId: 'tall.fridge', widthMm: 600 }], createWallLayer: true,
    });
}
test('2.7.0 Design Studio returns a ready Top 3 shortlist when room permits', () => {
    const r = generated();
    assert.ok(r.generatedCount >= 3);
    assert.equal(r.topDesigns.length, 3);
    assert.ok(r.topDesigns.every(v => v.ready));
    assert.equal(r.recommended?.id, r.topDesigns[0]?.id);
});
test('2.7.0 selected variant materializes into a valid normal kitchen ProjectModel', () => {
    const r = generated();
    const v = r.recommended;
    const base = createEmptyProjectModel({ projectId: '27000000-0000-4000-8000-000000000001', title: 'Studio test', projectType: 'kitchen' });
    const p = materializeKitchenDesignVariant(base, v, { title: 'Chosen Kitchen' });
    const validation = validateProjectModel(p);
    assert.deepEqual(validation.errors, []);
    assert.equal(p.projectType, 'kitchen');
    assert.equal(p.site.rooms.length, 1);
    assert.ok(p.furniture.length >= 2);
    assert.ok(p.furniture.some(f => f.tags?.includes('layer:floor')));
    assert.ok(p.furniture.some(f => f.tags?.includes('layer:wall')));
});
test('2.7.0 materialized Studio project compiles through the existing Engineering Engine', () => {
    const r = generated();
    const v = r.recommended;
    const base = createEmptyProjectModel({ projectId: '27000000-0000-4000-8000-000000000002', title: 'Studio engineering test', projectType: 'kitchen' });
    const p = materializeKitchenDesignVariant(base, v);
    const out = new MaksterEngineeringCompiler().compile(p);
    assert.equal(out.ruleSetId, 'kitchen-pro-engineering-v2.7.0');
    assert.ok(out.parts.length > 0);
    assert.ok(!out.issues.some(i => i.code === 'MODULE_WIDTH_SUM_MISMATCH'));
});
