import test from 'node:test';
import assert from 'node:assert/strict';
import { mm } from '../packages/project-model/src/types.js';
import {
  planKitchenLayout,
  planKitchenMixedHeight,
  applyKitchenMixedHeightPlan,
  MaksterEngineeringCompiler,
} from '../packages/engineering-engine/src/index.js';
import golden from '../packages/project-model/examples/golden.kitchen.001.r14.site-fit.json' with { type: 'json' };

const applianceBindings = [
  { libraryModuleId:'base.oven_hob' as const, appliances:[
    {kind:'oven' as const,installation:'cabinet' as const,fitMode:'site_fit' as const},
    {kind:'hob' as const,installation:'worktop' as const,fitMode:'site_fit' as const},
  ]},
  { libraryModuleId:'tall.fridge' as const, appliances:[{kind:'fridge' as const,installation:'cabinet' as const,fitMode:'site_fit' as const}]},
  { libraryModuleId:'wall.hood' as const, appliances:[{kind:'hood' as const,installation:'wall' as const,fitMode:'site_fit' as const}]},
];

function basePlan() {
  return planKitchenLayout({
    layoutId:'mixed-base',kind:'l_shape',roomWidthMm:4200,roomDepthMm:3200,
    requirements:[
      {libraryModuleId:'base.sink',widthMm:600,side:'south'},
      {libraryModuleId:'base.oven_hob',widthMm:600,side:'south'},
      {libraryModuleId:'base.dishwasher',widthMm:600,side:'east'},
    ],
  });
}

test('mixed-height planner combines floor base/tall modules and creates elevated wall layer', () => {
  const result=planKitchenMixedHeight({
    planId:'mixed-1',basePlan:basePlan(),
    tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600,side:'south',position:'end'}],
    applianceBindings,
  });
  assert.equal(result.ready,true);
  const south=result.runs.find(r=>r.side==='south')!;
  assert.ok(south.floorModules.some(m=>m.libraryModuleId==='tall.fridge'));
  assert.ok(south.wallModules.length>0);
  assert.equal(Number(south.wallTransform?.position.z),Number(mm(1450)));
});

test('hood is projected directly above the hob slot', () => {
  const result=planKitchenMixedHeight({planId:'mixed-hood',basePlan:basePlan(),tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600,side:'south'}],applianceBindings});
  const south=result.runs.find(r=>r.side==='south')!;
  const hob=south.floorPlacements.find(p=>p.module.libraryModuleId==='base.oven_hob')!;
  const hood=south.wallPlacements.find(p=>p.module.libraryModuleId==='wall.hood')!;
  assert.equal(hood.xMm+south.wallOffsetMm,hob.xMm);
  assert.equal(hood.widthMm,hob.widthMm);
});

test('actual refrigerator placement enables a real work triangle', () => {
  const result=planKitchenMixedHeight({planId:'mixed-triangle',basePlan:basePlan(),tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600,side:'east',position:'end'}],applianceBindings});
  assert.equal(result.workTriangle.available,true);
  assert.equal(result.workTriangle.legsMm.length,3);
  assert.ok((result.workTriangle.perimeterMm ?? 0)>0);
});

test('hood clearance is blocking when vertical geometry is unsafe', () => {
  const result=planKitchenMixedHeight({
    planId:'mixed-low-hood',basePlan:basePlan(),tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600,side:'south'}],
    wallBottomZMm:1300,worktopTopZMm:910,minHoodClearanceMm:650,applianceBindings,
  });
  assert.equal(result.ready,false);
  assert.ok(result.issues.some(i=>i.code==='HOOD_CLEARANCE_TOO_SMALL'&&i.severity==='blocking'));
});

test('materialized mixed layers remain compatible with Engineering Engine width invariants', () => {
  const project=structuredClone(golden) as any;
  const template=project.furniture.find((f:any)=>f.kind==='kitchen');
  assert.ok(template);
  const straight=planKitchenLayout({
    layoutId:'mixed-golden',kind:'straight',roomWidthMm:4190,roomDepthMm:3000,
    runLengthsMm:{south:4190},requirements:[
      {libraryModuleId:'base.sink',widthMm:600,side:'south'},
      {libraryModuleId:'base.oven_hob',widthMm:600,side:'south'},
    ],
  });
  const mixed=planKitchenMixedHeight({planId:'mixed-golden-267',basePlan:straight,tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600,side:'south'}],applianceBindings});
  const applied=applyKitchenMixedHeightPlan(project,template.id,mixed);
  const compiled=new MaksterEngineeringCompiler().compile(applied);
  const mismatch=compiled.furniture.flatMap((f:any)=>f.issues).filter((i:any)=>i.code==='MODULE_WIDTH_SUM_MISMATCH');
  assert.equal(mismatch.length,0);
});
