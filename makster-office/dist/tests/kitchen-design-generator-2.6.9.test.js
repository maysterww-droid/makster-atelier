import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAndRankKitchenDesigns } from '../packages/engineering-engine/src/kitchen-design-generator-variant-ranking.js';
const requirements = [
    { libraryModuleId: 'base.sink', widthMm: 600 },
    { libraryModuleId: 'base.dishwasher', widthMm: 600 },
    { libraryModuleId: 'base.storage', widthMm: 600 },
    { libraryModuleId: 'base.oven_hob', widthMm: 600 },
];
const tallRequirements = [{ libraryModuleId: 'tall.fridge', widthMm: 600, side: 'south' }];
test('2.6.9 generates and ranks a Top 3 shortlist from real layout candidates', () => {
    const r = generateAndRankKitchenDesigns({
        optimizationId: '2.6.9-top3', roomWidthMm: 4200, roomDepthMm: 3200,
        allowedKinds: ['straight', 'l_shape', 'parallel', 'u_shape'], requirements, tallRequirements,
        maxGeneratedVariants: 30, topN: 3,
    });
    assert.ok(r.generatedCount >= 3);
    assert.ok(r.topDesigns.length >= 1 && r.topDesigns.length <= 3);
    assert.equal(r.topDesigns[0]?.rank, 1);
    assert.equal(r.recommended?.id, r.topDesigns[0]?.id);
});
test('2.6.9 exposes transparent multi-axis score breakdown', () => {
    const r = generateAndRankKitchenDesigns({ optimizationId: '2.6.9-score', roomWidthMm: 4200, roomDepthMm: 3200, allowedKinds: ['l_shape'], requirements, tallRequirements });
    const v = r.allVariants[0];
    assert.ok(v.score.engineering >= 0 && v.score.engineering <= 100);
    assert.ok(v.score.ergonomics >= 0 && v.score.ergonomics <= 100);
    assert.ok(v.score.manufacturing >= 0 && v.score.manufacturing <= 100);
    assert.ok(v.reasons.some(x => x.includes('Technical') || x.includes('Manufacturing')));
});
test('2.6.9 never ranks a blocked design above a ready design', () => {
    const r = generateAndRankKitchenDesigns({
        optimizationId: '2.6.9-ready-first', roomWidthMm: 4200, roomDepthMm: 3200,
        allowedKinds: ['straight', 'parallel'], requirements, tallRequirements,
        constraints: { obstacles: [{ id: 'block-north', kind: 'radiator', xMm: 0, yMm: 2600, widthMm: 4200, depthMm: 600 }] },
    });
    const firstRejected = r.allVariants.findIndex(v => !v.ready);
    const lastReady = r.allVariants.map(v => v.ready).lastIndexOf(true);
    if (firstRejected >= 0 && lastReady >= 0)
        assert.ok(lastReady < firstRejected);
});
test('2.6.9 generates start/end tall-position variants when position is not fixed', () => {
    const r = generateAndRankKitchenDesigns({ optimizationId: '2.6.9-tall', roomWidthMm: 4200, roomDepthMm: 3200, allowedKinds: ['straight'], requirements, tallRequirements, maxGeneratedVariants: 10 });
    const modes = new Set(r.allVariants.map(v => v.tallPositionMode));
    assert.ok(modes.has('start'));
    assert.ok(modes.has('end'));
});
test('2.6.9 respects the hard generation cap', () => {
    const r = generateAndRankKitchenDesigns({ optimizationId: '2.6.9-cap', roomWidthMm: 4200, roomDepthMm: 3200, requirements, tallRequirements, maxGeneratedVariants: 4 });
    assert.equal(r.generatedCount, 4);
    assert.ok(r.issues.some(x => x.includes('capped')));
});
