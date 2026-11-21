import { createHash } from 'node:crypto';
export function requireMeasured(name, measured) {
    if (measured.value == null)
        throw new Error(`missing_dimension:${name}`);
    return measured.value;
}
export function stableChecksum(project) {
    return createHash('sha256').update(JSON.stringify(project)).digest('hex');
}
export function mm10AreaToMm2(length, width, quantity = 1) {
    return (Number(length) / 10) * (Number(width) / 10) * quantity;
}
export function deterministicId(...parts) {
    return parts.filter((x) => x !== undefined).join(':');
}
