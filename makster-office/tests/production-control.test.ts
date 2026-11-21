import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider } from '../packages/engineering-engine/src/index.js';
import { buildReleasePackage } from '../packages/manufacturing-release/src/index.js';
import {
  createProductionApprovalRequest,
  decideProductionApproval,
  enqueueProduction,
  MaksterNeutralCncPostprocessor,
  TestVerifiedMachinePostprocessor,
  type ProductionMachineProfile,
} from '../packages/production-control/src/index.js';

async function project(): Promise<ProjectModelV1> {
  return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8')) as ProjectModelV1;
}

function signer() {
  const pair = generateKeyPairSync('ed25519');
  return { keyId: 'TEST-QUEUE-KEY', privateKeyPem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
}

function testMachine(postprocessorId: string): ProductionMachineProfile {
  return {
    id: 'TEST-MACHINE-001',
    organizationId: '00000000-0000-4000-8000-000000000001',
    name: 'TEST ONLY CNC',
    manufacturer: 'Makster Test Lab',
    model: 'Virtual CNC 0.8',
    trust: 'test_only',
    postprocessorId,
    capability: {
      operations: ['drill', 'hinge_cup', 'groove'],
      maxPartLengthMm10: 40000,
      maxPartWidthMm10: 25000,
      maxPartThicknessMm10: 1000,
    },
  };
}

async function signedRelease() {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const preview = buildReleasePackage({ engineering, releaseId: 'release-queue-test' });
  const request = createProductionApprovalRequest({ manifest: preview.manifest, requestedBy: 'owner', requestId: 'approval-queue-test' });
  const authorization = decideProductionApproval({ request, decision: { requestId: request.id, decision: 'approved', actorId: 'tech-1', actorRole: 'technologist', decidedAt: '2026-09-03T09:00:00.000Z' } })!;
  const release = buildReleasePackage({ engineering, releaseId: preview.manifest.releaseId, approval: authorization, signer: signer() });
  return { engineering, release };
}

test('production operator cannot approve a CNC release; owner/admin/technologist can', async () => {
  const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
  const preview = buildReleasePackage({ engineering, releaseId: 'role-test' });
  const request = createProductionApprovalRequest({ manifest: preview.manifest, requestedBy: 'sales' });
  assert.throws(() => decideProductionApproval({ request, decision: { requestId: request.id, decision: 'approved', actorId: 'operator', actorRole: 'production', decidedAt: new Date().toISOString() } }), /approval_role_not_authorized/);
});

test('preview-only neutral postprocessor cannot be sent to a CNC machine', async () => {
  const { engineering, release } = await signedRelease();
  const post = new MaksterNeutralCncPostprocessor();
  assert.throws(() => enqueueProduction({ organizationId: 'org-test', release, engineering, machine: testMachine(post.id), postprocessor: post }), /postprocessor_not_machine_executable/);
});

test('signed + approved release can enter TEST ONLY production queue with matching TEST postprocessor', async () => {
  const { engineering, release } = await signedRelease();
  const post = new TestVerifiedMachinePostprocessor();
  const result = enqueueProduction({
    organizationId: 'org-test',
    release,
    engineering,
    machine: testMachine(post.id),
    postprocessor: post,
    jobId: 'job-test-001',
    now: new Date('2026-09-03T09:10:00Z'),
  });
  assert.equal(result.job.status, 'queued');
  assert.equal(result.job.message.queue, 'makster-production');
  assert.equal(result.job.approvalId, 'approval-queue-test');
  assert.equal(result.machinePackage.machineExecutable, true);
  assert.equal(result.machinePackage.files.length, 2);
});

test('changing machine/postprocessor pairing blocks production enqueue', async () => {
  const { engineering, release } = await signedRelease();
  const post = new TestVerifiedMachinePostprocessor();
  const machine = testMachine('wrong-postprocessor');
  assert.throws(() => enqueueProduction({ organizationId: 'org-test', release, engineering, machine, postprocessor: post }), /machine_postprocessor_mismatch/);
});
