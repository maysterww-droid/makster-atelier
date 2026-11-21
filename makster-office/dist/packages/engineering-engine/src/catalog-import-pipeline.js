const clean = (v) => String(v ?? '').trim();
const low = (v) => clean(v).toLowerCase();
const num = (v) => {
    if (v == null || v === '')
        return;
    const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : undefined;
};
const pick = (row, keys) => {
    for (const k of keys)
        if (row[k] != null && clean(row[k]))
            return row[k];
    const map = new Map(Object.keys(row).map(k => [k.toLowerCase().replace(/[\s_-]+/g, ''), k]));
    for (const k of keys) {
        const hit = map.get(k.toLowerCase().replace(/[\s_-]+/g, ''));
        if (hit && row[hit] != null && clean(row[hit]))
            return row[hit];
    }
};
function csvRows(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim());
    if (!lines.length)
        return [];
    const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
    const parse = (line) => {
        const out = [];
        let cur = '';
        let quote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (quote && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                }
                else
                    quote = !quote;
            }
            else if (ch === delim && !quote) {
                out.push(cur.trim());
                cur = '';
            }
            else
                cur += ch;
        }
        out.push(cur.trim());
        return out;
    };
    const headers = parse(lines[0]);
    return lines.slice(1).map(line => {
        const vals = parse(line);
        const row = {};
        headers.forEach((h, i) => row[h] = vals[i] ?? '');
        return row;
    });
}
function jsonRows(text) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed?.records) ? parsed.records : [parsed];
    return rows.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
}
/**
 * Conservative generic BXF import. We only read explicit Product/Item element attributes.
 * Unknown schemas remain unparsed rather than guessing machining geometry.
 */
