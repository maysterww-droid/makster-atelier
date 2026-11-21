import { randomUUID } from 'node:crypto';
import { canonicalize } from '../../manufacturing-release/src/canonical.js';
import { sha256Text } from '../../manufacturing-release/src/crypto.js';
import type { EnqueueProductionInput, EnqueueProductionResult, MachinePackage, ProductionMachineProfile } from './types.js';
import { PRODUCTION_QUEUE_NAME } from './types.js';

export function releaseManifestHash(manifest: EnqueueProductionInput['release']['manifest']): string {
  return sha256Text(canonicalize(manifest));
}

export function machineProfileHash(machine: ProductionMachineProfile): string {
  return sha256Text(canonicalize({
    id: machine.id,
    organizationId: machine.organizationId,
    name: machine.name,
    manufacturer: machine.manufacturer,
    model: machine.model,
    controller: machine.controller ?? null,
    trust: machine.trust,
    postprocessorId: machine.postprocessorId,
    capability: {
      operations: [...machine.capability.operations].sort(),
      maxPartLengthMm10: machine.capability.maxPartLengthMm10,
      maxPartWidthMm10: machine.capability.maxPartWidthMm10,
      maxPartThicknessMm10: machine.capability.maxPartThicknessMm10,
    },
  }));
}

export function machinePackageHash(pkg: MachinePackage): string {
  return sha256Text(canonicalize({
    packageVersion: pkg.packageVersion,
    postprocessorId: pkg.postprocessorId,
    postprocessorVersion: pkg.postprocessorVersion,
    postprocessorTrust: pkg.postprocessorTrust,
    machineId: pkg.machineId,
    releaseId: pkg.releaseId,
    projectId: pkg.projectId,
    revision: pkg.revision,
    machineExecutable: pkg.machineExecutable,
    files: pkg.files.map((f) => ({ name: f.name, mediaType: f.mediaType, sha256: f.sha256, byteLength: f.byteLength })),
    warnings: pkg.warnings,
  }));
}

export function enqueueProduction(input: EnqueueProductionInput): EnqueueProductionResult {
  const manifest = input.release.manifest;
  if (!manifest.canReleaseToCnc || manifest.status !== 'signed' || !manifest.signature) throw new Error('signed_release_required');
  if (!manifest.approvalReady || !manifest.approval) throw new Error('approved_release_required');
  if (input.machine.trust !== 'verified' && input.machine.trust !== 'test_only') throw new Error('machine_not_verified');
  if (input.machine.postprocessorId !== input.postprocessor.id) throw new Error('machine_postprocessor_mismatch');
  if (!/^[0-9a-f]{64}$/.test(input.postprocessor.artifactSha256)) throw new Error('postprocessor_artifact_hash_required');

  const machinePackage = input.postprocessor.compile({ release: input.release, engineering: input.engineering, machine: input.machine });
  if (!machinePackage.machineExecutable) throw new Error('postprocessor_not_machine_executable');
  if (machinePackage.warnings.some((w) => w.startsWith('unsupported_operation:') || w.startsWith('part_too_'))) throw new Error('machine_capability_mismatch');
  if (input.machine.trust === 'verified' && input.postprocessor.trust !== 'verified') throw new Error('verified_machine_requires_verified_postprocessor');
  if (input.machine.trust === 'test_only' && input.postprocessor.trust !== 'test_only') throw new Error('test_machine_requires_test_postprocessor');

  const jobId = input.jobId ?? randomUUID();
  const maxAttempts = input.maxAttempts ?? 5;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) throw new Error('invalid_max_attempts');
  return {
    machinePackage,
    job: {
      id: jobId,
      organizationId: input.organizationId,
      projectId: manifest.projectId,
      revision: manifest.revision,
      releaseId: manifest.releaseId,
      approvalId: manifest.approval.approvalId,
      machineId: input.machine.id,
      machineProfileSha256: machineProfileHash(input.machine),
      postprocessorId: input.postprocessor.id,
      postprocessorVersion: input.postprocessor.version,
      postprocessorArtifactSha256: input.postprocessor.artifactSha256,
      status: 'queued',
      createdAt: (input.now ?? new Date()).toISOString(),
      releaseManifestSha256: releaseManifestHash(manifest),
      machinePackageSha256: machinePackageHash(machinePackage),
      attemptCount: 0,
      maxAttempts,
      message: { queue: PRODUCTION_QUEUE_NAME, jobId, releaseId: manifest.releaseId, machineId: input.machine.id },
    },
  };
}
