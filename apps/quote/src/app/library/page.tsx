import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { ALL_QUOTE_MODULE_PRESETS } from '@/lib/all-module-presets';
import { getInterfaceLocale } from '@/lib/interface-locale';
import type { Locale } from '@/lib/i18n';
import { getLibraryMessages, libraryFamily, libraryGroup, localizePreset, presetFeature } from '@/lib/i18n-library';
import type { QuoteModuleFamily } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';
import { addPresetToProject, addTemplateToProject, deleteTemplate, togglePresetFavorite, toggleTemplateFavorite } from './actions';
import { ModuleThumbnail } from './module-thumbnail';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{project?:string;error?:string;family?:string;q?:string}>};
const families:QuoteModuleFamily[]=['kitchen','wardrobe','bathroom','utility'];
const personal:Record<Locale,{my:string;myHelp:string;favorites:string;recent:string;favorite:string;unfavorite:string;remove:string;recalc:string;empty:string;used:string}>={
  ru:{my:'Мои стандарты',myHelp:'Сохранённые модули вашей мастерской. Их можно повторно использовать в новых проектах.',favorites:'Избранное',recent:'Последние использованные',favorite:'В избранное',unfavorite:'Убрать из избранного',remove:'Удалить стандарт',recalc:'После добавления проверьте цены и пересохраните расчёт в проекте.',empty:'Пока нет сохранённых стандартов.',used:'использований'},
  en:{my:'My standards',myHelp:'Saved workshop modules that can be reused in future projects.',favorites:'Favorites',recent:'Recently used',favorite:'Add to favorites',unfavorite:'Remove from favorites',remove:'Delete standard',recalc:'After adding, review prices and save the calculation in the project.',empty:'No saved standards yet.',used:'uses'},
  cs:{my:'Moje standardy',myHelp:'Uložené moduly dílny pro opakované použití v dalších projektech.',favorites:'Oblíbené',recent:'Naposledy použité',favorite:'Přidat do oblíbených',unfavorite:'Odebrat z oblíbených',remove:'Smazat standard',recalc:'Po přidání zkontrolujte ceny a kalkulaci v projektu znovu uložte.',empty:'Zatím žádné uložené standardy.',used:'použití'},
  de:{my:'Meine Standards',myHelp:'Gespeicherte Werkstattmodule zur Wiederverwendung in weiteren Projekten.',favorites:'Favoriten',recent:'Zuletzt verwendet',favorite:'Zu Favoriten',unfavorite:'Aus Favoriten entfernen',remove:'Standard löschen',recalc:'Nach dem Hinzufügen Preise prüfen und die Kalkulation im Projekt neu speichern.',empty:'Noch keine gespeicherten Standards.',used:'Verwendungen'},
  pl:{my:'Moje standardy',myHelp:'Zapisane moduły pracowni do ponownego użycia w kolejnych projektach.',favorites:'Ulubione',recent:'Ostatnio używane',favorite:'Dodaj do ulubionych',unfavorite:'Usuń z ulubionych',remove:'Usuń standard',recalc:'Po dodaniu sprawdź ceny i ponownie zapisz kalkulację w projekcie.',empty:'Brak zapisanych standardów.',used:'użyć'},
};

