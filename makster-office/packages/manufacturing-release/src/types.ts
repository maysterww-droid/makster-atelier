import type { EngineeringCompileResult, MachiningVerificationSource } from '../../engineering-engine/src/types.js';
import type { BxfInspectionReport } from '../../bxf-intelligence/src/types.js';

export const MANUFACTURING_RELEASE_VERSION = '0.8.0' as const;
export const RELEASE_POLICY_VERSION = 'release-trust-v0.8' as const;

export type ReleaseStatus = 'blocked' | 'awaiting_approval' | 'ready_to_sign' | 'signed';

export interface ReleaseTrustBlocker {
  code: string;
  message: string;
  operationId?: string;
  targetPartId?: string;
}

export interface ReleaseTrustResult {
  ready: boolean;
  blockers: ReleaseTrustBlocker[];
  sourceCounts: Partial<Record<MachiningVerificationSource | 'missing', number>>;
}

export interface ReleasePackageFile {
  name: string;
  mediaType: string;
  byteLength: number;
  sha256: string;
}

export interface ReleaseManufacturingSource {
  verificationSource: MachiningVerificationSource;
  manufacturer?: string;
  hardwareCode?: string;
  catalogVersion?: string;
  sourceChecksumSha256?: string;
  schemaFingerprint?: string;
  adapterId?: string;
  manualVerificationId?: string;
  operationCount: number;
}


export interface ReleaseApprovalBinding {
  approvalId: string;
  decision: 'approved';
  approvalFingerprint: string;
  approvedBy: string;
  approvedRole: 'owner' | 'admin' | 'technologist';
  approvedAt: string;
}

export interface ReleaseSignature {
  algorithm: 'Ed25519';
  keyId: string;
  signedPayloadSha256: string;
  signatureBase64: string;
}

export interface CncReleaseManifest {
  manifestVersion: '1.0.0';
  releaseSoftwareVersion: typeof MANUFACTURING_RELEASE_VERSION;
  releasePolicyVersion: typeof RELEASE_POLICY_VERSION;
  releaseId: string;
  projectId: string;
  revision: number;
  createdAt: string;
  status: ReleaseStatus;
  readyForProduction: boolean;
  engineeringCncReady: boolean;
  releaseTrustReady: boolean;
  approvalReady: boolean;
  canReleaseToCnc: boolean;
  engineering: {
    engineVersion: string;
    ruleSetId: string;
    artifactVersion: string;
    inputChecksum: string;
    resultSha256: string;
  };
  bxf?: {
    fileName: string;
    status: BxfInspectionReport['status'];
    sha256: string;
    schemaFingerprint?: string;
    adapterId?: string;
  };
  manufacturingSources: ReleaseManufacturingSource[];
  trust: ReleaseTrustResult;
  approvalFingerprint: string;
  approval?: ReleaseApprovalBinding;
  files: ReleasePackageFile[];
  signature?: ReleaseSignature;
}

export interface ReleaseSigner {
  keyId: string;
  privateKeyPem: string;
}

export interface BuildReleasePackageInput {
  engineering: EngineeringCompileResult;
  bxfReport?: BxfInspectionReport;
  signer?: ReleaseSigner;
  approval?: ReleaseApprovalBinding;
  now?: Date;
  releaseId?: string;
}

export interface BuiltReleasePackage {
  manifest: CncReleaseManifest;
  files: Record<string, string>;
}
