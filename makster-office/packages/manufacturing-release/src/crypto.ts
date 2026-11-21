import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { canonicalize } from './canonical.js';
import type { ReleaseSignature, ReleaseSigner } from './types.js';

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function signCanonicalPayload(payload: unknown, signer: ReleaseSigner): ReleaseSignature {
  const canonical = canonicalize(payload);
  const payloadHash = sha256Text(canonical);
  const privateKey = createPrivateKey(signer.privateKeyPem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('release_signing_key_must_be_ed25519');
  const signature = sign(null, Buffer.from(payloadHash, 'hex'), privateKey);
  return {
    algorithm: 'Ed25519',
    keyId: signer.keyId,
    signedPayloadSha256: payloadHash,
    signatureBase64: signature.toString('base64'),
  };
}

export function publicKeyPemFromPrivate(privateKeyPem: string): string {
  const privateKey = createPrivateKey(privateKeyPem);
  return createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
}

export function verifyCanonicalPayload(payload: unknown, signature: ReleaseSignature, publicKeyPem: string): boolean {
  const canonical = canonicalize(payload);
  const payloadHash = sha256Text(canonical);
  if (payloadHash !== signature.signedPayloadSha256) return false;
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== 'ed25519') return false;
  return verify(null, Buffer.from(payloadHash, 'hex'), publicKey, Buffer.from(signature.signatureBase64, 'base64'));
}
