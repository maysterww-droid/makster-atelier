import type { PriceBookItem } from './engineering';
import { validatedPriceBookDefaults } from './price-book-defaults';

export type PriceBookSetupStepKey =
  | 'board'
  | 'front'
  | 'edge'
  | 'hinge'
  | 'drawer'
  | 'operations'
  | 'labour'
  | 'extras';

export type PriceBookSetupState = 'ready' | 'demo' | 'missing';

export type PriceBookSetupStep = {
  key: PriceBookSetupStepKey;
  state: PriceBookSetupState;
  required: boolean;
  count: number;
  missingKeys?: string[];
};

const REQUIRED_OPERATION_KEYS = [
  'cutting',
  'edge-banding',
  'carcass-drilling',
  'hinge-cup',
  'drawer-drilling',
  'back-groove',
] as const;

const EXTRA_CATEGORIES = new Set(['worktop', 'plinth', 'filler', 'decor', 'delivery', 'installation']);

function parameters(item: PriceBookItem | undefined) {
  return item?.parameters_json && typeof item.parameters_json === 'object' && !Array.isArray(item.parameters_json)
    ? item.parameters_json as Record<string, unknown>
    : {};
}

export function isDemoPriceBookItem(item: PriceBookItem | undefined) {
  return Boolean(parameters(item).demo);
}

function stateForItems(items: PriceBookItem[]) : PriceBookSetupState {
  if (!items.length) return 'missing';
  return items.every(isDemoPriceBookItem) ? 'demo' : 'ready';
}

export function priceBookSetupStatus(settings: unknown, items: PriceBookItem[]) {
  const defaults = validatedPriceBookDefaults(settings, items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const defaultItem = (id: string | undefined) => id ? byId.get(id) : undefined;
  const defaultState = (id: string | undefined): PriceBookSetupState => {
    const item = defaultItem(id);
    if (!item) return 'missing';
    return isDemoPriceBookItem(item) ? 'demo' : 'ready';
  };

  const operationsByKey = new Map<string, PriceBookItem[]>();
  for (const item of items) {
    if (item.category !== 'operation') continue;
    const key = String(parameters(item).operationKey ?? '');
    if (!key) continue;
    operationsByKey.set(key, [...(operationsByKey.get(key) ?? []), item]);
  }
  const missingOperationKeys = REQUIRED_OPERATION_KEYS.filter((key) => !(operationsByKey.get(key)?.length));
  const operationItems = REQUIRED_OPERATION_KEYS.flatMap((key) => operationsByKey.get(key) ?? []);
  const operationState: PriceBookSetupState = missingOperationKeys.length
    ? 'missing'
    : stateForItems(operationItems);

  const extras = items.filter((item) => EXTRA_CATEGORIES.has(item.category));

  const steps: PriceBookSetupStep[] = [
    { key:'board', state:defaultState(defaults.boardItemId), required:true, count:items.filter((item)=>item.category==='board').length },
    { key:'front', state:defaultState(defaults.frontItemId), required:true, count:items.filter((item)=>item.category==='front').length },
    { key:'edge', state:defaultState(defaults.edgeItemId), required:true, count:items.filter((item)=>item.category==='edge').length },
    { key:'hinge', state:defaultState(defaults.hingeItemId), required:true, count:items.filter((item)=>item.category==='hardware' && !parameters(item).hardwareRole).length },
    { key:'drawer', state:defaultState(defaults.drawerItemId), required:true, count:items.filter((item)=>item.category==='hardware' && !parameters(item).hardwareRole).length },
    { key:'operations', state:operationState, required:true, count:operationItems.length, missingKeys:missingOperationKeys },
    { key:'labour', state:defaultState(defaults.labourItemId), required:true, count:items.filter((item)=>item.category==='labour').length },
    { key:'extras', state:stateForItems(extras), required:false, count:extras.length },
  ];

  const requiredSteps = steps.filter((step) => step.required);
  const requiredReady = requiredSteps.filter((step) => step.state === 'ready').length;
  const displayReady = steps.filter((step) => step.state === 'ready').length;
  const demoSteps = steps.filter((step) => step.state === 'demo').length;
  const realItems = items.filter((item) => !isDemoPriceBookItem(item)).length;
  const demoItems = items.filter(isDemoPriceBookItem).length;

  return {
    steps,
    requiredReady,
    requiredTotal: requiredSteps.length,
    displayReady,
    total: steps.length,
    demoSteps,
    coreReady: requiredReady === requiredSteps.length,
    realItems,
    demoItems,
    defaults,
  };
}
