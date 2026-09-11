'use client';

import { useMemo, useState } from 'react';
import {
  calculateCabinetPreview,
  type BackMode,
  type ModuleKey,
  type PriceBookItem,
} from '@/lib/engineering';
import { formatMinor } from '@/lib/calculation';
import { deleteCabinet, duplicateCabinet, saveCabinet } from './actions';

type CabinetRow = {
  id: string;
  module_key: string;
  name: string;
  width_mm: number | string;
  height_mm: number | string;
  depth_mm: number | string;
  quantity: number | string;
  construction_json: Record<string, unknown>;
  material_refs_json: Record<string, unknown>;
  hardware_refs_json: Record<string, unknown>;
  computed_cost_json: Record<string, unknown>;
};

type Props = {
  projectId: string;
  currency: string;
  cabinets: CabinetRow[];
  priceBook: PriceBookItem[];
  targetMarginBps: number;
  overheadBps: number;
  taxBps: number;
};

const byCategory = (items: PriceBookItem[], category: string) => items.filter((item) => item.category === category);
const roleLabel: Record<string, string> = { board: 'Корпус', front: 'Фасад', back: 'Задняя стенка' };
const moduleLabel: Record<ModuleKey, string> = {
  'b-door': 'Нижний с дверью',
  'b-drawer': 'Нижний с ящиками',
  'b-oven': 'Нижний под духовку',
  'w-door': 'Верхний с дверью',
  't-door': 'Высокий пенал',
  't-oven': 'Пенал под духовку',
  't-fridge': 'Пенал под холодильник',
  dishwasher: 'ПММ · фасад',
  open: 'Открытый модуль',
  generic: 'Универсальный корпус',
};

function asBackMode(value: unknown): BackMode {
  return value === 'none' || value === 'overlay' || value === 'groove' ? value : 'groove';
}

function safeBigInt(value: unknown) {
  try {
    return BigInt(typeof value === 'string' || typeof value === 'number' ? value : 0);
  } catch {
    return 0n;
  }
}

function rowQuantity(value: unknown) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(1, Math.min(999, Math.round(quantity))) : 1;
}

function defaultShelfCount(moduleKey: ModuleKey) {
  if (moduleKey === 'b-door') return 1;
  if (moduleKey === 'w-door' || moduleKey === 'open') return 2;
  if (moduleKey === 't-door') return 4;
  if (moduleKey === 't-oven') return 2;
  if (moduleKey === 't-fridge') return 1;
  return 0;
}

function hasFront(moduleKey: ModuleKey) {
  return ['b-door', 'b-drawer', 'w-door', 't-door', 't-oven', 't-fridge', 'dishwasher'].includes(moduleKey);
}

function hasCarcass(moduleKey: ModuleKey) {
  return moduleKey !== 'dishwasher';
}

function isHinged(moduleKey: ModuleKey) {
  return ['b-door', 'w-door', 't-door', 't-oven'].includes(moduleKey);
}

function usesStretchers(moduleKey: ModuleKey) {
  return ['b-door', 'b-drawer', 'b-oven'].includes(moduleKey);
}

