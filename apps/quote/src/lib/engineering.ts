import { calculateQuote, type CostBreakdown, type QuotePricingResult } from './calculation';

export type ModuleKey = 'b-door' | 'b-drawer' | 'generic';
export type BackMode = 'none' | 'overlay' | 'groove';
export type MaterialRole = 'board' | 'front' | 'back';
export type OperationKey =
  | 'cutting'
  | 'edge-banding'
  | 'carcass-drilling'
  | 'hinge-cup'
  | 'drawer-drilling'
  | 'back-groove';

export const OPERATION_LABELS: Record<OperationKey, string> = {
  cutting: 'Раскрой деталей',
  'edge-banding': 'Кромление',
  'carcass-drilling': 'Присадка корпуса',
  'hinge-cup': 'Присадка чашек петель',
  'drawer-drilling': 'Присадка ящиков',
  'back-groove': 'Паз задней стенки',
};

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
  moduleKey: ModuleKey;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  gapMm: number;
  drawers: number;
  doors: number;
  shelfCount: number;
  stretcherDepthMm?: number;
  shelfSetbackMm?: number;
  backMode: BackMode;
  backThicknessMm: number;
  backInsetMm: number;
  backGrooveDepthMm: number;
  frontEdgeIncluded: boolean;
  boardItemId?: string;
  frontItemId?: string;
  backItemId?: string;
  edgeItemId?: string;
  hingeItemId?: string;
  drawerItemId?: string;
  labourItemId?: string;
  labourHours?: number;
};

export type CabinetPart = {
  key: string;
  label: string;
  materialRole: MaterialRole;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  edgeLengthMm: number;
  grain: 'length' | 'width' | 'none';
};

export type HardwareUsage = {
  key: 'hinge' | 'drawer-system';
  label: string;
  quantity: number;
  priceBookItemId?: string;
  itemName?: string;
  costMinor: bigint;
};

export type OperationUsage = {
  key: OperationKey;
  label: string;
  quantity: number;
  unit: 'pcs' | 'm';
  priceBookItemId?: string;
  itemName?: string;
  costMinor: bigint;
};

type PendingOperation = Omit<OperationUsage, 'priceBookItemId' | 'itemName' | 'costMinor'>;

export type CabinetUsage = {
  boardM2: number;
  frontM2: number;
  backM2: number;
  edgeM: number;
  partCount: number;
  hardwareQty: number;
  labourHours: number;
};

export type CabinetDetailCosts = {
  carcass: bigint;
  back: bigint;
  fronts: bigint;
  edges: bigint;
  hardware: bigint;
  operations: bigint;
  labour: bigint;
};

export type CabinetCostPreview = {
  parts: CabinetPart[];
  hardware: HardwareUsage[];
  operations: OperationUsage[];
  usage: CabinetUsage;
  detailCosts: CabinetDetailCosts;
  costs: CostBreakdown;
  pricing: QuotePricingResult;
  warnings: string[];
  notes: string[];
  complete: boolean;
};

function finitePositive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNonNegative(value: number, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function positiveInteger(value: number, fallback: number, max = 20) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.round(value)));
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

function parameterString(item: PriceBookItem | undefined, key: string) {
  const raw = item?.parameters_json?.[key];
  return typeof raw === 'string' ? raw : '';
}

function roundedMinor(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value));
}

function sumBigInt(values: bigint[]) {
  return values.reduce((sum, value) => sum + value, 0n);
}

function partAreaM2(part: CabinetPart) {
  return (part.lengthMm * part.widthMm * part.quantity) / 1_000_000;
}

function areaForRole(parts: CabinetPart[], role: MaterialRole) {
  return parts.filter((part) => part.materialRole === role).reduce((sum, part) => sum + partAreaM2(part), 0);
}

function areaCost(item: PriceBookItem | undefined, areaM2: number, warnings: string[], label: string) {
  if (areaM2 <= 0) return 0n;
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

  warnings.push(`${item.name}: для листовых материалов поддерживаются единицы m² или лист.`);
  return 0n;
}

function linearCost(item: PriceBookItem | undefined, lengthM: number, warnings: string[], label: string) {
  if (lengthM <= 0) return 0n;
  if (!item) {
    warnings.push(`Не выбрана цена: ${label}.`);
    return 0n;
  }
  if (item.unit !== 'm') {
    warnings.push(`${item.name}: ${label.toLowerCase()} должна иметь единицу «м».`);
    return 0n;
  }
  return roundedMinor(lengthM * minor(item));
}

