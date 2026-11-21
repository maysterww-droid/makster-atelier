import type { CncReleaseManifest } from './types.js';
import { sha256Text, verifyCanonicalPayload } from './crypto.js';

export interface ReleaseVerificationResult {
  ok: boolean;
  errors: string[];
}

export function verifyReleasePackageFiles(manifest: CncReleaseManifest, files: Record<string, string>, publicKeyPem?: string): ReleaseVerificationResult {
  const errors: string[] = [];
  for (const expected of manifest.files) {
    const content = files[expected.name];
    if (content == null) { errors.push(`missing_file:${expected.name}`); continue; }
    if (Buffer.byteLength(content, 'utf8') !== expected.byteLength) errors.push(`byte_length_mismatch:${expected.name}`);
    if (sha256Text(content) !== expected.sha256) errors.push(`sha256_mismatch:${expected.name}`);
  }
  if (manifest.status === 'signed') {
    if (!manifest.signature) errors.push('signature_missing');
    else if (!publicKeyPem) errors.push('public_key_missing');
    else {
      const { signature, ...payload } = manifest;
      if (!verifyCanonicalPayload(payload, signature, publicKeyPem)) errors.push('signature_invalid');
    }
  }
  if (manifest.canReleaseToCnc && manifest.status !== 'signed') errors.push('release_flag_requires_signature');
  if (manifest.canReleaseToCnc && !manifest.releaseTrustReady) errors.push('release_flag_requires_trust');
  if (manifest.canReleaseToCnc && !manifest.approvalReady) errors.push('release_flag_requires_approval');
  if (manifest.approvalReady && !manifest.approval) errors.push('approval_binding_missing');
  if (manifest.approval && manifest.approval.approvalFingerprint !== manifest.approvalFingerprint) errors.push('approval_fingerprint_mismatch');
  return { ok: errors.length === 0, errors };
}
