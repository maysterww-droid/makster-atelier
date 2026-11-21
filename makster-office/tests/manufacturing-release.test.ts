import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import {
  ImportedManufacturingDataProvider,
  MaksterEngineeringCompiler,
  ManualVerifiedFixtureManufacturingDataProvider,
} from '../packages/engineering-engine/src/index.js';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../packages/bxf-intelligence/src/index.js';
import {
  buildReleasePackage,
  verifyReleasePackageFiles,
} from '../packages/manufacturing-release/src/index.js';
import { createProductionApprovalRequest, decideProductionApproval } from '../packages/production-control/src/index.js';

async function text(path: string): Promise<string> {
  return readFile(new URL('file://' + process.cwd() + '/' + path), 'utf8');
}
async function project(): Promise<ProjectModelV1> {
  return JSON.parse(await text('packages/project-model/examples/wardrobe.blum.v1.json')) as ProjectModelV1;
}
function testSigner() {
  const pair = generateKeyPairSync('ed25519');
  return {
    signer: {
      keyId: 'TEST-ONLY-KEY',
      privateKeyPem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    },
    publicKeyPem: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

function approve(preview: ReturnType<typeof buildReleasePackage>) {
  const request = createProductionApprovalRequest({
    manifest: preview.manifest,
    requestedBy: 'test-requester',
    requestId: 'approval-test-001',
    now: new Date('2026-09-03T08:01:00Z'),
  });
  return decideProductionApproval({
    request,
    decision: {
      requestId: request.id,
      decision: 'approved',
      actorId: 'test-technologist',
      actorRole: 'technologist',
      decidedAt: '2026-09-03T08:02:00.000Z',
    },
  })!;
}

test('Release Trust blocks fixture-only BXF even when Engineering CNC gate is green', async () => {
  const xml = await text('packages/bxf-intelligence/fixtures/TEST_ONLY_makster_bxf_fixture.xml');
  const bxf = inspectBxf({ fileName: 'fixture.bxf', xml, adapters: [new MaksterFixtureBxfAdapter()] });
  const engineering = new MaksterEngineeringCompiler(new ImportedManufacturingDataProvider(bxf.adapter!.manufacturingProfiles)).compile(await project());
  assert.equal(engineering.cncReady, true);
  const built = buildReleasePackage({ engineering, bxfReport: bxf, now: new Date('2026-09-03T08:00:00Z'), releaseId: 'release-fixture-blocked' });
  assert.equal(built.manifest.status, 'blocked');
  assert.equal(built.manifest.releaseTrustReady, false);
  assert.equal(built.manifest.approvalReady, false);
  assert.equal(built.manifest.canReleaseToCnc, false);
  assert.ok(built.manifest.trust.blockers.some((b) => b.code === 'UNTRUSTED_VERIFICATION_SOURCE'));
});

test('Trusted release must wait for explicit human approval before signing', async () => {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const { signer } = testSigner();
  const preview = buildReleasePackage({ engineering, signer, now: new Date('2026-09-03T08:00:00Z'), releaseId: 'release-awaiting-approval' });
  assert.equal(preview.manifest.status, 'awaiting_approval');
  assert.equal(preview.manifest.releaseTrustReady, true);
  assert.equal(preview.manifest.approvalReady, false);
  assert.equal(preview.manifest.signature, undefined);
  assert.equal(preview.manifest.canReleaseToCnc, false);
});

test('Approved exact release fingerprint can be signed and independently verified', async () => {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const { signer, publicKeyPem } = testSigner();
  const preview = buildReleasePackage({ engineering, now: new Date('2026-09-03T08:00:00Z'), releaseId: 'release-test-signed' });
  const authorization = approve(preview);
  const built = buildReleasePackage({ engineering, signer, approval: authorization, now: new Date('2026-09-03T08:03:00Z'), releaseId: preview.manifest.releaseId });
  assert.equal(built.manifest.status, 'signed');
  assert.equal(built.manifest.approvalReady, true);
  assert.equal(built.manifest.approval?.approvalId, 'approval-test-001');
  assert.equal(built.manifest.canReleaseToCnc, true);
  const verified = verifyReleasePackageFiles(built.manifest, built.files, publicKeyPem);
  assert.deepEqual(verified, { ok: true, errors: [] });
});

test('Approval fingerprint cannot authorize a different release id or changed release draft', async () => {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const { signer } = testSigner();
  const preview = buildReleasePackage({ engineering, releaseId: 'release-approved' });
  const authorization = approve(preview);
  const changed = buildReleasePackage({ engineering, signer, approval: authorization, releaseId: 'release-different' });
  assert.equal(changed.manifest.status, 'awaiting_approval');
  assert.equal(changed.manifest.approvalReady, false);
  assert.equal(changed.manifest.signature, undefined);
});

test('Tampering with machining.csv invalidates an approved signed CNC release package', async () => {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const { signer, publicKeyPem } = testSigner();
  const preview = buildReleasePackage({ engineering, releaseId: 'release-tamper-test' });
  const authorization = approve(preview);
  const built = buildReleasePackage({ engineering, signer, approval: authorization, releaseId: preview.manifest.releaseId });
  const tampered = { ...built.files, 'machining.csv': built.files['machining.csv']!.replace('37.0', '38.0') };
  const verified = verifyReleasePackageFiles(built.manifest, tampered, publicKeyPem);
  assert.equal(verified.ok, false);
  assert.ok(verified.errors.includes('sha256_mismatch:machining.csv'));
});
