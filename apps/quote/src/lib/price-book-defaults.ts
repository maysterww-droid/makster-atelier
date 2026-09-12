import type { PriceBookItem } from './engineering';

export const PRICE_BOOK_DEFAULT_ROLES = [
  'boardItemId',
  'frontItemId',
  'backItemId',
  'edgeItemId',
  'hingeItemId',
  'drawerItemId',
  'labourItemId',
] as const;

export type PriceBookDefaultRole = (typeof PRICE_BOOK_DEFAULT_ROLES)[number];
export type PriceBookDefaults = Partial<Record<PriceBookDefaultRole, string>>;

type RoleSpec = { category: string; units: readonly string[] };

const ROLE_SPECS: Record<PriceBookDefaultRole, RoleSpec> = {
  boardItemId: { category: 'board', units: ['sheet', 'm2'] },
  frontItemId: { category: 'front', units: ['sheet', 'm2'] },
  backItemId: { category: 'board', units: ['sheet', 'm2'] },
  edgeItemId: { category: 'edge', units: ['m'] },
  hingeItemId: { category: 'hardware', units: ['pcs', 'set'] },
  drawerItemId: { category: 'hardware', units: ['pcs', 'set'] },
  labourItemId: { category: 'labour', units: ['hour'] },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function uuid(value: unknown) {
  const text = String(value ?? '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(text) ? text : '';
}

export function priceBookDefaultsFromSettings(settings: unknown): PriceBookDefaults {
  const root = record(settings);
  const quote = record(root.quote);
  const raw = record(quote.priceBookDefaults);
  const result: PriceBookDefaults = {};

  for (const role of PRICE_BOOK_DEFAULT_ROLES) {
    const id = uuid(raw[role]);
    if (id) result[role] = id;
  }

  return result;
}

export function isPriceBookItemValidForDefaultRole(item: PriceBookItem, role: PriceBookDefaultRole) {
  const spec = ROLE_SPECS[role];
  return item.category === spec.category && spec.units.includes(item.unit);
}

/**
 * Returns only defaults that still exist in the supplied active Price Book slice.
 * Callers should pass items already filtered to the project currency. This makes
 * deactivated, deleted, wrong-currency, wrong-category and wrong-unit defaults
 * fail closed instead of silently poisoning a calculation.
 */
export function validatedPriceBookDefaults(settings: unknown, items: PriceBookItem[]): PriceBookDefaults {
  const stored = priceBookDefaultsFromSettings(settings);
  const byId = new Map(items.map((item) => [item.id, item]));
  const result: PriceBookDefaults = {};

  for (const role of PRICE_BOOK_DEFAULT_ROLES) {
    const id = stored[role];
    if (!id) continue;
    const item = byId.get(id);
    if (item && isPriceBookItemValidForDefaultRole(item, role)) result[role] = id;
  }

  return result;
}
