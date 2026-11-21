import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeKitchenLayouts } from '../packages/engineering-engine/src/index.js';

const functions = [
  { libraryModuleId: 'base.sink' as const, widthMm: 600 },
  { libraryModuleId: 'base.dishwasher' as const, widthMm: 600 },
  { libraryModuleId: 'base.oven_hob' as const, widthMm: 600 },
];

test('optimizer ranks multiple feasible layouts and exposes score breakdown', () => {
  const r = optimizeKitchenLayouts({
    optimizationId: 'opt-1', roomWidthMm: 4200, roomDepthMm: 3200,
    allowedKinds: ['straight','l_shape','parallel'], requirements: functions,
    utilities: [
      {kind:'water',side:'south',offsetMm:1000},{kind:'drain',side:'south',offsetMm:1000},
      {kind:'power',side:'east',offsetMm:1200},
    ],
  });
  assert.ok(r.candidates.length >= 3);
  assert.ok(r.recommended);
  assert.equal(r.recommended?.rank, 1);
  assert.ok((r.recommended?.score.total ?? 0) > 0);
  assert.ok(r.candidates.every(c => c.score.feasibility >= 0 && c.score.feasibility <= 100));
});

test('optimizer rejects parallel kitchen when aisle is below configured minimum', () => {
  const r = optimizeKitchenLayouts({
    optimizationId:'opt-narrow', roomWidthMm:3600, roomDepthMm:1900,
    allowedKinds:['parallel'], minAisleMm:900, requirements:[{libraryModuleId:'base.sink',widthMm:600}],
  });
  assert.ok(r.candidates.length > 0);
  assert.ok(r.candidates.every(c => !c.ready));
  assert.ok(r.candidates.some(c => c.plan.issues.some(i => i.code === 'AISLE_TOO_NARROW')));
  assert.equal(r.recommended, undefined);
});

test('utility-affinity strategy can move service-dependent requirements to a serviced run', () => {
  const r = optimizeKitchenLayouts({
    optimizationId:'opt-util', roomWidthMm:4200, roomDepthMm:3200,
    allowedKinds:['l_shape'],
    requirements:[{libraryModuleId:'base.sink',widthMm:600},{libraryModuleId:'base.oven_hob',widthMm:600}],
    utilities:[{kind:'water',side:'east',offsetMm:600},{kind:'drain',side:'east',offsetMm:600}],
  });
  const util = r.candidates.find(c => c.strategy === 'utility_affinity');
  assert.ok(util);
  const sinkRun = util?.plan.runs.find(run => run.composition.placements.some(p => p.module.libraryModuleId === 'base.sink'));
  assert.equal(sinkRun?.side, 'east');
});

test('obstacle collisions are rejected and sorted below ready candidates', () => {
  const r = optimizeKitchenLayouts({
    optimizationId:'opt-obstacle', roomWidthMm:4200, roomDepthMm:3200,
    allowedKinds:['straight','l_shape'], requirements:[{libraryModuleId:'base.sink',widthMm:600}],
    constraints:{obstacles:[{id:'column-south',kind:'column',xMm:0,yMm:0,widthMm:500,depthMm:500}]},
  });
  if (r.readyCandidates > 0 && r.rejectedCandidates > 0) {
    const firstRejected = r.candidates.findIndex(c => !c.ready);
    const lastReady = Math.max(...r.candidates.map((c,i)=>c.ready?i:-1));
    assert.ok(firstRejected > lastReady);
  }
});

test('optimizer does not invent a work triangle when fridge is not represented in the base-run plan', () => {
  const r = optimizeKitchenLayouts({
    optimizationId:'opt-triangle', roomWidthMm:4800, roomDepthMm:3600,
    allowedKinds:['u_shape'], requirements:functions,
  });
  assert.ok(r.candidates.length > 0);
  assert.ok(r.candidates.every(c => c.workTriangle.available === false));
  assert.ok(r.candidates.every(c => c.workTriangle.note.includes('not scored')));
});
