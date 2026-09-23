import { createHash } from 'node:crypto';
import { readQuoteSnapshot, type QuoteSnapshot } from './quote-snapshot';
import { createClient } from './supabase/server';

export type PublicQuoteAccess = {
  quoteId: string;
  quoteVersion: number;
  issuedAt: string;
  validUntil: string;
  linkExpiresAt: string;
  status: string;
  actionAllowed: boolean;
  snapshot: QuoteSnapshot;
};

export function hashClientQuoteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function validClientQuoteToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function loadPublicQuote(token: string): Promise<PublicQuoteAccess | null> {
  if (!validClientQuoteToken(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('quote_public_snapshot', { p_token_hash:hashClientQuoteToken(token) });
  if (error || !data) return null;
  const root = record(data);
  const snapshot = readQuoteSnapshot(root.quote);
  if (!snapshot) return null;
  const quoteId = typeof root.quoteId === 'string' ? root.quoteId : '';
  const quoteVersion = Number(root.quoteVersion ?? 0);
  const issuedAt = typeof root.issuedAt === 'string' ? root.issuedAt : snapshot.issuedAt;
  const validUntil = typeof root.validUntil === 'string' ? root.validUntil : snapshot.validUntil;
  const linkExpiresAt = typeof root.linkExpiresAt === 'string' ? root.linkExpiresAt : validUntil;
  const status = typeof root.status === 'string' ? root.status : 'approved';
  if (!quoteId || !Number.isFinite(quoteVersion) || quoteVersion < 1) return null;
  return {
    quoteId,
    quoteVersion,
    issuedAt,
    validUntil,
    linkExpiresAt,
    status,
    actionAllowed: root.actionAllowed === true,
    snapshot:{ ...snapshot, quoteId, quoteVersion, issuedAt, validUntil },
  };
}
