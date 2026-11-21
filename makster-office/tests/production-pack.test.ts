import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler, FixtureManufacturingDataProvider } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';

async function project(): Promise<ProjectModelV1> {
  return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8')) as ProjectModelV1;
}

test('manual workshop pack is ready without CNC-ready runner drilling', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler().compile(p);
  assert.equal(e.readyForProduction, true);
  assert.equal(e.cncReady, false);
  const pack = buildProductionPack({ project:p, engineering:e, route:'manual_workshop', packId:'manual-test', generatedAt:'2026-09-03T10:00:00Z' });
  assert.equal(pack.manifest.ready, true);
  assert.equal(pack.manifest.route, 'manual_workshop');
  assert.ok(pack.files['cutlist.csv']);
  assert.ok(pack.files['edging.csv']);
  assert.ok(pack.files['drilling.csv']);
  assert.ok(pack.files['assembly-sequence.csv']);
  assert.ok(pack.files['workshop-checklist.txt']?.includes('CHECK/REFERENCE'));
  assert.ok(pack.manifest.summary.unresolvedMachiningOperations > 0);
});

test('outsource cutting-only pack is ready even while CNC drilling is unresolved', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering:e, route:'outsource', outsourcePreset:'cutting_only', packId:'cut-only' });
  assert.equal(pack.manifest.ready, true);
  assert.deepEqual(pack.manifest.services, ['cutting']);
  assert.ok(pack.files['cutlist.csv']);
  assert.equal(pack.files['edging.csv'], undefined);
  assert.equal(pack.files['drilling.csv'], undefined);
  assert.ok(JSON.parse(pack.files['supplier-order.json']!).readyToSend);
});

test('outsource cutting + edging remains ready with resolved edge material mapping', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering:e, route:'outsource', outsourcePreset:'cutting_edging', packId:'edge-test' });
  assert.equal(pack.manifest.ready, true);
  assert.ok(pack.files['edging.csv']);
  assert.equal(pack.files['drilling.csv'], undefined);
  assert.ok(pack.files['edging.csv']?.includes('Matching ABS edge 0.8 mm'));
});

test('outsource drilling is blocked until all drilling operations are exact', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering:e, route:'outsource', outsourcePreset:'cutting_edging_drilling', packId:'drill-block' });
  assert.equal(pack.manifest.ready, false);
  assert.ok(pack.manifest.blockers.some(b=>b.code==='OUTSOURCE_DRILLING_NOT_EXACT'));
  assert.equal(JSON.parse(pack.files['supplier-order.json']!).readyToSend, false);
});

test('verified drilling fixture proves outsource full-service pack gate', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler(new FixtureManufacturingDataProvider()).compile(p);
  assert.equal(e.cncReady, true);
  const pack = buildProductionPack({ project:p, engineering:e, route:'outsource', outsourcePreset:'cutting_edging_drilling', packId:'drill-ready' });
  assert.equal(pack.manifest.ready, true);
  assert.equal(pack.manifest.blockers.length, 0);
  assert.ok(pack.files['drilling.csv']);
});

test('production pack manifest contains hashes for every generated payload file', async () => {
  const p = await project();
  const e = new MaksterEngineeringCompiler().compile(p);
  const pack = buildProductionPack({ project:p, engineering:e, route:'manual_workshop', packId:'hash-test' });
  const payloadNames = Object.keys(pack.files).filter(name=>name!=='production-pack-manifest.json').sort();
  const manifestNames = pack.manifest.files.map(f=>f.name).sort();
  assert.deepEqual(manifestNames,payloadNames);
  assert.ok(pack.manifest.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256) && f.byteLength>0));
});
