import test from 'node:test';
import assert from 'node:assert/strict';
import { planKitchenLayout } from '../packages/engineering-engine/src/kitchen-layout-planner.js';
import { planKitchenMixedHeight } from '../packages/engineering-engine/src/kitchen-mixed-height-appliance-layout.js';
import { evaluateKitchenErgonomics } from '../packages/engineering-engine/src/kitchen-ergonomics-design-intelligence.js';
function mixed(opts = {}) {
    const base = planKitchenLayout({
        layoutId: 'erg-base', kind: opts.kind ?? 'straight', roomWidthMm: opts.roomWidthMm ?? 4200, roomDepthMm: opts.roomDepthMm ?? 3000, runDepthMm: 600,
        requirements: opts.reqs ?? [
            { libraryModuleId: 'base.sink', widthMm: 600, side: 'south' },
            { libraryModuleId: 'base.storage', widthMm: 800, side: 'south' },
            { libraryModuleId: 'base.oven_hob', widthMm: 600, side: 'south' },
            { libraryModuleId: 'base.dishwasher', widthMm: 600, side: 'south' },
        ], minAisleMm: 900,
    });
    return planKitchenMixedHeight({ planId: 'erg-mixed', basePlan: base, tallRequirements: opts.tall ?? [{ libraryModuleId: 'tall.fridge', widthMm: 600, side: 'south', position: 'end' }], createWallLayer: true, ...(opts.wallBottomZMm == null ? {} : { wallBottomZMm: opts.wallBottomZMm }) });
}
test('2.6.8 derives continuous prep surface between sink and cooking', () => {
    const r = evaluateKitchenErgonomics(mixed());
    assert.equal(r.prepSurface.available, true);
    assert.ok(r.prepSurface.widthMm >= 800);
    assert.ok(r.score.total > 0);
});
test('2.6.8 blocks too-small configured prep surface', () => {
    const m = mixed({ reqs: [{ libraryModuleId: 'base.sink', widthMm: 600, side: 'south' }, { libraryModuleId: 'base.storage', widthMm: 200, side: 'south' }, { libraryModuleId: 'base.oven_hob', widthMm: 600, side: 'south' }] });
    const r = evaluateKitchenErgonomics(m, { minPrepSurfaceMm: 400 });
    assert.ok(r.issues.some(i => i.code === 'PREP_SURFACE_TOO_SMALL' && i.severity === 'blocking'));
    assert.equal(r.ready, false);
});
test('2.6.8 warns when dishwasher is configured too far from sink', () => {
    const m = mixed({ reqs: [{ libraryModuleId: 'base.sink', widthMm: 600, side: 'south' }, { libraryModuleId: 'base.storage', widthMm: 1200, side: 'south' }, { libraryModuleId: 'base.dishwasher', widthMm: 600, side: 'south' }, { libraryModuleId: 'base.oven_hob', widthMm: 600, side: 'south' }] });
    const r = evaluateKitchenErgonomics(m, { maxSinkDishwasherDistanceMm: 900 });
    assert.ok(r.issues.some(i => i.code === 'DISHWASHER_TOO_FAR_FROM_SINK'));
});
test('2.6.8 detects opposing appliance-opening conflict', () => {
    const m = mixed({ kind: 'parallel', roomWidthMm: 3600, roomDepthMm: 1800, reqs: [{ libraryModuleId: 'base.dishwasher', widthMm: 600, side: 'south' }, { libraryModuleId: 'base.storage', widthMm: 600, side: 'north' }], tall: [{ libraryModuleId: 'tall.fridge', widthMm: 600, side: 'north', position: 'end' }] });
    const r = evaluateKitchenErgonomics(m, { minApplianceOpeningClearanceMm: 700, minFridgeOpeningClearanceMm: 1000 });
    assert.ok(r.issues.some(i => i.code === 'FRIDGE_OPENING_CONFLICT' || i.code === 'APPLIANCE_OPENING_CONFLICT'));
});
test('2.6.8 warns when wall cabinet bottom is outside configured reach band', () => {
    const r = evaluateKitchenErgonomics(mixed({ wallBottomZMm: 1750 }), { maxWallBottomZMm: 1650 });
    assert.ok(r.issues.some(i => i.code === 'WALL_CABINET_HEIGHT_OUT_OF_RANGE'));
});
test('2.6.8 evaluates actual sink-cooking-fridge triangle', () => {
    const r = evaluateKitchenErgonomics(mixed(), { minWorkTriangleLegMm: 2000 });
    assert.equal(r.planId, 'erg-mixed');
    assert.ok(r.issues.some(i => i.code === 'WORK_TRIANGLE_LEG_TOO_SHORT'));
});
