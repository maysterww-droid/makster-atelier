'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ModuleSchematic } from '@/components/module-schematic';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';
import { reorderVisualCabinets } from './visual-actions';
import { VISUAL_COPY } from './visual-copy';
import styles from './visual-builder.module.css';

type CabinetRow={id:string;module_key:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;quantity:number|string;construction_json:Record<string,unknown>;computed_cost_json:Record<string,unknown>};
type Props={projectId:string;cabinets:CabinetRow[];currency:string;locale:Locale};
type SceneItem={sceneId:string;row:CabinetRow;index:number};
type Level='base'|'wall'|'tall';
type PositionedItem=SceneItem&{level:Level;xMm:number;widthMm:number;heightMm:number;bottomMm:number};
type Interval={start:number;end:number};
type SaveState='idle'|'saving'|'saved'|'error';
type DragState={cabinetId:string;pointerId:number;startX:number;startY:number;active:boolean;changed:boolean};

const reorderText:Record<Locale,{hint:string;saving:string;saved:string;error:string}>={
  ru:{hint:'Потяните модуль влево или вправо, чтобы изменить порядок кухни.',saving:'Сохраняю порядок…',saved:'Порядок сохранён',error:'Не удалось сохранить порядок'},
  en:{hint:'Drag a module left or right to change the kitchen order.',saving:'Saving order…',saved:'Order saved',error:'Could not save order'},
  cs:{hint:'Přetáhněte modul vlevo nebo vpravo a změňte pořadí sestavy.',saving:'Ukládám pořadí…',saved:'Pořadí uloženo',error:'Pořadí se nepodařilo uložit'},
  de:{hint:'Modul nach links oder rechts ziehen, um die Reihenfolge zu ändern.',saving:'Reihenfolge wird gespeichert…',saved:'Reihenfolge gespeichert',error:'Reihenfolge konnte nicht gespeichert werden'},
  pl:{hint:'Przeciągnij moduł w lewo lub w prawo, aby zmienić kolejność zabudowy.',saving:'Zapisywanie kolejności…',saved:'Kolejność zapisana',error:'Nie udało się zapisać kolejności'},
};

