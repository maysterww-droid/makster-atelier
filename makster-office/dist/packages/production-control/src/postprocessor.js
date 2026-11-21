import { canonicalize } from '../../manufacturing-release/src/canonical.js';
import { sha256Text } from '../../manufacturing-release/src/crypto.js';
function machineCompatibilityErrors(engineering, machine) {
    const errors = [];
    const allowed = new Set(machine.capability.operations);
    for (const op of engineering.machining) {
        if (!allowed.has(op.kind))
            errors.push(`unsupported_operation:${op.kind}:${op.id}`);
    }
    for (const part of engineering.parts) {
        if (part.length > machine.capability.maxPartLengthMm10)
            errors.push(`part_too_long:${part.id}`);
        if (part.width > machine.capability.maxPartWidthMm10)
            errors.push(`part_too_wide:${part.id}`);
        if (part.thickness > machine.capability.maxPartThicknessMm10)
            errors.push(`part_too_thick:${part.id}`);
    }
    return errors;
}
/**
 * Safe intermediate representation. It is intentionally NOT machine executable.
 * It proves postprocessor plumbing without pretending to know a proprietary controller format.
 */
export class MaksterNeutralCncPostprocessor {
    id = 'makster-neutral-cnc-v1';
    version = '1.0.0';
    trust = 'preview_only';
    machineExecutable = false;
    artifactSha256 = sha256Text('makster-neutral-cnc-v1@1.0.0');
    compile(input) {
        const warnings = machineCompatibilityErrors(input.engineering, input.machine);
        const payload = {
            format: 'makster-neutral-cnc-ir',
            version: '1.0.0',
            releaseId: input.release.manifest.releaseId,
            projectId: input.engineering.projectId,
            revision: input.engineering.revision,
            machine: {
                id: input.machine.id,
                manufacturer: input.machine.manufacturer,
                model: input.machine.model,
            },
            parts: input.engineering.parts.map((p) => ({
                id: p.id,
                lengthMm10: p.length,
                widthMm10: p.width,
                thicknessMm10: p.thickness,
            })),
            operations: input.engineering.machining.map((op) => ({
                id: op.id,
                targetPartId: op.targetPartId,
                kind: op.kind,
                face: op.face,
                xMm10: op.x,
                yMm10: op.y,
                ...(op.diameter != null ? { diameterMm10: op.diameter } : {}),
                ...(op.depth != null ? { depthMm10: op.depth } : {}),
                ...(op.length != null ? { lengthMm10: op.length } : {}),
                ...(op.toolWidth != null ? { toolWidthMm10: op.toolWidth } : {}),
            })),
        };
        const content = JSON.stringify(payload, null, 2) + '\n';
        return {
            packageVersion: '1.0.0',
            postprocessorId: this.id,
            postprocessorVersion: this.version,
            postprocessorTrust: this.trust,
            machineId: input.machine.id,
            releaseId: input.release.manifest.releaseId,
            projectId: input.engineering.projectId,
            revision: input.engineering.revision,
            machineExecutable: false,
            files: [{
                    name: 'makster-neutral-cnc.json',
                    mediaType: 'application/json',
                    content,
                    sha256: sha256Text(content),
                    byteLength: Buffer.byteLength(content, 'utf8'),
                }],
            warnings: [...warnings, 'preview_only_postprocessor_not_machine_executable'],
        };
    }
}
/** TEST ONLY. Used to prove queue/release mechanics. Never register in production. */
export class TestVerifiedMachinePostprocessor {
    id = 'TEST_ONLY_verified-machine-v1';
    version = '1.0.0';
    trust = 'test_only';
    machineExecutable = true;
    artifactSha256 = sha256Text('TEST_ONLY_verified-machine-v1@1.0.0');
    compile(input) {
        const warnings = machineCompatibilityErrors(input.engineering, input.machine);
        const rows = ['part_id,operation,face,x_mm,y_mm,diameter_mm,depth_mm'];
        for (const op of input.engineering.machining) {
            rows.push([
                op.targetPartId,
                op.kind,
                op.face,
                (op.x / 10).toFixed(1),
                (op.y / 10).toFixed(1),
                op.diameter == null ? '' : (op.diameter / 10).toFixed(1),
                op.depth == null ? '' : (op.depth / 10).toFixed(1),
            ].join(','));
        }
        const content = rows.join('\n') + '\n';
        const meta = canonicalize({ machine: input.machine.id, release: input.release.manifest.releaseId, sha256: sha256Text(content) });
        return {
            packageVersion: '1.0.0',
            postprocessorId: this.id,
            postprocessorVersion: this.version,
            postprocessorTrust: this.trust,
            machineId: input.machine.id,
            releaseId: input.release.manifest.releaseId,
            projectId: input.engineering.projectId,
            revision: input.engineering.revision,
            machineExecutable: true,
            files: [
                { name: 'TEST_ONLY_machine_program.csv', mediaType: 'text/csv', content, sha256: sha256Text(content), byteLength: Buffer.byteLength(content, 'utf8') },
                { name: 'TEST_ONLY_machine_program.meta', mediaType: 'text/plain', content: meta + '\n', sha256: sha256Text(meta + '\n'), byteLength: Buffer.byteLength(meta + '\n', 'utf8') },
            ],
            warnings,
        };
    }
}