function bxfRows(text) {
    const rows = [];
    const rx = /<(?:Product|Item|Hardware|Appliance)\b([^>]*)\/?>/gi;
    for (const m of text.matchAll(rx)) {
        const attrs = {};
        for (const a of m[1].matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g))
            attrs[a[1]] = a[2];
        if (Object.keys(attrs).length)
            rows.push(attrs);
    }
    return rows;
}
function sourceLabel(src, rowIndex) {
    return src.sourceUri ?? `import:${src.importId}:${src.fileName}:row:${rowIndex + 1}`;
}
function normalizeHardware(row, src, rowIndex) {
    const manufacturer = clean(pick(row, ['manufacturer', 'brand', 'maker']) ?? src.manufacturer);
    const family = clean(pick(row, ['family', 'series', 'name', 'product']));
    const code = clean(pick(row, ['code', 'sku', 'article', 'articleNumber', 'partNumber']));
    const roleRaw = low(pick(row, ['role', 'type', 'hardwareType']));
    const role = (['hinge', 'runner', 'lift', 'connector', 'other'].includes(roleRaw) ? roleRaw : 'other');
    if (!manufacturer || (!family && !code))
        return;
    const nominalLengthMm = num(pick(row, ['nominalLengthMm', 'lengthMm', 'nominal_length', 'length']));
    const maxLoadKg = num(pick(row, ['maxDynamicLoadKg', 'capacityKg', 'loadKg', 'load']));
    const maxFrontThicknessMm = num(pick(row, ['maxFrontThicknessMm', 'frontThicknessMaxMm']));
    const drillingProfileId = clean(pick(row, ['drillingProfileId', 'drilling_profile_id']));
    const warnings = [];
    if (role === 'other')
        warnings.push('Hardware role could not be normalized confidently.');
    if (drillingProfileId)
        warnings.push('Imported drilling profile reference is NOT trusted until manufacturer evidence is reviewed.');
    const record = {
        id: `imported:${src.importId}:${rowIndex + 1}`,
        manufacturer, family: family || code, role,
        ...(code ? { code } : {}),
        trust: 'imported_unverified',
        source: sourceLabel(src, rowIndex),
        ...(nominalLengthMm != null || maxLoadKg != null ? { planning: { ...(nominalLengthMm != null ? { nominalLengthMm } : {}), ...(maxLoadKg != null ? { dynamicCapacityKg: maxLoadKg } : {}) } } : {}),
        ...(nominalLengthMm != null || maxLoadKg != null || maxFrontThicknessMm != null ? { compatibility: {
                ...(nominalLengthMm != null ? { nominalLengthMm } : {}),
                ...(maxLoadKg != null ? { maxDynamicLoadKg: maxLoadKg } : {}),
                ...(maxFrontThicknessMm != null ? { maxFrontThicknessMm } : {})
            } } : {}),
        drillingProfile: { status: 'not_imported' },
        notes: 'Imported candidate. Review required before promotion to trusted master catalog.'
    };
    return {
        candidateId: record.id, record, trust: 'imported_unverified',
        sourceEvidence: { importId: src.importId, format: src.format, fileName: src.fileName, ...(src.sourceUri ? { sourceUri: src.sourceUri } : {}), rowIndex },
        confidence: manufacturer && role !== 'other' && code ? 0.82 : 0.62, warnings, productionEligible: false
    };
}
function normalizeAppliance(row, src, rowIndex) {
    const manufacturer = clean(pick(row, ['manufacturer', 'brand', 'maker']) ?? src.manufacturer);
    const model = clean(pick(row, ['model', 'modelNumber', 'sku', 'code', 'article']));
    const kindRaw = low(pick(row, ['kind', 'type', 'applianceType']));
    const kind = (['dishwasher', 'fridge', 'oven', 'hob', 'hood', 'microwave', 'sink', 'other'].includes(kindRaw) ? kindRaw : 'other');
    if (!manufacturer || !model)
        return;
    const installationRaw = low(pick(row, ['installation', 'installationType']));
    const installation = (['cabinet', 'worktop', 'wall', 'sink_cutout'].includes(installationRaw) ? installationRaw : 'cabinet');
    const priceTierRaw = low(pick(row, ['priceTier', 'priceClass', 'segment', 'marketSegment']));
    const priceTier = (['budget', 'mid', 'premium'].includes(priceTierRaw) ? priceTierRaw : 'unknown');
    const nicheWidthMm = num(pick(row, ['nicheWidthMm', 'installationWidthMm', 'niche_width']));
    const nicheHeightMm = num(pick(row, ['nicheHeightMm', 'installationHeightMm', 'niche_height']));
    const minNicheDepthMm = num(pick(row, ['minNicheDepthMm', 'installationDepthMm', 'nicheDepthMm', 'niche_depth']));
    const minVentilationAreaCm2 = num(pick(row, ['minVentilationAreaCm2', 'ventilationAreaCm2', 'ventilation']));
    const warnings = [];
    if (kind === 'other')
        warnings.push('Appliance kind could not be normalized confidently.');
    const compatibility = {
        ...(nicheWidthMm != null ? { nicheWidthMm } : {}),
        ...(nicheHeightMm != null ? { nicheHeightMm } : {}),
        ...(minNicheDepthMm != null ? { minNicheDepthMm } : {}),
        ...(minVentilationAreaCm2 != null ? { minVentilationAreaCm2 } : {}),
    };
    const record = {
        id: `imported:${src.importId}:${rowIndex + 1}`, manufacturer, model, kind, installation,
        trust: 'imported_unverified', source: sourceLabel(src, rowIndex), priceTier,
        ...(Object.keys(compatibility).length ? { compatibility } : {}),
        notes: 'Imported candidate. Manufacturer installation drawing must be reviewed before production use.'
    };
    return {
        candidateId: record.id, record, trust: 'imported_unverified',
        sourceEvidence: { importId: src.importId, format: src.format, fileName: src.fileName, ...(src.sourceUri ? { sourceUri: src.sourceUri } : {}), rowIndex },
        confidence: manufacturer && kind !== 'other' ? 0.8 : 0.6, warnings, productionEligible: false
    };
}
export function importCatalogSource(src) {
    const issues = [];
    let rows = [];
    try {
        if (src.extractedRows?.length)
            rows = src.extractedRows;
        else if (src.format === 'json')
            rows = jsonRows(src.contentText ?? '');
        else if (src.format === 'csv')
            rows = csvRows(src.contentText ?? '');
        else if (src.format === 'bxf')
            rows = bxfRows(src.contentText ?? '');
        else if (src.format === 'pdf' || src.format === 'xlsx') {
            issues.push(`${src.format.toUpperCase()} raw-byte parsing is adapter-driven. Supply extractedRows from a PDF/XLSX extractor; core will not OCR/guess raw documents.`);
        }
    }
    catch (e) {
        issues.push(`Parse failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const candidates = [];
    let rejectedCount = 0;
    rows.forEach((row, i) => {
        const c = src.target === 'hardware' ? normalizeHardware(row, src, i) : normalizeAppliance(row, src, i);
        if (c)
            candidates.push(c);
        else
            rejectedCount++;
    });
    if (!rows.length && !issues.length)
        issues.push('No rows found.');
    if (rejectedCount)
        issues.push(`${rejectedCount} row(s) could not be normalized and remain rejected.`);
    return {
        importId: src.importId, target: src.target, format: src.format,
        parsedCount: candidates.length, rejectedCount, candidates, issues, requiresReview: true
    };
}
export function promoteCatalogCandidate(req) {
    if (!req.reviewedBy.trim())
        throw new Error('catalog_promotion_reviewer_required');
    if ((req.trust === 'manufacturer_verified' || req.trust === 'project_verified') && !req.manufacturerEvidenceConfirmed)
        throw new Error('catalog_promotion_evidence_confirmation_required');
    const record = structuredClone(req.candidate.record);
    record.trust = req.trust;
    if ('drillingProfile' in record && record.drillingProfile) {
        // Imported drilling is never automatically upgraded merely because a row had a profile id.
        if (!req.drillingProfileApproved)
            record.drillingProfile = { status: 'not_imported' };
    }
    record.notes = [record.notes, `Reviewed by ${req.reviewedBy}. Promotion trust: ${req.trust}.`].filter(Boolean).join(' ');
    return record;
}
