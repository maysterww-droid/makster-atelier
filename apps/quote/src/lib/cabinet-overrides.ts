import { calculateQuote } from './calculation';
import { calculateCabinetPreview, type CabinetCostPreview, type CabinetInput, type PriceBookItem } from './engineering';

export type QuoteCabinetInput = CabinetInput & {
  frontWidthMm?: number;
};

function moneyMinor(item: PriceBookItem | undefined) {
  const value = Number(item?.purchase_price_minor ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function parameter(item: PriceBookItem | undefined, key: string) {
  const value = Number(item?.parameters_json?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function areaCost(item: PriceBookItem | undefined, areaM2: number) {
  if (!item || areaM2 <= 0) return 0n;
  const price = moneyMinor(item);
  if (item.unit === 'm2') return BigInt(Math.round(areaM2 * price));
  if (item.unit === 'sheet') {
    const width = parameter(item, 'sheetWidthMm');
    const height = parameter(item, 'sheetHeightMm');
    const waste = Math.max(0, parameter(item, 'wastePct'));
    if (!(width > 0 && height > 0)) return 0n;
    const sheetArea = width * height / 1_000_000;
    return BigInt(Math.round((areaM2 / sheetArea) * (1 + waste / 100) * price));
  }
  return 0n;
}

function linearCost(item: PriceBookItem | undefined, lengthM: number) {
  if (!item || item.unit !== 'm' || lengthM <= 0) return 0n;
  return BigInt(Math.round(lengthM * moneyMinor(item)));
}

export function calculateQuoteCabinetPreview(
  input: QuoteCabinetInput,
  items: PriceBookItem[],
  options: { targetMarginBps: number; overheadBps?: number; taxBps?: number },
): CabinetCostPreview {
  const base = calculateCabinetPreview(input, items, options);
  const requested = Number(input.frontWidthMm ?? 0);
  if (!(requested > 0) || !['b-door', 'w-door'].includes(input.moduleKey)) return base;

  const index = base.parts.findIndex((part) => part.key === 'door-front');
  if (index < 0) return base;
  const oldPart = base.parts[index];
  const doors = Math.max(1, oldPart.quantity);
  const gap = Math.max(0, Number(input.gapMm) || 0);
  const visibleWidth = Math.max(1, Math.min(Number(input.widthMm), requested));
  const newWidth = Math.max(1, (visibleWidth - Math.max(0, doors - 1) * gap) / doors);
  const oldFrontM2 = oldPart.lengthMm * oldPart.widthMm * oldPart.quantity / 1_000_000;
  const newFrontM2 = oldPart.lengthMm * newWidth * oldPart.quantity / 1_000_000;
  const oldFrontEdgeM = oldPart.edgeLengthMm * oldPart.quantity / 1000;
  const newEdgePerPart = input.frontEdgeIncluded ? 0 : 2 * (oldPart.lengthMm + newWidth);
  const newFrontEdgeM = newEdgePerPart * oldPart.quantity / 1000;

  const frontItem = input.frontItemId ? items.find((item) => item.id === input.frontItemId) : undefined;
  const edgeItem = input.edgeItemId ? items.find((item) => item.id === input.edgeItemId) : undefined;
  const oldFrontCost = base.detailCosts.fronts;
  const newFrontCost = areaCost(frontItem, newFrontM2);
  const edgeWithoutFront = base.detailCosts.edges - linearCost(edgeItem, oldFrontEdgeM);
  const newEdgeCost = edgeWithoutFront + linearCost(edgeItem, newFrontEdgeM);

  const parts = [...base.parts];
  parts[index] = { ...oldPart, widthMm: Math.round(newWidth * 100) / 100, edgeLengthMm: Math.round(newEdgePerPart * 100) / 100 };

  let operations = base.operations;
  let productionCost = base.detailCosts.operations;
  const edgeOperationIndex = base.operations.findIndex((operation) => operation.key === 'edge-banding');
  if (edgeOperationIndex >= 0) {
    const operation = base.operations[edgeOperationIndex];
    const quantity = Math.max(0, operation.quantity - oldFrontEdgeM + newFrontEdgeM);
    const operationItem = operation.priceBookItemId ? items.find((item) => item.id === operation.priceBookItemId) : undefined;
    let costMinor = operation.costMinor;
    if (operationItem?.unit === 'm') costMinor = BigInt(Math.round(quantity * moneyMinor(operationItem)));
    operations = [...base.operations];
    operations[edgeOperationIndex] = { ...operation, quantity, costMinor };
    productionCost = operations.reduce((sum, line) => sum + line.costMinor, 0n);
  }

  const costs = {
    ...base.costs,
    fronts: newFrontCost,
    edges: newEdgeCost,
    production: productionCost,
  };
  const pricing = calculateQuote({
    costs,
    overheadBps: options.overheadBps ?? 0,
    targetMarginBps: options.targetMarginBps,
    taxBps: options.taxBps ?? 0,
  });

  return {
    ...base,
    parts,
    operations,
    usage: {
      ...base.usage,
      frontM2: Math.max(0, base.usage.frontM2 - oldFrontM2 + newFrontM2),
      edgeM: Math.max(0, base.usage.edgeM - oldFrontEdgeM + newFrontEdgeM),
    },
    detailCosts: {
      ...base.detailCosts,
      fronts: newFrontCost,
      edges: newEdgeCost,
      operations: productionCost,
    },
    costs,
    pricing,
    notes: [
      ...base.notes,
      `Глухой угловой модуль: мебельный фасад рассчитан по видимой ширине ${visibleWidth.toFixed(0)} мм при ширине корпуса ${Number(input.widthMm).toFixed(0)} мм. Точная угловая геометрия и присадка относятся к Makster Pro.`,
    ],
  };
}
