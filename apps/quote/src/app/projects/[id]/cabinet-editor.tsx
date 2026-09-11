'use client';

import { useMemo, useState } from 'react';
import { calculateCabinetPreview, type PriceBookItem } from '@/lib/engineering';
import { formatMinor } from '@/lib/calculation';
import { saveCabinet } from './actions';

type CabinetRow = {
  id: string; module_key: string; name: string; width_mm: number | string; height_mm: number | string; depth_mm: number | string;
  construction_json: Record<string, unknown>; material_refs_json: Record<string, unknown>; hardware_refs_json: Record<string, unknown>; computed_cost_json: Record<string, unknown>;
};

type Props = { projectId: string; currency: string; cabinets: CabinetRow[]; priceBook: PriceBookItem[]; targetMarginBps: number; overheadBps: number; taxBps: number };

const byCategory = (items: PriceBookItem[], category: string) => items.filter((i) => i.category === category);

export default function CabinetEditor({ projectId, currency, cabinets, priceBook, targetMarginBps, overheadBps, taxBps }: Props) {
  const first = cabinets[0];
  const [cabinetId, setCabinetId] = useState(first?.id ?? '');
  const [moduleKey, setModuleKey] = useState<'b-door' | 'b-drawer' | 'generic'>((first?.module_key as 'b-door' | 'b-drawer' | 'generic') ?? 'b-drawer');
  const [name, setName] = useState(first?.name ?? 'Шкаф с ящиками');
  const [width, setWidth] = useState(Number(first?.width_mm ?? 800));
  const [height, setHeight] = useState(Number(first?.height_mm ?? 720));
  const [depth, setDepth] = useState(Number(first?.depth_mm ?? 560));
  const [thickness, setThickness] = useState(Number(first?.construction_json?.thicknessMm ?? 18));
  const [gap, setGap] = useState(Number(first?.construction_json?.gapMm ?? 2));
  const [drawers, setDrawers] = useState(Number(first?.construction_json?.drawers ?? 2));
  const [labourHours, setLabourHours] = useState(Number(first?.construction_json?.labourHours ?? 0));
  const [boardItemId, setBoardItemId] = useState(String(first?.material_refs_json?.boardItemId ?? ''));
  const [frontItemId, setFrontItemId] = useState(String(first?.material_refs_json?.frontItemId ?? ''));
  const [edgeItemId, setEdgeItemId] = useState(String(first?.material_refs_json?.edgeItemId ?? ''));
  const [hardwareItemId, setHardwareItemId] = useState(String(first?.hardware_refs_json?.hardwareItemId ?? ''));
  const [labourItemId, setLabourItemId] = useState(String(first?.material_refs_json?.labourItemId ?? ''));

  const preview = useMemo(() => calculateCabinetPreview({ moduleKey, widthMm: width, heightMm: height, depthMm: depth, thicknessMm: thickness, gapMm: gap, drawers, boardItemId, frontItemId, edgeItemId, hardwareItemId, labourItemId, labourHours }, priceBook, { targetMarginBps, overheadBps, taxBps }), [moduleKey, width, height, depth, thickness, gap, drawers, boardItemId, frontItemId, edgeItemId, hardwareItemId, labourItemId, labourHours, priceBook, targetMarginBps, overheadBps, taxBps]);

  function loadCabinet(row: CabinetRow) {
    setCabinetId(row.id); setModuleKey(row.module_key as 'b-door' | 'b-drawer' | 'generic'); setName(row.name);
    setWidth(Number(row.width_mm)); setHeight(Number(row.height_mm)); setDepth(Number(row.depth_mm));
    setThickness(Number(row.construction_json?.thicknessMm ?? 18)); setGap(Number(row.construction_json?.gapMm ?? 2)); setDrawers(Number(row.construction_json?.drawers ?? 2)); setLabourHours(Number(row.construction_json?.labourHours ?? 0));
    setBoardItemId(String(row.material_refs_json?.boardItemId ?? '')); setFrontItemId(String(row.material_refs_json?.frontItemId ?? '')); setEdgeItemId(String(row.material_refs_json?.edgeItemId ?? '')); setHardwareItemId(String(row.hardware_refs_json?.hardwareItemId ?? '')); setLabourItemId(String(row.material_refs_json?.labourItemId ?? ''));
  }

  function newCabinet() {
    setCabinetId(''); setModuleKey('b-drawer'); setName('Шкаф с ящиками'); setWidth(800); setHeight(720); setDepth(560); setThickness(18); setGap(2); setDrawers(2); setLabourHours(0); setBoardItemId(''); setFrontItemId(''); setEdgeItemId(''); setHardwareItemId(''); setLabourItemId('');
  }

  const boards = byCategory(priceBook, 'board'); const fronts = byCategory(priceBook, 'front'); const edges = byCategory(priceBook, 'edge'); const hardware = byCategory(priceBook, 'hardware'); const labour = byCategory(priceBook, 'labour');

  return <div className="contentGrid">
    <section className="panel treePanel"><div className="panelHeader"><span>Модули</span><button className="iconButton" type="button" onClick={newCabinet}>+</button></div>{cabinets.map((row) => <button key={row.id} type="button" onClick={() => loadCabinet(row)} className={`cabinetRow ${row.id === cabinetId ? 'selected' : ''}`}><span>{row.module_key}</span><div><strong>{row.name}</strong><small>{Number(row.width_mm)} × {Number(row.height_mm)} × {Number(row.depth_mm)} мм</small></div></button>)}{!cabinets.length ? <div className="miniEmpty">Добавьте первый модуль.</div> : null}</section>
    <form action={saveCabinet} className="panel editorPanel"><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="cabinetId" value={cabinetId}/><div className="panelHeader"><div><span className="eyebrow">{cabinetId ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ МОДУЛЬ'}</span><h2>{name}</h2></div><button className="primary" type="submit">Сохранить</button></div>
      <div className="formSection"><h3>Тип и размеры</h3><div className="fieldGrid"><label>Тип<select name="moduleKey" value={moduleKey} onChange={(e) => setModuleKey(e.target.value as typeof moduleKey)}><option value="b-drawer">Нижний с ящиками</option><option value="b-door">Нижний с дверью</option><option value="generic">Универсальный корпус</option></select></label><label>Название<input name="name" value={name} onChange={(e)=>setName(e.target.value)}/></label><label>Толщина, мм<input name="thicknessMm" type="number" value={thickness} onChange={(e)=>setThickness(Number(e.target.value))}/></label><label>Ширина, мм<input name="widthMm" type="number" value={width} onChange={(e)=>setWidth(Number(e.target.value))}/></label><label>Высота, мм<input name="heightMm" type="number" value={height} onChange={(e)=>setHeight(Number(e.target.value))}/></label><label>Глубина, мм<input name="depthMm" type="number" value={depth} onChange={(e)=>setDepth(Number(e.target.value))}/></label></div></div>
      <div className="formSection"><h3>Конструкция</h3><div className="fieldGrid"><label>Зазор фасада, мм<input name="gapMm" type="number" step="0.5" value={gap} onChange={(e)=>setGap(Number(e.target.value))}/></label><label>Ящиков<input name="drawers" type="number" min="1" max="8" value={drawers} onChange={(e)=>setDrawers(Number(e.target.value))}/></label><label>Работа, часов<input name="labourHours" type="number" step="0.1" min="0" value={labourHours} onChange={(e)=>setLabourHours(Number(e.target.value))}/></label></div></div>
      <div className="formSection"><h3>Прайс-лист</h3><div className="fieldGrid two"><PriceSelect name="boardItemId" label="Корпус" value={boardItemId} setValue={setBoardItemId} items={boards}/><PriceSelect name="frontItemId" label="Фасад" value={frontItemId} setValue={setFrontItemId} items={fronts}/><PriceSelect name="edgeItemId" label="Кромка" value={edgeItemId} setValue={setEdgeItemId} items={edges}/><PriceSelect name="hardwareItemId" label="Фурнитура" value={hardwareItemId} setValue={setHardwareItemId} items={hardware}/><PriceSelect name="labourItemId" label="Ставка работы" value={labourItemId} setValue={setLabourItemId} items={labour}/></div></div>
      <div className="engineNote"><strong>Engineering Preview 0.1.1</strong><span>Плита ≈ {preview.usage.boardM2.toFixed(3)} м² · фасад ≈ {preview.usage.frontM2.toFixed(3)} м² · кромка ≈ {preview.usage.edgeM.toFixed(2)} м. Перед production-релизом геометрия будет заменена полной библиотекой Makster.</span></div>
    </form>
    <aside className="panel costPanel"><div className="panelHeader"><span>Расчёт по Price Book</span><span className="liveDot">LIVE</span></div><div className="costRows"><div><span>Корпус</span><strong>{formatMinor(preview.costs.board, currency)}</strong></div><div><span>Фасады</span><strong>{formatMinor(preview.costs.fronts, currency)}</strong></div><div><span>Кромка</span><strong>{formatMinor(preview.costs.edges, currency)}</strong></div><div><span>Фурнитура</span><strong>{formatMinor(preview.costs.hardware, currency)}</strong></div><div><span>Работа</span><strong>{formatMinor(preview.costs.labour, currency)}</strong></div><div className="soft"><span>Накладные</span><strong>{formatMinor(preview.pricing.overheadMinor, currency)}</strong></div></div><div className="trueCost"><span>Полная себестоимость</span><strong>{formatMinor(preview.pricing.trueCostMinor, currency)}</strong></div><div className="priceHero"><span>Рекомендуемая цена</span><strong>{formatMinor(preview.pricing.netSalesMinor, currency)}</strong><small>маржа {(preview.pricing.marginBps/100).toFixed(2)}%</small></div>{preview.warnings.length ? <div className="warningList"><strong>Расчёт пока неполный</strong>{preview.warnings.map((w,i)=><span key={i}>• {w}</span>)}</div> : null}</aside>
  </div>;
}

function PriceSelect({ name, label, value, setValue, items }: { name:string; label:string; value:string; setValue:(v:string)=>void; items:PriceBookItem[] }) {
  return <label>{label}<select name={name} value={value} onChange={(e)=>setValue(e.target.value)}><option value="">— не выбрано —</option>{items.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}
