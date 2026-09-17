export type Minor = bigint;

export type CostBreakdown = {
  board: Minor;
  fronts: Minor;
  edges: Minor;
  hardware: Minor;
  production: Minor;
  labour: Minor;
  delivery: Minor;
  installation: Minor;
  other?: Minor;
};

export type QuotePricingInput = {
  costs: CostBreakdown;
  overheadBps: number;
  targetMarginBps: number;
  taxBps: number;
};

export type QuotePricingResult = {
  directCostMinor: Minor;
  overheadMinor: Minor;
  trueCostMinor: Minor;
  netSalesMinor: Minor;
  taxMinor: Minor;
  grossSalesMinor: Minor;
  profitMinor: Minor;
  marginBps: number;
  markupBps: number;
};

const BPS = 10_000n;

function assertBps(value: number, name: string, maxExclusive = 10_000) {
  if (!Number.isInteger(value) || value < 0 || value >= maxExclusive) {
    throw new Error(`${name} must be an integer from 0 to ${maxExclusive - 1}`);
  }
}

function sumMinor(values: Minor[]): Minor {
  return values.reduce((sum, value) => sum + value, 0n);
}

function roundDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function calculateQuote(input: QuotePricingInput): QuotePricingResult {
  assertBps(input.overheadBps, 'overheadBps');
  assertBps(input.targetMarginBps, 'targetMarginBps');
  if (!Number.isInteger(input.taxBps) || input.taxBps < 0) {
    throw new Error('taxBps must be a non-negative integer');
  }

  const costs = input.costs;
  const directCostMinor = sumMinor([
    costs.board,
    costs.fronts,
    costs.edges,
    costs.hardware,
    costs.production,
    costs.labour,
    costs.delivery,
    costs.installation,
    costs.other ?? 0n,
  ]);

  if (directCostMinor < 0n) {
    throw new Error('Costs cannot be negative');
  }

  const overheadMinor = roundDiv(
    directCostMinor * BigInt(input.overheadBps),
    BPS,
  );

  const trueCostMinor = directCostMinor + overheadMinor;
  const marginDenominator = BPS - BigInt(input.targetMarginBps);

  // ceilDiv guarantees that rounding never pushes the realised margin below target.
  const netSalesMinor = trueCostMinor === 0n
    ? 0n
    : ceilDiv(trueCostMinor * BPS, marginDenominator);

  const profitMinor = netSalesMinor - trueCostMinor;
  const taxMinor = roundDiv(netSalesMinor * BigInt(input.taxBps), BPS);
  const grossSalesMinor = netSalesMinor + taxMinor;

  const marginBps = netSalesMinor === 0n
    ? 0
    : Number(roundDiv(profitMinor * BPS, netSalesMinor));

  const markupBps = trueCostMinor === 0n
    ? 0
    : Number(roundDiv(profitMinor * BPS, trueCostMinor));

  return {
    directCostMinor,
    overheadMinor,
    trueCostMinor,
    netSalesMinor,
    taxMinor,
    grossSalesMinor,
    profitMinor,
    marginBps,
    markupBps,
  };
}

export function formatMinor(
  value: Minor,
  currency: string,
  locale = 'ru-RU',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) / 100);
}
