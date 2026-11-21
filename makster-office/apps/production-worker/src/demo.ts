import { generateKeyPairSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectModelV1 } from '../../../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider } from '../../../packages/engineering-engine/src/index.js';
import { buildReleasePackage } from '../../../packages/manufacturing-release/src/index.js';
import { createProductionApprovalRequest, decideProductionApproval, enqueueProduction, TestVerifiedMachinePostprocessor, type ProductionMachineProfile } from '../../../packages/production-control/src/index.js';
import { InMemoryProductionWorkerBackend, ProductionWorker } from '../../../packages/production-worker/src/index.js';

const out = process.argv[2] ?? 'engineering-output/production-worker-demo';
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile('packages/project-model/examples/wardrobe.blum.v1.json','utf8')) as ProjectModelV1;
const engineering = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider()).compile(project);
const pair = generateKeyPairSync('ed25519');
const signer = { keyId:'TEST-WORKER-DEMO', privateKeyPem: pair.privateKey.export({type:'pkcs8',format:'pem'}).toString() };
const publicKeyPem = pair.publicKey.export({type:'spki',format:'pem'}).toString();
const preview = buildReleasePackage({ engineering, releaseId:'release-worker-demo' });
const request = createProductionApprovalRequest({ manifest: preview.manifest, requestedBy:'demo-owner', requestId:'approval-worker-demo' });
const approval = decideProductionApproval({ request, decision:{ requestId:request.id,decision:'approved',actorId:'demo-tech',actorRole:'technologist',decidedAt:'2026-09-03T10:30:00.000Z' } })!;
const release = buildReleasePackage({ engineering, releaseId:preview.manifest.releaseId,approval,signer,now:new Date('2026-09-03T10:31:00Z') });
const postprocessor = new TestVerifiedMachinePostprocessor();
const machine: ProductionMachineProfile = {
  id:'TEST-WORKER-DEMO-MACHINE',organizationId:'00000000-0000-4000-8000-000000000001',name:'TEST ONLY Worker Demo CNC',manufacturer:'Makster Test Lab',model:'Virtual 0.9',trust:'test_only',postprocessorId:postprocessor.id,
  capability:{operations:['drill','hinge_cup','groove'],maxPartLengthMm10:50000,maxPartWidthMm10:30000,maxPartThicknessMm10:1000},
};
const queued = enqueueProduction({ organizationId:machine.organizationId,release,engineering,machine,postprocessor,jobId:'job-worker-demo',now:new Date('2026-09-03T10:32:00Z') });
const backend = new InMemoryProductionWorkerBackend(new Date('2026-09-03T10:33:00Z'));
backend.add(queued,{release,engineering,releasePublicKeyPem:publicKeyPem,machine,postprocessor});
const result = await new ProductionWorker(backend,{workerId:'demo-worker',allowTestOnly:true}).runOnce();
for (const artifact of backend.artifactList()) {
  const content = backend.artifactContent(artifact.path)!;
  await writeFile(join(out,artifact.fileName),content);
}
await writeFile(join(out,'worker-result.json'),JSON.stringify({result,job:backend.getJob(queued.job.id),events:backend.events,artifacts:backend.artifactList()},null,2)+'\n');
console.log(JSON.stringify(result));
