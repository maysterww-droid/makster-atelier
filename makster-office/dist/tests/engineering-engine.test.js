import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FixtureManufacturingDataProvider, MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
async function fixture(name) {
    const text = await readFile(new URL('file://' + process.cwd() + `/packages/project-model/examples/${name}`), 'utf8');
    return JSON.parse(text);
}
const goldenWardrobe = () => fixture('wardrobe.v1.json');
const blumWardrobe = () => fixture('wardrobe.blum.v1.json');
test('Engineering 0.7 preserves deterministic carcass dimensions for the golden 3360 wardrobe', async () => {
    const result = new MaksterEngineeringCompiler().compile(await goldenWardrobe());
    assert.equal(result.engineVersion, '0.7.0');
    assert.equal(result.ruleSetId, 'wardrobe-modular-boxes-release-v0.7');
    assert.equal(result.stats.moduleCount, 6);
    assert.equal(result.parts.filter((part) => part.kind === 'side').length, 12);
    assert.equal(result.parts.filter((part) => part.kind === 'front').length, 6);
    const side = result.parts.find((part) => part.name === 'M1 left side');
    assert.ok(side);
    assert.equal(Number(side.length), 25700);
    assert.equal(Number(side.width), 6000);
    const top = result.parts.find((part) => part.name === 'M1 top');
    assert.ok(top);
    assert.equal(Number(top.length), 5240);
    assert.equal(Number(top.width), 6000);
});
test('Unconfigured golden project remains blocked rather than inventing hardware', async () => {
    const result = new MaksterEngineeringCompiler().compile(await goldenWardrobe());
    assert.equal(result.readyForProduction, false);
    assert.equal(result.cncReady, false);
    assert.equal(result.issues.filter((issue) => issue.code === 'DRAWER_RUNNER_UNRESOLVED').length, 2);
    assert.equal(result.issues.filter((issue) => issue.code === 'HINGE_SYSTEM_UNRESOLVED').length, 1);
    assert.ok(result.cncRelease.blockers.length > 0);
});
test('Safe production provider compiles Blum geometry but holds CNC until verified manufacturer drilling arrives', async () => {
    const result = new MaksterEngineeringCompiler().compile(await blumWardrobe());
    assert.equal(result.readyForProduction, true);
    assert.equal(result.cncReady, false);
    assert.equal(result.checks.blocking, 0);
    assert.equal(result.issues.filter((issue) => issue.code === 'RUNNER_MANUFACTURING_DATA_REQUIRED').length, 2);
    assert.equal(result.issues.filter((issue) => issue.code === 'RUNNER_VERTICAL_LINES_REQUIRED').length, 0);
    assert.ok(result.cncRelease.blockers.some((item) => item.code === 'RUNNER_MANUFACTURING_DATA_REQUIRED'));
    assert.ok(result.cncRelease.blockers.some((item) => item.code === 'UNVERIFIED_MACHINING_OPERATIONS'));
    const grooves = result.machining.filter((op) => op.kind === 'groove');
    assert.equal(grooves.length, 24); // 4 groove operations × 6 modular carcasses
    assert.ok(grooves.every((op) => !op.estimated && op.verificationSource === 'makster_rule'));
    assert.equal(Number(grooves[0].toolWidth), 85); // 8 mm back + 0.5 mm clearance
    assert.equal(Number(grooves[0].depth), 80);
    const system32 = result.machining.filter((op) => op.note === 'Makster System 32 adjustable-shelf row');
    assert.ok(system32.length > 0);
    assert.ok(system32.every((op) => !op.estimated && Number(op.diameter) === 50));
});
test('Fixture-only manufacturing provider proves the CNC gate end-to-end without claiming manufacturer truth', async () => {
    const result = new MaksterEngineeringCompiler(new FixtureManufacturingDataProvider()).compile(await blumWardrobe());
    assert.equal(result.readyForProduction, true);
    assert.equal(result.cncReady, true);
    assert.equal(result.cncRelease.ready, true);
    assert.equal(result.cncRelease.blockers.length, 0);
    assert.equal(result.machining.some((op) => op.kind === 'reference_line'), false);
    assert.equal(result.machining.some((op) => op.estimated), false);
    const runnerDrills = result.machining.filter((op) => op.note?.includes('runner fixing'));
    assert.equal(runnerDrills.length, 24); // 2 systems × 3 drawers × 2 sides × 2 fixture holes
    assert.ok(runnerDrills.every((op) => op.verificationSource === 'fixture_only'));
});
test('MOVENTO and LEGRABOX dimensional formulas remain deterministic', async () => {
    const result = new MaksterEngineeringCompiler().compile(await blumWardrobe());
    const moventoSide = result.parts.find((part) => part.name === 'M1 drawer 1 sides');
    const moventoBottom = result.parts.find((part) => part.name === 'M1 drawer 1 bottom');
    const legraboxBottom = result.parts.find((part) => part.name === 'M6 LEGRABOX 1 bottom');
    const legraboxBack = result.parts.find((part) => part.name === 'M6 LEGRABOX 1 back');
    assert.ok(moventoSide && moventoBottom && legraboxBottom && legraboxBack);
    assert.equal(Number(moventoSide.length), 5400);
    assert.equal(Number(moventoBottom.width), 4820);
    assert.equal(Number(legraboxBottom.length), 5400);
    assert.equal(Number(legraboxBottom.width), 4890);
    assert.equal(Number(legraboxBack.length), 4860);
    assert.equal(Number(legraboxBack.width), 1480);
});
test('Grooved back panel extends into the groove instead of using recessed dimensions', async () => {
    const result = new MaksterEngineeringCompiler().compile(await blumWardrobe());
    const back = result.parts.find((part) => part.name === 'M1 back');
    assert.ok(back);
    // inner height 2534 + 16 mm total groove capture; inner width 524 + 16 mm total capture
    assert.equal(Number(back.length), 25500);
    assert.equal(Number(back.width), 5400);
});
test('Engineering detects module width mismatch instead of silently stretching the model', async () => {
    const project = await goldenWardrobe();
    const changed = structuredClone(project);
    const first = changed.furniture[0]?.modules[0];
    assert.ok(first && first.width.mode === 'fixed');
    first.width.value.value = 5500;
    const result = new MaksterEngineeringCompiler().compile(changed);
    assert.ok(result.issues.some((issue) => issue.code === 'MODULE_WIDTH_SUM_MISMATCH' && issue.severity === 'blocking'));
});
test('engineering compiles every furniture object in a multi-object Visual Project', async () => {
    const { applyVisualCommand } = await import('../packages/visual-product/src/index.js');
    const project = JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
    const two = applyVisualCommand(project, { type: 'duplicate_furniture', furnitureIndex: 0, offsetXMm: 3360, offsetYMm: 0, rotationZDeg: 90, name: 'Return wardrobe' });
    const result = new MaksterEngineeringCompiler().compile(two);
    assert.equal(result.stats.furnitureCount, 2);
    assert.equal(result.furniture.length, 2);
    assert.ok(result.parts.some(part => part.furnitureId === two.furniture[0].id));
    assert.ok(result.parts.some(part => part.furnitureId === two.furniture[1].id));
});
