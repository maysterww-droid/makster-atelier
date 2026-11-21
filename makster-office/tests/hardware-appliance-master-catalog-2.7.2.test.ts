
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  searchHardwareCatalog,
  searchApplianceCatalog,
  hardwareMayAuthorizeDrilling,
  getHardwareCatalogRecord,
  HARDWARE_MANUFACTURERS,
  APPLIANCE_MANUFACTURERS,
} from '../packages/engineering-engine/src/index.js';

test('2.7.2 exposes registered hardware manufacturers',()=>{
  assert.ok(HARDWARE_MANUFACTURERS.some(x=>x.name==='Blum'));
  assert.ok(HARDWARE_MANUFACTURERS.some(x=>x.name==='Hettich'));
  assert.ok(HARDWARE_MANUFACTURERS.some(x=>x.name==='GTV'));
});

test('2.7.2 production-ready drilling gate does not authorize SKU-only runner data',()=>{
  const movento=getHardwareCatalogRecord('blum-movento-760h-550')!;
  assert.equal(movento.code,'760H5500S');
  assert.equal(hardwareMayAuthorizeDrilling(movento),false);
  const ready=searchHardwareCatalog({productionReadyOnly:true});
  assert.ok(ready.every(hardwareMayAuthorizeDrilling));
});

test('2.7.2 verified Blum/GTV profiles can be distinguished from planning-only records',()=>{
  const hinge=getHardwareCatalogRecord('blum-clip-top-blumotion-110-overlay')!;
  const gtv=getHardwareCatalogRecord('gtv-modern-slide-existing')!;
  assert.equal(hardwareMayAuthorizeDrilling(hinge),true);
  assert.equal(hardwareMayAuthorizeDrilling(gtv),true);
});

test('2.7.2 appliance master catalog resolves exact manufacturer models',()=>{
  const bosch=searchApplianceCatalog({manufacturer:'Bosch',q:'SMV6ZCX10E'});
  const liebherr=searchApplianceCatalog({manufacturer:'Liebherr',q:'IRBd 5120'});
  assert.equal(bosch.length,1);
  assert.equal(liebherr.length,1);
  assert.equal(bosch[0]?.trust,'manufacturer_verified');
  assert.equal(liebherr[0]?.kind,'fridge');
});

test('2.7.2 appliance manufacturer registry includes expansion brands without inventing models',()=>{
  assert.ok(APPLIANCE_MANUFACTURERS.includes('AEG'));
  assert.ok(APPLIANCE_MANUFACTURERS.includes('NEFF'));
  assert.equal(searchApplianceCatalog({manufacturer:'AEG'}).length,0);
});
