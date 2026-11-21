import { randomUUID } from 'node:crypto';
import type { CncReleaseManifest } from '../../manufacturing-release/src/types.js';
import type {
  ApprovedReleaseAuthorization,
  ApprovalActorRole,
  ProductionApprovalDecision,
  ProductionApprovalRequest,
} from './types.js';

const APPROVER_ROLES = new Set<ApprovalActorRole>(['owner', 'admin', 'technologist']);

export function createProductionApprovalRequest(input: {
  manifest: CncReleaseManifest;
  requestedBy: string;
  now?: Date;
  requestId?: string;
  reason?: string;
}): ProductionApprovalRequest {
  const { manifest } = input;
  if (!manifest.releaseTrustReady) throw new Error('release_trust_not_ready');
  if (manifest.canReleaseToCnc || manifest.status === 'signed') throw new Error('release_already_signed');
  if (manifest.status !== 'awaiting_approval' && manifest.status !== 'ready_to_sign') throw new Error('release_not_approvable');
  return {
    id: input.requestId ?? randomUUID(),
    projectId: manifest.projectId,
    revision: manifest.revision,
    releaseId: manifest.releaseId,
    approvalFingerprint: manifest.approvalFingerprint,
    requestedBy: input.requestedBy,
    requestedAt: (input.now ?? new Date()).toISOString(),
    status: 'requested',
    ...(input.reason ? { reason: input.reason } : {}),
  };
}

export function decideProductionApproval(input: {
  request: ProductionApprovalRequest;
  decision: ProductionApprovalDecision;
}): ApprovedReleaseAuthorization | null {
  const { request, decision } = input;
  if (request.status !== 'requested') throw new Error('approval_request_not_pending');
  if (decision.requestId !== request.id) throw new Error('approval_request_id_mismatch');
  if (!APPROVER_ROLES.has(decision.actorRole)) throw new Error('approval_role_not_authorized');
  if (decision.decision === 'rejected') return null;
  return {
    approvalId: request.id,
    decision: 'approved',
    approvalFingerprint: request.approvalFingerprint,
    approvedBy: decision.actorId,
    approvedRole: decision.actorRole as 'owner' | 'admin' | 'technologist',
    approvedAt: decision.decidedAt,
    projectId: request.projectId,
    revision: request.revision,
    releaseId: request.releaseId,
  };
}

export function assertAuthorizationMatchesManifest(auth: ApprovedReleaseAuthorization, manifest: CncReleaseManifest): void {
  if (auth.projectId !== manifest.projectId) throw new Error('approval_project_mismatch');
  if (auth.revision !== manifest.revision) throw new Error('approval_revision_mismatch');
  if (auth.releaseId !== manifest.releaseId) throw new Error('approval_release_id_mismatch');
  if (auth.approvalFingerprint !== manifest.approvalFingerprint) throw new Error('approval_fingerprint_mismatch');
}
