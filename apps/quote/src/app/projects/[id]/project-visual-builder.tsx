'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ModuleSchematic } from '@/components/module-schematic';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';
import { reorderVisualCabinets } from './visual-actions';
import { VISUAL_COPY } from './visual-copy';
import styles from './visual-builder.module.css';

type CabinetRow={id:string;module_key:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;quantity:number|string;construction_json:Record<string,unknown>;computed_cost_json:Record<string,unknown>};
type Props={projectId:string;cabinets:CabinetRow[];currency:string;locale:Locale};
type Level='base'|'wall'|'tall';
type SceneItem={sceneId:string;row:CabinetRow;index:number;level:Level;xMm:number;widthMm:number;heightMm:number;bottomMm:number};
type Interval={start:number;end:number};
type SaveState='idle'|'saving'|'saved'|'error';
type DragState={cabinetId:string;pointerId:number;startX:number;startY:number;active:boolean;changed:boolean};

const reorderText:Record<Locale,{hint:string;saving:string;saved:string;error:string;left:string;right:string;backsplash:string}>={
  ru:{hint:'Потяните шкаф влево или вправо. Стрелки работают как запасной способ.',saving:'Сохраняю порядок…',saved:'Порядок сохранён',error:'Не удалось сохранить порядок',left:'Левее',right:'Правее',backsplash:'Фартук 600 мм'},
  en:{hint:'Drag a cabinet left or right. Arrows are a fallback.',saving:'Saving order…',saved:'Order saved',error:'Could not save order',left:'Left',right:'Right',backsplash:'600 mm backsplash'},
  cs:{hint:'Přetáhněte skříňku vlevo nebo vpravo. Šipky jsou záložní způsob.',saving:'Ukládám pořadí…',saved:'Pořadí uloženo',error:'Pořadí se nepodařilo uložit',left:'Vlevo',right:'Vpravo',backsplash:'Zástěna 600 mm'},
  de:{hint:'Schrank nach links oder rechts ziehen. Pfeile dienen als Alternative.',saving:'Reihenfolge wird gespeichert…',saved:'Reihenfolge gespeichert',error:'Reihenfolge konnte nicht gespeichert werden',left:'Links',right:'Rechts',backsplash:'Nischenhöhe 600 mm'},
  pl:{hint:'Przeciągnij szafkę w lewo lub w prawo. Strzałki są opcją zapasową.',saving:'Zapisywanie kolejności…',saved:'Kolejność zapisana',error:'Nie udało się zapisać kolejności',left:'W lewo',right:'W prawo',backsplash:'Pas 600 mm'},
};

