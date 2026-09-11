import { minorFromUnknown, type ProjectCommercialSettings } from './project-pricing';

export type MeasuredExtraCategory = 'worktop' | 'plinth' | 'filler' | 'decor';

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
  itemField: keyof ProjectCommercialSettings;
  quantityField: keyof ProjectCommercialSettings;
  unit: 'm' | 'm2';
}> = [
  { category: 'worktop', itemField: 'worktopItemId', quantityField: 'worktopLengthM', unit: 'm' },
  { category: 'plinth', itemField: 'plinthItemId', quantityField: 'plinthLengthM', unit: 'm' },
  { category: 'filler', itemField: 'fillerItemId', quantityField: 'fillerAreaM2', unit: 'm2' },
  { category: 'decor', itemField: 'decorItemId', quantityField: 'decorAreaM2', unit: 'm2' },
];

export function measuredExtraDefinitions() {
  return definitions;
}

export function calculateMeasuredExtras(settings: ProjectCommercialSettings, priceBook: MeasuredPriceRow[]) {
  const lines: MeasuredExtraLine[] = [];
  const missing: MeasuredExtraCategory[] = [];

  for (const definition of definitions) {
    const itemId = String(settings[definition.itemField] ?? '');
    const quantity = Number(settings[definition.quantityField] ?? 0);
    if (!(quantity > 0)) continue;

    const item = priceBook.find((row) => row.id === itemId && row.category === definition.category && row.unit === definition.unit);
    if (!item) {
      missing.push(definition.category);
      continue;
    }

    const unitMinor = minorFromUnknown(item.purchase_price_minor);
    const amountMinor = BigInt(Math.round(Number(unitMinor) * quantity));
    lines.push({ category: definition.category, name: item.name, quantity, unit: definition.unit, amountMinor });
  }

  return {
    lines,
    missing,
    totalMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0n),
  };
}