function qty(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(1,Math.min(99,Math.round(parsed))):1;}
function dimension(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0?parsed:fallback;}
function level(row:CabinetRow):Level{const key=row.module_key.toLowerCase();const name=row.name.toLowerCase();if(key.startsWith('w-')||name.includes('верх')||name.includes('wall')||name.includes('horní')||name.includes('oberschrank')||name.includes('górna'))return 'wall';if(key.startsWith('t-')||name.includes('пенал')||name.includes('tall')||name.includes('vysok')||name.includes('hochschrank')||name.includes('słupek'))return 'tall';return 'base';}
function zone(row:CabinetRow){return level(row)==='wall'?'wall':'ground';}
function safeMinor(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
function visualType(row:CabinetRow){const haystack=`${row.module_key} ${row.name}`.toLowerCase();if(haystack.includes('drawer')||haystack.includes('ящик')||haystack.includes('zásuv')||haystack.includes('schublad')||haystack.includes('szuflad'))return 'drawer';if(haystack.includes('oven')||haystack.includes('духов')||haystack.includes('troub')||haystack.includes('backofen')||haystack.includes('piekarnik'))return 'oven';if(haystack.includes('dishwasher')||haystack.includes('пмм')||haystack.includes('myčk')||haystack.includes('geschirr')||haystack.includes('zmyw'))return 'dishwasher';if(haystack.includes('fridge')||haystack.includes('холод')||haystack.includes('lednic')||haystack.includes('kühl')||haystack.includes('lodów'))return 'fridge';if(haystack.includes('sink')||haystack.includes('мой')||haystack.includes('dřez')||haystack.includes('spül')||haystack.includes('zlew'))return 'sink';return 'door';}

function sameOrder(a:CabinetRow[],b:CabinetRow[]){return a.length===b.length&&a.every((row,index)=>row.id===b[index]?.id);}
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

function baseIntervals(items:PositionedItem[]):Interval[]{
  const segments=items.filter((item)=>item.level==='base').map((item)=>({start:item.xMm,end:item.xMm+item.widthMm}));
  const intervals:Interval[]=[];
  for(const segment of segments){const last=intervals[intervals.length-1];if(last&&Math.abs(last.end-segment.start)<1){last.end=segment.end;}else{intervals.push({...segment});}}
  return intervals;
}

function placeWalls(items:SceneItem[],intervals:Interval[],bottomMm:number):PositionedItem[]{
  if(!items.length)return[];
  if(!intervals.length){let cursor=0;return items.map((item)=>{const widthMm=dimension(item.row.width_mm,600);const positioned={...item,level:'wall' as const,xMm:cursor,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm};cursor+=widthMm;return positioned;});}
  let intervalIndex=0;let cursor=intervals[0].start;let overflowCursor=intervals[intervals.length-1].end;
  return items.map((item)=>{const widthMm=dimension(item.row.width_mm,600);while(intervalIndex<intervals.length&&cursor+widthMm>intervals[intervalIndex].end+1){intervalIndex+=1;if(intervalIndex<intervals.length)cursor=intervals[intervalIndex].start;}
    const xMm=intervalIndex<intervals.length?cursor:overflowCursor;
    if(intervalIndex<intervals.length)cursor+=widthMm;else overflowCursor+=widthMm;
    return {...item,level:'wall' as const,xMm,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm};
  });
}

function ElevationUnit({row}:{row:CabinetRow}){
  const type=visualType(row);const stroke='#4a3327';const front='#f2e2d5';const panel='#fffaf5';
  return <svg className={styles.elevationSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="1" y="1" width="98" height="98" fill={panel} stroke={stroke} strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
    {type==='drawer'?<>{[33.3,66.6].map((y)=><line key={y} x1="1" x2="99" y1={y} y2={y} stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke"/>)}{[16.5,50,83.5].map((y)=><line key={`h${y}`} x1="44" x2="56" y1={y} y2={y} stroke={stroke} strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>)}</>:null}
    {type==='door'||type==='sink'?<><rect x="5" y="5" width="90" height="90" fill={front} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke"/><line x1="84" x2="84" y1="43" y2="57" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke"/>{type==='sink'?<ellipse cx="50" cy="8" rx="23" ry="4" fill="#d9c5b4" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke"/>:null}</>:null}
    {type==='oven'?<><rect x="5" y="5" width="90" height="90" fill="#f4ece6" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke"/><rect x="14" y="24" width="72" height="58" rx="2" fill="#4b4039"/><rect x="20" y="34" width="60" height="38" fill="#9c8f85"/><circle cx="35" cy="14" r="3" fill={stroke}/><circle cx="65" cy="14" r="3" fill={stroke}/></>:null}
    {type==='dishwasher'?<><rect x="5" y="5" width="90" height="90" fill="#eee5dd" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke"/><rect x="12" y="12" width="76" height="8" rx="1" fill="#9c8f85"/><circle cx="78" cy="16" r="2.5" fill={stroke}/></>:null}
    {type==='fridge'?<><rect x="5" y="5" width="90" height="90" fill={front} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke"/><line x1="5" x2="95" y1="69" y2="69" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/><line x1="84" x2="84" y1="22" y2="42" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke"/><line x1="84" x2="84" y1="78" y2="90" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke"/></>:null}
  </svg>;
}

export function ProjectVisualBuilder({projectId,cabinets,currency,locale}:Props){
  const copy=VISUAL_COPY[locale]; const intl=INTL_LOCALES[locale]; const dragCopy=reorderText[locale];
  const [orderedCabinets,setOrderedCabinets]=useState(cabinets);
  const orderRef=useRef(cabinets);
  const dragRef=useRef<DragState|null>(null);
  const [draggingId,setDraggingId]=useState('');
  const [saveState,setSaveState]=useState<SaveState>('idle');
  const [isPending,startTransition]=useTransition();
  const [selectedId,setSelectedId]=useState(cabinets[0]?.id??'');

  useEffect(()=>{setOrderedCabinets(cabinets);orderRef.current=cabinets;if(selectedId&&!cabinets.some((row)=>row.id===selectedId))setSelectedId(cabinets[0]?.id??'');},[cabinets,selectedId]);

  const selected=orderedCabinets.find((row)=>row.id===selectedId)??orderedCabinets[0];
  const sceneItems=useMemo<SceneItem[]>(()=>orderedCabinets.flatMap((row)=>Array.from({length:qty(row.quantity)},(_,index)=>({sceneId:`${row.id}-${index}`,row,index}))),[orderedCabinets]);
  const layout=useMemo(()=>{
    const groundRaw=sceneItems.filter((item)=>level(item.row)!=='wall');
    const wallRaw=sceneItems.filter((item)=>level(item.row)==='wall');
    let cursor=0;
    const ground:PositionedItem[]=groundRaw.map((item)=>{const widthMm=dimension(item.row.width_mm,600);const positioned={...item,level:level(item.row),xMm:cursor,widthMm,heightMm:dimension(item.row.height_mm,720),bottomMm:0};cursor+=widthMm;return positioned;});
    const baseHeight=Math.max(720,...ground.filter((item)=>item.level==='base').map((item)=>item.heightMm));
    const backsplashMm=600;
    const wallBottom=baseHeight+backsplashMm;
    const walls=placeWalls(wallRaw,baseIntervals(ground),wallBottom);
    const all=[...ground,...walls];
    const lineWidth=Math.max(1,...all.map((item)=>item.xMm+item.widthMm));
    const wallTop=Math.max(0,...walls.map((item)=>item.bottomMm+item.heightMm));
    const tallTop=Math.max(0,...ground.filter((item)=>item.level==='tall').map((item)=>item.heightMm));
    const canvasHeight=Math.max(2200,wallTop,tallTop)+120;
    return{ground,walls,all,lineWidth,canvasHeight,baseHeight,backsplashMm};
  },[sceneItems]);

  const persistOrder=()=>{
    const ids=orderRef.current.map((row)=>row.id);
    setSaveState('saving');
    startTransition(async()=>{
      try{await reorderVisualCabinets(projectId,ids);setSaveState('saved');}
      catch{orderRef.current=cabinets;setOrderedCabinets(cabinets);setSaveState('error');}
    });
  };

  const totalWidth=layout.lineWidth;
  const money=(minor:unknown)=>new Intl.NumberFormat(intl,{style:'currency',currency,maximumFractionDigits:2}).format(safeMinor(minor)/100);
  const aspect=Math.max(.95,Math.min(1.65,layout.lineWidth/layout.canvasHeight));
  const statusText=isPending||saveState==='saving'?dragCopy.saving:saveState==='saved'?dragCopy.saved:saveState==='error'?dragCopy.error:dragCopy.hint;

  return <>
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}><div><span className="eyebrow">MAKSTER QUOTE · VISUAL 0.3</span><h2>{copy.visualTitle}</h2><p>{copy.visualHelp}</p></div><div className={styles.sceneStats}><span>{copy.lineLength}</span><strong>{totalWidth.toLocaleString(intl)} mm</strong><span>{sceneItems.length} {copy.modules}</span></div></div>
      <div className={styles.dragHint} data-state={saveState}><span>↔</span><strong>{statusText}</strong></div>
      <div className={styles.sceneViewport}>
        {sceneItems.length?<div className={styles.sceneCanvas} style={{aspectRatio:String(aspect)}}>
          <div className={styles.backsplash} style={{bottom:`${layout.baseHeight/layout.canvasHeight*100}%`,height:`${layout.backsplashMm/layout.canvasHeight*100}%`}}><span>600 mm</span></div>
          <div className={styles.floorLine}/>
          {layout.all.map((item)=>{const active=item.row.id===selected?.id;const dragging=item.row.id===draggingId;return <button key={item.sceneId} type="button" data-cabinet-id={item.row.id} data-zone={zone(item.row)} aria-grabbed={dragging} onClick={()=>setSelectedId(item.row.id)} onPointerDown={(event)=>{if(isPending||(event.pointerType==='mouse'&&event.button!==0))return;dragRef.current={cabinetId:item.row.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false,changed:false};setSelectedId(item.row.id);setSaveState('idle');}} onPointerMove={(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.startX;const dy=event.clientY-drag.startY;if(!drag.active){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;if(Math.abs(dy)>Math.abs(dx)*1.15){dragRef.current=null;return;}drag.active=true;setDraggingId(drag.cabinetId);try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}}event.preventDefault();const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-cabinet-id]');const targetId=hit?.dataset.cabinetId;if(!targetId||targetId===drag.cabinetId)return;const targetRow=orderRef.current.find((row)=>row.id===targetId);const dragRow=orderRef.current.find((row)=>row.id===drag.cabinetId);if(!targetRow||!dragRow||zone(targetRow)!==zone(dragRow))return;const rect=hit.getBoundingClientRect();const after=event.clientX>rect.left+rect.width/2;const next=reorderWithinZone(orderRef.current,drag.cabinetId,targetId,after);if(!sameOrder(next,orderRef.current)){orderRef.current=next;setOrderedCabinets(next);drag.changed=true;}}} onPointerUp={(event)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;dragRef.current=null;setDraggingId('');try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}if(drag.active&&drag.changed)persistOrder();}} onPointerCancel={()=>{dragRef.current=null;setDraggingId('');orderRef.current=cabinets;setOrderedCabinets(cabinets);}} className={`${styles.elevationUnit} ${active?styles.elevationSelected:''} ${dragging?styles.elevationDragging:''} ${item.level==='wall'?styles.elevationWall:item.level==='tall'?styles.elevationTall:styles.elevationBase}`} style={{left:`${item.xMm/layout.lineWidth*100}%`,width:`${item.widthMm/layout.lineWidth*100}%`,bottom:`${item.bottomMm/layout.canvasHeight*100}%`,height:`${item.heightMm/layout.canvasHeight*100}%`}} aria-label={`${item.row.name} ${item.index+1}`}><ElevationUnit row={item.row}/></button>;})}
        </div>:<div className={styles.empty}><div className={styles.emptyIllustration}><ModuleSchematic moduleKey="b-door" name="Base cabinet"/></div><h3>{copy.emptyTitle}</h3><p>{copy.emptyText}</p></div>}
      </div>
      <div className={styles.sceneFooter}><span className={styles.schematicBadge}>{copy.schematic}</span><span>{copy.future3d}</span></div>
    </section>
    <aside className={styles.detailsPanel}>
      <div className={styles.detailsHeader}><div><span className="eyebrow">{copy.selected.toUpperCase()}</span><h3>{selected?.name??'—'}</h3></div>{selected?<span className={styles.schematicBadge}>{copy.schematic}</span>:null}</div>
      {selected?<div className={styles.detailsBody}><div className={styles.detailPreview}><ModuleSchematic moduleKey={selected.module_key} name={selected.name} widthMm={selected.width_mm} heightMm={selected.height_mm}/></div><div><div className={styles.detailName}>{selected.name}</div><div className={styles.detailKey}>{selected.module_key}</div><div className={styles.detailRows}><div className={styles.detailRow}><span>{copy.dimensions}</span><strong>{dimension(selected.width_mm,0)} × {dimension(selected.height_mm,0)} × {dimension(selected.depth_mm,0)} mm</strong></div><div className={styles.detailRow}><span>{copy.cost}</span><strong>{money(selected.computed_cost_json?.trueCostMinor)}</strong></div><div className={styles.detailRow}><span>{copy.price}</span><strong>{money(selected.computed_cost_json?.netSalesMinor)}</strong></div><div className={styles.detailRow}><span>Status</span><strong className={selected.computed_cost_json?.complete?styles.ready:styles.needs}>{selected.computed_cost_json?.complete?copy.complete:copy.needsCost}</strong></div></div><div className={styles.future}>{copy.future3d}</div></div></div>:<div className={styles.emptyDetails}>{copy.emptyText}</div>}
    </aside>
  </>;
}
