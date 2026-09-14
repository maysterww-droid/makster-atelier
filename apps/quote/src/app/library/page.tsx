import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getLibraryMessages, libraryFamily, libraryGroup, localizePreset, presetFeature } from '@/lib/i18n-library';
import { QUOTE_MODULE_PRESETS, type QuoteModuleFamily } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';
import { addPresetToProject } from './actions';
import { ModuleThumbnail } from './module-thumbnail';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{project?:string;error?:string;family?:string;q?:string}>};
const families:QuoteModuleFamily[]=['kitchen','wardrobe','bathroom','utility'];

export default async function LibraryPage({searchParams}:Props){
  const query=await searchParams;const {supabase,organization,role}=await requireWorkspace();const locale=await getInterfaceLocale();const m=getLibraryMessages(locale);
  const [{data:projects,error:projectError},{data:subscription}]=await Promise.all([
    supabase.from('projects').select('id, name, project_type').eq('organization_id',organization.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(100),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
  ]);
  if(projectError)throw new Error(`Failed to load projects: ${projectError.message}`);
  const selectedProject=(projects??[]).find((project)=>project.id===query.project)??projects?.[0]??null;
  const selectedFamily=families.includes(query.family as QuoteModuleFamily)?query.family as QuoteModuleFamily:null;
  const search=(query.q??'').trim().toLocaleLowerCase(locale);
  const filteredPresets=QUOTE_MODULE_PRESETS.filter((preset)=>{
    if(selectedFamily&&preset.family!==selectedFamily)return false;
    if(!search)return true;
    const localized=localizePreset(locale,preset);
    const haystack=[localized.name,localized.description,libraryGroup(locale,preset.group).label,libraryFamily(locale,preset.family),preset.key].join(' ').toLocaleLowerCase(locale);
    return haystack.includes(search);
  });
  const visibleFamilies=families.filter((family)=>filteredPresets.some((preset)=>preset.family===family));
  const visibleGroups=[...new Set(filteredPresets.map((preset)=>preset.group))];
  const familyHref=(family:QuoteModuleFamily|null)=>{const params=new URLSearchParams();if(selectedProject)params.set('project',selectedProject.id);if(family)params.set('family',family);if(query.q)params.set('q',query.q);return `/library?${params.toString()}`;};

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">FURNITURE MODULE LIBRARY · MQ 0.2</span><h1>{m.title}</h1></div><div className="topActions">{selectedProject?<Link href={`/projects/${selectedProject.id}`} className="secondary linkButton">{m.openProject}</Link>:null}<Link href="/dashboard" className="textLink">{m.back}</Link></div></header>
    <div className="pageContent">
      {query.error?<div className="notice error">{m.addError} ({query.error}).</div>:null}
      <section className="metricGrid" style={{marginBottom:18}}><article className="metricCard"><span>{m.readyPresets}</span><strong>{QUOTE_MODULE_PRESETS.length}</strong><small>{m.presetSummary}</small></article><article className="metricCard"><span>{m.groups}</span><strong>{new Set(QUOTE_MODULE_PRESETS.map((preset)=>preset.group)).size}</strong><small>{m.groupsSummary}</small></article><article className="metricCard"><span>{m.activeProject}</span><strong style={{fontSize:18}}>{selectedProject?.name??m.notSelected}</strong><small>{selectedProject?.project_type??m.createFirst}</small></article></section>

      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">{m.targetProject}</span><h2>{m.whereToAdd}</h2><p className="muted">{m.targetHelp}</p></div></div><form method="get" className="stackForm padded"><label>{m.project}<select name="project" defaultValue={selectedProject?.id??''}>{!projects?.length?<option value="">{m.noActiveProjects}</option>:null}{(projects??[]).map((project)=><option key={project.id} value={project.id}>{project.name} · {project.project_type}</option>)}</select></label>{selectedFamily?<input type="hidden" name="family" value={selectedFamily}/>:null}{query.q?<input type="hidden" name="q" value={query.q}/>:null}<div className="formActions"><button className="secondary" type="submit">{m.selectProject}</button><Link href="/projects/new" className="primary linkButton">{m.newProject}</Link></div></form></section>
      {!selectedProject?<div className="notice warning"><strong>{m.createProjectFirst}</strong></div>:null}

      <section className="panel" style={{marginBottom:18}}>
        <div className="panelHeader"><div><span className="eyebrow">PHASE 2 · LIBRARY NAVIGATION</span><h2>{m.family}</h2><p className="muted">{m.presetSummary}</p></div></div>
        <div className="formActions padded" style={{flexWrap:'wrap'}}>
          <Link href={familyHref(null)} className={selectedFamily?"secondary linkButton":"primary linkButton"}>{m.allFamilies} · {QUOTE_MODULE_PRESETS.length}</Link>
          {families.map((family)=>{const count=QUOTE_MODULE_PRESETS.filter((preset)=>preset.family===family).length;return <Link key={family} href={familyHref(family)} className={selectedFamily===family?"primary linkButton":"secondary linkButton"}>{libraryFamily(locale,family)} · {count}</Link>;})}
        </div>
        <form method="get" className="stackForm padded" style={{paddingTop:0}}>
          {selectedProject?<input type="hidden" name="project" value={selectedProject.id}/>:null}
          {selectedFamily?<input type="hidden" name="family" value={selectedFamily}/>:null}
          <label>{m.search}<input name="q" defaultValue={query.q??''} placeholder={m.searchPlaceholder}/></label>
          <div className="formActions"><button className="secondary" type="submit">{m.search}</button>{query.q?<Link className="textLink" href={familyHref(selectedFamily)}>× {m.search}</Link>:null}</div>
        </form>
      </section>

      {!filteredPresets.length?<div className="notice warning"><strong>{m.noResults}</strong></div>:null}
      {visibleFamilies.map((family)=>{
        const familyPresets=filteredPresets.filter((preset)=>preset.family===family);
        const familyGroups=visibleGroups.filter((group)=>familyPresets.some((preset)=>preset.group===group));
        return <div key={family} style={{marginBottom:28}}>
          <div className="panelHeader" style={{padding:'6px 2px 10px'}}><div><span className="eyebrow">{m.family.toUpperCase()} · {familyPresets.length}</span><h2>{libraryFamily(locale,family)}</h2></div></div>
          {familyGroups.map((group)=>{const presets=familyPresets.filter((preset)=>preset.group===group);const groupText=libraryGroup(locale,group);return <section className="panel" style={{marginBottom:18}} key={group}><div className="panelHeader"><div><span className="eyebrow">{m.standardPresets} · {presets.length}</span><h3>{groupText.label}</h3><p className="muted">{groupText.hint}</p></div></div><div className="metricGrid" style={{padding:16,marginBottom:0}}>{presets.map((preset)=>{const localized=localizePreset(locale,preset);return <article className="metricCard" key={preset.key}><ModuleThumbnail preset={preset}/><span style={{marginTop:10}}>{preset.moduleKey.toUpperCase()}</span><strong style={{fontSize:18}}>{localized.name}</strong><small>{localized.description}</small><div className="costRows" style={{padding:'10px 0 0'}}><div><span>{m.size}</span><strong>{preset.widthMm} × {preset.heightMm} × {preset.depthMm} {m.mm}</strong></div><div><span>{m.construction}</span><strong>{presetFeature(locale,preset)}</strong></div><div><span>{m.backPanel}</span><strong>{preset.backMode==='none'?m.none:preset.backMode==='groove'?m.groove:m.overlay}</strong></div></div>{selectedProject?<form action={addPresetToProject} className="stackForm" style={{marginTop:12}}><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="presetKey" value={preset.key}/><label>{m.quantity}<input name="quantity" type="number" min="1" max="999" step="1" defaultValue="1"/></label><button className="primary wide" type="submit">{m.addTo} {selectedProject.name}</button></form>:null}</article>;})}</div></section>;})}
        </div>;
      })}
      <div className="notice success"><strong>{m.quickKitchen}</strong> {m.quickKitchenHelp}</div><div className="notice warning" style={{marginTop:12}}><strong>{m.quoteBoundary}</strong> {m.quoteBoundaryHelp}</div>
    </div>
  </AppShell>;
}
