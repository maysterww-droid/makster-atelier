import type { MeasurementMessages } from '@/lib/i18n-measurements';
import { saveProjectMeasurements } from './actions';
import styles from './measurements.module.css';

type Measurement = Record<string,any> | null;
type Props={projectId:string;measurement:Measurement;complete:boolean;m:MeasurementMessages};

export function MeasurementForm({projectId,measurement,complete,m}:Props){
  const metricFields=[['roomHeightMm',m.roomHeight,measurement?.room_height_mm],['wallAMm',m.wallA,measurement?.wall_a_mm],['wallBMm',m.wallB,measurement?.wall_b_mm],['wallCMm',m.wallC,measurement?.wall_c_mm],['wallDMm',m.wallD,measurement?.wall_d_mm]];
  return <form action={saveProjectMeasurements}>
    <input type="hidden" name="projectId" value={projectId}/>
    <section className={styles.section}>
      <div className={styles.head}><span className="eyebrow">01</span><h2>{m.basics}</h2><p className="muted">{m.basicsHelp}</p></div>
      <div className={styles.body}>
        <div className={styles.grid2}><label className={styles.field}>{m.measuredAt}<input name="measuredAt" type="date" defaultValue={measurement?.measured_at??''}/></label><label className={styles.field}>{m.measuredBy}<input name="measuredBy" defaultValue={measurement?.measured_by??''}/></label></div>
        <label className={styles.field}>{m.siteAddress}<input name="siteAddress" defaultValue={measurement?.site_address??''}/></label>
        <label className={styles.field}>{m.roomShape}<select name="roomShape" defaultValue={measurement?.room_shape??''}><option value="">—</option><option value="straight">{m.shapeStraight}</option><option value="l">{m.shapeL}</option><option value="u">{m.shapeU}</option><option value="island">{m.shapeIsland}</option><option value="other">{m.shapeOther}</option></select></label>
      </div>
    </section>
    <section className={styles.section} style={{marginTop:18}}><div className={styles.head}><span className="eyebrow">02</span><h2>{m.geometry}</h2><p className="muted">{m.geometryHelp}</p></div><div className={styles.body}><div className={styles.grid4}>{metricFields.map(([name,label,value])=><label className={`${styles.field} ${styles.metricInput}`} key={String(name)}>{String(label)}<input name={String(name)} type="number" min="1" step="1" defaultValue={(value as string|number|null)??''}/><span className={styles.unit}>{m.millimeters}</span></label>)}</div></div></section>
    <section className={styles.section} style={{marginTop:18}}><div className={styles.head}><span className="eyebrow">03</span><h2>{m.openings}</h2><p className="muted">{m.openingsHelp}</p></div><div className={styles.body}><div className={styles.grid2}><label className={styles.field}>{m.niches}<textarea name="nichesText" defaultValue={measurement?.niches_text??''}/></label><label className={styles.field}>{m.windows}<textarea name="windowsText" defaultValue={measurement?.windows_text??''}/></label><label className={styles.field}>{m.doors}<textarea name="doorsText" defaultValue={measurement?.doors_text??''}/></label></div></div></section>
    <section className={styles.section} style={{marginTop:18}}><div className={styles.head}><span className="eyebrow">04</span><h2>{m.utilities}</h2><p className="muted">{m.utilitiesHelp}</p></div><div className={styles.body}><div className={styles.grid2}><label className={styles.field}>{m.plumbing}<textarea name="plumbingText" defaultValue={measurement?.plumbing_text??''}/></label><label className={styles.field}>{m.electrical}<textarea name="electricalText" defaultValue={measurement?.electrical_text??''}/></label><label className={styles.field}>{m.ventilation}<textarea name="ventilationText" defaultValue={measurement?.ventilation_text??''}/></label><label className={styles.field}>{m.gas}<textarea name="gasText" defaultValue={measurement?.gas_text??''}/></label></div></div></section>
    <section className={styles.section} style={{marginTop:18}}><div className={styles.head}><span className="eyebrow">05</span><h2>{m.appliances}</h2><p className="muted">{m.appliancesHelp}</p></div><div className={styles.body}><label className={styles.field}>{m.applianceNotes}<textarea name="appliancesText" defaultValue={measurement?.appliances_text??''}/></label></div></section>
    <section className={styles.section} style={{marginTop:18}}><div className={styles.head}><span className="eyebrow">06</span><h2>{m.conditions}</h2><p className="muted">{m.conditionsHelp}</p></div><div className={styles.body}><div className={styles.grid2}><label className={styles.field}>{m.floorWalls}<textarea name="floorWallsText" defaultValue={measurement?.floor_walls_text??''}/></label><label className={styles.field}>{m.notes}<textarea name="notes" defaultValue={measurement?.notes??''}/></label></div></div><div className={styles.footer}><div className={styles.status}><strong>{complete?m.complete:m.draft}</strong><small>{m.completeRequirements}</small></div><div className={styles.actions}><button className="secondary" name="intent" value="draft" type="submit">{m.saveDraft}</button><button className="primary" name="intent" value="complete" type="submit">{m.saveComplete}</button></div></div></section>
  </form>;
}
