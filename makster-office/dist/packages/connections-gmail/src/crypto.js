import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export function sha256Secret(value) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}
export function parseAes256Key(base64) {
    if (!base64)
        throw new Error('connection_encryption_key_required');
    const key = Buffer.from(base64, 'base64');
    if (key.length !== 32)
        throw new Error('connection_encryption_key_must_be_32_bytes');
    return key;
}
export function encryptSecret(value, key, keyVersion = 'v1') {
    if (!value)
        throw new Error('secret_value_required');
    if (key.length !== 32)
        throw new Error('aes_256_key_required');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        version: 1,
        algorithm: 'AES-256-GCM',
        keyVersion,
        ivB64: iv.toString('base64'),
        ciphertextB64: ciphertext.toString('base64'),
        authTagB64: authTag.toString('base64'),
    };
}
export function decryptSecret(payload, key) {
    if (payload.algorithm !== 'AES-256-GCM' || payload.version !== 1)
        throw new Error('unsupported_encrypted_secret_format');
    if (key.length !== 32)
        throw new Error('aes_256_key_required');
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(payload.authTagB64, 'base64'));
        return Buffer.concat([
            decipher.update(Buffer.from(payload.ciphertextB64, 'base64')),
            decipher.final(),
        ]).toString('utf8');
    }
    catch {
        throw new Error('encrypted_secret_authentication_failed');
    }
}
function base64url(input) {
    return Buffer.from(input).toString('base64url');
}
function fromBase64url(input) {
    return Buffer.from(input, 'base64url');
}
export function signOauthState(payload, secret) {
    if (!secret)
        throw new Error('oauth_state_secret_required');
    const body = base64url(JSON.stringify(payload));
    const signature = createHmac('sha256', secret).update(body).digest();
    return `${body}.${base64url(signature)}`;
}
export function verifyOauthState(token, secret, nowMs = Date.now()) {
    if (!secret)
        throw new Error('oauth_state_secret_required');
    const [body, signatureText, ...extra] = token.split('.');
    if (!body || !signatureText || extra.length)
        throw new Error('oauth_state_malformed');
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = fromBase64url(signatureText);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        throw new Error('oauth_state_invalid_signature');
    let payload;
    try {
        payload = JSON.parse(fromBase64url(body).toString('utf8'));
    }
    catch {
        throw new Error('oauth_state_invalid_payload');
    }
    if (!payload.organizationId || !payload.returnUrl || !payload.nonce)
        throw new Error('oauth_state_invalid_payload');
    if (!Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt))
        throw new Error('oauth_state_invalid_payload');
    if (payload.expiresAt <= nowMs)
        throw new Error('oauth_state_expired');
    if (payload.issuedAt > nowMs + 60_000)
        throw new Error('oauth_state_issued_in_future');
    return payload;
}