export default async function LibraryPage({searchParams}:Props){
  const query=await searchParams;const {supabase,organization,userId,role}=await requireWorkspace();const locale=await getInterfaceLocale();const m=getLibraryMessages(locale);const p=personal[locale];
  const [{data:projects,error:projectError},{data:subscription},{data:prefs,error:prefsError},{data:templates,error:templatesError}]=await Promise.all([
    supabase.from('projects').select('id, name, project_type').eq('organization_id',organization.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(100),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_library_prefs').select('preset_key,is_favorite,use_count,last_used_at').eq('organization_id',organization.id).eq('user_id',userId),
    supabase.from('quote_module_templates').select('id,name,module_key,width_mm,height_mm,depth_mm,is_favorite,use_count,last_used_at,updated_at').eq('organization_id',organization.id).order('updated_at',{ascending:false}),
  ]);
  if(projectError)throw new Error(`Failed to load projects: ${projectError.message}`);if(prefsError)throw new Error(`Failed to load library preferences: ${prefsError.message}`);if(templatesError)throw new Error(`Failed to load workshop standards: ${templatesError.message}`);
  const selectedProject=(projects??[]).find((project)=>project.id===query.project)??projects?.[0]??null;
  const selectedFamily=families.includes(query.family as QuoteModuleFamily)?query.family as QuoteModuleFamily:null;
  const search=(query.q??'').trim().toLocaleLowerCase(locale);
  const favoriteKeys=new Set((prefs??[]).filter((row)=>row.is_favorite).map((row)=>row.preset_key));
  const favoritePresets=ALL_QUOTE_MODULE_PRESETS.filter((preset)=>favoriteKeys.has(preset.key)).slice(0,8);
  const recentPresets=[...(prefs??[])].filter((row)=>row.last_used_at).sort((a,b)=>String(b.last_used_at).localeCompare(String(a.last_used_at))).map((row)=>ALL_QUOTE_MODULE_PRESETS.find((preset)=>preset.key===row.preset_key)??null).filter((preset):preset is NonNullable<typeof preset>=>Boolean(preset)).slice(0,8);
  const filteredPresets=ALL_QUOTE_MODULE_PRESETS.filter((preset)=>{
    if(selectedFamily&&preset.family!==selectedFamily)return false;
    if(!search)return true;
    const localized=localizePreset(locale,preset);
    const haystack=[localized.name,localized.description,libraryGroup(locale,preset.group).label,libraryFamily(locale,preset.family),preset.key].join(' ').toLocaleLowerCase(locale);
    return haystack.includes(search);
  });
  const visibleFamilies=families.filter((family)=>filteredPresets.some((preset)=>preset.family===family));
  const visibleGroups=[...new Set(filteredPresets.map((preset)=>preset.group))];
  const familyHref=(family:QuoteModuleFamily|null)=>{const params=new URLSearchParams();if(selectedProject)params.set('project',selectedProject.id);if(family)params.set('family',family);if(query.q)params.set('q',query.q);return `/library?${params.toString()}`;};

  const compactPreset=(preset:(typeof ALL_QUOTE_MODULE_PRESETS)[number])=>{const localized=localizePreset(locale,preset);return <article className="metricCard" key={preset.key}><ModuleThumbnail preset={preset}/><strong style={{fontSize:16,marginTop:8}}>{localized.name}</strong><small>{preset.widthMm} × {preset.heightMm} × {preset.depthMm} {m.mm}</small>{selectedProject?<form action={addPresetToProject} className="stackForm"><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="presetKey" value={preset.key}/><input type="hidden" name="quantity" value="1"/><button className="secondary wide" type="submit">+ {m.addTo} {selectedProject.name}</button></form>:null}</article>;};

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">FURNITURE MODULE LIBRARY · MQ 0.2</span><h1>{m.title}</h1></div><div className="topActions">{selectedProject?<Link href={`/projects/${selectedProject.id}`} className="secondary linkButton">{m.openProject}</Link>:null}<Link href="/dashboard" className="textLink">{m.back}</Link></div></header>
    <div className="pageContent">
      {query.error?<div className="notice error">{m.addError} ({query.error}).</div>:null}
      <section className="metricGrid" style={{marginBottom:18}}><article className="metricCard"><span>{m.readyPresets}</span><strong>{ALL_QUOTE_MODULE_PRESETS.length}</strong><small>{m.presetSummary}</small></article><article className="metricCard"><span>{m.groups}</span><strong>{new Set(ALL_QUOTE_MODULE_PRESETS.map((preset)=>preset.group)).size}</strong><small>{m.groupsSummary}</small></article><article className="metricCard"><span>{m.activeProject}</span><strong style={{fontSize:18}}>{selectedProject?.name??m.notSelected}</strong><small>{selectedProject?.project_type??m.createFirst}</small></article></section>

      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">{m.targetProject}</span><h2>{m.whereToAdd}</h2><p className="muted">{m.targetHelp}</p></div></div><form method="get" className="stackForm padded"><label>{m.project}<select name="project" defaultValue={selectedProject?.id??''}>{!projects?.length?<option value="">{m.noActiveProjects}</option>:null}{(projects??[]).map((project)=><option key={project.id} value={project.id}>{project.name} · {project.project_type}</option>)}</select></label>{selectedFamily?<input type="hidden" name="family" value={selectedFamily}/>:null}{query.q?<input type="hidden" name="q" value={query.q}/>:null}<div className="formActions"><button className="secondary" type="submit">{m.selectProject}</button><Link href="/projects/new" className="primary linkButton">{m.newProject}</Link></div></form></section>
      {!selectedProject?<div className="notice warning"><strong>{m.createProjectFirst}</strong></div>:null}

      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">PHASE 2 · WORKSHOP STANDARDS</span><h2>{p.my}</h2><p className="muted">{p.myHelp}</p></div></div>{templates?.length?<div className="metricGrid" style={{padding:16,marginBottom:0}}>{templates.map((template)=><article className="metricCard" key={template.id}><span>{template.is_favorite?'★':'☆'} {String(template.module_key).toUpperCase()}</span><strong style={{fontSize:18}}>{template.name}</strong><small>{Number(template.width_mm)} × {Number(template.height_mm)} × {Number(template.depth_mm)} {m.mm} · {Number(template.use_count??0)} {p.used}</small><div className="formActions" style={{flexWrap:'wrap'}}><form action={toggleTemplateFavorite}><input type="hidden" name="templateId" value={template.id}/><button className="secondary" type="submit">{template.is_favorite?'★':'☆'}</button></form>{selectedProject?<form action={addTemplateToProject}><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="templateId" value={template.id}/><input type="hidden" name="quantity" value="1"/><button className="primary" type="submit">+ {m.addTo}</button></form>:null}<form action={deleteTemplate}><input type="hidden" name="templateId" value={template.id}/><button className="textLink" type="submit">{p.remove}</button></form></div></article>)}</div>:<div className="miniEmpty" style={{margin:16}}>{p.empty}</div>}<div className="notice warning" style={{margin:'0 16px 16px'}}>{p.recalc}</div></section>

      {favoritePresets.length?<section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">PERSONAL LIBRARY</span><h2>★ {p.favorites}</h2></div></div><div className="metricGrid" style={{padding:16,marginBottom:0}}>{favoritePresets.map(compactPreset)}</div></section>:null}
      {recentPresets.length?<section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">PERSONAL LIBRARY</span><h2>{p.recent}</h2></div></div><div className="metricGrid" style={{padding:16,marginBottom:0}}>{recentPresets.map(compactPreset)}</div></section>:null}

      <section className="panel" style={{marginBottom:18}}>
        <div className="panelHeader"><div><span className="eyebrow">PHASE 2 · LIBRARY NAVIGATION</span><h2>{m.family}</h2><p className="muted">{m.presetSummary}</p></div></div>
        <div className="formActions padded" style={{flexWrap:'wrap'}}>
          <Link href={familyHref(null)} className={selectedFamily?"secondary linkButton":"primary linkButton"}>{m.allFamilies} · {ALL_QUOTE_MODULE_PRESETS.length}</Link>
          {families.map((family)=>{const count=ALL_QUOTE_MODULE_PRESETS.filter((preset)=>preset.family===family).length;return <Link key={family} href={familyHref(family)} className={selectedFamily===family?"primary linkButton":"secondary linkButton"}>{libraryFamily(locale,family)} · {count}</Link>;})}
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
          {familyGroups.map((group)=>{const presets=familyPresets.filter((preset)=>preset.group===group);const groupText=libraryGroup(locale,group);return <section className="panel" style={{marginBottom:18}} key={group}><div className="panelHeader"><div><span className="eyebrow">{m.standardPresets} · {presets.length}</span><h3>{groupText.label}</h3><p className="muted">{groupText.hint}</p></div></div><div className="metricGrid" style={{padding:16,marginBottom:0}}>{presets.map((preset)=>{const localized=localizePreset(locale,preset);const isFavorite=favoriteKeys.has(preset.key);return <article className="metricCard" key={preset.key}><ModuleThumbnail preset={preset}/><div className="formActions" style={{justifyContent:'space-between',marginTop:8}}><span>{preset.moduleKey.toUpperCase()}</span><form action={togglePresetFavorite}><input type="hidden" name="presetKey" value={preset.key}/><button className="textLink" type="submit" title={isFavorite?p.unfavorite:p.favorite}>{isFavorite?'★':'☆'}</button></form></div><strong style={{fontSize:18}}>{localized.name}</strong><small>{localized.description}</small><div className="costRows" style={{padding:'10px 0 0'}}><div><span>{m.size}</span><strong>{preset.widthMm} × {preset.heightMm} × {preset.depthMm} {m.mm}</strong></div><div><span>{m.construction}</span><strong>{presetFeature(locale,preset)}</strong></div><div><span>{m.backPanel}</span><strong>{preset.backMode==='none'?m.none:preset.backMode==='groove'?m.groove:m.overlay}</strong></div></div>{selectedProject?<form action={addPresetToProject} className="stackForm" style={{marginTop:12}}><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="presetKey" value={preset.key}/><label>{m.quantity}<input name="quantity" type="number" min="1" max="999" step="1" defaultValue="1"/></label><button className="primary wide" type="submit">{m.addTo} {selectedProject.name}</button></form>:null}</article>;})}</div></section>;})}
        </div>;
      })}
      <div className="notice success"><strong>{m.quickKitchen}</strong> {m.quickKitchenHelp}</div><div className="notice warning" style={{marginTop:12}}><strong>{m.quoteBoundary}</strong> {m.quoteBoundaryHelp}</div>
    </div>
  </AppShell>;
}
