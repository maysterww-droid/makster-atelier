import { calculateQuote, type CostBreakdown, type QuotePricingResult } from './calculation';

export type PriceBookItem = {
  id: string;
  category: string;
  name: string;
  unit: string;
  currency: string;
  purchase_price_minor: number | string;
  parameters_json: Record<string, unknown> | null;
};

export type CabinetInput = {
  moduleKey: 'b-door' | 'b-drawer' | 'generic';
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  gapMm: number;
  drawers: number;
  boardItemId?: string;
  frontItemId?: string;
  edgeItemId?: string;
  hardwareItemId?: string;
  labourItemId?: string;
  labourHours?: number;
};

export type CabinetUsage = {
  boardM2: number;
  frontM2: number;
  edgeM: number;
  hardwareQty: number;
  labourHours: number;
};

export type CabinetCostPreview = {
  usage: CabinetUsage;
  costs: CostBreakdown;
  pricing: QuotePricingResult;
  warnings: string[];
};

function finitePositive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function itemById(items: PriceBookItem[], id?: string) {
  return id ? items.find((item) => item.id === id) : undefined;
}

function minor(item?: PriceBookItem) {
  if (!item) return 0;
  const value = Number(item.purchase_price_minor);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function parameterNumber(item: PriceBookItem | undefined, key: string, fallback = 0) {
  const raw = item?.parameters_json?.[key];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function roundedMinor(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value));
}

function areaCost(item: PriceBookItem | undefined, areaM2: number, warnings: string[], label: string) {
  if (!item) {
    warnings.push(`Не выбрана цена: ${label}.`);
    return 0n;
  }

  const price = minor(item);
  if (item.unit === 'm2') return roundedMinor(areaM2 * price);

  if (item.unit === 'sheet') {
    const width = parameterNumber(item, 'sheetWidthMm');
    const height = parameterNumber(item, 'sheetHeightMm');
    const wastePct = Math.max(0, parameterNumber(item, 'wastePct'));
    if (width <= 0 || height <= 0) {
      warnings.push(`${item.name}: задайте размер листа в прайс-листе.`);
      return 0n;
    }
    const sheetArea = (width * height) / 1_000_000;
    const allocatedSheets = (areaM2 / sheetArea) * (1 + wastePct / 100);
    return roundedMinor(allocatedSheets * price);
  }

  warnings.push(`${item.name}: для плит/фасадов поддерживаются единицы m² или лист.`);
  return 0n;
}

function linearCost(item: PriceBookItem | undefined, lengthM: number, warnings: string[]) {
  if (!item) {
    warnings.push('Не выбрана цена кромки.');
    return 0n;
  }
  if (item.unit !== 'm') {
    warnings.push(`${item.name}: кромка должна иметь единицу «м».`);
    return 0n;
  }
  return roundedMinor(lengthM * minor(item));
}

function pieceCost(item: PriceBookItem | undefined, quantity: number, warnings: string[]) {
  if (!item) {
    warnings.push('Не выбрана фурнитура.');
    return 0n;
  }
  if (item.unit !== 'pcs' && item.unit !== 'set') {
    warnings.push(`${item.name}: фурнитура должна иметь единицу «шт» или «комплект».`);
    return 0n;
  }
  return roundedMinor(quantity * minor(item));
}

function labourCost(item: PriceBookItem | undefined, hours: number, warnings: string[]) {
  if (hours <= 0) return 0n;
  if (!item) {
    warnings.push('Указано время работы, но не выбрана часовая ставка.');
    return 0n;
  }
  if (item.unit !== 'hour') {
    warnings.push(`${item.name}: ставка труда должна иметь единицу «час».`);
    return 0n;
  }
  return roundedMinor(hours * minor(item));
}

export function calculateCabinetPreview(
  input: CabinetInput,
  items: PriceBookItem[],
  options: { targetMarginBps: number; overheadBps?: number; taxBps?: number },
): CabinetCostPreview {
  const width = finitePositive(input.widthMm, 800);
  const height = finitePositive(input.heightMm, 720);
  const depth = finitePositive(input.depthMm, 560);
  const thickness = finitePositive(input.thicknessMm, 18);
  const gap = Math.max(0, Number.isFinite(input.gapMm) ? input.gapMm : 2);
  const innerWidth = Math.max(1, width - 2 * thickness);
  const shelfDepth = Math.max(1, depth - 20);
  const stretcherDepth = Math.min(100, depth);

  const sideArea = (2 * height * depth) / 1_000_000;
  const bottomArea = (innerWidth * depth) / 1_000_000;
  const stretcherArea = (2 * innerWidth * stretcherDepth) / 1_000_000;
  const shelfArea = input.moduleKey === 'b-door' ? (innerWidth * shelfDepth) / 1_000_000 : 0;
  const boardM2 = sideArea + bottomArea + stretcherArea + shelfArea;

  const frontWidth = Math.max(1, width - 2 * gap);
  const frontHeight = Math.max(1, height - 2 * gap);
  const frontM2 = (frontWidth * frontHeight) / 1_000_000;
  const edgeM = (2 * height + innerWidth + (input.moduleKey === 'b-door' ? innerWidth : 0)) / 1000;
  const hardwareQty = input.moduleKey === 'b-drawer'
    ? Math.max(1, Math.round(input.drawers || 2))
    : input.moduleKey === 'b-door'
      ? (height > 900 ? 3 : 2)
      : 0;
  const labourHours = Math.max(0, input.labourHours ?? 0);

  const warnings: string[] = [];
  const board = itemById(items, input.boardItemId);
  const front = itemById(items, input.frontItemId);
  const edge = itemById(items, input.edgeItemId);
  const hardware = itemById(items, input.hardwareItemId);
  const labour = itemById(items, input.labourItemId);

  const costs: CostBreakdown = {
    board: areaCost(board, boardM2, warnings, 'плита корпуса'),
    fronts: areaCost(front, frontM2, warnings, 'фасад'),
    edges: linearCost(edge, edgeM, warnings),
    hardware: hardwareQty > 0 ? pieceCost(hardware, hardwareQty, warnings) : 0n,
    production: 0n,
    labour: labourCost(labour, labourHours, warnings),
    delivery: 0n,
    installation: 0n,
  };

  warnings.push('Операции производства, доставка и монтаж пока не добавлены в расчёт MQ 0.1.1.');

  return {
    usage: { boardM2, frontM2, edgeM, hardwareQty, labourHours },
    costs,
    pricing: calculateQuote({
      costs,
      overheadBps: options.overheadBps ?? 0,
      targetMarginBps: options.targetMarginBps,
      taxBps: options.taxBps ?? 0,
    }),
    warnings,
  };
}

export function costPreviewToJson(preview: CabinetCostPreview) {
  return {
    usage: preview.usage,
    costs: Object.fromEntries(Object.entries(preview.costs).map(([key, value]) => [key, value?.toString() ?? '0'])),
    directCostMinor: preview.pricing.directCostMinor.toString(),
    overheadMinor: preview.pricing.overheadMinor.toString(),
    trueCostMinor: preview.pricing.trueCostMinor.toString(),
    netSalesMinor: preview.pricing.netSalesMinor.toString(),
    taxMinor: preview.pricing.taxMinor.toString(),
    grossSalesMinor: preview.pricing.grossSalesMinor.toString(),
    profitMinor: preview.pricing.profitMinor.toString(),
    marginBps: preview.pricing.marginBps,
    markupBps: preview.pricing.markupBps,
    warnings: preview.warnings,
    engineVersion: 'mq-0.1.1-preview',
  };
}
