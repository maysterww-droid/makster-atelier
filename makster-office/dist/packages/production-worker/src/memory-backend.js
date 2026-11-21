import { randomUUID } from 'node:crypto';
import { sha256Text } from '../../manufacturing-release/src/crypto.js';
import { ProductionWorkerError } from './errors.js';
export class InMemoryProductionWorkerBackend {
    jobs = new Map();
    contexts = new Map();
    queue = [];
    artifacts = new Map();
    events = [];
    messageCounter = 0;
    nowMs;
    failArtifactWrites = 0;
    constructor(now = new Date('2026-09-03T10:00:00.000Z')) { this.nowMs = now.getTime(); }
    now() { return new Date(this.nowMs); }
    advance(ms) { this.nowMs += ms; }
    add(input, context) {
        const job = structuredClone(input.job);
        this.jobs.set(job.id, job);
        this.contexts.set(job.id, context);
        this.queue.push({ messageId: ++this.messageCounter, jobId: job.id, readCount: 0, visibleAt: this.nowMs, archived: false });
        this.events.push({ jobId: job.id, event: 'queued', at: this.now().toISOString() });
    }
    getJob(id) { const j = this.jobs.get(id); return j ? structuredClone(j) : undefined; }
    listJobs() { return [...this.jobs.values()].map((j) => structuredClone(j)); }
    isArchived(jobId) { return !!this.queue.find((q) => q.jobId === jobId)?.archived; }
    artifactList(jobId) {
        const root = jobId ? `/${jobId}/` : '';
        return [...this.artifacts.values()].map((v) => v.record).filter((r) => !jobId || r.path.includes(root));
    }
    artifactContent(path) { return this.artifacts.get(path)?.content; }
    async claimNext(workerId, visibilityTimeoutSeconds) {
        const record = this.queue.find((q) => !q.archived && q.visibleAt <= this.nowMs && ['queued', 'claimed'].includes(this.jobs.get(q.jobId)?.status ?? ''));
        if (!record)
            return null;
        const job = this.jobs.get(record.jobId);
        if (job.status === 'claimed' && job.leaseExpiresAt && Date.parse(job.leaseExpiresAt) > this.nowMs)
            return null;
        record.readCount += 1;
        record.visibleAt = this.nowMs + visibilityTimeoutSeconds * 1000;
        job.status = 'claimed';
        job.attemptCount += 1;
        job.workerId = workerId;
        job.leaseToken = randomUUID();
        job.leaseExpiresAt = new Date(record.visibleAt).toISOString();
        delete job.lastError;
        delete job.failureCode;
        delete job.nextRetryAt;
        this.events.push({ jobId: job.id, event: 'claimed', at: this.now().toISOString(), payload: { workerId, attempt: job.attemptCount } });
        return { job: structuredClone(job), messageId: record.messageId, readCount: record.readCount, workerId, leaseToken: job.leaseToken, leaseExpiresAt: job.leaseExpiresAt };
    }
    assertLease(claim) {
        const job = this.jobs.get(claim.job.id);
        if (!job || job.workerId !== claim.workerId || job.leaseToken !== claim.leaseToken || !job.leaseExpiresAt || Date.parse(job.leaseExpiresAt) <= this.nowMs) {
            throw new ProductionWorkerError('LEASE_LOST', 'worker_lease_lost', true);
        }
        return job;
    }
    async loadContext(claim) {
        this.assertLease(claim);
        const ctx = this.contexts.get(claim.job.id);
        if (!ctx)
            throw new Error('context_missing');
        return ctx;
    }
    async markProcessing(claim) {
        const job = this.assertLease(claim);
        job.status = 'processing';
        job.processingStartedAt ??= this.now().toISOString();
        this.events.push({ jobId: job.id, event: 'processing', at: this.now().toISOString() });
    }
    async heartbeat(claim, visibilityTimeoutSeconds) {
        const job = this.assertLease(claim);
        const record = this.queue.find((q) => q.messageId === claim.messageId && !q.archived);
        if (!record)
            throw new ProductionWorkerError('LEASE_LOST', 'queue_message_missing', true);
        record.visibleAt = this.nowMs + visibilityTimeoutSeconds * 1000;
        job.leaseExpiresAt = new Date(record.visibleAt).toISOString();
        job.lastHeartbeatAt = this.now().toISOString();
        this.events.push({ jobId: job.id, event: 'heartbeat', at: this.now().toISOString() });
    }
    async putArtifact(claim, artifact) {
        this.assertLease(claim);
        if (this.failArtifactWrites > 0) {
            this.failArtifactWrites--;
            throw new Error('simulated_storage_failure');
        }
        if (sha256Text(artifact.content) !== artifact.sha256 || Buffer.byteLength(artifact.content, 'utf8') !== artifact.byteLength) {
            throw new ProductionWorkerError('ARTIFACT_CONFLICT', `artifact_content_hash_mismatch:${artifact.fileName}`, false);
        }
        const existing = this.artifacts.get(artifact.path);
        if (existing) {
            if (existing.record.sha256 !== artifact.sha256 || existing.record.byteLength !== artifact.byteLength) {
                throw new ProductionWorkerError('ARTIFACT_CONFLICT', `artifact_path_conflict:${artifact.path}`, false);
            }
            return existing.record;
        }
        const record = {
            path: artifact.path, fileName: artifact.fileName, mediaType: artifact.mediaType,
            sha256: artifact.sha256, byteLength: artifact.byteLength, storedAt: this.now().toISOString(),
        };
        this.artifacts.set(artifact.path, { record, content: artifact.content });
        this.events.push({ jobId: claim.job.id, event: 'artifact_written', at: this.now().toISOString(), payload: { path: artifact.path, sha256: artifact.sha256 } });
        return record;
    }
    async complete(claim, artifacts) {
        const job = this.assertLease(claim);
        const record = this.queue.find((q) => q.messageId === claim.messageId && !q.archived);
        if (!record)
            throw new ProductionWorkerError('LEASE_LOST', 'queue_message_missing_at_complete', true);
        job.status = 'completed';
        job.completedAt = this.now().toISOString();
        delete job.workerId;
        delete job.leaseToken;
        delete job.leaseExpiresAt;
        record.archived = true;
        this.events.push({ jobId: job.id, event: 'completed', at: this.now().toISOString(), payload: { artifactCount: artifacts.length } });
        this.events.push({ jobId: job.id, event: 'archived', at: this.now().toISOString(), payload: { messageId: record.messageId } });
    }
    async retry(claim, code, error, delaySeconds) {
        const job = this.assertLease(claim);
        const record = this.queue.find((q) => q.messageId === claim.messageId && !q.archived);
        if (!record)
            throw new ProductionWorkerError('LEASE_LOST', 'queue_message_missing_at_retry', true);
        job.status = 'queued';
        job.failureCode = code;
        job.lastError = error;
        job.nextRetryAt = new Date(this.nowMs + delaySeconds * 1000).toISOString();
        delete job.workerId;
        delete job.leaseToken;
        delete job.leaseExpiresAt;
        record.visibleAt = this.nowMs + delaySeconds * 1000;
        this.events.push({ jobId: job.id, event: 'retry', at: this.now().toISOString(), payload: { code, delaySeconds } });
    }
    async failTerminal(claim, code, error) {
        const job = this.assertLease(claim);
        const record = this.queue.find((q) => q.messageId === claim.messageId && !q.archived);
        job.status = 'failed';
        job.failureCode = code;
        job.lastError = error;
        delete job.workerId;
        delete job.leaseToken;
        delete job.leaseExpiresAt;
        if (record)
            record.archived = true;
        this.events.push({ jobId: job.id, event: 'failed', at: this.now().toISOString(), payload: { code } });
        if (record)
            this.events.push({ jobId: job.id, event: 'dead_letter', at: this.now().toISOString(), payload: { messageId: record.messageId, code } });
    }
}