function pieceCost(item: PriceBookItem | undefined, quantity: number, warnings: string[], label: string) {
  if (quantity <= 0) return 0n;
  if (!item) {
    warnings.push(`Не выбрана цена: ${label}.`);
    return 0n;
  }
  if (item.unit !== 'pcs' && item.unit !== 'set') {
    warnings.push(`${item.name}: ${label.toLowerCase()} должна иметь единицу «шт» или «комплект».`);
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

function makePart(
  key: string,
  label: string,
  materialRole: MaterialRole,
  quantity: number,
  lengthMm: number,
  widthMm: number,
  thicknessMm: number,
  edgeLengthMm: number,
  grain: CabinetPart['grain'] = 'length',
): CabinetPart {
  return {
    key,
    label,
    materialRole,
    quantity,
    lengthMm: Math.max(1, Math.round(lengthMm * 100) / 100),
    widthMm: Math.max(1, Math.round(widthMm * 100) / 100),
    thicknessMm: Math.max(0.1, Math.round(thicknessMm * 100) / 100),
    edgeLengthMm: Math.max(0, Math.round(edgeLengthMm * 100) / 100),
    grain,
  };
}

function hingesPerDoor(heightMm: number) {
  if (heightMm <= 900) return 2;
  if (heightMm <= 1500) return 3;
  if (heightMm <= 2100) return 4;
  return 5;
}

function generateParts(input: CabinetInput, items: PriceBookItem[]) {
  const width = finitePositive(input.widthMm, 800);
  const height = finitePositive(input.heightMm, 720);
  const depth = finitePositive(input.depthMm, 560);
  const thickness = finitePositive(input.thicknessMm, 18);
  const gap = finiteNonNegative(input.gapMm, 2);
  const innerWidth = Math.max(1, width - 2 * thickness);
  const stretcherDepth = Math.min(depth, finitePositive(input.stretcherDepthMm ?? 100, 100));
  const shelfSetback = Math.min(depth - 1, finiteNonNegative(input.shelfSetbackMm ?? 20, 20));
  const shelfDepth = Math.max(1, depth - shelfSetback);
  const shelfCount = positiveInteger(input.shelfCount, input.moduleKey === 'b-door' ? 1 : 0, 10);
  const parts: CabinetPart[] = [];

  parts.push(makePart('side', 'Боковина', 'board', 2, height, depth, thickness, height));
  parts.push(makePart('bottom', 'Дно', 'board', 1, innerWidth, depth, thickness, innerWidth));

  if (input.moduleKey === 'generic') {
    parts.push(makePart('top', 'Верх', 'board', 1, innerWidth, depth, thickness, innerWidth));
  } else {
    parts.push(makePart('stretcher', 'Царга верхняя', 'board', 2, innerWidth, stretcherDepth, thickness, innerWidth));
  }

  if (shelfCount > 0) {
    parts.push(makePart('shelf', 'Полка', 'board', shelfCount, innerWidth, shelfDepth, thickness, innerWidth));
  }

  const frontItem = itemById(items, input.frontItemId);
  const frontThickness = finitePositive(parameterNumber(frontItem, 'thicknessMm', thickness), thickness);

  if (input.moduleKey === 'b-door') {
    const doors = Math.max(1, positiveInteger(input.doors, 1, 4));
    const frontHeight = Math.max(1, height - 2 * gap);
    const totalFrontWidth = Math.max(1, width - (doors + 1) * gap);
    const frontWidth = totalFrontWidth / doors;
    const edgePerFront = input.frontEdgeIncluded ? 0 : 2 * (frontHeight + frontWidth);
    parts.push(makePart('door-front', 'Фасад двери', 'front', doors, frontHeight, frontWidth, frontThickness, edgePerFront));
  }

  if (input.moduleKey === 'b-drawer') {
    const drawers = Math.max(1, positiveInteger(input.drawers, 2, 8));
    const frontWidth = Math.max(1, width - 2 * gap);
    const totalFrontHeight = Math.max(1, height - (drawers + 1) * gap);
    const frontHeight = totalFrontHeight / drawers;
    const edgePerFront = input.frontEdgeIncluded ? 0 : 2 * (frontHeight + frontWidth);
    parts.push(makePart('drawer-front', 'Фасад ящика', 'front', drawers, frontHeight, frontWidth, frontThickness, edgePerFront));
  }

  if (input.backMode !== 'none') {
    const backThickness = finitePositive(input.backThicknessMm, 4);
    let backWidth = width;
    let backHeight = height;
    if (input.backMode === 'groove') {
      const inset = finiteNonNegative(input.backInsetMm, 10);
      const grooveDepth = finiteNonNegative(input.backGrooveDepthMm, 8);
      backWidth = Math.max(1, width - 2 * inset + 2 * grooveDepth);
      backHeight = Math.max(1, height - 2 * inset + 2 * grooveDepth);
    }
    parts.push(makePart('back', input.backMode === 'groove' ? 'Задняя стенка в паз' : 'Задняя стенка накладная', 'back', 1, backHeight, backWidth, backThickness, 0, 'none'));
  }

  return parts;
}

function findOperationItem(items: PriceBookItem[], key: OperationKey) {
  return items.find((item) => item.category === 'operation' && parameterString(item, 'operationKey') === key);
}

function operationCost(item: PriceBookItem | undefined, operation: PendingOperation, warnings: string[]) {
  if (!item) {
    warnings.push(`В прайс-листе нет операции: ${operation.label}.`);
    return 0n;
  }
  if (item.unit === 'job') return roundedMinor(minor(item));
  if (item.unit !== operation.unit) {
    warnings.push(`${item.name}: ожидается единица «${operation.unit === 'm' ? 'м' : 'шт'}» или «заказ».`);
    return 0n;
  }
  return roundedMinor(operation.quantity * minor(item));
}

function buildHardware(input: CabinetInput, items: PriceBookItem[], warnings: string[]): HardwareUsage[] {
  if (input.moduleKey === 'b-door') {
    const doors = Math.max(1, positiveInteger(input.doors, 1, 4));
    const quantity = doors * hingesPerDoor(finitePositive(input.heightMm, 720));
    const item = itemById(items, input.hingeItemId);
    return [{
      key: 'hinge',
      label: 'Петли',
      quantity,
      priceBookItemId: item?.id,
      itemName: item?.name,
      costMinor: pieceCost(item, quantity, warnings, 'петли'),
    }];
  }

  if (input.moduleKey === 'b-drawer') {
    const quantity = Math.max(1, positiveInteger(input.drawers, 2, 8));
    const item = itemById(items, input.drawerItemId);
    return [{
      key: 'drawer-system',
      label: 'Комплекты ящиков',
      quantity,
      priceBookItemId: item?.id,
      itemName: item?.name,
      costMinor: pieceCost(item, quantity, warnings, 'комплекты ящиков'),
    }];
  }

  return [];
}

function buildOperations(input: CabinetInput, parts: CabinetPart[], hardware: HardwareUsage[], items: PriceBookItem[], warnings: string[]): OperationUsage[] {
  const partCount = parts.reduce((sum, part) => sum + part.quantity, 0);
  const carcassPartCount = parts.filter((part) => part.materialRole === 'board').reduce((sum, part) => sum + part.quantity, 0);
  const edgeM = parts.reduce((sum, part) => sum + (part.edgeLengthMm * part.quantity) / 1000, 0);
  const hingeQty = hardware.find((line) => line.key === 'hinge')?.quantity ?? 0;
  const drawerQty = hardware.find((line) => line.key === 'drawer-system')?.quantity ?? 0;
  const backPart = parts.find((part) => part.key === 'back');
  const backGrooveM = input.backMode === 'groove' && backPart
    ? (2 * (backPart.lengthMm + backPart.widthMm)) / 1000
    : 0;

  const candidates: PendingOperation[] = [
    { key: 'cutting', label: OPERATION_LABELS.cutting, quantity: partCount, unit: 'pcs' },
    { key: 'edge-banding', label: OPERATION_LABELS['edge-banding'], quantity: edgeM, unit: 'm' },
    { key: 'carcass-drilling', label: OPERATION_LABELS['carcass-drilling'], quantity: carcassPartCount, unit: 'pcs' },
    { key: 'hinge-cup', label: OPERATION_LABELS['hinge-cup'], quantity: hingeQty, unit: 'pcs' },
    { key: 'drawer-drilling', label: OPERATION_LABELS['drawer-drilling'], quantity: drawerQty, unit: 'pcs' },
    { key: 'back-groove', label: OPERATION_LABELS['back-groove'], quantity: backGrooveM, unit: 'm' },
  ];
  const raw = candidates.filter((operation) => operation.quantity > 0.0001);

  return raw.map((operation) => {
    const item = findOperationItem(items, operation.key);
    return {
      ...operation,
      priceBookItemId: item?.id,
      itemName: item?.name,
      costMinor: operationCost(item, operation, warnings),
    };
  });
}

export function calculateCabinetPreview(
  input: CabinetInput,
  items: PriceBookItem[],
  options: { targetMarginBps: number; overheadBps?: number; taxBps?: number },
): CabinetCostPreview {
  const parts = generateParts(input, items);
  const warnings: string[] = [];
  const notes: string[] = [];

  const boardM2 = areaForRole(parts, 'board');
  const frontM2 = areaForRole(parts, 'front');
  const backM2 = areaForRole(parts, 'back');
  const edgeM = parts.reduce((sum, part) => sum + (part.edgeLengthMm * part.quantity) / 1000, 0);
  const labourHours = finiteNonNegative(input.labourHours ?? 0, 0);

  const board = itemById(items, input.boardItemId);
  const front = itemById(items, input.frontItemId);
  const back = itemById(items, input.backItemId);
  const edge = itemById(items, input.edgeItemId);
  const labour = itemById(items, input.labourItemId);

  const carcassCost = areaCost(board, boardM2, warnings, 'плита корпуса');
  const backCost = areaCost(back, backM2, warnings, 'материал задней стенки');
  const frontCost = areaCost(front, frontM2, warnings, 'фасад');
  const edgeCost = linearCost(edge, edgeM, warnings, 'кромка');
  const hardware = buildHardware(input, items, warnings);
  const hardwareCost = sumBigInt(hardware.map((line) => line.costMinor));
  const operations = buildOperations(input, parts, hardware, items, warnings);
  const operationsCost = sumBigInt(operations.map((operation) => operation.costMinor));
  const directLabourCost = labourCost(labour, labourHours, warnings);

  if (labourHours <= 0) {
    notes.push('Прямой труд не добавлен: время работы модуля равно 0 ч. Операционные расценки считаются отдельно.');
  }
  notes.push('Листовые материалы распределяются по площади + процент отхода из Price Book; оптимизация раскроя листов будет отдельным этапом.');
  notes.push('Доставка и монтаж относятся к проекту целиком и не включаются в себестоимость отдельного модуля.');
  if (input.backMode === 'groove') {
    notes.push('Размер задней стенки в паз — коммерческая геометрия для калькуляции, не CNC-релиз. Точная привязка паза будет задаваться производственным профилем.');
  }

  const detailCosts: CabinetDetailCosts = {
    carcass: carcassCost,
    back: backCost,
    fronts: frontCost,
    edges: edgeCost,
    hardware: hardwareCost,
    operations: operationsCost,
    labour: directLabourCost,
  };

  const costs: CostBreakdown = {
    board: carcassCost + backCost,
    fronts: frontCost,
    edges: edgeCost,
    hardware: hardwareCost,
    production: operationsCost,
    labour: directLabourCost,
    delivery: 0n,
    installation: 0n,
  };

  const pricing = calculateQuote({
    costs,
    overheadBps: options.overheadBps ?? 0,
    targetMarginBps: options.targetMarginBps,
    taxBps: options.taxBps ?? 0,
  });

  return {
    parts,
    hardware,
    operations,
    usage: {
      boardM2,
      frontM2,
      backM2,
      edgeM,
      partCount: parts.reduce((sum, part) => sum + part.quantity, 0),
      hardwareQty: hardware.reduce((sum, line) => sum + line.quantity, 0),
      labourHours,
    },
    detailCosts,
    costs,
    pricing,
    warnings,
    notes,
    complete: warnings.length === 0,
  };
}

export function costPreviewToJson(preview: CabinetCostPreview) {
  return {
    usage: preview.usage,
    detailCosts: Object.fromEntries(Object.entries(preview.detailCosts).map(([key, value]) => [key, value.toString()])),
    costs: Object.fromEntries(Object.entries(preview.costs).map(([key, value]) => [key, value?.toString() ?? '0'])),
    parts: preview.parts,
    hardware: preview.hardware.map((line) => ({ ...line, costMinor: line.costMinor.toString() })),
    operations: preview.operations.map((line) => ({ ...line, costMinor: line.costMinor.toString() })),
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
    notes: preview.notes,
    complete: preview.complete,
    engineVersion: 'mq-0.1.2-engineering',
  };
}
