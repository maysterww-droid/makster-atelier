import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ProjectFlow } from '@/components/project-flow';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMeasurementMessages } from '@/lib/i18n-measurements';
import { getPhase1Messages } from '@/lib/i18n-measurements-phase1';
import { requireWorkspace } from '@/lib/workspace';
import { MeasurementForm } from './measurement-form';
import { MeasurementPhotoUploader } from './measurement-photo-uploader';
import styles from './measurements.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};
type JsonRecord = Record<string, unknown>;
type StoredPhoto = { path: string; name: string };

function photoRows(value: unknown): StoredPhoto[] {
  if (!Array.isArray(value)) return [];
  const result: StoredPhoto[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as JsonRecord;
    if (typeof row.path !== 'string' || !row.path) continue;
    result.push({ path: row.path, name: typeof row.name === 'string' ? row.name : 'photo' });
  }
  return result;
}

export default async function MeasurementsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getMeasurementMessages(locale);
  const p1 = getPhase1Messages(locale);

  const [projectResult, measurementResult, subscriptionResult, cabinetsResult, quotesResult] = await Promise.all([
    supabase.from('projects').select('id, name, settings').eq('id', id).eq('organization_id', organization.id).is('archived_at', null).maybeSingle(),
    supabase.from('quote_project_measurements').select('*').eq('project_id', id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, computed_cost_json').eq('project_id', id).eq('organization_id', organization.id),
    supabase.from('client_commercial_quotes').select('id').eq('project_id', id).eq('organization_id', organization.id).limit(1),
  ]);

  const project = projectResult.data;
  if (projectResult.error || !project) notFound();
  if (measurementResult.error || cabinetsResult.error || quotesResult.error) throw new Error('Failed to load measurement workspace.');

  const measurement = measurementResult.data;
  const cabinets = cabinetsResult.data ?? [];
  const completeCabinetCount = cabinets.filter((row) => Boolean((row.computed_cost_json as JsonRecord | null)?.complete)).length;
  const costReady = cabinets.length > 0 && completeCabinetCount === cabinets.length;
  const projectSettings = (project.settings && typeof project.settings === 'object' && !Array.isArray(project.settings) ? project.settings : {}) as JsonRecord;
  const priceReady = costReady && Boolean(projectSettings.quoteCommercial);
  const proposalReady = (quotesResult.data?.length ?? 0) > 0;
  const complete = measurement?.status === 'complete';
  const missingRequired = [
    measurement?.measured_at ? null : m.measuredAt,
    measurement?.site_address ? null : m.siteAddress,
    Number(measurement?.room_height_mm ?? 0) > 0 ? null : m.roomHeight,
    Number(measurement?.wall_a_mm ?? 0) > 0 ? null : m.wallA,
  ].filter((value): value is string => Boolean(value));
  const storedPhotos = photoRows(measurement?.photos_json);
  const photos = await Promise.all(storedPhotos.map(async (photo) => {
    const { data } = await supabase.storage.from('quote-measurements').createSignedUrl(photo.path, 3600);
    return { ...photo, url:data?.signedUrl ?? '' };
  }));

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscriptionResult.data?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">PHASE 1 · MEASUREMENTS</span><h1>{m.title} · {project.name}</h1><p className="muted">{m.subtitle}</p></div>
        <div className="topActions"><Link href={`/projects/${project.id}`} className="textLink">{m.backToProject}</Link><Link href={`/library?project=${project.id}`} className="secondary linkButton">{m.modulesStep}</Link></div>
      </header>
      <div className={styles.page}>
        <ProjectFlow projectId={project.id} locale={locale} active="measurements" measurementComplete={complete} cabinetCount={cabinets.length} completeCabinetCount={completeCabinetCount} costReady={costReady} priceReady={priceReady} proposalReady={proposalReady}/>
        {query.saved === 'draft' ? <div className="notice success">{m.savedDraft}</div> : null}
        {query.saved === 'complete' ? <div className="notice success">{m.savedComplete}</div> : null}
        {query.error === 'required' ? <div className="notice warning">{m.requiredError}</div> : null}
        {query.error && query.error !== 'required' ? <div className="notice error">{m.saveError} ({query.error})</div> : null}
        {!complete && missingRequired.length ? <div className="notice warning"><strong>{p1.remaining}: {missingRequired.length}.</strong> {missingRequired.join(' · ')}</div> : null}
        <MeasurementForm projectId={project.id} measurement={measurement} complete={complete} m={m}/>
        <section className={styles.section}>
          <div className={styles.head}><span className="eyebrow">07</span><h2>{m.photos}</h2><p className="muted">{m.photosHelp}</p></div>
          <div className={styles.body}>
            <MeasurementPhotoUploader organizationId={organization.id} projectId={project.id} photos={photos} copy={{upload:p1.upload,uploadHint:p1.uploadHint,uploading:p1.uploading,uploadFailed:p1.uploadFailed,invalidPhoto:p1.invalidPhoto,remove:p1.remove,noPhotos:p1.noPhotos,photos:p1.photos}}/>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
