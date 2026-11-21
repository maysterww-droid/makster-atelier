import { createHash } from 'node:crypto';
import { BXF_INTELLIGENCE_VERSION } from './types.js';
import { parseSafeXml, walkXml } from './xml.js';
function sha256(value) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}
function fingerprint(root) {
    const names = new Set();
    const attrs = new Set();
    walkXml(root, (node) => {
        names.add(node.localName.toLowerCase());
        Object.keys(node.attributes).forEach((key) => attrs.add(key.toLowerCase()));
    });
    return sha256(JSON.stringify({ root: root.localName.toLowerCase(), names: [...names].sort(), attrs: [...attrs].sort() }));
}
const SKU_KEYS = /(article|artikel|sku|product|part|order|code|number|nummer|item)/i;
const DRILL_KEYS = /(drill|bore|hole|bohr|boring|machin|processing)/i;
const NUMERIC_KEYS = /(x|y|z|diam|diameter|depth|position|pos|distance|offset|length)/i;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9.\-_/]{3,30}$/i;
function collectCandidates(root) {
    const skus = [];
    const drillings = [];
    const namespaceUris = new Set();
    const seenSku = new Set();
    walkXml(root, (node, path) => {
        for (const [key, value] of Object.entries(node.attributes)) {
            if (key === 'xmlns' || key.startsWith('xmlns:'))
                namespaceUris.add(value);
            if (SKU_KEYS.test(key) && SKU_PATTERN.test(value) && !seenSku.has(value)) {
                seenSku.add(value);
                skus.push({ value, path: `${path}/@${key}`, confidence: 0.72 });
            }
        }
        if (SKU_KEYS.test(node.localName) && SKU_PATTERN.test(node.text) && !seenSku.has(node.text)) {
            seenSku.add(node.text);
            skus.push({ value: node.text, path, confidence: 0.68 });
        }
        if (DRILL_KEYS.test(node.localName) || Object.keys(node.attributes).some((key) => DRILL_KEYS.test(key))) {
            const numericValues = {};
            for (const [key, value] of Object.entries(node.attributes)) {
                if (!NUMERIC_KEYS.test(key))
                    continue;
                const number = Number(value.replace(',', '.'));
                if (Number.isFinite(number))
                    numericValues[key] = number;
            }
            for (const child of node.children) {
                if (!NUMERIC_KEYS.test(child.localName))
                    continue;
                const number = Number(child.text.replace(',', '.'));
                if (Number.isFinite(number))
                    numericValues[child.localName] = number;
            }
            drillings.push({ path, tag: node.localName, attributes: node.attributes, numericValues, confidence: Object.keys(numericValues).length >= 2 ? 0.65 : 0.35 });
        }
    });
    return { skus, drillings, namespaceUris: [...namespaceUris] };
}
export function inspectBxf(input) {
    const checksum = sha256(input.xml);
    let root;
    try {
        root = parseSafeXml(input.xml);
    }
    catch (error) {
        return {
            parserVersion: BXF_INTELLIGENCE_VERSION,
            fileName: input.fileName,
            byteLength: Buffer.byteLength(input.xml, 'utf8'),
            sha256: checksum,
            namespaceUris: [],
            status: 'rejected',
            candidateSkus: [],
            candidateDrillings: [],
            warnings: [error instanceof Error ? error.message : String(error)],
        };
    }
    const schemaFingerprint = fingerprint(root);
    const candidates = collectCandidates(root);
    const adapters = input.adapters ?? [];
    for (const adapter of adapters) {
        const result = adapter.extract(root, { sha256: checksum, schemaFingerprint });
        if (result.recognized) {
            return {
                parserVersion: BXF_INTELLIGENCE_VERSION,
                fileName: input.fileName,
                byteLength: Buffer.byteLength(input.xml, 'utf8'),
                sha256: checksum,
                rootElement: root.name,
                namespaceUris: candidates.namespaceUris,
                schemaFingerprint,
                status: 'recognized',
                adapter: result,
                candidateSkus: candidates.skus,
                candidateDrillings: candidates.drillings,
                warnings: result.warnings,
            };
        }
    }
    return {
        parserVersion: BXF_INTELLIGENCE_VERSION,
        fileName: input.fileName,
        byteLength: Buffer.byteLength(input.xml, 'utf8'),
        sha256: checksum,
        rootElement: root.name,
        namespaceUris: candidates.namespaceUris,
        schemaFingerprint,
        status: 'inspection_only',
        candidateSkus: candidates.skus,
        candidateDrillings: candidates.drillings,
        warnings: [
            'BXF XML parsed safely, but no trusted schema adapter recognized this structure.',
            'No manufacturing profile may be marked manufacturer_bxf until a Blum-provided interface specification or validated adapter is installed.',
        ],
    };
}
