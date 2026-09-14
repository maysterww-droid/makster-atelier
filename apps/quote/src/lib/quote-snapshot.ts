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
  category: 'delivery' | 'installation' | 'other' | 'worktop' | 'plinth' | 'filler' | 'decor' | 'manual';
  name: string;
  amountMinor: string;
  quantity?: number;
  unit?: 'm' | 'm2' | 'job';
};

export type QuoteSnapshotCommercial = {
  variantKey: 'base' | 'standard' | 'premium';
  variantLabel: string;
  targetMarginBps: number;
  adjustmentMode: 'none' | 'discount' | 'surcharge';
  adjustmentBps: number;
  listNetMinor: string;
  adjustmentMinor: string;
  actualMarginBps: number;
};

export type QuoteSnapshot = {
  schemaVersion: 'mq-quote-0.1.4' | 'mq-quote-0.1.11' | 'mq-quote-0.1.12';
  quoteId?: string;
  quoteVersion?: number;
  issuedAt: string;
  validUntil: string;
  locale: DocumentLocale;
  currency: string;
  project: { id:string; name:string; revisionNumber:number };
  client: { id:string; name:string; email:string; phone:string; address:string };
  supplier: QuoteBrandSettings;
  modules: QuoteSnapshotModule[];
  extras: QuoteSnapshotExtra[];
  commercial?: QuoteSnapshotCommercial;
  terms: { depositBps:number; productionLeadText:string; paymentTerms:string; warrantyText:string; clientNote:string };
  amounts: { netMinor:string; taxMinor:string; totalMinor:string; depositMinor:string; taxBps:number };
};

const SCHEMA_VERSIONS = new Set<QuoteSnapshot['schemaVersion']>(['mq-quote-0.1.4', 'mq-quote-0.1.11', 'mq-quote-0.1.12']);
const DOCUMENT_LOCALES = new Set<DocumentLocale>(['ru', 'en', 'cs', 'de', 'pl']);
const EXTRA_CATEGORIES = new Set<QuoteSnapshotExtra['category']>(['delivery', 'installation', 'other', 'worktop', 'plinth', 'filler', 'decor', 'manual']);
const EXTRA_UNITS = new Set<NonNullable<QuoteSnapshotExtra['unit']>>(['m', 'm2', 'job']);
const VARIANTS = new Set<QuoteSnapshotCommercial['variantKey']>(['base', 'standard', 'premium']);
const ADJUSTMENT_MODES = new Set<QuoteSnapshotCommercial['adjustmentMode']>(['none', 'discount', 'surcharge']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function nonEmptyText(value: unknown) {
  const result = text(value);
  return result && result.trim() ? result : null;
}

function integer(value: unknown, minimum?: number, maximum?: number) {
  const number = Number(value);
  if (!Number.isInteger(number)) return null;
  if (minimum !== undefined && number < minimum) return null;
  if (maximum !== undefined && number > maximum) return null;
  return number;
}

function positiveFinite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function integerString(value: unknown) {
  return typeof value === 'string' && /^-?\d+$/.test(value) ? value : null;
}

function isoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function validModule(value: unknown) {
  const row = record(value);
  return Boolean(
    nonEmptyText(row.id)
    && nonEmptyText(row.name)
    && nonEmptyText(row.moduleKey)
    && positiveFinite(row.widthMm)
    && positiveFinite(row.heightMm)
    && positiveFinite(row.depthMm)
    && integer(row.quantity, 1, 999),
  );
}

function validExtra(value: unknown) {
  const row = record(value);
  const category = text(row.category) as QuoteSnapshotExtra['category'] | null;
  if (!category || !EXTRA_CATEGORIES.has(category) || !nonEmptyText(row.name) || !integerString(row.amountMinor)) return false;
  if (row.quantity !== undefined && row.quantity !== null) {
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return false;
  }
  if (row.unit !== undefined && row.unit !== null) {
    const unit = text(row.unit) as NonNullable<QuoteSnapshotExtra['unit']> | null;
    if (!unit || !EXTRA_UNITS.has(unit)) return false;
  }
  return true;
}

function validCommercial(value: unknown) {
  if (value === undefined || value === null) return true;
  const row = record(value);
  const variantKey = text(row.variantKey) as QuoteSnapshotCommercial['variantKey'] | null;
  const adjustmentMode = text(row.adjustmentMode) as QuoteSnapshotCommercial['adjustmentMode'] | null;
  return Boolean(
    variantKey && VARIANTS.has(variantKey)
    && nonEmptyText(row.variantLabel)
    && integer(row.targetMarginBps, 0, 9_999) !== null
    && adjustmentMode && ADJUSTMENT_MODES.has(adjustmentMode)
    && integer(row.adjustmentBps, 0, 10_000) !== null
    && integerString(row.listNetMinor)
    && integerString(row.adjustmentMinor)
    && integer(row.actualMarginBps, -100_000, 100_000) !== null,
  );
}

export function readQuoteSnapshot(value: unknown): QuoteSnapshot | null {
  const root = record(value);
  const schemaVersion = text(root.schemaVersion) as QuoteSnapshot['schemaVersion'] | null;
  const locale = text(root.locale) as DocumentLocale | null;
  const currency = nonEmptyText(root.currency);
  const project = record(root.project);
  const client = record(root.client);
  const supplier = record(root.supplier);
  const terms = record(root.terms);
  const amounts = record(root.amounts);

  if (!schemaVersion || !SCHEMA_VERSIONS.has(schemaVersion)) return null;
  if (!locale || !DOCUMENT_LOCALES.has(locale)) return null;
  if (!currency || !/^[A-Za-z]{3}$/.test(currency)) return null;
  if (!isoDate(root.issuedAt) || !isoDate(root.validUntil)) return null;

  if (!nonEmptyText(project.id) || !nonEmptyText(project.name) || integer(project.revisionNumber, 1) === null) return null;
  if (!nonEmptyText(client.id) || !nonEmptyText(client.name)) return null;
  if (!nonEmptyText(supplier.tradeName)) return null;

  if (!Array.isArray(root.modules) || !root.modules.every(validModule)) return null;
  if (!Array.isArray(root.extras) || !root.extras.every(validExtra)) return null;
  if (!validCommercial(root.commercial)) return null;

  if (integer(terms.depositBps, 0, 10_000) === null) return null;
  for (const key of ['productionLeadText', 'paymentTerms', 'warrantyText', 'clientNote']) {
    if (terms[key] !== undefined && typeof terms[key] !== 'string') return null;
  }

  for (const key of ['netMinor', 'taxMinor', 'totalMinor', 'depositMinor']) {
    if (!integerString(amounts[key])) return null;
  }
  if (integer(amounts.taxBps, 0, 100_000) === null) return null;

  return value as QuoteSnapshot;
}
