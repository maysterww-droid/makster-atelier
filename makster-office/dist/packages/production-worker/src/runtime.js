import { canonicalize } from '../../manufacturing-release/src/canonical.js';
import { sha256Text } from '../../manufacturing-release/src/crypto.js';
import { verifyReleasePackageFiles } from '../../manufacturing-release/src/verify.js';
import { machinePackageHash, machineProfileHash, releaseManifestHash, } from '../../production-control/src/queue.js';
import { ProductionWorkerError, workerError } from './errors.js';
import { DEFAULT_VISIBILITY_TIMEOUT_SECONDS } from './types.js';
function sanitizeFileName(name) {
    if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..')
        workerError('ARTIFACT_CONFLICT', `unsafe_artifact_name:${name}`);
    return name;
}
function artifactRoot(claim) {
    const j = claim.job;
    return `${j.organizationId}/${j.projectId}/release/${j.releaseId}/machine/${j.machineId}/${j.id}`;
}
function assertContext(claim, context, allowTestOnly) {
    const { job } = claim;
    const { release, engineering, machine, postprocessor } = context;
    const verified = verifyReleasePackageFiles(release.manifest, release.files, context.releasePublicKeyPem);
    if (!verified.ok)
        workerError('RELEASE_VERIFICATION_FAILED', verified.errors.join(','));
    if (releaseManifestHash(release.manifest) !== job.releaseManifestSha256)
        workerError('RELEASE_HASH_MISMATCH', 'release_manifest_sha256_mismatch');
    if (!release.manifest.approval || release.manifest.approval.approvalId !== job.approvalId)
        workerError('APPROVAL_BINDING_MISMATCH', 'approval_id_mismatch');
    if (release.manifest.projectId !== job.projectId || release.manifest.revision !== job.revision || release.manifest.releaseId !== job.releaseId) {
        workerError('RELEASE_HASH_MISMATCH', 'release_identity_mismatch');
    }
    if (engineering.projectId !== job.projectId || engineering.revision !== job.revision)
        workerError('RELEASE_HASH_MISMATCH', 'engineering_identity_mismatch');
    if (machine.id !== job.machineId || machine.postprocessorId !== job.postprocessorId)
        workerError('MACHINE_IDENTITY_MISMATCH', 'machine_or_postprocessor_id_mismatch');
    if (machineProfileHash(machine) !== job.machineProfileSha256)
        workerError('MACHINE_PROFILE_DRIFT', 'machine_profile_sha256_mismatch');
    if (postprocessor.id !== job.postprocessorId || postprocessor.version !== job.postprocessorVersion)
        workerError('POSTPROCESSOR_IDENTITY_MISMATCH', 'postprocessor_id_or_version_mismatch');
    if (postprocessor.artifactSha256 !== job.postprocessorArtifactSha256)
        workerError('POSTPROCESSOR_ARTIFACT_DRIFT', 'postprocessor_artifact_sha256_mismatch');
    if (allowTestOnly) {
        if (machine.trust !== 'verified' && machine.trust !== 'test_only')
            workerError('MACHINE_NOT_LIVE_VERIFIED', `machine_trust:${machine.trust}`);
        if (postprocessor.trust !== 'verified' && postprocessor.trust !== 'test_only')
            workerError('POSTPROCESSOR_NOT_LIVE_VERIFIED', `postprocessor_trust:${postprocessor.trust}`);
    }
    else {
        if (machine.trust !== 'verified')
            workerError('MACHINE_NOT_LIVE_VERIFIED', `machine_trust:${machine.trust}`);
        if (postprocessor.trust !== 'verified')
            workerError('POSTPROCESSOR_NOT_LIVE_VERIFIED', `postprocessor_trust:${postprocessor.trust}`);
    }
    let machinePackage;
    try {
        machinePackage = postprocessor.compile({ release, engineering, machine });
    }
    catch (error) {
        workerError('POSTPROCESSOR_COMPILE_FAILED', error instanceof Error ? error.message : String(error));
    }
    if (!machinePackage.machineExecutable)
        workerError('POSTPROCESSOR_NOT_LIVE_VERIFIED', 'machine_package_not_executable');
    if (machinePackageHash(machinePackage) !== job.machinePackageSha256)
        workerError('MACHINE_PACKAGE_DRIFT', 'machine_package_sha256_mismatch');
    return machinePackage;
}
function machinePackageManifest(claim, pkg) {
    return JSON.stringify({
        manifestVersion: '1.0.0',
        productionWorkerVersion: '0.9.0',
        jobId: claim.job.id,
        organizationId: claim.job.organizationId,
        projectId: claim.job.projectId,
        revision: claim.job.revision,
        releaseId: claim.job.releaseId,
        approvalId: claim.job.approvalId,
        machineId: claim.job.machineId,
        machineProfileSha256: claim.job.machineProfileSha256,
        postprocessorId: claim.job.postprocessorId,
        postprocessorVersion: claim.job.postprocessorVersion,
        postprocessorArtifactSha256: claim.job.postprocessorArtifactSha256,
        releaseManifestSha256: claim.job.releaseManifestSha256,
        machinePackageSha256: claim.job.machinePackageSha256,
        files: pkg.files.map((f) => ({ name: f.name, mediaType: f.mediaType, sha256: f.sha256, byteLength: f.byteLength })),
    }, null, 2) + '\n';
}
function outputArtifacts(claim, pkg) {
    const root = artifactRoot(claim);
    const files = pkg.files.map((file) => ({
        path: `${root}/${sanitizeFileName(file.name)}`,
        fileName: file.name,
        mediaType: file.mediaType,
        content: file.content,
        sha256: file.sha256,
        byteLength: file.byteLength,
    }));
    const manifest = machinePackageManifest(claim, pkg);
    files.push({
        path: `${root}/machine-package-manifest.json`,
        fileName: 'machine-package-manifest.json',
        mediaType: 'application/json',
        content: manifest,
        sha256: sha256Text(manifest),
        byteLength: Buffer.byteLength(manifest, 'utf8'),
    });
    return files;
}
function retryDelay(attempt, base, max) {
    return Math.min(max, base * 2 ** Math.max(0, attempt - 1));
}
export class ProductionWorker {
    backend;
    workerId;
    visibilityTimeoutSeconds;
    allowTestOnly;
    retryBaseSeconds;
    retryMaxSeconds;
    constructor(backend, options) {
        this.backend = backend;
        this.workerId = options.workerId;
        this.visibilityTimeoutSeconds = options.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
        this.allowTestOnly = options.allowTestOnly ?? false;
        this.retryBaseSeconds = options.retryBaseSeconds ?? 30;
        this.retryMaxSeconds = options.retryMaxSeconds ?? 1800;
    }
    async runOnce() {
        const claim = await this.backend.claimNext(this.workerId, this.visibilityTimeoutSeconds);
        if (!claim)
            return { status: 'idle' };
        try {
            await this.backend.markProcessing(claim);
            await this.backend.heartbeat(claim, this.visibilityTimeoutSeconds);
            let context;
            try {
                context = await this.backend.loadContext(claim);
            }
            catch (error) {
                throw new ProductionWorkerError('CONTEXT_LOAD_FAILED', error instanceof Error ? error.message : String(error), true);
            }
            const pkg = assertContext(claim, context, this.allowTestOnly);
            const artifacts = [];
            for (const artifact of outputArtifacts(claim, pkg)) {
                await this.backend.heartbeat(claim, this.visibilityTimeoutSeconds);
                try {
                    artifacts.push(await this.backend.putArtifact(claim, artifact));
                }
                catch (error) {
                    if (error instanceof ProductionWorkerError)
                        throw error;
                    throw new ProductionWorkerError('ARTIFACT_WRITE_FAILED', error instanceof Error ? error.message : String(error), true);
                }
            }
            await this.backend.complete(claim, artifacts);
            return { status: 'completed', jobId: claim.job.id, attemptCount: claim.job.attemptCount, artifactCount: artifacts.length };
        }
        catch (error) {
            const failure = error instanceof ProductionWorkerError
                ? error
                : new ProductionWorkerError('UNKNOWN_WORKER_ERROR', error instanceof Error ? error.message : String(error), false);
            if (failure.retriable && claim.job.attemptCount < claim.job.maxAttempts) {
                const delay = retryDelay(claim.job.attemptCount, this.retryBaseSeconds, this.retryMaxSeconds);
                await this.backend.retry(claim, failure.code, failure.message, delay);
                return { status: 'retry_scheduled', jobId: claim.job.id, attemptCount: claim.job.attemptCount, failureCode: failure.code, error: failure.message, retryDelaySeconds: delay };
            }
            await this.backend.failTerminal(claim, failure.code, failure.message);
            return { status: 'failed', jobId: claim.job.id, attemptCount: claim.job.attemptCount, failureCode: failure.code, error: failure.message };
        }
    }
}
export function workerPackageIdentity(input) {
    return sha256Text(canonicalize({
        jobId: input.claim.job.id,
        releaseManifestSha256: input.claim.job.releaseManifestSha256,
        machineProfileSha256: input.claim.job.machineProfileSha256,
        postprocessorArtifactSha256: input.claim.job.postprocessorArtifactSha256,
    }));
}
