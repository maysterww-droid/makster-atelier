import { generateKeyPairSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider } from '../../../packages/engineering-engine/src/index.js';
import { buildReleasePackage, publicKeyPemFromPrivate } from '../../../packages/manufacturing-release/src/index.js';
import { createProductionApprovalRequest, decideProductionApproval, enqueueProduction, MaksterNeutralCncPostprocessor, TestVerifiedMachinePostprocessor, } from '../../../packages/production-control/src/index.js';
const out = resolve(process.argv[2] ?? 'engineering-output/production-control-demo');
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile(resolve('packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(project);
const releaseId = '00000000-0000-4000-8000-000000000808';
const preview = buildReleasePackage({ engineering, releaseId, now: new Date('2026-09-03T09:30:00Z') });
const request = createProductionApprovalRequest({
    manifest: preview.manifest,
    requestedBy: 'TEST-ONLY-requester',
    requestId: '00000000-0000-4000-8000-000000000818',
    now: new Date('2026-09-03T09:31:00Z'),
    reason: 'TEST ONLY: prove approval binding',
});
const authorization = decideProductionApproval({
    request,
    decision: {
        requestId: request.id,
        decision: 'approved',
        actorId: 'TEST-ONLY-technologist',
        actorRole: 'technologist',
        decidedAt: '2026-09-03T09:32:00.000Z',
    },
});
const pair = generateKeyPairSync('ed25519');
const privateKeyPem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const release = buildReleasePackage({
    engineering,
    releaseId,
    approval: authorization,
    signer: { keyId: 'TEST-ONLY-PRODUCTION-KEY', privateKeyPem },
    now: new Date('2026-09-03T09:33:00Z'),
});
const neutralPost = new MaksterNeutralCncPostprocessor();
const neutralMachine = {
    id: 'neutral-preview', organizationId: 'TEST-ORG', name: 'Neutral preview', manufacturer: 'Makster', model: 'Neutral CNC IR',
    trust: 'test_only', postprocessorId: neutralPost.id,
    capability: { operations: ['drill', 'hinge_cup', 'groove'], maxPartLengthMm10: 50000, maxPartWidthMm10: 30000, maxPartThicknessMm10: 1000 },
};
const neutralPackage = neutralPost.compile({ release, engineering, machine: neutralMachine });
const testPost = new TestVerifiedMachinePostprocessor();
const testMachine = {
    id: 'TEST-ONLY-MACHINE', organizationId: 'TEST-ORG', name: 'TEST ONLY Virtual CNC', manufacturer: 'Makster Test Lab', model: 'Virtual CNC 0.8',
    trust: 'test_only', postprocessorId: testPost.id,
    capability: { operations: ['drill', 'hinge_cup', 'groove'], maxPartLengthMm10: 50000, maxPartWidthMm10: 30000, maxPartThicknessMm10: 1000 },
};
const queued = enqueueProduction({ organizationId: 'TEST-ORG', release, engineering, machine: testMachine, postprocessor: testPost, jobId: '00000000-0000-4000-8000-000000000828', now: new Date('2026-09-03T09:34:00Z') });
await writeFile(resolve(out, '01-release-preview.json'), JSON.stringify(preview.manifest, null, 2) + '\n');
await writeFile(resolve(out, '02-approval-request.json'), JSON.stringify(request, null, 2) + '\n');
await writeFile(resolve(out, '03-approval-authorization.json'), JSON.stringify(authorization, null, 2) + '\n');
await writeFile(resolve(out, '04-signed-release.json'), JSON.stringify(release.manifest, null, 2) + '\n');
await writeFile(resolve(out, '05-neutral-machine-preview.json'), JSON.stringify({ ...neutralPackage, files: neutralPackage.files.map(({ content, ...meta }) => meta) }, null, 2) + '\n');
await writeFile(resolve(out, '06-production-queue-job.json'), JSON.stringify(queued.job, null, 2) + '\n');
await writeFile(resolve(out, '07-test-machine-package.json'), JSON.stringify({ ...queued.machinePackage, files: queued.machinePackage.files.map(({ content, ...meta }) => meta) }, null, 2) + '\n');
for (const f of queued.machinePackage.files)
    await writeFile(resolve(out, f.name), f.content);
await writeFile(resolve(out, 'TEST_ONLY_release-public-key.pem'), publicKeyPemFromPrivate(privateKeyPem));
console.log(JSON.stringify({ out, releaseStatus: release.manifest.status, approvalReady: release.manifest.approvalReady, canReleaseToCnc: release.manifest.canReleaseToCnc, queueStatus: queued.job.status, machineExecutable: queued.machinePackage.machineExecutable }, null, 2));
