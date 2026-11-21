import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { BuiltReleasePackage } from '../../manufacturing-release/src/types.js';
import type { MachinePostprocessor, ProductionMachineProfile, ProductionQueueJob } from '../../production-control/src/types.js';

export const PRODUCTION_WORKER_VERSION = '0.9.0' as const;
export const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 300;

export type WorkerFailureCode =
  | 'RELEASE_VERIFICATION_FAILED'
  | 'RELEASE_HASH_MISMATCH'
  | 'APPROVAL_BINDING_MISMATCH'
  | 'MACHINE_IDENTITY_MISMATCH'
  | 'MACHINE_PROFILE_DRIFT'
  | 'POSTPROCESSOR_IDENTITY_MISMATCH'
  | 'POSTPROCESSOR_ARTIFACT_DRIFT'
  | 'MACHINE_PACKAGE_DRIFT'
  | 'MACHINE_NOT_LIVE_VERIFIED'
  | 'POSTPROCESSOR_NOT_LIVE_VERIFIED'
  | 'POSTPROCESSOR_COMPILE_FAILED'
  | 'ARTIFACT_CONFLICT'
  | 'ARTIFACT_WRITE_FAILED'
  | 'LEASE_LOST'
  | 'CONTEXT_LOAD_FAILED'
  | 'UNKNOWN_WORKER_ERROR';

export interface ProductionWorkerClaim {
  job: ProductionQueueJob;
  messageId: number;
  readCount: number;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: string;
}

export interface ProductionWorkerContext {
  release: BuiltReleasePackage;
  engineering: EngineeringCompileResult;
  releasePublicKeyPem: string;
  machine: ProductionMachineProfile;
  postprocessor: MachinePostprocessor;
}

export interface WorkerArtifactInput {
  path: string;
  fileName: string;
  mediaType: string;
  content: string;
  sha256: string;
  byteLength: number;
}

export interface WorkerArtifactRecord {
  path: string;
  fileName: string;
  mediaType: string;
  sha256: string;
  byteLength: number;
  storedAt: string;
}

export interface WorkerRunResult {
  status: 'idle' | 'completed' | 'retry_scheduled' | 'failed';
  jobId?: string;
  attemptCount?: number;
  artifactCount?: number;
  failureCode?: WorkerFailureCode;
  error?: string;
  retryDelaySeconds?: number;
}

export interface ProductionWorkerBackend {
  claimNext(workerId: string, visibilityTimeoutSeconds: number): Promise<ProductionWorkerClaim | null>;
  loadContext(claim: ProductionWorkerClaim): Promise<ProductionWorkerContext>;
  markProcessing(claim: ProductionWorkerClaim): Promise<void>;
  heartbeat(claim: ProductionWorkerClaim, visibilityTimeoutSeconds: number): Promise<void>;
  putArtifact(claim: ProductionWorkerClaim, artifact: WorkerArtifactInput): Promise<WorkerArtifactRecord>;
  complete(claim: ProductionWorkerClaim, artifacts: WorkerArtifactRecord[]): Promise<void>;
  retry(claim: ProductionWorkerClaim, code: WorkerFailureCode, error: string, delaySeconds: number): Promise<void>;
  failTerminal(claim: ProductionWorkerClaim, code: WorkerFailureCode, error: string): Promise<void>;
}

export interface ProductionWorkerOptions {
  workerId: string;
  visibilityTimeoutSeconds?: number;
  allowTestOnly?: boolean;
  retryBaseSeconds?: number;
  retryMaxSeconds?: number;
}
