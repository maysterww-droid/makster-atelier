import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ProjectFlow } from '@/components/project-flow';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMeasurementMessages } from '@/lib/i18n-measurements';
import { requireWorkspace } from '@/lib/workspace';
import { saveProjectMeasurements } from './actions';
import styles from './measurements.module.css';

export const dynamic = 'force-dynamic';
type Props = { params:Promise<{id:string}>; searchParams:Promise<{saved?:string;error?:string}> };
type JsonRecord = Record<string,unknown>;

export default async function MeasurementsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getMeasurementMessages(locale);

  const [projectResult, measurementResult, subscriptionResult, cabinetsResult, quotesResult] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, status, currency, settings').eq('id',id).eq('organization_id',organization.id).is('archived_at',null).maybeSingle(),
    supabase.from('quote_project_measurements').select('*').eq('project_id',id).eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, computed_cost_json').eq('project_id',id).eq('organization_id',organization.id),
    supabase.from('client_commercial_quotes').select('id').eq('project_id',id).eq('organization_id',organization.id).limit(1),
  ]);

  const project = projectResult.data;
  if (projectResult.error || !project) notFound();
  if (measurementResult.error) throw new Error(`Failed to load measurements: ${measurementResult.error.message}`);
  if (cabinetsResult.error) throw new Error(`Failed to load modules: ${cabinetsResult.error.message}`);
  if (quotesResult.error) throw new Error(`Failed to load proposal state: ${quotesResult.error.message}`);

  const measurement = measurementResult.data;
  const cabinets = cabinetsResult.data ?? [];
  const completeCabinetCount = cabinets.filter((row)=>Boolean((row.computed_cost_json as JsonRecord | null)?.complete)).length;
  const costReady = cabinets.length > 0 && completeCabinetCount === cabinets.length;
  const projectSettings = (project.settings && typeof project.settings === 'object' && !Array.isArray(project.settings) ? project.settings : {}) as JsonRecord;
  const priceReady = costReady && Boolean(projectSettings.quoteCommercial);
  const proposalReady = (quotesResult.data?.length ?? 0) > 0;
  const complete = measurement?.status === 'complete';

  return <AppShell organizationName={organization.name} role={role} plan={(subscriptionResult.data?.plan??'free').toUpperCase()}>
    <header className="topbar">
      <div><span className="eyebrow">PHASE 1 · MEASUREMENTS</span><h1>{m.title} · {project.name}</h1><p className="muted">{m.subtitle}</p></div>
      <div className="topActions"><Link href={`/projects/${project.id}`} className="textLink">{m.backToProject}</Link><Link href={`/library?project=${project.id}`} className="secondary linkButton">{m.modulesStep}</Link></div>
    </header>

    <div className={styles.page}>
      <ProjectFlow projectId={project.id} locale={locale} active="measurements" measurementComplete={complete} cabinetCount={cabinets.length} completeCabinetCount={completeCabinetCount} costReady={costReady} priceReady={priceReady} proposalReady={proposalReady}/>

      {query.saved==='draft'?<div className="notice success">{m.savedDraft}</div>:null}
      {query.saved==='complete'?<div className="notice success">{m.savedComplete}</div>:null}
      {query.error==='required'?<div className="notice warning">{m.requiredError}</div>:null}
      {query.error&&query.error!=='required'?<div className="notice error">{m.saveError} ({query.error})</div>:null}

      <form action={saveProjectMeasurements}>
        <input type="hidden" name="projectId" value={project.id}/>

        <section className={styles.section}>
          <div className={styles.head}><span className="eyebrow">01</span><h2>{m.basics}</h2><p className="muted">{m.basicsHelp}</p></div>
          <div className={styles.body}>
            <div className={styles.grid2}>
              <label className={styles.field}>{m.measuredAt}<input name="measuredAt" type="date" defaultValue={measurement?.measured_at??''}/></label>
              <label className={styles.field}>{m.measuredBy}<input name="measuredBy" defaultValue={measurement?.measured_by??''}/></label>
            </div>
            <label className={styles.field}>{m.siteAddress}<input name="siteAddress" defaultValue={measurement?.site_address??''}/></label>
            <label className={styles.field}>{m.roomShape}<select name="roomShape" defaultValue={measurement?.room_shape??''}><option value="">—</option><option value="straight">{m.shapeStraight}</option><option value="l">{m.shapeL}</option><option value="u">{m.shapeU}</option><option value="island">{m.shapeIsland}</option><option value="other">{m.shapeOther}</option></select></label>
          </div>
        </section>

        <section className={styles.section} style={{marginTop:18}}>
          <div className={styles.head}><span className="eyebrow">02</span><h2>{m.geometry}</h2><p className="muted">{m.geometryHelp}</p></div>
          <div className={styles.body}><div className={styles.grid4}>
            {[['roomHeightMm',m.roomHeight,measurement?.room_height_mm],['wallAMm',m.wallA,measurement?.wall_a_mm],['wallBMm',m.wallB,measurement?.wall_b_mm],['wallCMm',m.wallC,measurement?.wall_c_mm],['wallDMm',m.wallD,measurement?.wall_d_mm]].map(([name,label,value])=><label className={`${styles.field} ${styles.metricInput}`} key={String(name)}>{String(label)}<input name={String(name)} type="number" min="1" step="1" defaultValue={(value as string|number|null)??''}/><span className={styles.unit}>{m.millimeters}</span></label>)}
          </div></div>
        </section>

        <section className={styles.section} style={{marginTop:18}}>
          <div className={styles.head}><span className="eyebrow">03</span><h2>{m.openings}</h2><p className="muted">{m.openingsHelp}</p></div>
          <div className={styles.body}><div className={styles.grid2}>
            <label className={styles.field}>{m.niches}<textarea name="nichesText" defaultValue={measurement?.niches_text??''}/></label>
            <label className={styles.field}>{m.windows}<textarea name="windowsText" defaultValue={measurement?.windows_text??''}/></label>
            <label className={styles.field}>{m.doors}<textarea name="doorsText" defaultValue={measurement?.doors_text??''}/></label>
          </div></div>
        </section>

        <section className={styles.section} style={{marginTop:18}}>
          <div className={styles.head}><span className="eyebrow">04</span><h2>{m.utilities}</h2><p className="muted">{m.utilitiesHelp}</p></div>
          <div className={styles.body}><div className={styles.grid2}>
            <label className={styles.field}>{m.plumbing}<textarea name="plumbingText" defaultValue={measurement?.plumbing_text??''}/></label>
            <label className={styles.field}>{m.electrical}<textarea name="electricalText" defaultValue={measurement?.electrical_text??''}/></label>
            <label className={styles.field}>{m.ventilation}<textarea name="ventilationText" defaultValue={measurement?.ventilation_text??''}/></label>
            <label className={styles.field}>{m.gas}<textarea name="gasText" defaultValue={measurement?.gas_text??''}/></label>
          </div></div>
        </section>

        <section className={styles.section} style={{marginTop:18}}>
          <div className={styles.head}><span className="eyebrow">05</span><h2>{m.appliances}</h2><p className="muted">{m.appliancesHelp}</p></div>
          <div className={styles.body}><label className={styles.field}>{m.applianceNotes}<textarea name="appliancesText" defaultValue={measurement?.appliances_text??''}/></label></div>
        </section>

        <section className={styles.section} style={{marginTop:18}}>
          <div className={styles.head}><span className="eyebrow">06</span><h2>{m.conditions}</h2><p className="muted">{m.conditionsHelp}</p></div>
          <div className={styles.body}><div className={styles.grid2}>
            <label className={styles.field}>{m.floorWalls}<textarea name="floorWallsText" defaultValue={measurement?.floor_walls_text??''}/></label>
            <label className={styles.field}>{m.notes}<textarea name="notes" defaultValue={measurement?.notes??''}/></label>
          </div><div className={styles.photoBox}><strong>{m.photos}</strong><p>{m.photosHelp}</p><p>{m.photosComing}</p></div></div>
          <div className={styles.footer}>
            <div className={styles.status}><strong>{complete?m.complete:m.draft}</strong><small>{m.completeRequirements}</small></div>
            <div className={styles.actions}><button className="secondary" name="intent" value="draft" type="submit">{m.saveDraft}</button><button className="primary" name="intent" value="complete" type="submit">{m.saveComplete}</button></div>
          </div>
        </section>
      </form>
    </div>
  </AppShell>;
}
