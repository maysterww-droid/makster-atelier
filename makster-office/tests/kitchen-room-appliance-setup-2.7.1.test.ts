import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAndRankKitchenDesigns } from '../packages/engineering-engine/src/index.js';

const req=[
 {libraryModuleId:'base.sink' as const,widthMm:600},
 {libraryModuleId:'base.dishwasher' as const,widthMm:600},
 {libraryModuleId:'base.oven_hob' as const,widthMm:600},
 {libraryModuleId:'base.drawers' as const,widthMm:600},
];

test('2.7.1 room obstacles can reject otherwise viable layouts',()=>{
 const plain=generateAndRankKitchenDesigns({optimizationId:'plain',roomWidthMm:4200,roomDepthMm:3200,requirements:req,tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600}],maxGeneratedVariants:30});
 const blocked=generateAndRankKitchenDesigns({optimizationId:'blocked',roomWidthMm:4200,roomDepthMm:3200,requirements:req,tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600}],constraints:{obstacles:[{id:'south-radiator',kind:'radiator',xMm:0,yMm:0,widthMm:4200,depthMm:250,clearanceMm:50}]},maxGeneratedVariants:30});
 assert.ok(plain.readyCount>blocked.readyCount);
 assert.ok(blocked.allVariants.some(v=>v.base.constraints.issues.some(i=>i.code==='OBSTACLE_COLLISION')));
});

test('2.7.1 declared utilities participate in variant utility scoring',()=>{
 const r=generateAndRankKitchenDesigns({optimizationId:'utilities',roomWidthMm:4200,roomDepthMm:3200,requirements:req,utilities:[{kind:'water',side:'south',offsetMm:900,toleranceMm:300},{kind:'drain',side:'south',offsetMm:900,toleranceMm:300},{kind:'power',side:'south',offsetMm:2500,toleranceMm:500}],maxGeneratedVariants:30});
 assert.ok(r.allVariants.length>0);
 assert.ok(r.allVariants.some(v=>v.score.utilities>=0));
});

test('2.7.1 opening zones are enforced as room constraints',()=>{
 const r=generateAndRankKitchenDesigns({optimizationId:'door',roomWidthMm:4200,roomDepthMm:3200,requirements:req,constraints:{openingZones:[{id:'entry-swing',owner:'room-door',xMm:0,yMm:0,widthMm:900,depthMm:900}]},maxGeneratedVariants:30});
 assert.ok(r.allVariants.some(v=>v.base.constraints.issues.some(i=>i.code==='OPENING_ZONE_COLLISION')));
});
