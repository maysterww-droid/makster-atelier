import { createHash } from 'node:crypto';
import { effectiveQuoteStatus, quoteActionAllowed } from './quote-lifecycle';
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

const PUBLIC_STATUSES = new Set(['approved', 'sent', 'accepted', 'rejected', 'expired', 'superseded']);

export function hashClientQuoteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function validClientQuoteToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function validIso(value: unknown, fallback: string) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : fallback;
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
  const issuedAt = validIso(root.issuedAt, snapshot.issuedAt);
  const validUntil = validIso(root.validUntil, snapshot.validUntil);
  const linkExpiresAt = validIso(root.linkExpiresAt, validUntil);
  const rawStatus = typeof root.status === 'string' && PUBLIC_STATUSES.has(root.status) ? root.status : 'approved';
  const status = effectiveQuoteStatus(rawStatus, validUntil);
  if (!quoteId || !Number.isInteger(quoteVersion) || quoteVersion < 1) return null;
  return {
    quoteId,
    quoteVersion,
    issuedAt,
    validUntil,
    linkExpiresAt,
    status,
    actionAllowed: root.actionAllowed === true && quoteActionAllowed(status, validUntil),
    snapshot:{ ...snapshot, quoteId, quoteVersion, issuedAt, validUntil },
  };
}
