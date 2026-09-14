import Link from 'next/link';
import { addPresetToProject } from '@/app/library/actions';
import { ModuleSchematic } from '@/components/module-schematic';
import type { Locale } from '@/lib/i18n';
import { ProjectVisualBuilder } from './project-visual-builder';
import { VISUAL_COPY, VISUAL_PRESETS } from './visual-copy';
import styles from './visual-builder.module.css';

type CabinetRow={id:string;module_key:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;quantity:number|string;construction_json:Record<string,unknown>;computed_cost_json:Record<string,unknown>};
type Props={projectId:string;currency:string;locale:Locale;cabinets:CabinetRow[]};

const presetVisual:Record<string,{moduleKey:string;width:number;height:number}>={
  'base-door-600':{moduleKey:'b-door',width:600,height:720},
  'base-drawer-600-3':{moduleKey:'b-drawer',width:600,height:720},
  'wall-door-600':{moduleKey:'w-door',width:600,height:720},
  'sink-600':{moduleKey:'b-door',width:600,height:720},
  'base-oven-600':{moduleKey:'b-oven',width:600,height:720},
  'dishwasher-600':{moduleKey:'dishwasher',width:600,height:720},
  'corner-base-blind-900':{moduleKey:'generic',width:900,height:720},
  'tall-oven-600':{moduleKey:'t-oven',width:600,height:2100},
  'tall-fridge-600':{moduleKey:'t-fridge',width:600,height:2100},
};

export function VisualWorkspace({projectId,currency,locale,cabinets}:Props){
  const copy=VISUAL_COPY[locale];
  return <section className={styles.workspace}>
    <aside className={styles.catalog}>
      <div className={styles.catalogHeader}><span className="eyebrow">VISUAL MODULE LIBRARY</span><h2>{copy.catalog}</h2><p>{copy.catalogHelp}</p></div>
      <div className={styles.catalogGrid}>{VISUAL_PRESETS.map((key)=>{const visual=presetVisual[key];return <form action={addPresetToProject} key={key} className={styles.presetForm}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="presetKey" value={key}/><input type="hidden" name="quantity" value="1"/><button className={styles.presetButton} type="submit"><div className={styles.presetPreview}><ModuleSchematic moduleKey={visual.moduleKey} name={copy.presets[key]} widthMm={visual.width} heightMm={visual.height}/></div><strong>{copy.presets[key]}</strong><span>+ {copy.add}</span></button></form>;})}</div>
      <div className={styles.catalogFooter}><Link href={`/library?project=${projectId}`} className="textLink">{copy.allPresets}</Link></div>
    </aside>
    <ProjectVisualBuilder cabinets={cabinets} currency={currency} locale={locale}/>
  </section>;
}
