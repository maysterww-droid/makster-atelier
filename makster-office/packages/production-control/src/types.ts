import type { CncReleaseManifest, BuiltReleasePackage, ReleaseApprovalBinding } from '../../manufacturing-release/src/types.js';
import type { EngineeringCompileResult, MachiningOperationKind } from '../../engineering-engine/src/types.js';

export const PRODUCTION_CONTROL_VERSION = '0.9.0' as const;
export const PRODUCTION_QUEUE_NAME = 'makster-production' as const;

export type ApprovalActorRole = 'owner' | 'admin' | 'technologist' | 'production' | 'viewer';
export type ApprovalStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

export interface ProductionApprovalRequest {
  id: string;
  projectId: string;
  revision: number;
  releaseId: string;
  approvalFingerprint: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  reason?: string;
}

export interface ProductionApprovalDecision {
  requestId: string;
  decision: 'approved' | 'rejected';
  actorId: string;
  actorRole: ApprovalActorRole;
  decidedAt: string;
  note?: string;
}

export interface ApprovedReleaseAuthorization extends ReleaseApprovalBinding {
  projectId: string;
  revision: number;
  releaseId: string;
}

export type MachineTrust = 'verified' | 'test_only' | 'disabled';
export type PostprocessorTrust = 'verified' | 'preview_only' | 'test_only';

export interface MachineCapability {
  operations: MachiningOperationKind[];
  maxPartLengthMm10: number;
  maxPartWidthMm10: number;
  maxPartThicknessMm10: number;
}

export interface ProductionMachineProfile {
  id: string;
  organizationId: string;
  name: string;
  manufacturer: string;
  model: string;
  controller?: string;
  trust: MachineTrust;
  postprocessorId: string;
  capability: MachineCapability;
}

export interface MachineProgramFile {
  name: string;
  mediaType: string;
  content: string;
  sha256: string;
  byteLength: number;
}

export interface MachinePackage {
  packageVersion: '1.0.0';
  postprocessorId: string;
  postprocessorVersion: string;
  postprocessorTrust: PostprocessorTrust;
  machineId: string;
  releaseId: string;
  projectId: string;
  revision: number;
  machineExecutable: boolean;
  files: MachineProgramFile[];
  warnings: string[];
}

export interface MachinePostprocessor {
  id: string;
  version: string;
  trust: PostprocessorTrust;
  machineExecutable: boolean;
  /** Hash of the reviewed postprocessor implementation/artifact. Required for verified live CNC. */
  artifactSha256: string;
  compile(input: {
    release: BuiltReleasePackage;
    engineering: EngineeringCompileResult;
    machine: ProductionMachineProfile;
  }): MachinePackage;
}

export type ProductionQueueJobStatus = 'queued' | 'claimed' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ProductionQueueJob {
  id: string;
  organizationId: string;
  projectId: string;
  revision: number;
  releaseId: string;
  approvalId: string;
  machineId: string;
  machineProfileSha256: string;
  postprocessorId: string;
  postprocessorVersion: string;
  postprocessorArtifactSha256: string;
  status: ProductionQueueJobStatus;
  createdAt: string;
  releaseManifestSha256: string;
  machinePackageSha256: string;
  attemptCount: number;
  maxAttempts: number;
  workerId?: string;
  leaseToken?: string;
  leaseExpiresAt?: string;
  lastHeartbeatAt?: string;
  processingStartedAt?: string;
  completedAt?: string;
  nextRetryAt?: string;
  failureCode?: string;
  lastError?: string;
  message: {
    queue: typeof PRODUCTION_QUEUE_NAME;
    jobId: string;
    releaseId: string;
    machineId: string;
    messageId?: number;
  };
}

export interface EnqueueProductionInput {
  organizationId: string;
  release: BuiltReleasePackage;
  engineering: EngineeringCompileResult;
  machine: ProductionMachineProfile;
  postprocessor: MachinePostprocessor;
  now?: Date;
  jobId?: string;
  maxAttempts?: number;
}

export interface EnqueueProductionResult {
  job: ProductionQueueJob;
  machinePackage: MachinePackage;
}

export interface ReleasePreviewSummary {
  manifest: CncReleaseManifest;
  approval?: ApprovedReleaseAuthorization;
}
