import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateProjectModel } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
async function r13() {
    return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/golden.kitchen.001.r13.gtv-modern-slide.json'), 'utf8'));
}
test('Golden Project #1 R13 uses dedicated GTV Modern Slide profile instead of Blum-equivalent sizing', async () => {
    const p = await r13();
    assert.equal(p.revision, 13);
    const runner = p.selections.hardware.find(h => h.role === 'runner');
    assert.equal(runner?.manufacturer, 'GTV');
    assert.equal(runner?.technical?.kind, 'gtv_modern_slide');
    assert.equal(validateProjectModel(p).ok, true);
    const e = new MaksterEngineeringCompiler().compile(p);
    assert.equal(e.issues.some(i => i.code === 'DRAWER_RUNNER_PROFILE_UNVERIFIED'), false);
    assert.equal(e.machining.some(m => m.hardwareSelectionId === runner?.id), false);
});
test('GTV Modern Slide 18 mm / 500 mm computes 551 x 490 outer timber box geometry', async () => {
    const e = new MaksterEngineeringCompiler().compile(await r13());
    const m1 = e.parts.filter(p => p.moduleId === '26100001-0000-4000-8000-000000000001');
    const side = m1.find(p => p.name === 'M1 drawer 1 sides');
    const back = m1.find(p => p.name === 'M1 drawer 1 back');
    assert.equal(Number(side?.length), 4900);
    assert.equal(Number(side?.thickness), 180);
    assert.equal(Number(back?.length), 5150);
    const outerWidth = Number(back?.length) + 2 * Number(side?.thickness);
    assert.equal(outerWidth, 5510);
});
test('R13 grooved 3 mm HDF bottom is derived from 3x10 shop groove profile', async () => {
    const e = new MaksterEngineeringCompiler().compile(await r13());
    const m1 = e.parts.filter(p => p.moduleId === '26100001-0000-4000-8000-000000000001');
    const bottom = m1.find(p => p.name === 'M1 drawer 1 bottom');
    assert.equal(Number(bottom?.length), 4740);
    assert.equal(Number(bottom?.width), 5350);
    assert.equal(Number(bottom?.thickness), 30);
    assert.equal(e.issues.some(i => i.code === 'DRAWER_BOTTOM_GROOVE_PROFILE_REQUIRED'), false);
});
test('R13 leaves only appliance envelopes as blocking issues and treats sink/hob cutouts as on-site operations', async () => {
    const e = new MaksterEngineeringCompiler().compile(await r13());
    const blocking = e.issues.filter(i => i.severity === 'blocking');
    assert.equal(blocking.length, 2);
    assert.ok(blocking.every(i => i.code === 'KITCHEN_APPLIANCE_ENVELOPE_REQUIRED'));
    assert.equal(e.machining.filter(m => m.kind === 'cutout').length, 0);
    assert.equal(e.issues.filter(i => i.code === 'KITCHEN_CUTOUT_ON_SITE').length, 2);
});
