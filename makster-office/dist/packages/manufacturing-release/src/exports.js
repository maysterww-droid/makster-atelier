function csvCell(value) {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function csv(rows) { return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n'; }
function mm10(value) { return (value / 10).toFixed(1); }
export function engineeringExportFiles(result, bxfReport) {
    const files = {};
    files['engineering.json'] = JSON.stringify(result, null, 2) + '\n';
    if (bxfReport)
        files['bxf-import-report.json'] = JSON.stringify(bxfReport, null, 2) + '\n';
    files['cutlist.csv'] = csv([
        ['part_id', 'name', 'kind', 'qty', 'length_mm', 'width_mm', 'thickness_mm', 'material_selection_id', 'grain', 'estimated', 'edges'],
        ...result.parts.map((part) => [
            part.id, part.name, part.kind, part.quantity, mm10(Number(part.length)), mm10(Number(part.width)), mm10(Number(part.thickness)),
            part.materialSelectionId ?? '', part.grainDirection, part.estimated,
            part.edges.map((edge) => `${edge.side}:${edge.thickness ? mm10(Number(edge.thickness)) + 'mm' : ''}${edge.materialSelectionId ? ':' + edge.materialSelectionId : ''}`).join('|'),
        ]),
    ]);
    files['hardware.csv'] = csv([
        ['requirement_id', 'name', 'role', 'qty', 'unit', 'length_mm', 'hardware_selection_id', 'estimated', 'note'],
        ...result.hardware.map((item) => [
            item.id, item.name, item.role, item.quantity, item.unit, item.length ? mm10(Number(item.length)) : '',
            item.hardwareSelectionId ?? '', item.estimated, item.note ?? '',
        ]),
    ]);
    files['machining.csv'] = csv([
        ['operation_id', 'kind', 'target_part_id', 'face', 'x_mm', 'y_mm', 'diameter_mm', 'depth_mm', 'length_mm', 'tool_width_mm', 'verification_source', 'manufacturer', 'hardware_code', 'catalog_version', 'source_sha256', 'schema_fingerprint', 'adapter_id', 'manual_verification_id', 'hardware_selection_id', 'estimated', 'reference', 'note'],
        ...result.machining.map((op) => [
            op.id, op.kind, op.targetPartId, op.face, mm10(Number(op.x)), mm10(Number(op.y)),
            op.diameter ? mm10(Number(op.diameter)) : '', op.depth ? mm10(Number(op.depth)) : '',
            op.length ? mm10(Number(op.length)) : '', op.toolWidth ? mm10(Number(op.toolWidth)) : '', op.verificationSource ?? '',
            op.verificationDetail?.manufacturer ?? '', op.verificationDetail?.hardwareCode ?? '', op.verificationDetail?.catalogVersion ?? '',
            op.verificationDetail?.sourceChecksumSha256 ?? '', op.verificationDetail?.schemaFingerprint ?? '', op.verificationDetail?.adapterId ?? '',
            op.verificationDetail?.manualVerificationId ?? '', op.hardwareSelectionId ?? '', op.estimated, op.reference ?? '', op.note ?? '',
        ]),
    ]);
    files['issues.csv'] = csv([
        ['issue_id', 'severity', 'category', 'code', 'message', 'furniture_id', 'module_id', 'target_id'],
        ...result.issues.map((item) => [item.id, item.severity, item.category, item.code, item.message, item.furnitureId ?? '', item.moduleId ?? '', item.targetId ?? '']),
    ]);
    files['cnc-blockers.csv'] = csv([
        ['code', 'message', 'target_id', 'hardware_selection_id'],
        ...result.cncRelease.blockers.map((item) => [item.code, item.message, item.targetId ?? '', item.hardwareSelectionId ?? '']),
    ]);
    return files;
}
