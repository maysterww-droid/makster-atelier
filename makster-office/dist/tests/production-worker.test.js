import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider } from '../packages/engineering-engine/src/index.js';
import { buildReleasePackage } from '../packages/manufacturing-release/src/index.js';
import { createProductionApprovalRequest, decideProductionApproval, enqueueProduction, TestVerifiedMachinePostprocessor, } from '../packages/production-control/src/index.js';
import { InMemoryProductionWorkerBackend, ProductionWorker } from '../packages/production-worker/src/index.js';
async function project() {
    return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
}
function testMachine(postprocessorId) {
    return {
        id: 'TEST-WORKER-MACHINE-001', organizationId: '00000000-0000-4000-8000-000000000001', name: 'TEST ONLY Worker CNC',
        manufacturer: 'Makster Test Lab', model: 'Virtual CNC 0.9', trust: 'test_only', postprocessorId,
        capability: { operations: ['drill', 'hinge_cup', 'groove'], maxPartLengthMm10: 50000, maxPartWidthMm10: 30000, maxPartThicknessMm10: 1000 },
    };
}
async function queuedFixture() {
    const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(await project());
    const pair = generateKeyPairSync('ed25519');
    const signer = { keyId: 'TEST-WORKER-KEY', privateKeyPem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
    const publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const preview = buildReleasePackage({ engineering, releaseId: 'release-worker-test' });
    const request = createProductionApprovalRequest({ manifest: preview.manifest, requestedBy: 'owner', requestId: 'approval-worker-test' });
    const approval = decideProductionApproval({ request, decision: { requestId: request.id, decision: 'approved', actorId: 'tech-worker', actorRole: 'technologist', decidedAt: '2026-09-03T10:00:00.000Z' } });
    const release = buildReleasePackage({ engineering, releaseId: preview.manifest.releaseId, approval, signer, now: new Date('2026-09-03T10:01:00Z') });
    const postprocessor = new TestVerifiedMachinePostprocessor();
    const machine = testMachine(postprocessor.id);
    const queued = enqueueProduction({ organizationId: machine.organizationId, release, engineering, machine, postprocessor, jobId: 'job-worker-001', maxAttempts: 3, now: new Date('2026-09-03T10:02:00Z') });
    return { engineering, release, publicKeyPem, postprocessor, machine, queued };
}
test('Production Worker verifies signed release, regenerates package, writes artifacts, then archives message', async () => {
    const f = await queuedFixture();
    const backend = new InMemoryProductionWorkerBackend();
    backend.add(f.queued, { release: f.release, engineering: f.engineering, releasePublicKeyPem: f.publicKeyPem, machine: f.machine, postprocessor: f.postprocessor });
    const worker = new ProductionWorker(backend, { workerId: 'worker-A', allowTestOnly: true });
    const result = await worker.runOnce();
    assert.equal(result.status, 'completed');
    assert.equal(result.artifactCount, 3);
    assert.equal(backend.getJob(f.queued.job.id)?.status, 'completed');
    assert.equal(backend.isArchived(f.queued.job.id), true);
    assert.ok(backend.artifactList().some((a) => a.fileName === 'machine-package-manifest.json'));
});
test('Worker refuses test-only machine in live mode', async () => {
    const f = await queuedFixture();
    const backend = new InMemoryProductionWorkerBackend();
    backend.add(f.queued, { release: f.release, engineering: f.engineering, releasePublicKeyPem: f.publicKeyPem, machine: f.machine, postprocessor: f.postprocessor });
    const result = await new ProductionWorker(backend, { workerId: 'worker-live', allowTestOnly: false }).runOnce();
    assert.equal(result.status, 'failed');
    assert.equal(result.failureCode, 'MACHINE_NOT_LIVE_VERIFIED');
    assert.equal(backend.isArchived(f.queued.job.id), true);
});
test('Tampered signed release is terminal and archived instead of being retried', async () => {
    const f = await queuedFixture();
    const tampered = { ...f.release, files: { ...f.release.files, 'machining.csv': f.release.files['machining.csv'].replace('37.0', '38.0') } };
    const backend = new InMemoryProductionWorkerBackend();
    backend.add(f.queued, { release: tampered, engineering: f.engineering, releasePublicKeyPem: f.publicKeyPem, machine: f.machine, postprocessor: f.postprocessor });
    const result = await new ProductionWorker(backend, { workerId: 'worker-tamper', allowTestOnly: true }).runOnce();
    assert.equal(result.status, 'failed');
    assert.equal(result.failureCode, 'RELEASE_VERIFICATION_FAILED');
    assert.equal(backend.getJob(f.queued.job.id)?.attemptCount, 1);
    assert.equal(backend.isArchived(f.queued.job.id), true);
});
test('Transient artifact storage failure schedules retry; next visibility window completes the same job', async () => {
    const f = await queuedFixture();
    const backend = new InMemoryProductionWorkerBackend();
    backend.failArtifactWrites = 1;
    backend.add(f.queued, { release: f.release, engineering: f.engineering, releasePublicKeyPem: f.publicKeyPem, machine: f.machine, postprocessor: f.postprocessor });
    const worker = new ProductionWorker(backend, { workerId: 'worker-retry', allowTestOnly: true, retryBaseSeconds: 5 });
    const first = await worker.runOnce();
    assert.equal(first.status, 'retry_scheduled');
    assert.equal(first.failureCode, 'ARTIFACT_WRITE_FAILED');
    assert.equal(backend.getJob(f.queued.job.id)?.status, 'queued');
    assert.equal((await worker.runOnce()).status, 'idle');
    backend.advance(5000);
    const second = await worker.runOnce();
    assert.equal(second.status, 'completed');
    assert.equal(backend.getJob(f.queued.job.id)?.attemptCount, 2);
    assert.equal(backend.isArchived(f.queued.job.id), true);
});
test('Postprocessor implementation drift after enqueue is detected before machine files are stored', async () => {
    const f = await queuedFixture();
    const drifted = {
        id: f.postprocessor.id,
        version: f.postprocessor.version,
        trust: f.postprocessor.trust,
        machineExecutable: true,
        artifactSha256: 'f'.repeat(64),
        compile: (input) => f.postprocessor.compile(input),
    };
    const backend = new InMemoryProductionWorkerBackend();
    backend.add(f.queued, { release: f.release, engineering: f.engineering, releasePublicKeyPem: f.publicKeyPem, machine: f.machine, postprocessor: drifted });
    const result = await new ProductionWorker(backend, { workerId: 'worker-drift', allowTestOnly: true }).runOnce();
    assert.equal(result.status, 'failed');
    assert.equal(result.failureCode, 'POSTPROCESSOR_ARTIFACT_DRIFT');
    assert.equal(backend.artifactList().length, 0);
});
