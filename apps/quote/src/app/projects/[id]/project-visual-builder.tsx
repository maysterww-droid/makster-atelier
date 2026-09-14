'use client';

import { useMemo, useState } from 'react';
import { ModuleSchematic } from '@/components/module-schematic';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';
import { VISUAL_COPY } from './visual-copy';
import styles from './visual-builder.module.css';

type CabinetRow={id:string;module_key:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;quantity:number|string;construction_json:Record<string,unknown>;computed_cost_json:Record<string,unknown>};
type Props={cabinets:CabinetRow[];currency:string;locale:Locale};
type SceneItem={sceneId:string;row:CabinetRow;index:number};
type Level='wall'|'tall'|'base';

function qty(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(1,Math.min(99,Math.round(parsed))):1;}
function dimension(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0?parsed:fallback;}
function level(row:CabinetRow):Level{const key=row.module_key;const name=row.name.toLowerCase();if(key.startsWith('w-')||name.includes('верх')||name.includes('wall')||name.includes('horní')||name.includes('oberschrank')||name.includes('górna'))return 'wall';if(key.startsWith('t-')||name.includes('пенал')||name.includes('tall')||name.includes('vysok')||name.includes('hochschrank')||name.includes('słupek'))return 'tall';return 'base';}
function safeMinor(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}

export function ProjectVisualBuilder({cabinets,currency,locale}:Props){
  const copy=VISUAL_COPY[locale]; const intl=INTL_LOCALES[locale];
  const [selectedId,setSelectedId]=useState(cabinets[0]?.id??'');
  const selected=cabinets.find((row)=>row.id===selectedId)??cabinets[0];
  const sceneItems=useMemo<SceneItem[]>(()=>cabinets.flatMap((row)=>Array.from({length:qty(row.quantity)},(_,index)=>({sceneId:`${row.id}-${index}`,row,index}))),[cabinets]);
  const wallItems=sceneItems.filter((item)=>level(item.row)==='wall');
  const lowerItems=sceneItems.filter((item)=>level(item.row)!=='wall');
  const wallWidth=wallItems.reduce((sum,item)=>sum+dimension(item.row.width_mm,600),0);
  const lowerWidth=lowerItems.reduce((sum,item)=>sum+dimension(item.row.width_mm,600),0);
  const totalWidth=Math.max(wallWidth,lowerWidth);
  const sceneScale=Math.max(.10,Math.min(.17,600/Math.max(totalWidth,1)));
  const money=(minor:unknown)=>new Intl.NumberFormat(intl,{style:'currency',currency,maximumFractionDigits:2}).format(safeMinor(minor)/100);
  const renderItem=({sceneId,row,index}:SceneItem)=>{const width=dimension(row.width_mm,600);const mode=level(row);const px=Math.max(34,width*sceneScale);return <button key={sceneId} type="button" onClick={()=>setSelectedId(row.id)} className={`${styles.sceneUnit} ${row.id===selected?.id?styles.sceneUnitSelected:''} ${mode==='tall'?styles.tallUnit:mode==='wall'?styles.wallUnit:styles.baseUnit}`} style={{width:px}} aria-label={`${row.name} ${index+1}`}><ModuleSchematic tight className={styles.sceneSvg} moduleKey={row.module_key} name={row.name} widthMm={row.width_mm} heightMm={row.height_mm}/><span className={styles.unitLabel}>{width} mm</span></button>;};
  return <>
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}><div><span className="eyebrow">MAKSTER QUOTE · VISUAL 0.1</span><h2>{copy.visualTitle}</h2><p>{copy.visualHelp}</p></div><div className={styles.sceneStats}><span>{copy.lineLength}</span><strong>{totalWidth.toLocaleString(intl)} mm</strong><span>{sceneItems.length} {copy.modules}</span></div></div>
      <div className={styles.sceneViewport}>
        {sceneItems.length?<div className={styles.sceneComposition}><div className={styles.wallRow}>{wallItems.map(renderItem)}</div><div className={styles.baseRow}>{lowerItems.map(renderItem)}</div></div>:<div className={styles.empty}><div className={styles.emptyIllustration}><ModuleSchematic moduleKey="b-door" name="Base cabinet"/></div><h3>{copy.emptyTitle}</h3><p>{copy.emptyText}</p></div>}
      </div>
      <div className={styles.sceneFooter}><span className={styles.schematicBadge}>{copy.schematic}</span><span>{copy.future3d}</span></div>
    </section>
    <aside className={styles.detailsPanel}>
      <div className={styles.detailsHeader}><div><span className="eyebrow">{copy.selected.toUpperCase()}</span><h3>{selected?.name??'—'}</h3></div>{selected?<span className={styles.schematicBadge}>{copy.schematic}</span>:null}</div>
      {selected?<div className={styles.detailsBody}><div className={styles.detailPreview}><ModuleSchematic moduleKey={selected.module_key} name={selected.name} widthMm={selected.width_mm} heightMm={selected.height_mm}/></div><div><div className={styles.detailName}>{selected.name}</div><div className={styles.detailKey}>{selected.module_key}</div><div className={styles.detailRows}><div className={styles.detailRow}><span>{copy.dimensions}</span><strong>{dimension(selected.width_mm,0)} × {dimension(selected.height_mm,0)} × {dimension(selected.depth_mm,0)} mm</strong></div><div className={styles.detailRow}><span>{copy.cost}</span><strong>{money(selected.computed_cost_json?.trueCostMinor)}</strong></div><div className={styles.detailRow}><span>{copy.price}</span><strong>{money(selected.computed_cost_json?.netSalesMinor)}</strong></div><div className={styles.detailRow}><span>Status</span><strong className={selected.computed_cost_json?.complete?styles.ready:styles.needs}>{selected.computed_cost_json?.complete?copy.complete:copy.needsCost}</strong></div></div><div className={styles.future}>{copy.future3d}</div></div></div>:<div className={styles.emptyDetails}>{copy.emptyText}</div>}
    </aside>
  </>;
}
