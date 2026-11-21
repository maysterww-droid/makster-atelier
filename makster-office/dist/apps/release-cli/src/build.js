import crypto, { generateKeyPairSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { ImportedManufacturingDataProvider, MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider, } from '../../../packages/engineering-engine/src/index.js';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../../../packages/bxf-intelligence/src/index.js';
import { buildReleasePackage, publicKeyPemFromPrivate } from '../../../packages/manufacturing-release/src/index.js';
import { createProductionApprovalRequest, decideProductionApproval } from '../../../packages/production-control/src/index.js';
const args = process.argv.slice(2);
const input = args[0];
const outputArg = args[1];
if (!input) {
    console.error('Usage: node build.js <project.json> [output-dir] [--bxf <file>] [--test-manual-verified] [--test-ephemeral-signing-key] [--test-auto-approve]');
    process.exit(2);
}
const bxfIndex = args.indexOf('--bxf');
const bxfPath = bxfIndex >= 0 ? args[bxfIndex + 1] : undefined;
const testManual = args.includes('--test-manual-verified');
const testEphemeralKey = args.includes('--test-ephemeral-signing-key');
const testAutoApprove = args.includes('--test-auto-approve');
const project = JSON.parse(await readFile(resolve(input), 'utf8'));
const outputDir = resolve(outputArg ?? join(process.cwd(), 'engineering-output', `${basename(input, '.json')}-release`));
let bxfReport;
let provider = testManual ? new ManualVerifiedFixtureManufacturingDataProvider() : undefined;
if (bxfPath) {
    const xml = await readFile(resolve(bxfPath), 'utf8');
    bxfReport = inspectBxf({ fileName: basename(bxfPath), xml, adapters: [new MaksterFixtureBxfAdapter()] });
    const profiles = bxfReport.adapter?.manufacturingProfiles ?? [];
    if (profiles.length > 0)
        provider = new ImportedManufacturingDataProvider(profiles);
}
const engineering = new MaksterEngineeringCompiler(provider).compile(project);
let signer;
let publicKeyPem;
const envPrivate = process.env.MAKSTER_CNC_SIGNING_PRIVATE_KEY_PEM;
const envKeyId = process.env.MAKSTER_CNC_SIGNING_KEY_ID;
if (envPrivate && envKeyId) {
    signer = { privateKeyPem: envPrivate.replaceAll('\\n', '\n'), keyId: envKeyId };
    publicKeyPem = publicKeyPemFromPrivate(signer.privateKeyPem);
}
else if (testEphemeralKey) {
    const pair = generateKeyPairSync('ed25519');
    const privateKeyPem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    signer = { keyId: 'TEST-ONLY-EPHEMERAL-ED25519', privateKeyPem };
}
const releaseId = crypto.randomUUID();
const preview = buildReleasePackage({ engineering, ...(bxfReport ? { bxfReport } : {}), releaseId });
let approval;
if (testAutoApprove && preview.manifest.releaseTrustReady) {
    const request = createProductionApprovalRequest({ manifest: preview.manifest, requestedBy: 'TEST-ONLY-CLI', requestId: crypto.randomUUID() });
    approval = decideProductionApproval({ request, decision: { requestId: request.id, decision: 'approved', actorId: 'TEST-ONLY-CLI-TECHNOLOGIST', actorRole: 'technologist', decidedAt: new Date().toISOString() } }) ?? undefined;
}
const built = buildReleasePackage({ engineering, ...(bxfReport ? { bxfReport } : {}), releaseId, ...(approval ? { approval } : {}), ...(signer ? { signer } : {}) });
await mkdir(outputDir, { recursive: true });
for (const [name, content] of Object.entries(built.files))
    await writeFile(join(outputDir, name), content);
if (publicKeyPem)
    await writeFile(join(outputDir, 'release-public-key.pem'), publicKeyPem);
console.log(JSON.stringify({
    ok: true,
    outputDir,
    engineeringCncReady: engineering.cncReady,
    releaseTrustReady: built.manifest.releaseTrustReady,
    releaseStatus: built.manifest.status,
    canReleaseToCnc: built.manifest.canReleaseToCnc,
    trustBlockers: built.manifest.trust.blockers.length,
    signatureKeyId: built.manifest.signature?.keyId ?? null,
    bxfStatus: bxfReport?.status ?? null,
}, null, 2));
