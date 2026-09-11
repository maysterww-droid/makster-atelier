import { minorFromUnknown } from './project-pricing';

export type MeasuredExtraCategory = 'worktop' | 'plinth' | 'filler' | 'decor';

export type MeasuredExtraSettings = {
  worktopItemId: string;
  worktopLengthM: number;
  plinthItemId: string;
  plinthLengthM: number;
  fillerItemId: string;
  fillerAreaM2: number;
  decorItemId: string;
  decorAreaM2: number;
};

export type MeasuredPriceRow = {
  id: string;
  category: string;
  name: string;
  unit: string;
  purchase_price_minor: number | string;
};

export type MeasuredExtraLine = {
  category: MeasuredExtraCategory;
  name: string;
  quantity: number;
  unit: 'm' | 'm2';
  amountMinor: bigint;
};

const definitions: Array<{
  category: MeasuredExtraCategory;
  itemField: keyof MeasuredExtraSettings;
  quantityField: keyof MeasuredExtraSettings;
  unit: 'm' | 'm2';
}> = [
  { category: 'worktop', itemField: 'worktopItemId', quantityField: 'worktopLengthM', unit: 'm' },
  { category: 'plinth', itemField: 'plinthItemId', quantityField: 'plinthLengthM', unit: 'm' },
  { category: 'filler', itemField: 'fillerItemId', quantityField: 'fillerAreaM2', unit: 'm2' },
  { category: 'decor', itemField: 'decorItemId', quantityField: 'decorAreaM2', unit: 'm2' },
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function quantity(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(10_000, number)) : 0;
}

export function readMeasuredExtraSettings(settings: unknown): MeasuredExtraSettings {
  const root = record(settings);
  const quote = record(root.quoteCommercial);
  return {
    worktopItemId: typeof quote.worktopItemId === 'string' ? quote.worktopItemId : '',
    worktopLengthM: quantity(quote.worktopLengthM),
    plinthItemId: typeof quote.plinthItemId === 'string' ? quote.plinthItemId : '',
    plinthLengthM: quantity(quote.plinthLengthM),
    fillerItemId: typeof quote.fillerItemId === 'string' ? quote.fillerItemId : '',
    fillerAreaM2: quantity(quote.fillerAreaM2),
    decorItemId: typeof quote.decorItemId === 'string' ? quote.decorItemId : '',
    decorAreaM2: quantity(quote.decorAreaM2),
  };
}

export function measuredExtraDefinitions() {
  return definitions;
}

export function calculateMeasuredExtras(settings: MeasuredExtraSettings, priceBook: MeasuredPriceRow[]) {
  const lines: MeasuredExtraLine[] = [];
  const missing: MeasuredExtraCategory[] = [];

  for (const definition of definitions) {
    const itemId = String(settings[definition.itemField] ?? '');
    const measuredQuantity = Number(settings[definition.quantityField] ?? 0);
    if (!(measuredQuantity > 0)) continue;

    const item = priceBook.find((row) => row.id === itemId && row.category === definition.category && row.unit === definition.unit);
    if (!item) {
      missing.push(definition.category);
      continue;
    }

    const unitMinor = minorFromUnknown(item.purchase_price_minor);
    const amountMinor = BigInt(Math.round(Number(unitMinor) * measuredQuantity));
    lines.push({ category: definition.category, name: item.name, quantity: measuredQuantity, unit: definition.unit, amountMinor });
  }

  return {
    lines,
    missing,
    totalMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0n),
  };
}
