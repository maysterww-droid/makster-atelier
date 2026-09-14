import { calculateQuote, type CostBreakdown, type QuotePricingResult } from './calculation';

export type DocumentLocale = 'ru' | 'en' | 'cs' | 'de' | 'pl';

export type ProjectCommercialSettings = {
  deliveryItemId: string;
  installationItemId: string;
  otherItemId: string;
  taxBps: number;
  validityDays: number;
  documentLocale: DocumentLocale;
  clientNote: string;
  issuedAt: string | null;
  depositBps: number;
  productionLeadText: string;
  paymentTerms: string;
  warrantyText: string;
};

export type StoredCabinetCost = {
  computed_cost_json: Record<string, unknown> | null;
  quantity?: number | string | null;
};

export type ProjectPricingResult = {
  costs: CostBreakdown;
  pricing: QuotePricingResult;
  cabinetCount: number;
  completeCabinets: number;
  incompleteCabinets: number;
};

const DOCUMENT_LOCALES = new Set<DocumentLocale>(['ru', 'en', 'cs', 'de', 'pl']);
const REQUIRED_COST_KEYS: Array<Exclude<keyof CostBreakdown, 'other'>> = ['board','fronts','edges','hardware','production','labour','delivery','installation'];

function safeInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) ? number : fallback;
}

export function minorFromUnknown(value: unknown): bigint {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  } catch {
    // Invalid external data becomes zero rather than breaking a quote screen.
  }
  return 0n;
}

function validNonNegativeMinor(value: unknown) {
  if (typeof value === 'bigint') return value >= 0n;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0;
  return typeof value === 'string' && /^\d+$/.test(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readProjectCommercialSettings(settings: unknown): ProjectCommercialSettings {
  const root = record(settings);
  const quote = record(root.quoteCommercial);
  const requestedLocale = typeof quote.documentLocale === 'string' ? quote.documentLocale : 'ru';
  const taxBps = Math.max(0, Math.min(100_000, safeInteger(quote.taxBps, safeInteger(root.taxBps, 0))));
  const validityDays = Math.max(1, Math.min(365, safeInteger(quote.validityDays, 14)));
  const depositBps = Math.max(0, Math.min(10_000, safeInteger(quote.depositBps, 0)));

  return {
    deliveryItemId: typeof quote.deliveryItemId === 'string' ? quote.deliveryItemId : '',
    installationItemId: typeof quote.installationItemId === 'string' ? quote.installationItemId : '',
    otherItemId: typeof quote.otherItemId === 'string' ? quote.otherItemId : '',
    taxBps,
    validityDays,
    documentLocale: DOCUMENT_LOCALES.has(requestedLocale as DocumentLocale) ? requestedLocale as DocumentLocale : 'ru',
    clientNote: typeof quote.clientNote === 'string' ? quote.clientNote : '',
    issuedAt: typeof quote.issuedAt === 'string' ? quote.issuedAt : null,
    depositBps,
    productionLeadText: typeof quote.productionLeadText === 'string' ? quote.productionLeadText : '',
    paymentTerms: typeof quote.paymentTerms === 'string' ? quote.paymentTerms : '',
    warrantyText: typeof quote.warrantyText === 'string' ? quote.warrantyText : '',
  };
}

function cabinetQuantity(cabinet: StoredCabinetCost) {
  return Math.max(1, Math.min(999, safeInteger(cabinet.quantity, 1)));
}

function cabinetQuantityValid(cabinet: StoredCabinetCost) {
  if (cabinet.quantity === undefined || cabinet.quantity === null) return true;
  const value = Number(cabinet.quantity);
  return Number.isInteger(value) && value >= 1 && value <= 999;
}

function cabinetCost(cabinet: StoredCabinetCost, key: keyof CostBreakdown) {
  const computed = record(cabinet.computed_cost_json);
  const costs = record(computed.costs);
  const raw = costs[key];
  if (raw === undefined && key === 'other') return 0n;
  if (!validNonNegativeMinor(raw)) return 0n;
  return minorFromUnknown(raw) * BigInt(cabinetQuantity(cabinet));
}

function cabinetCostDataValid(cabinet: StoredCabinetCost) {
  const computed = record(cabinet.computed_cost_json);
  const costs = record(computed.costs);
  if (!REQUIRED_COST_KEYS.every((key) => validNonNegativeMinor(costs[key]))) return false;
  return costs.other === undefined || validNonNegativeMinor(costs.other);
}

function cabinetComplete(cabinet: StoredCabinetCost) {
  return record(cabinet.computed_cost_json).complete === true
    && cabinetQuantityValid(cabinet)
    && cabinetCostDataValid(cabinet);
}

export function calculateProjectPricing(
  cabinets: StoredCabinetCost[],
  extras: { deliveryMinor?: bigint; installationMinor?: bigint; otherMinor?: bigint },
  options: { targetMarginBps: number; overheadBps?: number; taxBps?: number },
): ProjectPricingResult {
  const sum = (key: keyof CostBreakdown) => cabinets.reduce((total, cabinet) => total + cabinetCost(cabinet, key), 0n);

  const costs: CostBreakdown = {
    board: sum('board'),
    fronts: sum('fronts'),
    edges: sum('edges'),
    hardware: sum('hardware'),
    production: sum('production'),
    labour: sum('labour'),
    delivery: sum('delivery') + (extras.deliveryMinor ?? 0n),
    installation: sum('installation') + (extras.installationMinor ?? 0n),
    other: sum('other') + (extras.otherMinor ?? 0n),
  };

  const cabinetCount = cabinets.reduce((total, cabinet) => total + cabinetQuantity(cabinet), 0);
  const completeCabinets = cabinets.reduce((total, cabinet) => total + (cabinetComplete(cabinet) ? cabinetQuantity(cabinet) : 0), 0);

  return {
    costs,
    pricing: calculateQuote({
      costs,
      overheadBps: options.overheadBps ?? 0,
      targetMarginBps: options.targetMarginBps,
      taxBps: options.taxBps ?? 0,
    }),
    cabinetCount,
    completeCabinets,
    incompleteCabinets: cabinetCount - completeCabinets,
  };
}

export function calculateDepositMinor(totalMinor: bigint, depositBps: number) {
  const bps = BigInt(Math.max(0, Math.min(10_000, Math.round(depositBps))));
  return (totalMinor * bps + 5_000n) / 10_000n;
}
