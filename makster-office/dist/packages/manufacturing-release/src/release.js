import { randomUUID } from 'node:crypto';
import { engineeringExportFiles } from './exports.js';
import { canonicalize } from './canonical.js';
import { sha256Text, signCanonicalPayload } from './crypto.js';
import { MANUFACTURING_RELEASE_VERSION, RELEASE_POLICY_VERSION } from './types.js';
const TRUSTED_SOURCES = new Set([
    'makster_rule',
    'manufacturer_catalog',
    'manufacturer_bxf',
    'manual_verified',
]);
function operationTrustBlocker(op) {
    if (op.estimated || op.kind === 'reference_line') {
        return { code: 'UNRESOLVED_MACHINING_OPERATION', message: `Operation ${op.id} is estimated/reference-only`, operationId: op.id, targetPartId: op.targetPartId };
    }
    const source = op.verificationSource;
    if (!source) {
        return { code: 'VERIFICATION_SOURCE_MISSING', message: `Operation ${op.id} has no verification source`, operationId: op.id, targetPartId: op.targetPartId };
    }
    if (!TRUSTED_SOURCES.has(source)) {
        return { code: 'UNTRUSTED_VERIFICATION_SOURCE', message: `Operation ${op.id} uses ${source}, which is forbidden for production release`, operationId: op.id, targetPartId: op.targetPartId };
    }
    const detail = op.verificationDetail;
    if (source === 'manufacturer_bxf') {
        if (!detail?.manufacturer || !detail.hardwareCode || !detail.sourceChecksumSha256 || !detail.schemaFingerprint || !detail.adapterId) {
            return { code: 'BXF_PROVENANCE_INCOMPLETE', message: `Operation ${op.id} lacks complete BXF provenance`, operationId: op.id, targetPartId: op.targetPartId };
        }
    }
    if (source === 'manufacturer_catalog') {
        if (!detail?.manufacturer || !detail.hardwareCode || !detail.catalogVersion) {
            return { code: 'CATALOG_PROVENANCE_INCOMPLETE', message: `Operation ${op.id} lacks manufacturer/catalog provenance`, operationId: op.id, targetPartId: op.targetPartId };
        }
    }
    if (source === 'manual_verified' && !detail?.manualVerificationId) {
        return { code: 'MANUAL_VERIFICATION_ID_MISSING', message: `Operation ${op.id} lacks a manual verification record id`, operationId: op.id, targetPartId: op.targetPartId };
    }
    return null;
}
export function evaluateReleaseTrust(input) {
    const blockers = [];
    const sourceCounts = {};
    if (!input.engineering.readyForProduction)
        blockers.push({ code: 'PRODUCTION_NOT_READY', message: 'Engineering is not ready for production' });
    if (!input.engineering.cncReady)
        blockers.push({ code: 'ENGINEERING_CNC_NOT_READY', message: 'Engineering CNC gate is not ready' });
    for (const op of input.engineering.machining) {
        const key = op.verificationSource ?? 'missing';
        sourceCounts[key] = (sourceCounts[key] ?? 0) + 1;
        const blocker = operationTrustBlocker(op);
        if (blocker)
            blockers.push(blocker);
    }
    if (input.bxfReport?.status === 'recognized' && input.bxfReport.adapter?.manufacturingProfiles.some((p) => p.sourceKind === 'fixture_only')) {
        blockers.push({ code: 'FIXTURE_BXF_CANNOT_RELEASE', message: 'Fixture-only BXF data can test the pipeline but cannot authorize a production CNC release' });
    }
    return { ready: blockers.length === 0, blockers, sourceCounts };
}
function manufacturingSources(ops) {
    const grouped = new Map();
    for (const op of ops) {
        if (!op.verificationSource)
            continue;
        const d = op.verificationDetail;
        const key = [op.verificationSource, d?.manufacturer ?? '', d?.hardwareCode ?? '', d?.catalogVersion ?? '', d?.sourceChecksumSha256 ?? '', d?.adapterId ?? '', d?.manualVerificationId ?? ''].join('|');
        const existing = grouped.get(key);
        if (existing) {
            existing.operationCount++;
            continue;
        }
        grouped.set(key, {
            verificationSource: op.verificationSource,
            ...(d?.manufacturer ? { manufacturer: d.manufacturer } : {}),
            ...(d?.hardwareCode ? { hardwareCode: d.hardwareCode } : {}),
            ...(d?.catalogVersion ? { catalogVersion: d.catalogVersion } : {}),
            ...(d?.sourceChecksumSha256 ? { sourceChecksumSha256: d.sourceChecksumSha256 } : {}),
            ...(d?.schemaFingerprint ? { schemaFingerprint: d.schemaFingerprint } : {}),
            ...(d?.adapterId ? { adapterId: d.adapterId } : {}),
            ...(d?.manualVerificationId ? { manualVerificationId: d.manualVerificationId } : {}),
            operationCount: 1,
        });
    }
    return [...grouped.values()].sort((a, b) => `${a.verificationSource}:${a.hardwareCode ?? ''}`.localeCompare(`${b.verificationSource}:${b.hardwareCode ?? ''}`));
}
export function releaseApprovalFingerprint(input) {
    return sha256Text(canonicalize({
        releasePolicyVersion: RELEASE_POLICY_VERSION,
        releaseId: input.releaseId,
        projectId: input.projectId,
        revision: input.revision,
        engineering: input.engineering,
        ...(input.bxf ? { bxf: input.bxf } : {}),
        manufacturingSources: input.manufacturingSources,
        files: input.files,
    }));
}
function approvalMatches(approval, fingerprint) {
    return !!approval && approval.decision === 'approved' && approval.approvalFingerprint === fingerprint;
}
export function buildReleasePackage(input) {
    const trust = evaluateReleaseTrust(input);
    const files = engineeringExportFiles(input.engineering, input.bxfReport);
    const fileList = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([name, content]) => ({
        name,
        mediaType: name.endsWith('.json') ? 'application/json' : 'text/csv',
        byteLength: Buffer.byteLength(content, 'utf8'),
        sha256: sha256Text(content),
    }));
    const releaseId = input.releaseId ?? randomUUID();
    const engineeringIdentity = {
        engineVersion: input.engineering.engineVersion,
        ruleSetId: input.engineering.ruleSetId,
        artifactVersion: input.engineering.artifactVersion,
        inputChecksum: input.engineering.inputChecksum,
        resultSha256: sha256Text(files['engineering.json']),
    };
    const bxfIdentity = input.bxfReport ? {
        fileName: input.bxfReport.fileName,
        status: input.bxfReport.status,
        sha256: input.bxfReport.sha256,
        ...(input.bxfReport.schemaFingerprint ? { schemaFingerprint: input.bxfReport.schemaFingerprint } : {}),
        ...(input.bxfReport.adapter?.adapterId ? { adapterId: input.bxfReport.adapter.adapterId } : {}),
    } : undefined;
    const sources = manufacturingSources(input.engineering.machining);
    const approvalFingerprint = releaseApprovalFingerprint({
        releaseId,
        projectId: input.engineering.projectId,
        revision: input.engineering.revision,
        engineering: engineeringIdentity,
        ...(bxfIdentity ? { bxf: bxfIdentity } : {}),
        manufacturingSources: sources,
        files: fileList,
    });
    const approvalReady = approvalMatches(input.approval, approvalFingerprint);
    const base = {
        manifestVersion: '1.0.0',
        releaseSoftwareVersion: MANUFACTURING_RELEASE_VERSION,
        releasePolicyVersion: RELEASE_POLICY_VERSION,
        releaseId,
        projectId: input.engineering.projectId,
        revision: input.engineering.revision,
        createdAt: (input.now ?? new Date()).toISOString(),
        status: trust.ready ? (approvalReady ? 'ready_to_sign' : 'awaiting_approval') : 'blocked',
        readyForProduction: input.engineering.readyForProduction,
        engineeringCncReady: input.engineering.cncReady,
        releaseTrustReady: trust.ready,
        approvalReady,
        canReleaseToCnc: false,
        engineering: engineeringIdentity,
        ...(bxfIdentity ? { bxf: bxfIdentity } : {}),
        manufacturingSources: sources,
        trust,
        approvalFingerprint,
        ...(approvalReady && input.approval ? { approval: {
                approvalId: input.approval.approvalId,
                decision: 'approved',
                approvalFingerprint: input.approval.approvalFingerprint,
                approvedBy: input.approval.approvedBy,
                approvedRole: input.approval.approvedRole,
                approvedAt: input.approval.approvedAt,
            } } : {}),
        files: fileList,
    };
    if (trust.ready && approvalReady && input.signer) {
        base.status = 'signed';
        base.canReleaseToCnc = true;
        base.signature = signCanonicalPayload(base, input.signer);
    }
    files['release-manifest.json'] = JSON.stringify(base, null, 2) + '\n';
    files['SHA256SUMS.txt'] = [...fileList, { name: 'release-manifest.json', mediaType: 'application/json', byteLength: Buffer.byteLength(files['release-manifest.json'], 'utf8'), sha256: sha256Text(files['release-manifest.json']) }]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((file) => `${file.sha256}  ${file.name}`)
        .join('\n') + '\n';
    return { manifest: base, files };
}
