import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../packages/bxf-intelligence/src/index.js';
import { ImportedManufacturingDataProvider, MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';

async function text(path: string): Promise<string> {
  return readFile(new URL('file://' + process.cwd() + '/' + path), 'utf8');
}

test('BXF 0.7 rejects XML with DOCTYPE/ENTITY instead of exposing an XXE parser surface', () => {
  const report = inspectBxf({
    fileName: 'evil.bxf',
    xml: '<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><x>&y;</x>',
  });
  assert.equal(report.status, 'rejected');
  assert.ok(report.warnings.some((item) => item.includes('doctype_or_entity_forbidden')));
});

test('Unknown proprietary-looking XML is inspection-only and never becomes verified manufacturing data', async () => {
  const xml = await text('packages/bxf-intelligence/fixtures/TEST_ONLY_unknown_bxf_like.xml');
  const report = inspectBxf({ fileName: 'unknown.bxf', xml, adapters: [new MaksterFixtureBxfAdapter()] });
  assert.equal(report.status, 'inspection_only');
  assert.ok(report.candidateSkus.some((item) => item.value === '760H5500S'));
  assert.ok(report.candidateDrillings.length > 0);
  assert.equal(report.adapter, undefined);
});

test('Fixture adapter proves BXF -> normalized profile -> CNC pipeline without claiming Blum proprietary schema support', async () => {
  const xml = await text('packages/bxf-intelligence/fixtures/TEST_ONLY_makster_bxf_fixture.xml');
  const report = inspectBxf({ fileName: 'fixture.bxf', xml, adapters: [new MaksterFixtureBxfAdapter()] });
  assert.equal(report.status, 'recognized');
  assert.equal(report.adapter?.adapterId, 'makster-fixture-bxf-v1');
  assert.equal(report.adapter?.manufacturingProfiles.length, 2);
  assert.ok(report.adapter?.manufacturingProfiles.every((profile) => profile.sourceKind === 'fixture_only'));

  const project = JSON.parse(await text('packages/project-model/examples/wardrobe.blum.v1.json')) as ProjectModelV1;
  const provider = new ImportedManufacturingDataProvider(report.adapter!.manufacturingProfiles);
  const result = new MaksterEngineeringCompiler(provider).compile(project);
  assert.equal(result.engineVersion, '0.7.0');
  assert.equal(result.ruleSetId, 'wardrobe-modular-boxes-release-v0.7');
  assert.equal(result.cncReady, true);
  const runnerDrills = result.machining.filter((op) => op.note?.includes('runner fixing'));
  assert.equal(runnerDrills.length, 24);
  assert.ok(runnerDrills.every((op) => op.verificationSource === 'fixture_only'));
  assert.ok(runnerDrills.every((op) => op.verificationDetail?.adapterId === 'makster-fixture-bxf-v1'));
  assert.ok(runnerDrills.every((op) => op.verificationDetail?.sourceChecksumSha256 === report.sha256));
});
