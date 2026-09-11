import type { DocumentLocale } from './project-pricing';
import type { QuoteBrandSettings } from './quote-brand';

export type QuoteSnapshotModule = {
  id: string;
  name: string;
  moduleKey: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  quantity: number;
};

export type QuoteSnapshotExtra = {
  category: 'delivery' | 'installation' | 'other';
  name: string;
  amountMinor: string;
};

export type QuoteSnapshot = {
  schemaVersion: 'mq-quote-0.1.4';
  quoteId?: string;
  quoteVersion?: number;
  issuedAt: string;
  validUntil: string;
  locale: DocumentLocale;
  currency: string;
  project: {
    id: string;
    name: string;
    revisionNumber: number;
  };
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  supplier: QuoteBrandSettings;
  modules: QuoteSnapshotModule[];
  extras: QuoteSnapshotExtra[];
  terms: {
    depositBps: number;
    productionLeadText: string;
    paymentTerms: string;
    warrantyText: string;
    clientNote: string;
  };
  amounts: {
    netMinor: string;
    taxMinor: string;
    totalMinor: string;
    depositMinor: string;
    taxBps: number;
  };
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readQuoteSnapshot(value: unknown): QuoteSnapshot | null {
  const root = record(value);
  if (root.schemaVersion !== 'mq-quote-0.1.4') return null;
  if (!root.project || !root.client || !root.supplier || !root.amounts || !root.terms) return null;
  if (!Array.isArray(root.modules) || !Array.isArray(root.extras)) return null;
  return value as QuoteSnapshot;
}
