import { calculateQuote } from './calculation';
import { calculateCabinetPreview, type CabinetCostPreview, type CabinetInput, type PriceBookItem } from './engineering';
import type { SpecialHardwareRole } from './special-hardware-presets';

export type QuoteCabinetInput = CabinetInput & {
  frontWidthMm?: number;
  specialHardwareRole?: SpecialHardwareRole;
  specialHardwareQty?: number;
  specialHardwareItemId?: string;
};

function moneyMinor(item: PriceBookItem | undefined) {
  const value = Number(item?.purchase_price_minor ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function parameter(item: PriceBookItem | undefined, key: string) {
  const value = Number(item?.parameters_json?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function isDemo(item: PriceBookItem | undefined) {
  return Boolean(item?.parameters_json && typeof item.parameters_json === 'object' && !Array.isArray(item.parameters_json) && item.parameters_json.demo);
}

function applyDemoGuard(preview: CabinetCostPreview, input: QuoteCabinetInput, items: PriceBookItem[]) {
  const ids = new Set<string>([
    input.boardItemId,
    input.frontItemId,
    input.backItemId,
    input.edgeItemId,
    input.hingeItemId,
    input.drawerItemId,
    input.labourItemId,
    input.specialHardwareItemId,
    ...preview.hardware.map((line) => line.priceBookItemId),
    ...preview.operations.map((line) => line.priceBookItemId),
  ].filter((id): id is string => Boolean(id)));
  const demoNames = items.filter((item) => ids.has(item.id) && isDemo(item)).map((item) => item.name);
  if (!demoNames.length) return preview;
  const message = `DEMO Price Book: замените тестовые позиции реальными закупочными ценами (${demoNames.join(', ')}).`;
  return {
    ...preview,
    warnings: preview.warnings.includes(message) ? preview.warnings : [...preview.warnings, message],
    notes: [...preview.notes, 'DEMO-цены предназначены только для изучения Makster Quote и не разрешают считать коммерческий расчёт готовым.'],
    complete: false,
  };
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

function specialLabel(role: SpecialHardwareRole) {
  if (role === 'cargo') return 'Cargo / бутылочница';
  if (role === 'lift') return 'Lift-Up / Aventos';
  if (role === 'corner') return 'Угловой механизм / LeMans / Magic Corner';
  if (role === 'rail') return 'Гардеробная штанга / крепления';
  return 'Раздвижная система фасадов';
}

function applySpecialHardware(base: CabinetCostPreview, input: QuoteCabinetInput, items: PriceBookItem[], options: { targetMarginBps:number; overheadBps?:number; taxBps?:number }) {
  const role = input.specialHardwareRole;
  if (!role) return base;
  const quantity = Math.max(1, Math.round(Number(input.specialHardwareQty ?? 1) || 1));
  const item = input.specialHardwareItemId ? items.find((candidate) => candidate.id === input.specialHardwareItemId) : undefined;
  const replacesStandardHinges = role === 'cargo' || role === 'lift' || role === 'sliding';

  let hardware = [...base.hardware];
  let operations = [...base.operations];
  let warnings = [...base.warnings];
  let removedHardwareCost = 0n;
  let removedHardwareQty = 0;
  let removedOperationCost = 0n;

  if (replacesStandardHinges) {
    const hinges = hardware.filter((line) => line.key === 'hinge');
    removedHardwareCost = hinges.reduce((sum, line) => sum + line.costMinor, 0n);
    removedHardwareQty = hinges.reduce((sum, line) => sum + line.quantity, 0);
    hardware = hardware.filter((line) => line.key !== 'hinge');
    const hingeOperations = operations.filter((line) => line.key === 'hinge-cup');
    removedOperationCost = hingeOperations.reduce((sum, line) => sum + line.costMinor, 0n);
    operations = operations.filter((line) => line.key !== 'hinge-cup');
    warnings = warnings.filter((warning) => !/петел|петли/i.test(warning));
  }

  let specialCost = 0n;
  if (!item) {
    warnings.push(`Не выбрана цена: ${specialLabel(role)}.`);
  } else if (item.category !== 'hardware' || !['pcs','set'].includes(item.unit)) {
    warnings.push(`${item.name}: специальная фурнитура должна иметь категорию hardware и единицу «шт» или «комплект».`);
  } else {
    specialCost = BigInt(Math.round(quantity * moneyMinor(item)));
  }

  const specialLine = {
    key:'special-hardware' as never,
    label:specialLabel(role),
    quantity,
    priceBookItemId:item?.id,
    itemName:item?.name,
    costMinor:specialCost,
  } as CabinetCostPreview['hardware'][number];
  hardware.push(specialLine);

  const hardwareCost = base.detailCosts.hardware - removedHardwareCost + specialCost;
  const productionCost = base.detailCosts.operations - removedOperationCost;
  const costs = {
    ...base.costs,
    hardware: hardwareCost,
    production: productionCost,
  };
  const pricing = calculateQuote({costs,overheadBps:options.overheadBps??0,targetMarginBps:options.targetMarginBps,taxBps:options.taxBps??0});

  return {
    ...base,
    hardware,
    operations,
    warnings,
    complete:warnings.length===0,
    usage:{...base.usage,hardwareQty:Math.max(0,base.usage.hardwareQty-removedHardwareQty)+quantity},
    detailCosts:{...base.detailCosts,hardware:hardwareCost,operations:productionCost},
    costs,
    pricing,
    notes:[...base.notes,`${specialLabel(role)} считается отдельной позицией фурнитуры Price Book, ${quantity} комплект(а).${replacesStandardHinges?' Стандартные петли для этого пресета не считаются.':''}`],
  };
}

export function calculateQuoteCabinetPreview(
  input: QuoteCabinetInput,
  items: PriceBookItem[],
  options: { targetMarginBps: number; overheadBps?: number; taxBps?: number },
): CabinetCostPreview {
  const withSpecial = applySpecialHardware(calculateCabinetPreview(input, items, options), input, items, options);
  const requested = Number(input.frontWidthMm ?? 0);
  if (!(requested > 0) || !['b-door', 'w-door'].includes(input.moduleKey)) return applyDemoGuard(withSpecial, input, items);

  const index = withSpecial.parts.findIndex((part) => part.key === 'door-front');
  if (index < 0) return applyDemoGuard(withSpecial, input, items);
  const oldPart = withSpecial.parts[index];
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
  const newFrontCost = areaCost(frontItem, newFrontM2);
  const edgeWithoutFront = withSpecial.detailCosts.edges - linearCost(edgeItem, oldFrontEdgeM);
  const newEdgeCost = edgeWithoutFront + linearCost(edgeItem, newFrontEdgeM);

  const parts = [...withSpecial.parts];
  parts[index] = { ...oldPart, widthMm: Math.round(newWidth * 100) / 100, edgeLengthMm: Math.round(newEdgePerPart * 100) / 100 };

  let operations = withSpecial.operations;
  let productionCost = withSpecial.detailCosts.operations;
  const edgeOperationIndex = withSpecial.operations.findIndex((operation) => operation.key === 'edge-banding');
  if (edgeOperationIndex >= 0) {
    const operation = withSpecial.operations[edgeOperationIndex];
    const quantity = Math.max(0, operation.quantity - oldFrontEdgeM + newFrontEdgeM);
    const operationItem = operation.priceBookItemId ? items.find((item) => item.id === operation.priceBookItemId) : undefined;
    let costMinor = operation.costMinor;
    if (operationItem?.unit === 'm') costMinor = BigInt(Math.round(quantity * moneyMinor(operationItem)));
    operations = [...withSpecial.operations];
    operations[edgeOperationIndex] = { ...operation, quantity, costMinor };
    productionCost = operations.reduce((sum, line) => sum + line.costMinor, 0n);
  }

  const costs = {
    ...withSpecial.costs,
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

  const adjusted: CabinetCostPreview = {
    ...withSpecial,
    parts,
    operations,
    usage: {
      ...withSpecial.usage,
      frontM2: Math.max(0, withSpecial.usage.frontM2 - oldFrontM2 + newFrontM2),
      edgeM: Math.max(0, withSpecial.usage.edgeM - oldFrontEdgeM + newFrontEdgeM),
    },
    detailCosts: {
      ...withSpecial.detailCosts,
      fronts: newFrontCost,
      edges: newEdgeCost,
      operations: productionCost,
    },
    costs,
    pricing,
    notes: [
      ...withSpecial.notes,
      `Угловой модуль: мебельный фасад рассчитан по видимой ширине ${visibleWidth.toFixed(0)} мм при ширине корпуса ${Number(input.widthMm).toFixed(0)} мм. Точная угловая геометрия и присадка относятся к Makster Pro.`,
    ],
  };
  return applyDemoGuard(adjusted, input, items);
}
