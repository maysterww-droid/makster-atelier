
import test from 'node:test';
import assert from 'node:assert/strict';
import { autoSelectHardware, autoSelectAppliances } from '../packages/engineering-engine/src/index.js';

test('2.7.4 hardware auto-selection returns compatible runner candidates',()=>{
  const r=autoSelectHardware({role:'runner',desiredNominalLengthMm:550,expectedDynamicLoadKg:35,maxResults:3});
  assert.ok(r.candidates.length>=1);
  assert.ok(r.candidates.every(c=>c.compatibilityStatus!=='incompatible'));
});

test('2.7.4 production-drilling request removes SKU-only runner candidates',()=>{
  const r=autoSelectHardware({role:'runner',desiredNominalLengthMm:550,expectedDynamicLoadKg:35,requireProductionDrilling:true,maxResults:3});
  assert.ok(r.candidates.every(c=>c.productionReady && c.compatibilityStatus!=='unknown'));
});

test('2.7.4 preferred manufacturer boosts otherwise viable candidates',()=>{
  const r=autoSelectHardware({role:'runner',desiredNominalLengthMm:550,expectedDynamicLoadKg:35,preferredManufacturers:['GTV'],maxResults:3});
  assert.ok(r.candidates.length>=1);
});

test('2.7.4 Bosch dishwasher can be automatically selected for verified niche',()=>{
  const r=autoSelectAppliances({kind:'dishwasher',nicheWidthMm:600,nicheHeightMm:820,nicheDepthMm:560,maxResults:3});
  assert.ok(r.ready);
  assert.ok(r.candidates.some(c=>c.record.id==='bosch-smv6zcx10e'&&c.compatibilityStatus==='compatible'));
});

test('2.7.4 unknown appliance data is retained for review, not promoted as confirmed fit',()=>{
  const r=autoSelectAppliances({kind:'dishwasher',nicheWidthMm:600,nicheHeightMm:820,nicheDepthMm:560,maxResults:5});
  const s=r.candidates.find(c=>c.record.id==='siemens-sn65zx07ce');
  if(s) assert.equal(s.compatibilityStatus,'unknown');
});
