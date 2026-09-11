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
};

export type StoredCabinetCost = {
  computed_cost_json: Record<string, unknown> | null;
};

export type ProjectPricingResult = {
  costs: CostBreakdown;
  pricing: QuotePricingResult;
  cabinetCount: number;
  completeCabinets: number;
  incompleteCabinets: number;
};

const DOCUMENT_LOCALES = new Set<DocumentLocale>(['ru', 'en', 'cs', 'de', 'pl']);

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

  return {
    deliveryItemId: typeof quote.deliveryItemId === 'string' ? quote.deliveryItemId : '',
    installationItemId: typeof quote.installationItemId === 'string' ? quote.installationItemId : '',
    otherItemId: typeof quote.otherItemId === 'string' ? quote.otherItemId : '',
    taxBps,
    validityDays,
    documentLocale: DOCUMENT_LOCALES.has(requestedLocale as DocumentLocale) ? requestedLocale as DocumentLocale : 'ru',
    clientNote: typeof quote.clientNote === 'string' ? quote.clientNote : '',
    issuedAt: typeof quote.issuedAt === 'string' ? quote.issuedAt : null,
  };
}

function cabinetCost(cabinet: StoredCabinetCost, key: keyof CostBreakdown) {
  const computed = record(cabinet.computed_cost_json);
  const costs = record(computed.costs);
  return minorFromUnknown(costs[key]);
}

function cabinetComplete(cabinet: StoredCabinetCost) {
  return record(cabinet.computed_cost_json).complete === true;
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

  const completeCabinets = cabinets.filter(cabinetComplete).length;

  return {
    costs,
    pricing: calculateQuote({
      costs,
      overheadBps: options.overheadBps ?? 0,
      targetMarginBps: options.targetMarginBps,
      taxBps: options.taxBps ?? 0,
    }),
    cabinetCount: cabinets.length,
    completeCabinets,
    incompleteCabinets: cabinets.length - completeCabinets,
  };
}
