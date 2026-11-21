import { ProductionWorkerError } from '../../../packages/production-worker/src/errors.js';
const BUCKET = 'makster-manufacturing-private';
function encodedStoragePath(path) { return path.split('/').map(encodeURIComponent).join('/'); }
export class SupabaseProductionWorkerBackend {
    url;
    secretKey;
    postprocessors;
    constructor(url, secretKey, postprocessors) {
        this.url = url;
        this.secretKey = secretKey;
        this.postprocessors = postprocessors;
    }
    headers(extra) {
        return {
            apikey: this.secretKey,
            ...(this.secretKey.startsWith('eyJ') ? { Authorization: `Bearer ${this.secretKey}` } : {}),
            ...extra,
        };
    }
    async rpc(name, body) {
        const response = await fetch(`${this.url}/rest/v1/rpc/${name}`, {
            method: 'POST', headers: this.headers({ 'content-type': 'application/json' }), body: JSON.stringify(body),
        });
        if (!response.ok)
            throw new Error(`rpc_${name}_${response.status}:${await response.text()}`);
        return await response.json();
    }
    async select(table, query) {
        const response = await fetch(`${this.url}/rest/v1/${table}?${query}`, { headers: this.headers() });
        if (!response.ok)
            throw new Error(`select_${table}_${response.status}:${await response.text()}`);
        return await response.json();
    }
    async download(path) {
        const response = await fetch(`${this.url}/storage/v1/object/${BUCKET}/${encodedStoragePath(path)}`, { headers: this.headers() });
        if (!response.ok)
            throw new Error(`storage_download_${response.status}:${path}:${await response.text()}`);
        return new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
    }
    async uploadIdempotent(artifact) {
        const target = `${this.url}/storage/v1/object/${BUCKET}/${encodedStoragePath(artifact.path)}`;
        const existing = await fetch(target, { headers: this.headers() });
        if (existing.ok) {
            const bytes = new Uint8Array(await existing.arrayBuffer());
            const text = new TextDecoder().decode(bytes);
            const { sha256Text } = await import('../../../packages/manufacturing-release/src/crypto.js');
            if (sha256Text(text) !== artifact.sha256 || bytes.byteLength !== artifact.byteLength) {
                throw new ProductionWorkerError('ARTIFACT_CONFLICT', `remote_artifact_conflict:${artifact.path}`, false);
            }
            return;
        }
        if (existing.status !== 404 && existing.status !== 400)
            throw new Error(`storage_probe_${existing.status}:${await existing.text()}`);
        const response = await fetch(target, {
            method: 'POST',
            headers: this.headers({ 'content-type': artifact.mediaType, 'x-upsert': 'false' }),
            body: artifact.content,
        });
        if (!response.ok) {
            if (response.status === 409)
                return this.uploadIdempotent(artifact);
            throw new Error(`storage_upload_${response.status}:${artifact.path}:${await response.text()}`);
        }
    }
    async revisionNumber(revisionId) {
        const rows = await this.select('project_revisions', `id=eq.${encodeURIComponent(revisionId)}&select=revision_number&limit=1`);
        if (!rows[0])
            throw new Error('revision_not_found');
        return rows[0].revision_number;
    }
    mapJob(row, revision, messageId) {
        return {
            id: row.id, organizationId: row.organization_id, projectId: row.project_id, revision,
            releaseId: row.release_package_id, approvalId: row.approval_request_id, machineId: row.machine_id,
            machineProfileSha256: row.machine_profile_sha256, postprocessorId: row.postprocessor_id,
            postprocessorVersion: row.postprocessor_version, postprocessorArtifactSha256: row.postprocessor_artifact_sha256,
            status: row.status, createdAt: row.created_at, releaseManifestSha256: row.release_manifest_sha256,
            machinePackageSha256: row.machine_package_sha256, attemptCount: row.attempt_count, maxAttempts: row.max_attempts,
            ...(row.worker_id ? { workerId: row.worker_id } : {}), ...(row.lease_token ? { leaseToken: row.lease_token } : {}),
            ...(row.lease_expires_at ? { leaseExpiresAt: row.lease_expires_at } : {}), ...(row.last_heartbeat_at ? { lastHeartbeatAt: row.last_heartbeat_at } : {}),
            ...(row.processing_started_at ? { processingStartedAt: row.processing_started_at } : {}), ...(row.completed_at ? { completedAt: row.completed_at } : {}),
            ...(row.next_retry_at ? { nextRetryAt: row.next_retry_at } : {}), ...(row.failure_code ? { failureCode: row.failure_code } : {}),
            ...(row.last_error ? { lastError: row.last_error } : {}),
            message: { queue: 'makster-production', jobId: row.id, releaseId: row.release_package_id, machineId: row.machine_id, messageId },
        };
    }
    async claimNext(workerId, visibilityTimeoutSeconds) {
        const raw = await this.rpc('production_worker_claim', { p_worker_id: workerId, p_visibility_timeout_seconds: visibilityTimeoutSeconds });
        if (!raw)
            return null;
        const revision = await this.revisionNumber(raw.job.revision_id);
        return {
            job: this.mapJob(raw.job, revision, Number(raw.messageId)), messageId: Number(raw.messageId), readCount: Number(raw.readCount),
            workerId: raw.workerId, leaseToken: raw.leaseToken, leaseExpiresAt: raw.leaseExpiresAt,
        };
    }
    async loadContext(claim) {
        const releaseRows = await this.select('manufacturing_release_packages', `id=eq.${encodeURIComponent(claim.job.releaseId)}&select=manifest_json,engineering_artifact_id,signing_key_id&limit=1`);
        const releaseRow = releaseRows[0];
        if (!releaseRow)
            throw new Error('release_package_missing');
        const fileRows = await this.select('manufacturing_release_files', `release_package_id=eq.${encodeURIComponent(claim.job.releaseId)}&select=file_name,storage_path,sha256,byte_length,media_type&order=file_name`);
        const files = {};
        for (const file of fileRows)
            files[file.file_name] = await this.download(file.storage_path);
        const release = { manifest: releaseRow.manifest_json, files };
        const engineeringRows = await this.select('engineering_artifacts', `id=eq.${encodeURIComponent(releaseRow.engineering_artifact_id)}&select=result_json&limit=1`);
        const engineering = engineeringRows[0]?.result_json;
        if (!engineering)
            throw new Error('engineering_artifact_missing');
        const keyRows = await this.select('manufacturing_signing_keys', `key_id=eq.${encodeURIComponent(releaseRow.signing_key_id)}&select=public_key_pem,is_active,revoked_at&limit=1`);
        const key = keyRows[0];
        if (!key?.public_key_pem || !key.is_active || key.revoked_at)
            throw new Error('release_public_key_unavailable');
        const machineRows = await this.select('production_machines', `id=eq.${encodeURIComponent(claim.job.machineId)}&select=*&limit=1`);
        const m = machineRows[0];
        if (!m)
            throw new Error('machine_missing');
        const cap = m.capability_json;
        const machine = {
            id: m.id, organizationId: m.organization_id, name: m.name, manufacturer: m.manufacturer, model: m.model,
            ...(m.controller ? { controller: m.controller } : {}), trust: m.trust, postprocessorId: m.postprocessor_id,
            capability: { operations: cap.operations, maxPartLengthMm10: cap.maxPartLengthMm10, maxPartWidthMm10: cap.maxPartWidthMm10, maxPartThicknessMm10: cap.maxPartThicknessMm10 },
        };
        const profileRows = await this.select('machine_postprocessor_profiles', `id=eq.${encodeURIComponent(claim.job.postprocessorId)}&select=id,version,trust,machine_executable,artifact_sha256&limit=1`);
        const profile = profileRows[0];
        if (!profile)
            throw new Error('postprocessor_profile_missing');
        const implementation = this.postprocessors.get(profile.id);
        if (!implementation)
            throw new Error(`postprocessor_implementation_missing:${profile.id}`);
        if (implementation.version !== profile.version || implementation.artifactSha256 !== profile.artifact_sha256)
            throw new Error('postprocessor_registry_profile_mismatch');
        return { release, engineering, releasePublicKeyPem: key.public_key_pem, machine, postprocessor: implementation };
    }
    async markProcessing(claim) {
        await this.rpc('production_worker_mark_processing', { p_job_id: claim.job.id, p_worker_id: claim.workerId, p_lease_token: claim.leaseToken });
    }
    async heartbeat(claim, visibilityTimeoutSeconds) {
        await this.rpc('production_worker_heartbeat', { p_job_id: claim.job.id, p_worker_id: claim.workerId, p_lease_token: claim.leaseToken, p_visibility_timeout_seconds: visibilityTimeoutSeconds });
    }
    async putArtifact(claim, artifact) {
        await this.uploadIdempotent(artifact);
        return { path: artifact.path, fileName: artifact.fileName, mediaType: artifact.mediaType, sha256: artifact.sha256, byteLength: artifact.byteLength, storedAt: new Date().toISOString() };
    }
    async complete(claim, artifacts) {
        await this.rpc('production_worker_complete', { p_job_id: claim.job.id, p_worker_id: claim.workerId, p_lease_token: claim.leaseToken, p_artifacts: artifacts });
    }
    async retry(claim, code, error, delaySeconds) {
        await this.rpc('production_worker_retry', { p_job_id: claim.job.id, p_worker_id: claim.workerId, p_lease_token: claim.leaseToken, p_failure_code: code, p_error: error, p_delay_seconds: delaySeconds });
    }
    async failTerminal(claim, code, error) {
        await this.rpc('production_worker_fail_terminal', { p_job_id: claim.job.id, p_worker_id: claim.workerId, p_lease_token: claim.leaseToken, p_failure_code: code, p_error: error });
    }
}