export default function CabinetEditor({ projectId, currency, cabinets, priceBook, targetMarginBps, overheadBps, taxBps }: Props) {
  const first = cabinets[0];
  const firstConstruction = first?.construction_json ?? {};
  const firstMaterials = first?.material_refs_json ?? {};
  const firstHardware = first?.hardware_refs_json ?? {};
  const firstLegacyHardware = String(firstHardware.hardwareItemId ?? '');
  const initialKey = ((first?.module_key as ModuleKey) ?? 'b-drawer');

  const [cabinetId, setCabinetId] = useState(first?.id ?? '');
  const [moduleKey, setModuleKey] = useState<ModuleKey>(initialKey);
  const [name, setName] = useState(first?.name ?? 'Шкаф с ящиками');
  const [quantity, setQuantity] = useState(rowQuantity(first?.quantity));
  const [width, setWidth] = useState(Number(first?.width_mm ?? 800));
  const [height, setHeight] = useState(Number(first?.height_mm ?? 720));
  const [depth, setDepth] = useState(Number(first?.depth_mm ?? 560));
  const [thickness, setThickness] = useState(Number(firstConstruction.thicknessMm ?? 18));
  const [gap, setGap] = useState(Number(firstConstruction.gapMm ?? 2));
  const [drawers, setDrawers] = useState(Number(firstConstruction.drawers ?? 2));
  const [doors, setDoors] = useState(Number(firstConstruction.doors ?? (initialKey === 't-fridge' || initialKey === 't-oven' ? 2 : 1)));
  const [shelfCount, setShelfCount] = useState(Number(firstConstruction.shelfCount ?? defaultShelfCount(initialKey)));
  const [stretcherDepth, setStretcherDepth] = useState(Number(firstConstruction.stretcherDepthMm ?? 100));
  const [shelfSetback, setShelfSetback] = useState(Number(firstConstruction.shelfSetbackMm ?? 20));
  const [applianceOpeningHeight, setApplianceOpeningHeight] = useState(Number(firstConstruction.applianceOpeningHeightMm ?? 600));
  const [backMode, setBackMode] = useState<BackMode>(asBackMode(firstConstruction.backMode));
  const [backThickness, setBackThickness] = useState(Number(firstConstruction.backThicknessMm ?? 4));
  const [backInset, setBackInset] = useState(Number(firstConstruction.backInsetMm ?? 10));
  const [backGrooveDepth, setBackGrooveDepth] = useState(Number(firstConstruction.backGrooveDepthMm ?? 8));
  const [frontEdgeIncluded, setFrontEdgeIncluded] = useState(firstConstruction.frontEdgeIncluded !== false);
  const [labourHours, setLabourHours] = useState(Number(firstConstruction.labourHours ?? 0));
  const [boardItemId, setBoardItemId] = useState(String(firstMaterials.boardItemId ?? ''));
  const [frontItemId, setFrontItemId] = useState(String(firstMaterials.frontItemId ?? ''));
  const [backItemId, setBackItemId] = useState(String(firstMaterials.backItemId ?? ''));
  const [edgeItemId, setEdgeItemId] = useState(String(firstMaterials.edgeItemId ?? ''));
  const [hingeItemId, setHingeItemId] = useState(String(firstHardware.hingeItemId ?? (isHinged(initialKey) ? firstLegacyHardware : '')));
  const [drawerItemId, setDrawerItemId] = useState(String(firstHardware.drawerItemId ?? (initialKey === 'b-drawer' ? firstLegacyHardware : '')));
  const [labourItemId, setLabourItemId] = useState(String(firstMaterials.labourItemId ?? ''));

  const preview = useMemo(() => calculateCabinetPreview({
    moduleKey,
    widthMm: width,
    heightMm: height,
    depthMm: depth,
    thicknessMm: thickness,
    gapMm: gap,
    drawers,
    doors,
    shelfCount,
    stretcherDepthMm: stretcherDepth,
    shelfSetbackMm: shelfSetback,
    applianceOpeningHeightMm: applianceOpeningHeight,
    backMode: moduleKey === 'dishwasher' ? 'none' : backMode,
    backThicknessMm: backThickness,
    backInsetMm: backInset,
    backGrooveDepthMm: backGrooveDepth,
    frontEdgeIncluded,
    boardItemId,
    frontItemId,
    backItemId,
    edgeItemId,
    hingeItemId,
    drawerItemId,
    labourItemId,
    labourHours,
  }, priceBook, { targetMarginBps, overheadBps, taxBps }), [
    moduleKey, width, height, depth, thickness, gap, drawers, doors, shelfCount,
    stretcherDepth, shelfSetback, applianceOpeningHeight, backMode, backThickness, backInset, backGrooveDepth,
    frontEdgeIncluded, boardItemId, frontItemId, backItemId, edgeItemId, hingeItemId,
    drawerItemId, labourItemId, labourHours, priceBook, targetMarginBps, overheadBps, taxBps,
  ]);

  const normalizedQuantity = rowQuantity(quantity);
  const savedProject = useMemo(() => cabinets.reduce((totals, row) => {
    const rowQty = BigInt(rowQuantity(row.quantity));
    return {
      trueCost: totals.trueCost + safeBigInt(row.computed_cost_json?.trueCostMinor) * rowQty,
      netSales: totals.netSales + safeBigInt(row.computed_cost_json?.netSalesMinor) * rowQty,
    };
  }, { trueCost: 0n, netSales: 0n }), [cabinets]);

  function loadCabinet(row: CabinetRow) {
    const construction = row.construction_json ?? {};
    const materials = row.material_refs_json ?? {};
    const hardware = row.hardware_refs_json ?? {};
    const legacyHardware = String(hardware.hardwareItemId ?? '');
    const key = (row.module_key as ModuleKey) || 'generic';

    setCabinetId(row.id);
    setModuleKey(key);
    setName(row.name);
    setQuantity(rowQuantity(row.quantity));
    setWidth(Number(row.width_mm));
    setHeight(Number(row.height_mm));
    setDepth(Number(row.depth_mm));
    setThickness(Number(construction.thicknessMm ?? 18));
    setGap(Number(construction.gapMm ?? 2));
    setDrawers(Number(construction.drawers ?? 2));
    setDoors(Number(construction.doors ?? (key === 't-fridge' || key === 't-oven' ? 2 : 1)));
    setShelfCount(Number(construction.shelfCount ?? defaultShelfCount(key)));
    setStretcherDepth(Number(construction.stretcherDepthMm ?? 100));
    setShelfSetback(Number(construction.shelfSetbackMm ?? 20));
    setApplianceOpeningHeight(Number(construction.applianceOpeningHeightMm ?? 600));
    setBackMode(asBackMode(construction.backMode));
    setBackThickness(Number(construction.backThicknessMm ?? 4));
    setBackInset(Number(construction.backInsetMm ?? 10));
    setBackGrooveDepth(Number(construction.backGrooveDepthMm ?? 8));
    setFrontEdgeIncluded(construction.frontEdgeIncluded !== false);
    setLabourHours(Number(construction.labourHours ?? 0));
    setBoardItemId(String(materials.boardItemId ?? ''));
    setFrontItemId(String(materials.frontItemId ?? ''));
    setBackItemId(String(materials.backItemId ?? ''));
    setEdgeItemId(String(materials.edgeItemId ?? ''));
    setHingeItemId(String(hardware.hingeItemId ?? (isHinged(key) ? legacyHardware : '')));
    setDrawerItemId(String(hardware.drawerItemId ?? (key === 'b-drawer' ? legacyHardware : '')));
    setLabourItemId(String(materials.labourItemId ?? ''));
  }

  function newCabinet() {
    setCabinetId('');
    setModuleKey('b-drawer');
    setName('Шкаф с ящиками');
    setQuantity(1);
    setWidth(800);
    setHeight(720);
    setDepth(560);
    setThickness(18);
    setGap(2);
    setDrawers(2);
    setDoors(1);
    setShelfCount(0);
    setStretcherDepth(100);
    setShelfSetback(20);
    setApplianceOpeningHeight(600);
    setBackMode('groove');
    setBackThickness(4);
    setBackInset(10);
    setBackGrooveDepth(8);
    setFrontEdgeIncluded(true);
    setLabourHours(0);
    setBoardItemId('');
    setFrontItemId('');
    setBackItemId('');
    setEdgeItemId('');
    setHingeItemId('');
    setDrawerItemId('');
    setLabourItemId('');
  }

  const boards = byCategory(priceBook, 'board');
  const fronts = byCategory(priceBook, 'front');
  const edges = byCategory(priceBook, 'edge');
  const hardware = byCategory(priceBook, 'hardware');
  const labour = byCategory(priceBook, 'labour');
  const showCarcass = hasCarcass(moduleKey);
  const showFront = hasFront(moduleKey);
  const showDoors = ['b-door', 'w-door', 't-door', 't-fridge'].includes(moduleKey);
  const showShelves = showCarcass && !['b-drawer', 'b-oven'].includes(moduleKey);
  const showBack = showCarcass;

  return <div className="contentGrid">
    <section className="panel treePanel">
      <div className="panelHeader"><span>Модули</span><button className="iconButton" type="button" onClick={newCabinet}>+</button></div>
      {cabinets.map((row) => <button key={row.id} type="button" onClick={() => loadCabinet(row)} className={`cabinetRow ${row.id === cabinetId ? 'selected' : ''}`}><span>{row.module_key}</span><div><strong>{row.name}{rowQuantity(row.quantity) > 1 ? ` × ${rowQuantity(row.quantity)}` : ''}</strong><small>{Number(row.width_mm)} × {Number(row.height_mm)} × {Number(row.depth_mm)} мм</small></div></button>)}
      {!cabinets.length ? <div className="miniEmpty">Добавьте первый модуль.</div> : null}
      <div className="engineNote"><strong>Сохранено по проекту</strong><span>Себестоимость: {formatMinor(savedProject.trueCost, currency)}</span><span>Цена: {formatMinor(savedProject.netSales, currency)}</span></div>
    </section>

    <form action={saveCabinet} className="panel editorPanel">
      <input type="hidden" name="projectId" value={projectId}/>
      <input type="hidden" name="cabinetId" value={cabinetId}/>
      {moduleKey === 'dishwasher' ? <input type="hidden" name="backMode" value="none"/> : null}
      <div className="panelHeader"><div><span className="eyebrow">{cabinetId ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ МОДУЛЬ'} · ENGINEERING 0.1.10</span><h2>{name}</h2></div><div className="topActions">{cabinetId ? <><button className="secondary" type="submit" formAction={duplicateCabinet}>Дублировать</button><button className="secondary" type="submit" formAction={deleteCabinet} onClick={(event) => { if (!window.confirm('Удалить этот модуль из текущего проекта? Выпущенные ранее предложения не изменятся.')) event.preventDefault(); }}>Удалить</button></> : null}<button className="primary" type="submit">Сохранить</button></div></div>

      <div className="formSection"><h3>Тип и размеры</h3><div className="fieldGrid">
        <label>Тип<select name="moduleKey" value={moduleKey} onChange={(event) => setModuleKey(event.target.value as ModuleKey)}>{Object.entries(moduleLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Название<input name="name" value={name} onChange={(event) => setName(event.target.value)}/></label>
        <label>Количество<input name="quantity" type="number" min="1" max="999" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/></label>
        <label>Толщина корпуса, мм<input name="thicknessMm" type="number" min="1" step="0.1" value={thickness} onChange={(event) => setThickness(Number(event.target.value))}/></label>
        <label>Ширина, мм<input name="widthMm" type="number" min="1" value={width} onChange={(event) => setWidth(Number(event.target.value))}/></label>
        <label>Высота, мм<input name="heightMm" type="number" min="1" value={height} onChange={(event) => setHeight(Number(event.target.value))}/></label>
        <label>Глубина, мм<input name="depthMm" type="number" min="1" value={depth} onChange={(event) => setDepth(Number(event.target.value))}/></label>
      </div></div>

      <div className="formSection"><h3>Конструкция</h3><div className="fieldGrid">
        <label>Зазор фасада, мм<input name="gapMm" type="number" min="0" step="0.5" value={gap} onChange={(event) => setGap(Number(event.target.value))}/></label>
        {moduleKey === 'b-drawer' ? <label>Ящиков<input name="drawers" type="number" min="1" max="8" value={drawers} onChange={(event) => setDrawers(Number(event.target.value))}/></label> : null}
        {showDoors ? <label>{moduleKey === 't-fridge' ? 'Фасадов по высоте' : 'Дверей'}<input name="doors" type="number" min="1" max="4" value={doors} onChange={(event) => setDoors(Number(event.target.value))}/></label> : null}
        {showShelves ? <label>Полок / перегородок<input name="shelfCount" type="number" min="0" max="12" value={shelfCount} onChange={(event) => setShelfCount(Number(event.target.value))}/></label> : null}
        {usesStretchers(moduleKey) ? <label>Глубина царги, мм<input name="stretcherDepthMm" type="number" min="20" value={stretcherDepth} onChange={(event) => setStretcherDepth(Number(event.target.value))}/></label> : null}
        {showShelves && shelfCount > 0 ? <label>Отступ полки сзади, мм<input name="shelfSetbackMm" type="number" min="0" value={shelfSetback} onChange={(event) => setShelfSetback(Number(event.target.value))}/></label> : null}
        {moduleKey === 't-oven' ? <label>Высота проёма духовки, мм<input name="applianceOpeningHeightMm" type="number" min="400" max={Math.max(400, height - 200)} value={applianceOpeningHeight} onChange={(event) => setApplianceOpeningHeight(Number(event.target.value))}/></label> : null}
        {showFront ? <label>Кромка фасада<select name="frontEdgeMode" value={frontEdgeIncluded ? 'included' : 'same-edge'} onChange={(event) => setFrontEdgeIncluded(event.target.value === 'included')}><option value="included">Входит в цену фасада</option><option value="same-edge">Считать той же кромкой</option></select></label> : <input type="hidden" name="frontEdgeMode" value="included"/>}
        <label>Прямой труд, часов<input name="labourHours" type="number" step="0.1" min="0" value={labourHours} onChange={(event) => setLabourHours(Number(event.target.value))}/></label>
      </div></div>

      {showBack ? <div className="formSection"><h3>Задняя стенка</h3><div className="fieldGrid">
        <label>Монтаж<select name="backMode" value={backMode} onChange={(event) => setBackMode(event.target.value as BackMode)}><option value="groove">В паз</option><option value="overlay">Накладная</option><option value="none">Без задней стенки</option></select></label>
        {backMode !== 'none' ? <label>Толщина, мм<input name="backThicknessMm" type="number" min="1" step="0.1" value={backThickness} onChange={(event) => setBackThickness(Number(event.target.value))}/></label> : null}
        {backMode === 'groove' ? <label>Отступ паза, мм<input name="backInsetMm" type="number" min="0" step="0.5" value={backInset} onChange={(event) => setBackInset(Number(event.target.value))}/></label> : null}
        {backMode === 'groove' ? <label>Глубина паза, мм<input name="backGrooveDepthMm" type="number" min="0" step="0.5" value={backGrooveDepth} onChange={(event) => setBackGrooveDepth(Number(event.target.value))}/></label> : null}
      </div></div> : null}

      <div className="formSection"><h3>Материалы и фурнитура</h3><div className="fieldGrid two">
        {showCarcass ? <PriceSelect name="boardItemId" label="Плита корпуса" value={boardItemId} setValue={setBoardItemId} items={boards}/> : null}
        {showFront ? <PriceSelect name="frontItemId" label="Фасад" value={frontItemId} setValue={setFrontItemId} items={fronts}/> : null}
        {showBack && backMode !== 'none' ? <PriceSelect name="backItemId" label="Задняя стенка" value={backItemId} setValue={setBackItemId} items={boards}/> : null}
        <PriceSelect name="edgeItemId" label="Кромка" value={edgeItemId} setValue={setEdgeItemId} items={edges}/>
        {isHinged(moduleKey) ? <PriceSelect name="hingeItemId" label="Петля" value={hingeItemId} setValue={setHingeItemId} items={hardware}/> : null}
        {moduleKey === 'b-drawer' ? <PriceSelect name="drawerItemId" label="Комплект ящика" value={drawerItemId} setValue={setDrawerItemId} items={hardware}/> : null}
        <PriceSelect name="labourItemId" label="Ставка труда" value={labourItemId} setValue={setLabourItemId} items={labour}/>
      </div></div>

      <div className="formSection"><h3>Деталировка на 1 шт.</h3><div className="tableWrap"><table><thead><tr><th>Деталь</th><th>Материал</th><th>Кол.</th><th>Размер, мм</th><th>Кромка</th></tr></thead><tbody>{preview.parts.map((part) => <tr key={part.key}><td><strong>{part.label}</strong></td><td>{roleLabel[part.materialRole] ?? part.materialRole}</td><td>{part.quantity}</td><td>{part.lengthMm.toFixed(1)} × {part.widthMm.toFixed(1)} × {part.thicknessMm.toFixed(1)}</td><td>{part.edgeLengthMm > 0 ? `${(part.edgeLengthMm / 1000).toFixed(2)} м/шт` : '—'}</td></tr>)}</tbody></table></div></div>

      <div className="engineNote"><strong>Makster Engineering Core 0.1.10</strong><span>{preview.usage.partCount} деталей/шт · корпус {preview.usage.boardM2.toFixed(3)} м² · фасад {preview.usage.frontM2.toFixed(3)} м² · задняя стенка {preview.usage.backM2.toFixed(3)} м² · кромка {preview.usage.edgeM.toFixed(2)} м.</span>{normalizedQuantity > 1 ? <span>В проекте: {normalizedQuantity} одинаковых модулей. Итоговая стоимость умножается автоматически.</span> : null}</div>
    </form>

    <aside className="panel costPanel">
      <div className="panelHeader"><span>Себестоимость 1 шт.</span><span className="liveDot">LIVE</span></div>
      <div className="costRows">
        <div><span>Корпус</span><strong>{formatMinor(preview.detailCosts.carcass, currency)}</strong></div>
        <div><span>Задняя стенка</span><strong>{formatMinor(preview.detailCosts.back, currency)}</strong></div>
        <div><span>Фасады</span><strong>{formatMinor(preview.detailCosts.fronts, currency)}</strong></div>
        <div><span>Кромка</span><strong>{formatMinor(preview.detailCosts.edges, currency)}</strong></div>
        <div><span>Фурнитура</span><strong>{formatMinor(preview.detailCosts.hardware, currency)}</strong></div>
        <div><span>Производственные операции</span><strong>{formatMinor(preview.detailCosts.operations, currency)}</strong></div>
        <div><span>Прямой труд</span><strong>{formatMinor(preview.detailCosts.labour, currency)}</strong></div>
        <div className="soft"><span>Накладные</span><strong>{formatMinor(preview.pricing.overheadMinor, currency)}</strong></div>
      </div>
      <div className="trueCost"><span>Полная себестоимость 1 шт.</span><strong>{formatMinor(preview.pricing.trueCostMinor, currency)}</strong></div>
      <div className="priceHero"><span>Рекомендуемая цена 1 шт.</span><strong>{formatMinor(preview.pricing.netSalesMinor, currency)}</strong><small>маржа {(preview.pricing.marginBps / 100).toFixed(2)}%</small></div>
      {normalizedQuantity > 1 ? <div className="engineNote"><strong>Итого × {normalizedQuantity}</strong><span>Полная себестоимость: {formatMinor(preview.pricing.trueCostMinor * BigInt(normalizedQuantity), currency)}</span><span>Рекомендуемая цена: {formatMinor(preview.pricing.netSalesMinor * BigInt(normalizedQuantity), currency)}</span></div> : null}

      <div className="costRows"><div className="soft"><span>Операции</span><strong>{preview.operations.length}</strong></div>{preview.operations.map((operation) => <div key={operation.key}><span>{operation.label}<br/><small>{operation.quantity.toFixed(operation.unit === 'm' ? 2 : 0)} {operation.unit === 'm' ? 'м' : 'шт'}</small></span><strong>{formatMinor(operation.costMinor, currency)}</strong></div>)}</div>

      {preview.hardware.length ? <div className="costRows"><div className="soft"><span>Фурнитура</span><strong>{preview.usage.hardwareQty} шт/компл.</strong></div>{preview.hardware.map((line) => <div key={line.key}><span>{line.label}<br/><small>{line.itemName ?? 'цена не выбрана'} · {line.quantity}</small></span><strong>{formatMinor(line.costMinor, currency)}</strong></div>)}</div> : null}

      {preview.warnings.length ? <div className="warningList"><strong>До полного расчёта нужно заполнить</strong>{preview.warnings.map((warning, index) => <span key={index}>• {warning}</span>)}</div> : <div className="notice success"><strong>Модуль рассчитан полностью.</strong></div>}
      <div className="warningList"><strong>Допущения 0.1.10</strong>{preview.notes.map((note, index) => <span key={index}>• {note}</span>)}</div>
    </aside>
  </div>;
}

function PriceSelect({ name, label, value, setValue, items }: { name: string; label: string; value: string; setValue: (value: string) => void; items: PriceBookItem[] }) {
  return <label>{label}<select name={name} value={value} onChange={(event) => setValue(event.target.value)}><option value="">— не выбрано —</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}
