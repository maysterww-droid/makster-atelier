import type { QuotePricingResult } from './calculation';
import { minorFromUnknown } from './project-pricing';

export type CommercialVariantKey = 'base' | 'standard' | 'premium';
export type SellingAdjustmentMode = 'none' | 'discount' | 'surcharge';

export type ManualCostLine = {
  id: string;
  name: string;
  costMinor: bigint;
};

export type CommercialOptions = {
  selectedVariant: CommercialVariantKey;
  variantMarginsBps: Record<CommercialVariantKey, number>;
  adjustmentMode: SellingAdjustmentMode;
  adjustmentBps: number;
  manualCostLines: ManualCostLine[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clampBps(value: unknown, fallback: number, max = 9_500) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(max, Math.round(number)));
}

function variantKey(value: unknown): CommercialVariantKey {
  return value === 'base' || value === 'premium' || value === 'standard' ? value : 'standard';
}

function adjustmentMode(value: unknown): SellingAdjustmentMode {
  return value === 'discount' || value === 'surcharge' || value === 'none' ? value : 'none';
}

export function readCommercialOptions(settings: unknown, defaultMarginBps: number): CommercialOptions {
  const root = record(settings);
  const quote = record(root.quoteCommercial);
  const variants = record(quote.variantMarginsBps);
  const standard = clampBps(variants.standard, defaultMarginBps);
  const baseFallback = Math.max(0, standard - 500);
  const premiumFallback = Math.min(9_500, standard + 500);
  const manualRaw = Array.isArray(quote.manualCostLines) ? quote.manualCostLines : [];
  const manualCostLines: ManualCostLine[] = manualRaw.slice(0, 30).flatMap((value) => {
    const row = record(value);
    const id = typeof row.id === 'string' ? row.id.slice(0, 80) : '';
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 200) : '';
    const costMinor = minorFromUnknown(row.costMinor);
    return id && name && costMinor >= 0n ? [{ id, name, costMinor }] : [];
  });

  return {
    selectedVariant: variantKey(quote.selectedVariant),
    variantMarginsBps: {
      base: clampBps(variants.base, baseFallback),
      standard,
      premium: clampBps(variants.premium, premiumFallback),
    },
    adjustmentMode: adjustmentMode(quote.adjustmentMode),
    adjustmentBps: clampBps(quote.adjustmentBps, 0, 5_000),
    manualCostLines,
  };
}

export function manualCostTotal(lines: ManualCostLine[]) {
  return lines.reduce((sum, line) => sum + line.costMinor, 0n);
}

function roundDiv(numerator: bigint, denominator: bigint) {
  if (numerator >= 0n) return (numerator + denominator / 2n) / denominator;
  return -((-numerator + denominator / 2n) / denominator);
}

export type AdjustedPricing = QuotePricingResult & {
  listNetSalesMinor: bigint;
  sellingAdjustmentMinor: bigint;
  adjustmentMode: SellingAdjustmentMode;
  adjustmentBps: number;
};

export function applySellingAdjustment(
  pricing: QuotePricingResult,
  taxBps: number,
  mode: SellingAdjustmentMode,
  bps: number,
): AdjustedPricing {
  const safeBps = Math.max(0, Math.min(5_000, Math.round(bps)));
  const signedBps = mode === 'discount' ? -safeBps : mode === 'surcharge' ? safeBps : 0;
  const listNetSalesMinor = pricing.netSalesMinor;
  const sellingAdjustmentMinor = roundDiv(listNetSalesMinor * BigInt(signedBps), 10_000n);
  const netSalesMinor = listNetSalesMinor + sellingAdjustmentMinor;
  const taxMinor = roundDiv(netSalesMinor * BigInt(Math.max(0, Math.round(taxBps))), 10_000n);
  const grossSalesMinor = netSalesMinor + taxMinor;
  const profitMinor = netSalesMinor - pricing.trueCostMinor;
  const marginBps = netSalesMinor === 0n ? 0 : Number(roundDiv(profitMinor * 10_000n, netSalesMinor));
  const markupBps = pricing.trueCostMinor === 0n ? 0 : Number(roundDiv(profitMinor * 10_000n, pricing.trueCostMinor));

  return {
    ...pricing,
    listNetSalesMinor,
    sellingAdjustmentMinor,
    netSalesMinor,
    taxMinor,
    grossSalesMinor,
    profitMinor,
    marginBps,
    markupBps,
    adjustmentMode: mode,
    adjustmentBps: safeBps,
  };
}

export const COMMERCIAL_VARIANT_LABELS: Record<CommercialVariantKey, string> = {
  base: 'Base',
  standard: 'Standard',
  premium: 'Premium',
};
