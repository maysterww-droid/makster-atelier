import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateProjectModel } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
async function golden() {
    return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/golden.kitchen.001.r4.2.6.1.json'), 'utf8'));
}
test('Golden Project #1 R4 is a valid 4190 mm ProjectModel revision', async () => {
    const p = await golden();
    assert.equal(p.revision, 4);
    assert.equal(Number(p.furniture[0].dimensions.width.value), 41900);
    assert.equal(validateProjectModel(p).ok, true);
});
test('Golden Project #1 no longer carries the false 3590 mm width into Engineering', async () => {
    const e = new MaksterEngineeringCompiler().compile(await golden());
    assert.equal(e.issues.some(i => i.code === 'MODULE_WIDTH_SUM_MISMATCH'), false);
});
test('Golden Project #1 keeps GTV in BOM but never substitutes Blum machining', async () => {
    const e = new MaksterEngineeringCompiler().compile(await golden());
    assert.ok(e.hardware.some(h => h.name.includes('GTV') && h.role === 'runner'));
    assert.ok(e.hardware.some(h => h.name.includes('GTV') && h.role === 'hinge'));
    assert.equal(e.machining.some(m => m.verificationDetail?.manufacturer === 'Blum'), false);
    assert.ok(e.issues.some(i => i.code === 'DRAWER_RUNNER_PROFILE_UNVERIFIED'));
    assert.ok(e.issues.some(i => i.code === 'HINGE_PROFILE_UNVERIFIED'));
});
test('Golden Project #1 models oven + hob separately and blocks unknown envelopes/cutout', async () => {
    const p = await golden();
    const zone = p.furniture[0].modules[3];
    assert.deepEqual(zone.kitchen?.appliances?.map(a => a.kind), ['oven', 'hob']);
    const e = new MaksterEngineeringCompiler().compile(p);
    assert.equal(e.issues.filter(i => i.code === 'KITCHEN_APPLIANCE_ENVELOPE_REQUIRED').length, 2);
    assert.ok(e.issues.some(i => i.code === 'KITCHEN_HOB_CUTOUT_REQUIRED'));
});
test('Golden Project #1 wall-side plinth/upstand is explicit and HOLD until dimensions are confirmed', async () => {
    const p = await golden();
    assert.ok(p.furniture[0].modules.every(m => m.kitchen?.worktop?.wallTrim?.enabled === true));
    const e = new MaksterEngineeringCompiler().compile(p);
    assert.equal(e.issues.filter(i => i.code === 'KITCHEN_WALL_TRIM_DIMENSIONS_REQUIRED').length, 1);
    assert.equal(e.readyForProduction, false);
});
