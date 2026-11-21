
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateHardwareCatalogId,
  evaluateApplianceCatalogId,
} from '../packages/engineering-engine/src/index.js';

test('2.7.3 Blum 110 hinge rejects a front thicker than verified profile limit',()=>{
  const ok=evaluateHardwareCatalogId('blum-clip-top-blumotion-110-overlay',{role:'hinge',frontThicknessMm:18})!;
  const bad=evaluateHardwareCatalogId('blum-clip-top-blumotion-110-overlay',{role:'hinge',frontThicknessMm:25})!;
  assert.equal(ok.status,'compatible');
  assert.equal(bad.status,'incompatible');
  assert.ok(bad.issues.some(i=>i.code==='FRONT_TOO_THICK'));
});

test('2.7.3 SKU-only MOVENTO record does not authorize production drilling',()=>{
  const r=evaluateHardwareCatalogId('blum-movento-760h-550',{role:'runner',desiredNominalLengthMm:550,expectedDynamicLoadKg:30,requireProductionDrilling:true})!;
  assert.equal(r.status,'incompatible');
  assert.ok(r.issues.some(i=>i.code==='DRILLING_NOT_AUTHORIZED'));
});

test('2.7.3 runner load and nominal length are checked independently',()=>{
  const load=evaluateHardwareCatalogId('blum-legrabox-750-550',{role:'runner',desiredNominalLengthMm:550,expectedDynamicLoadKg:45})!;
  const length=evaluateHardwareCatalogId('blum-legrabox-750-550',{role:'runner',desiredNominalLengthMm:500,expectedDynamicLoadKg:30})!;
  assert.ok(load.issues.some(i=>i.code==='LOAD_EXCEEDS_RATING'));
  assert.ok(length.issues.some(i=>i.code==='RUNNER_LENGTH_MISMATCH'));
});

test('2.7.3 Bosch dishwasher accepts verified niche and rejects shallow niche',()=>{
  const ok=evaluateApplianceCatalogId('bosch-smv6zcx10e',{kind:'dishwasher',nicheWidthMm:600,nicheHeightMm:820,nicheDepthMm:560})!;
  const bad=evaluateApplianceCatalogId('bosch-smv6zcx10e',{kind:'dishwasher',nicheWidthMm:600,nicheHeightMm:820,nicheDepthMm:520})!;
  assert.equal(ok.status,'compatible');
  assert.equal(bad.status,'incompatible');
  assert.ok(bad.issues.some(i=>i.code==='NICHE_TOO_SHALLOW'));
});

test('2.7.3 Liebherr refrigerator checks niche ranges and ventilation',()=>{
  const ok=evaluateApplianceCatalogId('liebherr-irbd-5120',{kind:'fridge',nicheWidthMm:565,nicheHeightMm:1780,nicheDepthMm:560,ventilationAreaCm2:220})!;
  const bad=evaluateApplianceCatalogId('liebherr-irbd-5120',{kind:'fridge',nicheWidthMm:565,nicheHeightMm:1780,nicheDepthMm:560,ventilationAreaCm2:150})!;
  assert.equal(ok.status,'compatible');
  assert.equal(bad.status,'incompatible');
  assert.ok(bad.issues.some(i=>i.code==='VENTILATION_TOO_SMALL'));
});

test('2.7.3 insufficient normalized data returns UNKNOWN instead of guessing',()=>{
  const r=evaluateApplianceCatalogId('siemens-sn65zx07ce',{kind:'dishwasher',nicheWidthMm:600,nicheHeightMm:820,nicheDepthMm:560})!;
  assert.equal(r.status,'unknown');
  assert.ok(r.issues.some(i=>i.code==='INSUFFICIENT_VERIFIED_DATA'));
});