function qty(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(1,Math.min(99,Math.round(parsed))):1;}
function dimension(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0?parsed:fallback;}
function level(row:CabinetRow):Level{const key=row.module_key.toLowerCase();const name=row.name.toLowerCase();if(key.startsWith('w-')||name.includes('верх')||name.includes('wall')||name.includes('horní')||name.includes('oberschrank')||name.includes('górna'))return 'wall';if(key.startsWith('t-')||name.includes('пенал')||name.includes('tall')||name.includes('vysok')||name.includes('hochschrank')||name.includes('słupek'))return 'tall';return 'base';}
function zone(row:CabinetRow){return level(row)==='wall'?'wall':'ground';}
function safeMinor(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
function sameOrder(a:CabinetRow[],b:CabinetRow[]){return a.length===b.length&&a.every((row,index)=>row.id===b[index]?.id);}

function visualType(row:CabinetRow){
  const haystack=`${row.module_key} ${row.name}`.toLowerCase();
  const isTall=level(row)==='tall';
  if(haystack.includes('drawer')||haystack.includes('ящик')||haystack.includes('zásuv')||haystack.includes('schublad')||haystack.includes('szuflad'))return 'drawer';
  if(haystack.includes('oven')||haystack.includes('духов')||haystack.includes('troub')||haystack.includes('backofen')||haystack.includes('piekarnik'))return isTall?'tall-oven':'oven';
  if(haystack.includes('dishwasher')||haystack.includes('пмм')||haystack.includes('myčk')||haystack.includes('geschirr')||haystack.includes('zmyw'))return 'dishwasher';
  if(haystack.includes('fridge')||haystack.includes('холод')||haystack.includes('lednic')||haystack.includes('kühl')||haystack.includes('lodów'))return 'fridge';
  if(haystack.includes('sink')||haystack.includes('мой')||haystack.includes('dřez')||haystack.includes('spül')||haystack.includes('zlew'))return 'sink';
  return 'door';
}

function reorderWithinZone(rows:CabinetRow[],dragId:string,targetId:string,after:boolean){
  if(dragId===targetId)return rows;
  const dragged=rows.find((row)=>row.id===dragId);const target=rows.find((row)=>row.id===targetId);
  if(!dragged||!target||zone(dragged)!==zone(target))return rows;
  const wantedZone=zone(dragged);const zoneRows=rows.filter((row)=>zone(row)===wantedZone);
  const from=zoneRows.findIndex((row)=>row.id===dragId);if(from<0)return rows;
  const [moved]=zoneRows.splice(from,1);const targetIndex=zoneRows.findIndex((row)=>row.id===targetId);if(targetIndex<0)return rows;
  zoneRows.splice(targetIndex+(after?1:0),0,moved);
  let index=0;return rows.map((row)=>zone(row)===wantedZone?zoneRows[index++]:row);
}

function baseIntervals(items:SceneItem[]):Interval[]{
  const segments=items.filter((item)=>item.level==='base').map((item)=>({start:item.xMm,end:item.xMm+item.widthMm}));
  const intervals:Interval[]=[];
  for(const segment of segments){const last=intervals[intervals.length-1];if(last&&Math.abs(last.end-segment.start)<1){last.end=segment.end;}else{intervals.push({...segment});}}
  return intervals;
}

function placeWalls(rows:{sceneId:string;row:CabinetRow;index:number}[],intervals:Interval[],bottomMm:number):SceneItem[]{
  if(!rows.length)return[];
  if(!intervals.length){let cursor=0;return rows.map((item)=>{const widthMm=dimension(item.row.width_mm,600);const positioned={...item,level:'wall' as const,xMm:cursor,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm};cursor+=widthMm;return positioned;});}
  let intervalIndex=0;let cursor=intervals[0].start;let overflowCursor=intervals[intervals.length-1].end;
  return rows.map((item)=>{const widthMm=dimension(item.row.width_mm,600);while(intervalIndex<intervals.length&&cursor+widthMm>intervals[intervalIndex].end+1){intervalIndex+=1;if(intervalIndex<intervals.length)cursor=intervals[intervalIndex].start;}
    const xMm=intervalIndex<intervals.length?cursor:overflowCursor;if(intervalIndex<intervals.length)cursor+=widthMm;else overflowCursor+=widthMm;
    return {...item,level:'wall' as const,xMm,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm};
  });
}

function CabinetFace({item,selected,dragging,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onClick}:{item:SceneItem;selected:boolean;dragging:boolean;onPointerDown:(event:React.PointerEvent<SVGGElement>)=>void;onPointerMove:(event:React.PointerEvent<SVGGElement>)=>void;onPointerUp:(event:React.PointerEvent<SVGGElement>)=>void;onPointerCancel:()=>void;onClick:()=>void}){
  const type=visualType(item.row);const w=item.widthMm;const h=item.heightMm;const stroke='#4a3327';const front='#f2e2d5';const panel='#fffaf5';const inset=Math.max(18,Math.min(38,w*.055));const handleX=w-inset*2;const handleHalf=Math.max(22,Math.min(55,h*.055));
  const y=-(item.bottomMm+item.heightMm);
  return <g transform={`translate(${item.xMm} ${y})`} className={`${styles.svgCabinet} ${dragging?styles.svgDragging:''}`} data-cabinet-id={item.row.id} data-zone={zone(item.row)} role="button" tabIndex={0} aria-label={item.row.name} aria-pressed={selected} onClick={onClick} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
    {selected?<rect x="-12" y="-12" width={w+24} height={h+24} rx="18" fill="none" stroke="#3b2418" strokeWidth="16" vectorEffect="non-scaling-stroke" className={styles.selectionRect}/>:null}
    <rect x="0" y="0" width={w} height={h} fill={panel} stroke={stroke} strokeWidth="10" vectorEffect="non-scaling-stroke"/>
    {type==='drawer'?<>{[1,2].map((n)=><line key={n} x1="0" x2={w} y1={h*n/3} y2={h*n/3} stroke={stroke} strokeWidth="8" vectorEffect="non-scaling-stroke"/>)}{[.5,1.5,2.5].map((n)=><line key={`h${n}`} x1={w*.43} x2={w*.57} y1={h*n/3} y2={h*n/3} stroke={stroke} strokeWidth="10" vectorEffect="non-scaling-stroke"/>)}</>:null}
    {type==='door'||type==='sink'?<><rect x={inset} y={inset} width={Math.max(1,w-inset*2)} height={Math.max(1,h-inset*2)} fill={front} stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><line x1={handleX} x2={handleX} y1={h/2-handleHalf} y2={h/2+handleHalf} stroke={stroke} strokeWidth="12" vectorEffect="non-scaling-stroke"/>{type==='sink'?<ellipse cx={w/2} cy={Math.max(18,inset*.7)} rx={Math.max(70,w*.25)} ry="24" fill="#d9c5b4" stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/>:null}</>:null}
    {type==='oven'?<><rect x={inset} y={inset} width={w-inset*2} height={h-inset*2} fill="#f4ece6" stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><rect x={w*.14} y={h*.24} width={w*.72} height={h*.58} rx="18" fill="#4b4039"/><rect x={w*.2} y={h*.34} width={w*.6} height={h*.38} fill="#9c8f85"/></>:null}
    {type==='tall-oven'?<><rect x={inset} y={inset} width={w-inset*2} height={h-inset*2} fill={front} stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><line x1={inset} x2={w-inset} y1={h*.28} y2={h*.28} stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><rect x={w*.13} y={h*.33} width={w*.74} height={h*.26} rx="18" fill="#4b4039"/><rect x={w*.2} y={h*.39} width={w*.6} height={h*.14} fill="#9c8f85"/><line x1={inset} x2={w-inset} y1={h*.65} y2={h*.65} stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/></>:null}
    {type==='dishwasher'?<><rect x={inset} y={inset} width={w-inset*2} height={h-inset*2} fill="#eee5dd" stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><rect x={w*.12} y={h*.12} width={w*.76} height={Math.max(30,h*.07)} rx="10" fill="#9c8f85"/></>:null}
    {type==='fridge'?<><rect x={inset} y={inset} width={w-inset*2} height={h-inset*2} fill={front} stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/><line x1={inset} x2={w-inset} y1={h*.68} y2={h*.68} stroke={stroke} strokeWidth="8" vectorEffect="non-scaling-stroke"/><line x1={handleX} x2={handleX} y1={h*.22} y2={h*.42} stroke={stroke} strokeWidth="12" vectorEffect="non-scaling-stroke"/><line x1={handleX} x2={handleX} y1={h*.76} y2={h*.88} stroke={stroke} strokeWidth="12" vectorEffect="non-scaling-stroke"/></>:null}
    <rect x="0" y="0" width={w} height={h} fill="transparent" pointerEvents="all"/>
  </g>;
}

export function ProjectVisualBuilder({projectId,cabinets,currency,locale}:Props){
  const copy=VISUAL_COPY[locale];const intl=INTL_LOCALES[locale];const dragCopy=reorderText[locale];
  const [orderedCabinets,setOrderedCabinets]=useState(cabinets);const orderRef=useRef(cabinets);const svgRef=useRef<SVGSVGElement|null>(null);const dragRef=useRef<DragState|null>(null);
  const [draggingId,setDraggingId]=useState('');const [saveState,setSaveState]=useState<SaveState>('idle');const [isPending,startTransition]=useTransition();const [selectedId,setSelectedId]=useState(cabinets[0]?.id??'');

  useEffect(()=>{setOrderedCabinets(cabinets);orderRef.current=cabinets;setSelectedId((current)=>current&&cabinets.some((row)=>row.id===current)?current:(cabinets[0]?.id??''));},[cabinets]);

  const selected=orderedCabinets.find((row)=>row.id===selectedId)??orderedCabinets[0];
  const layout=useMemo(()=>{
    const raw=orderedCabinets.flatMap((row)=>Array.from({length:qty(row.quantity)},(_,index)=>({sceneId:`${row.id}-${index}`,row,index})));
    const groundRaw=raw.filter((item)=>level(item.row)!=='wall');const wallRaw=raw.filter((item)=>level(item.row)==='wall');let cursor=0;
    const ground:SceneItem[]=groundRaw.map((item)=>{const widthMm=dimension(item.row.width_mm,600);const result={...item,level:level(item.row),xMm:cursor,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm:0};cursor+=widthMm;return result;});
    const baseHeight=Math.max(720,...ground.filter((item)=>item.level==='base').map((item)=>item.heightMm));const backsplashMm=600;const wallBottom=baseHeight+backsplashMm;const walls=placeWalls(wallRaw,baseIntervals(ground),wallBottom);const all=[...ground,...walls];
    const lineWidth=Math.max(1,...all.map((item)=>item.xMm+item.widthMm));const wallTop=Math.max(0,...walls.map((item)=>item.bottomMm+item.heightMm));const tallTop=Math.max(0,...ground.filter((item)=>item.level==='tall').map((item)=>item.heightMm));const sceneTop=Math.max(baseHeight+backsplashMm,wallTop,tallTop,1800);
    const padX=90;const padTop=100;const padBottom=80;const viewWidth=lineWidth+padX*2;const viewHeight=sceneTop+padTop+padBottom;const floorY=padTop+sceneTop;
    const centers=new Map<string,{center:number;zone:string}>();for(const row of orderedCabinets){const pieces=all.filter((item)=>item.row.id===row.id);if(pieces.length){const start=Math.min(...pieces.map((item)=>item.xMm));const end=Math.max(...pieces.map((item)=>item.xMm+item.widthMm));centers.set(row.id,{center:(start+end)/2,zone:zone(row)});}}
    return{all,lineWidth,baseHeight,backsplashMm,sceneTop,padX,padTop,padBottom,viewWidth,viewHeight,floorY,centers,count:raw.length};
  },[orderedCabinets]);

  const persistOrder=(next:CabinetRow[])=>{orderRef.current=next;setOrderedCabinets(next);setSaveState('saving');startTransition(async()=>{try{await reorderVisualCabinets(projectId,next.map((row)=>row.id));setSaveState('saved');}catch{orderRef.current=cabinets;setOrderedCabinets(cabinets);setSaveState('error');}});};
  const shiftSelected=(direction:-1|1)=>{if(!selected||isPending)return;const sameZone=orderRef.current.filter((row)=>zone(row)===zone(selected));const index=sameZone.findIndex((row)=>row.id===selected.id);const target=sameZone[index+direction];if(!target)return;const next=reorderWithinZone(orderRef.current,selected.id,target.id,direction>0);if(!sameOrder(next,orderRef.current))persistOrder(next);};
  const selectedZoneRows=selected?orderedCabinets.filter((row)=>zone(row)===zone(selected)):[];const selectedZoneIndex=selected?selectedZoneRows.findIndex((row)=>row.id===selected.id):-1;
  const money=(minor:unknown)=>new Intl.NumberFormat(intl,{style:'currency',currency,maximumFractionDigits:2}).format(safeMinor(minor)/100);const statusText=isPending||saveState==='saving'?dragCopy.saving:saveState==='saved'?dragCopy.saved:saveState==='error'?dragCopy.error:dragCopy.hint;

  const pointerHandlers=(item:SceneItem)=>({
    onPointerDown:(event:React.PointerEvent<SVGGElement>)=>{if(isPending||(event.pointerType==='mouse'&&event.button!==0))return;dragRef.current={cabinetId:item.row.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false,changed:false};setSelectedId(item.row.id);setSaveState('idle');try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}},
    onPointerMove:(event:React.PointerEvent<SVGGElement>)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.startX;const dy=event.clientY-drag.startY;if(!drag.active){if(Math.abs(dx)<12&&Math.abs(dy)<12)return;if(Math.abs(dy)>Math.abs(dx)*1.1)return;drag.active=true;setDraggingId(drag.cabinetId);}if(!drag.active)return;event.preventDefault();const svg=svgRef.current;if(!svg)return;const rect=svg.getBoundingClientRect();const sceneX=(event.clientX-rect.left)/Math.max(rect.width,1)*layout.viewWidth-layout.padX;const dragRow=orderRef.current.find((row)=>row.id===drag.cabinetId);if(!dragRow)return;const candidates=orderRef.current.filter((row)=>zone(row)===zone(dragRow)&&row.id!==drag.cabinetId).map((row)=>({row,center:layout.centers.get(row.id)?.center??0}));if(!candidates.length)return;const target=candidates.reduce((best,current)=>Math.abs(current.center-sceneX)<Math.abs(best.center-sceneX)?current:best);const next=reorderWithinZone(orderRef.current,drag.cabinetId,target.row.id,sceneX>target.center);if(!sameOrder(next,orderRef.current)){orderRef.current=next;setOrderedCabinets(next);drag.changed=true;}},
    onPointerUp:(event:React.PointerEvent<SVGGElement>)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;dragRef.current=null;setDraggingId('');try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}if(drag.active&&drag.changed)persistOrder(orderRef.current);},
    onPointerCancel:()=>{dragRef.current=null;setDraggingId('');orderRef.current=cabinets;setOrderedCabinets(cabinets);},
  });

  return <>
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}><div><span className="eyebrow">MAKSTER QUOTE · VISUAL 0.4</span><h2>{copy.visualTitle}</h2><p>{copy.visualHelp}</p></div><div className={styles.sceneStats}><span>{copy.lineLength}</span><strong>{layout.lineWidth.toLocaleString(intl)} mm</strong><span>{layout.count} {copy.modules}</span></div></div>
      <div className={styles.dragHint} data-state={saveState}><div className={styles.dragCopy}><span>↔</span><strong>{statusText}</strong></div><div className={styles.orderButtons}><button type="button" onClick={()=>shiftSelected(-1)} disabled={!selected||selectedZoneIndex<=0||isPending} aria-label={dragCopy.left}>←</button><button type="button" onClick={()=>shiftSelected(1)} disabled={!selected||selectedZoneIndex<0||selectedZoneIndex>=selectedZoneRows.length-1||isPending} aria-label={dragCopy.right}>→</button></div></div>
      <div className={styles.sceneViewport}>
        {layout.count?<svg ref={svgRef} className={styles.kitchenElevation} viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`} role="img" aria-label={copy.visualTitle}>
          <rect x="0" y="0" width={layout.viewWidth} height={layout.viewHeight} fill="#fffdf9"/>
          <rect x={layout.padX} y={layout.floorY-layout.baseHeight-layout.backsplashMm} width={layout.lineWidth} height={layout.backsplashMm} fill="#fbf4ee"/>
          <line x1={layout.padX} x2={layout.padX+layout.lineWidth} y1={layout.floorY-layout.baseHeight} y2={layout.floorY-layout.baseHeight} stroke="#d6bfae" strokeWidth="7" vectorEffect="non-scaling-stroke"/>
          <line x1={layout.padX} x2={layout.padX+layout.lineWidth} y1={layout.floorY} y2={layout.floorY} stroke="#bca28e" strokeWidth="7" vectorEffect="non-scaling-stroke"/>
          <g transform={`translate(${layout.padX} ${layout.floorY})`}>
            {layout.all.map((item)=>{const handlers=pointerHandlers(item);return <CabinetFace key={item.sceneId} item={item} selected={item.row.id===selected?.id} dragging={item.row.id===draggingId} onClick={()=>setSelectedId(item.row.id)} {...handlers}/>;})}
          </g>
        </svg>:<div className={styles.empty}><div className={styles.emptyIllustration}><ModuleSchematic moduleKey="b-door" name="Base cabinet"/></div><h3>{copy.emptyTitle}</h3><p>{copy.emptyText}</p></div>}
      </div>
      <div className={styles.sceneFooter}><span className={styles.schematicBadge}>{copy.schematic}</span><span>{dragCopy.backsplash}</span><span>{copy.future3d}</span></div>
    </section>
    <aside className={styles.detailsPanel}>
      <div className={styles.detailsHeader}><div><span className="eyebrow">{copy.selected.toUpperCase()}</span><h3>{selected?.name??'—'}</h3></div>{selected?<span className={styles.schematicBadge}>{copy.schematic}</span>:null}</div>
      {selected?<div className={styles.detailsBody}><div className={styles.detailPreview}><ModuleSchematic moduleKey={selected.module_key} name={selected.name} widthMm={selected.width_mm} heightMm={selected.height_mm}/></div><div><div className={styles.detailName}>{selected.name}</div><div className={styles.detailKey}>{selected.module_key}</div><div className={styles.detailRows}><div className={styles.detailRow}><span>{copy.dimensions}</span><strong>{dimension(selected.width_mm,0)} × {dimension(selected.height_mm,0)} × {dimension(selected.depth_mm,0)} mm</strong></div><div className={styles.detailRow}><span>{copy.cost}</span><strong>{money(selected.computed_cost_json?.trueCostMinor)}</strong></div><div className={styles.detailRow}><span>{copy.price}</span><strong>{money(selected.computed_cost_json?.netSalesMinor)}</strong></div><div className={styles.detailRow}><span>Status</span><strong className={selected.computed_cost_json?.complete?styles.ready:styles.needs}>{selected.computed_cost_json?.complete?copy.complete:copy.needsCost}</strong></div></div><div className={styles.future}>{copy.future3d}</div></div></div>:<div className={styles.emptyDetails}>{copy.emptyText}</div>}
    </aside>
  </>;
}
