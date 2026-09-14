import type { Locale } from '@/lib/i18n';
import { getMeasurementMessages } from '@/lib/i18n-measurements';
import { getPhase1Messages } from '@/lib/i18n-measurements-phase1';
import { saveDimensionSource } from './dimension-source-actions';

type Row={id:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;dimension_source?:string|null;measurement_reference?:string|null};
type Props={projectId:string;cabinets:Row[];locale:Locale};
const saveText:Record<Locale,string>={ru:'Сохранить источник',en:'Save source',cs:'Uložit zdroj',de:'Quelle speichern',pl:'Zapisz źródło'};

export function DimensionSourcePanel({projectId,cabinets,locale}:Props){
  if(!cabinets.length)return null;
  const m=getMeasurementMessages(locale);const p1=getPhase1Messages(locale);
  const refs=[p1.refWallA,p1.refWallB,p1.refWallC,p1.refWallD,p1.refNiche,p1.refWindow,p1.refDoor,p1.refAppliance];
  return <section className="pageContent compact"><div className="panel"><div className="panelHeader"><div><span className="eyebrow">DIMENSION PROVENANCE · PHASE 1</span><h2>{p1.dimensionSource}</h2><p className="muted">{p1.sourceHelp}</p></div></div><div className="stackForm padded">{cabinets.map((cabinet)=>{const source=cabinet.dimension_source==='standard'||cabinet.dimension_source==='measurement'?cabinet.dimension_source:'manual';const listId=`measurement-refs-${cabinet.id}`;return <form action={saveDimensionSource} key={cabinet.id} className="panel" style={{padding:14}}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="cabinetId" value={cabinet.id}/><div className="panelHeader"><div><strong>{cabinet.name}</strong><p className="muted">{Number(cabinet.width_mm)} × {Number(cabinet.height_mm)} × {Number(cabinet.depth_mm)} mm</p></div><span className="statusBadge">{source==='standard'?m.sourceStandard:source==='measurement'?m.sourceMeasurement:m.sourceManual}</span></div><div className="fieldGrid two"><label>{p1.dimensionSource}<select name="dimensionSource" defaultValue={source}><option value="standard">{m.sourceStandard}</option><option value="measurement">{m.sourceMeasurement}</option><option value="manual">{m.sourceManual}</option></select></label><label>{p1.measurementReference}<input name="measurementReference" list={listId} defaultValue={cabinet.measurement_reference??''} placeholder={p1.referencePlaceholder}/><datalist id={listId}>{refs.map((ref)=><option key={ref} value={ref}/>)}</datalist></label></div><div className="formActions"><button className="secondary" type="submit">{saveText[locale]}</button></div></form>;})}</div></div></section>;
}
