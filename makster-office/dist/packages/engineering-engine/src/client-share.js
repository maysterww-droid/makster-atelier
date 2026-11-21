function uuid() {
    if (globalThis.crypto?.randomUUID)
        return globalThis.crypto.randomUUID();
    const b = new Uint8Array(16);
    globalThis.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function token() {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}
function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
export function sha256TextPure(raw) {
    const bytes = new TextEncoder().encode(raw), bitLen = bytes.length * 8;
    const paddedLen = (((bytes.length + 9 + 63) >> 6) << 6);
    const msg = new Uint8Array(paddedLen);
    msg.set(bytes);
    msg[bytes.length] = 0x80;
    const dv = new DataView(msg.buffer);
    dv.setUint32(paddedLen - 4, bitLen >>> 0, false);
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let off = 0; off < paddedLen; off += 64) {
        for (let i = 0; i < 16; i++)
            w[i] = dv.getUint32(off + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const x = w[i - 15], y = w[i - 2];
            const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3), s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        H = [(H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0, (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0];
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
}
export const hashClientShareToken = sha256TextPure;
export function listClientShareLinks(project) {
    const now = Date.now();
    return (project.clientShareLinks ?? []).map(x => ({
        id: x.id,
        status: x.status === 'active' && ((x.oneTime && x.usedAt) || (x.expiresAt && Date.parse(x.expiresAt) <= now)) ? 'expired' : x.status,
        createdAt: x.createdAt, ...(x.expiresAt ? { expiresAt: x.expiresAt } : {}),
        oneTime: Boolean(x.oneTime), ...(x.usedAt ? { usedAt: x.usedAt } : {}),
        allowApprovalResponses: x.allowApprovalResponses, approvalCount: x.approvalIds?.length ?? 0, sourceRevision: x.sourceRevision, ...(x.label ? { label: x.label } : {})
    }));
}
export function createClientShareLink(project, input) {
    if (!project.clientPortal?.enabled)
        throw new Error('client_portal_disabled');
    if (input.expiresAt && (!Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now()))
        throw new Error('client_share_expiry_must_be_future');
    const rawToken = token(), snapshot = structuredClone(project);
    snapshot.clientShareLinks ??= [];
    const allowApprovalResponses = input.allowApprovalResponses !== false;
    const approvalIds = allowApprovalResponses ? (project.clientApprovals ?? []).filter(x => x.status === 'pending').map(x => x.id) : [];
    const link = {
        id: uuid(), tokenHash: hashClientShareToken(rawToken), status: 'active', createdBy: input.createdBy.trim() || 'owner',
        createdAt: new Date().toISOString(), sourceRevision: project.revision, oneTime: Boolean(input.oneTime),
        allowApprovalResponses, approvalIds,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}), ...(input.label ? { label: input.label } : {})
    };
    snapshot.clientShareLinks.push(link);
    snapshot.revision = project.revision + 1;
    return { snapshot, link, rawToken };
}
export function revokeClientShareLink(project, id) {
    const snapshot = structuredClone(project), link = snapshot.clientShareLinks?.find(x => x.id === id);
    if (!link)
        throw new Error('client_share_link_not_found');
    link.status = 'revoked';
    snapshot.revision = project.revision + 1;
    return { snapshot, link };
}
function constantTimeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
export function validateClientShareToken(project, rawToken) {
    const now = Date.now(), hash = hashClientShareToken(rawToken);
    const link = (project.clientShareLinks ?? []).find(x => constantTimeEqual(x.tokenHash, hash));
    if (!link)
        return { ok: false, error: 'client_share_token_invalid' };
    if (link.status !== 'active')
        return { ok: false, error: 'client_share_token_inactive' };
    if (link.expiresAt && Date.parse(link.expiresAt) <= now)
        return { ok: false, error: 'client_share_token_expired', link };
    if (link.oneTime && link.usedAt)
        return { ok: false, error: 'client_share_token_already_used', link };
    if (!project.clientPortal?.enabled)
        return { ok: false, error: 'client_portal_disabled', link };
    return { ok: true, link };
}
export function markClientShareTokenUsed(project, id) {
    const snapshot = structuredClone(project), link = snapshot.clientShareLinks?.find(x => x.id === id);
    if (!link)
        throw new Error('client_share_link_not_found');
    if (link.oneTime && !link.usedAt)
        link.usedAt = new Date().toISOString();
    snapshot.revision = project.revision + 1;
    return { snapshot, link };
}
