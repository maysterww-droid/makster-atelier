import { validateProjectModel } from './project-model.js';
const FORBIDDEN_PATHS = [
    '/schemaVersion',
    '/projectId',
    '/revision',
    '/unitSystem',
    '/geometryUnit',
    '/coordinateSystem',
];
export class ProjectPatchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProjectPatchError';
    }
}
function decodePointerToken(token) {
    return token.replace(/~1/g, '/').replace(/~0/g, '~');
}
function parsePointer(path) {
    if (!path.startsWith('/'))
        throw new ProjectPatchError(`Invalid JSON Pointer: ${path}`);
    if (FORBIDDEN_PATHS.some((forbidden) => path === forbidden || path.startsWith(`${forbidden}/`))) {
        throw new ProjectPatchError(`Patch path is protected: ${path}`);
    }
    return path.slice(1).split('/').map(decodePointerToken);
}
function getContainer(root, tokens) {
    if (tokens.length === 0)
        throw new ProjectPatchError('Root replacement is not allowed');
    let current = root;
    for (const token of tokens.slice(0, -1)) {
        if (Array.isArray(current)) {
            const index = Number(token);
            if (!Number.isInteger(index) || index < 0 || index >= current.length) {
                throw new ProjectPatchError(`Array index out of range: ${token}`);
            }
            current = current[index];
        }
        else if (current && typeof current === 'object') {
            if (!(token in current))
                throw new ProjectPatchError(`Path does not exist: ${token}`);
            current = current[token];
        }
        else {
            throw new ProjectPatchError(`Cannot traverse through ${token}`);
        }
    }
    return { container: current, key: tokens[tokens.length - 1] };
}
function hasKey(container, key) {
    if (Array.isArray(container)) {
        const index = Number(key);
        return Number.isInteger(index) && index >= 0 && index < container.length;
    }
    return Boolean(container && typeof container === 'object' && key in container);
}
function applyOne(root, patch) {
    const tokens = parsePointer(patch.path);
    const { container, key } = getContainer(root, tokens);
    if (Array.isArray(container)) {
        if (patch.op === 'add') {
            if (key === '-') {
                container.push(structuredClone(patch.value));
                return;
            }
            const index = Number(key);
            if (!Number.isInteger(index) || index < 0 || index > container.length) {
                throw new ProjectPatchError(`Invalid array insert index: ${key}`);
            }
            container.splice(index, 0, structuredClone(patch.value));
            return;
        }
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= container.length) {
            throw new ProjectPatchError(`Invalid array index: ${key}`);
        }
        if (patch.op === 'remove') {
            container.splice(index, 1);
            return;
        }
        if (patch.op === 'replace' || patch.op === 'set') {
            container[index] = structuredClone(patch.value);
            return;
        }
    }
    if (!container || typeof container !== 'object') {
        throw new ProjectPatchError(`Target container is not an object: ${patch.path}`);
    }
    if (patch.op === 'remove') {
        if (!hasKey(container, key))
            throw new ProjectPatchError(`Cannot remove missing path: ${patch.path}`);
        delete container[key];
        return;
    }
    if (patch.op === 'replace') {
        if (!hasKey(container, key))
            throw new ProjectPatchError(`Cannot replace missing path: ${patch.path}`);
        container[key] = structuredClone(patch.value);
        return;
    }
    if (patch.op === 'add' || patch.op === 'set') {
        container[key] = structuredClone(patch.value);
        return;
    }
    const exhaustive = patch.op;
    throw new ProjectPatchError(`Unsupported patch operation: ${String(exhaustive)}`);
}
export function applyProjectChangeSet(current, changeSet) {
    if (changeSet.projectId !== current.projectId) {
        throw new ProjectPatchError('changeSet.projectId does not match project');
    }
    if (changeSet.basedOnRevision !== current.revision) {
        throw new ProjectPatchError(`revision_conflict: expected ${changeSet.basedOnRevision}, current ${current.revision}`);
    }
    const next = structuredClone(current);
    for (const patch of changeSet.patches)
        applyOne(next, patch);
    next.revision = current.revision + 1;
    const validation = validateProjectModel(next);
    if (!validation.ok) {
        throw new ProjectPatchError(`Resulting ProjectModel is invalid: ${validation.errors.join('; ')}`);
    }
    return next;
}
