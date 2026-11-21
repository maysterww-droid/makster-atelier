import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mm } from '../packages/project-model/src/index.js';
import { KITCHEN_MODULE_LIBRARY, resolveKitchenLibraryModule, MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
test('2.6.2 library covers base, wall, tall, appliance, open and technical kitchen sections', () => {
    for (const id of ['base.storage', 'base.drawers', 'base.sink', 'base.oven_hob', 'base.dishwasher', 'base.open', 'wall.storage', 'wall.hood', 'wall.open', 'tall.pantry', 'tall.oven', 'tall.fridge', 'tall.open', 'technical.base', 'technical.wall', 'technical.tall'])
        assert.ok(KITCHEN_MODULE_LIBRARY[id], id);
});
test('library defaults are deterministic but explicit project construction wins', () => {
    const module = { id: 'x', libraryModuleId: 'base.sink', kind: 'sink', width: { mode: 'fixed', value: { value: mm(600), state: 'confirmed' } }, contents: [], kitchen: { type: 'base', function: 'sink', hasTop: true, hasBottom: true, hasBack: false } };
    const r = resolveKitchenLibraryModule(module);
    assert.equal(r.kitchen?.hasTop, true);
    assert.ok(r.tags?.includes('base.sink'));
});
test('Golden Project #1 R14 compiles through Kitchen Module Library without geometry regression', async () => {
    const p = JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/golden.kitchen.001.r14.site-fit.json'), 'utf8'));
    assert.deepEqual(p.furniture[0].modules.map(m => m.libraryModuleId), ['base.drawers', 'base.sink', 'base.storage', 'base.oven_hob', 'base.storage', 'base.drawers']);
    const e = new MaksterEngineeringCompiler().compile(p);
    assert.equal(e.issues.filter(i => i.severity === 'blocking').length, 0);
    assert.equal(e.readyForProduction, true);
    const m1 = e.parts.filter(x => x.moduleId === '26100001-0000-4000-8000-000000000001');
    const side = m1.find(x => x.name === 'M1 drawer 1 sides');
    const back = m1.find(x => x.name === 'M1 drawer 1 back');
    assert.equal(Number(side?.length), 4900);
    assert.equal(Number(back?.length) + 2 * Number(side?.thickness), 5510);
});
