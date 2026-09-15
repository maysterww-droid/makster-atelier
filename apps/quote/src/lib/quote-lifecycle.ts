export type QuoteLifecycleStatus = 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded';

const ACTIVE_STATUSES = new Set<QuoteLifecycleStatus>(['approved', 'sent']);

export function effectiveQuoteStatus(status: string, validUntil: string, nowMs = Date.now()): string {
  const expiresAt = Date.parse(validUntil);
  if (Number.isFinite(expiresAt) && expiresAt < nowMs && ACTIVE_STATUSES.has(status as QuoteLifecycleStatus)) {
    return 'expired';
  }
  return status;
}

export function quoteActionAllowed(status: string, validUntil: string, nowMs = Date.now()) {
  const effective = effectiveQuoteStatus(status, validUntil, nowMs);
  return ACTIVE_STATUSES.has(effective as QuoteLifecycleStatus) && Date.parse(validUntil) >= nowMs;
}

export function quoteReference(projectId: string, quoteVersion: number) {
  const version = Number.isInteger(quoteVersion) && quoteVersion > 0 ? quoteVersion : 1;
  const projectPart = projectId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'PROJECT';
  return `MQ-${String(version).padStart(3, '0')}-${projectPart}`;
}
