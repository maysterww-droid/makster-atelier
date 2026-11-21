import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planKitchenLayout, applyKitchenLayoutPlan, MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import type { ProjectModelV1 } from '../packages/project-model/src/types.js';

const fixture = JSON.parse(fs.readFileSync(new URL('file://'+process.cwd()+'/packages/project-model/examples/golden.kitchen.001.r14.site-fit.json'), 'utf8')) as ProjectModelV1;

test('L-shape generates two orthogonal production runs', () => {
  const p = planKitchenLayout({ layoutId:'l1', kind:'l_shape', roomWidthMm:4200, roomDepthMm:3200, requirements:[
    { libraryModuleId:'base.sink', widthMm:600, side:'south' },
    { libraryModuleId:'base.oven_hob', widthMm:600, side:'east' },
  ]});
  assert.equal(p.ready, true);
  assert.deepEqual(p.runs.map(r=>r.side), ['south','east']);
  assert.deepEqual(p.runs.map(r=>r.transform.rotationZDeg), [0,90]);
  assert.ok(p.runs.every(r=>r.composition.ready));
});

test('parallel layout blocks an unsafe aisle', () => {
  const p = planKitchenLayout({ layoutId:'p1', kind:'parallel', roomWidthMm:3600, roomDepthMm:1900, runDepthMm:600, minAisleMm:900 });
  assert.equal(p.ready, false);
  assert.equal(p.aisleMm, 700);
  assert.ok(p.issues.some(i=>i.code==='AISLE_TOO_NARROW' && i.severity==='blocking'));
});

test('island layout validates clearances instead of blindly placing an island', () => {
  const good = planKitchenLayout({ layoutId:'i1', kind:'island', roomWidthMm:5200, roomDepthMm:3900, islandLengthMm:2200, islandDepthMm:900, minAisleMm:900 });
  const bad = planKitchenLayout({ layoutId:'i2', kind:'island', roomWidthMm:4200, roomDepthMm:2700, islandLengthMm:2000, islandDepthMm:900, minAisleMm:900 });
  assert.equal(good.ready, true);
  assert.equal(bad.ready, false);
  assert.ok(bad.issues.some(i=>i.code==='ISLAND_DOES_NOT_FIT'));
});

test('utility points warn when sink is too far from declared water', () => {
  const p = planKitchenLayout({ layoutId:'u1', kind:'straight', roomWidthMm:3600, roomDepthMm:3000,
    requirements:[{ libraryModuleId:'base.sink', widthMm:600 }],
    utilities:[{ kind:'water', side:'south', offsetMm:3200, toleranceMm:200 }],
  });
  assert.equal(p.ready, true);
  assert.ok(p.issues.some(i=>i.code==='UTILITY_NOT_NEAR_REQUIRED_MODULE' && i.severity==='warning'));
});

test('U-shape plan can replace one Golden Project kitchen with three runs and compile through the same Engineering Engine', () => {
  const template = fixture.furniture[0]!;
  const plan = planKitchenLayout({ layoutId:'golden-u', kind:'u_shape', roomWidthMm:4190, roomDepthMm:3200, cornerReserveMm:600,
    requirements:[
      { libraryModuleId:'base.drawers', widthMm:600, side:'south' },
      { libraryModuleId:'base.sink', widthMm:600, side:'south' },
      { libraryModuleId:'base.dishwasher', widthMm:600, side:'east' },
      { libraryModuleId:'base.oven_hob', widthMm:600, side:'north' },
    ],
  });
  assert.equal(plan.ready, true);
  const project = applyKitchenLayoutPlan(fixture, template.id, plan);
  assert.equal(project.furniture.length, fixture.furniture.length + 2);
  assert.equal(project.revision, fixture.revision + 1);
  const result = new MaksterEngineeringCompiler().compile(project);
  assert.equal(result.ruleSetId, 'kitchen-pro-engineering-v2.7.9');
  assert.ok(result.parts.length > 0);
  assert.ok(!result.issues.some(i=>i.code==='MODULE_WIDTH_SUM_MISMATCH'));
});
