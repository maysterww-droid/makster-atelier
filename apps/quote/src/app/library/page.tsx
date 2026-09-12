import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getLibraryMessages, libraryGroup, localizePreset, presetFeature } from '@/lib/i18n-library';
import { QUOTE_MODULE_PRESETS } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';
import { addPresetToProject } from './actions';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{project?:string;error?:string}>};

export default async function LibraryPage({searchParams}:Props){
  const query=await searchParams;const {supabase,organization,role}=await requireWorkspace();const locale=await getInterfaceLocale();const m=getLibraryMessages(locale);
  const [{data:projects,error:projectError},{data:subscription}]=await Promise.all([
    supabase.from('projects').select('id, name, project_type').eq('organization_id',organization.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(100),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
  ]);
  if(projectError)throw new Error(`Failed to load projects: ${projectError.message}`);
  const selectedProject=(projects??[]).find((project)=>project.id===query.project)??projects?.[0]??null;const groups=[...new Set(QUOTE_MODULE_PRESETS.map((preset)=>preset.group))];
  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">STANDARD MODULE LIBRARY · MQ 0.1.15</span><h1>{m.title}</h1></div><div className="topActions">{selectedProject?<Link href={`/projects/${selectedProject.id}`} className="secondary linkButton">{m.openProject}</Link>:null}<Link href="/" className="textLink">{m.back}</Link></div></header>
    <div className="pageContent">
      {query.error?<div className="notice error">{m.addError} ({query.error}).</div>:null}
      <section className="metricGrid" style={{marginBottom:18}}><article className="metricCard"><span>{m.readyPresets}</span><strong>{QUOTE_MODULE_PRESETS.length}</strong><small>{m.presetSummary}</small></article><article className="metricCard"><span>{m.groups}</span><strong>{groups.length}</strong><small>{m.groupsSummary}</small></article><article className="metricCard"><span>{m.activeProject}</span><strong style={{fontSize:18}}>{selectedProject?.name??m.notSelected}</strong><small>{selectedProject?.project_type??m.createFirst}</small></article></section>
      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">{m.targetProject}</span><h2>{m.whereToAdd}</h2><p className="muted">{m.targetHelp}</p></div></div><form method="get" className="stackForm padded"><label>{m.project}<select name="project" defaultValue={selectedProject?.id??''}>{!projects?.length?<option value="">{m.noActiveProjects}</option>:null}{(projects??[]).map((project)=><option key={project.id} value={project.id}>{project.name} · {project.project_type}</option>)}</select></label><div className="formActions"><button className="secondary" type="submit">{m.selectProject}</button><Link href="/projects/new" className="primary linkButton">{m.newProject}</Link></div></form></section>
      {!selectedProject?<div className="notice warning"><strong>{m.createProjectFirst}</strong></div>:null}
      {groups.map((group)=>{const presets=QUOTE_MODULE_PRESETS.filter((preset)=>preset.group===group);const groupText=libraryGroup(locale,group);return <section className="panel" style={{marginBottom:18}} key={group}><div className="panelHeader"><div><span className="eyebrow">{m.standardPresets} · {presets.length}</span><h2>{groupText.label}</h2><p className="muted">{groupText.hint}</p></div></div><div className="metricGrid" style={{padding:16,marginBottom:0}}>{presets.map((preset)=>{const localized=localizePreset(locale,preset);return <article className="metricCard" key={preset.key}><span>{preset.moduleKey.toUpperCase()}</span><strong style={{fontSize:18}}>{localized.name}</strong><small>{localized.description}</small><div className="costRows" style={{padding:'10px 0 0'}}><div><span>{m.size}</span><strong>{preset.widthMm} × {preset.heightMm} × {preset.depthMm} {m.mm}</strong></div><div><span>{m.construction}</span><strong>{presetFeature(locale,preset)}</strong></div><div><span>{m.backPanel}</span><strong>{preset.backMode==='none'?m.none:preset.backMode==='groove'?m.groove:m.overlay}</strong></div></div>{selectedProject?<form action={addPresetToProject} className="stackForm" style={{marginTop:12}}><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="presetKey" value={preset.key}/><label>{m.quantity}<input name="quantity" type="number" min="1" max="999" step="1" defaultValue="1"/></label><button className="primary wide" type="submit">{m.addTo} {selectedProject.name}</button></form>:null}</article>;})}</div></section>;})}
      <div className="notice success"><strong>{m.quickKitchen}</strong> {m.quickKitchenHelp}</div><div className="notice warning" style={{marginTop:12}}><strong>{m.quoteBoundary}</strong> {m.quoteBoundaryHelp}</div>
    </div>
  </AppShell>;
}
