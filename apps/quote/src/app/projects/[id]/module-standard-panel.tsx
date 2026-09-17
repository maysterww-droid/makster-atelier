import type { Locale } from '@/lib/i18n';
import { saveCabinetAsTemplate } from './module-template-actions';

type Row={id:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string};
type Props={projectId:string;cabinets:Row[];locale:Locale};
const copy={
  ru:{title:'Мои стандарты',help:'Сохраните уже настроенный модуль как стандарт мастерской и используйте его в следующих проектах.',name:'Название стандарта',save:'Сохранить в библиотеку'},
  en:{title:'My standards',help:'Save a configured module as a workshop standard and reuse it in future projects.',name:'Standard name',save:'Save to library'},
  cs:{title:'Moje standardy',help:'Uložte nastavený modul jako standard dílny a použijte ho v dalších projektech.',name:'Název standardu',save:'Uložit do knihovny'},
  de:{title:'Meine Standards',help:'Konfiguriertes Modul als Werkstattstandard speichern und in weiteren Projekten wiederverwenden.',name:'Standardname',save:'In Bibliothek speichern'},
  pl:{title:'Moje standardy',help:'Zapisz skonfigurowany moduł jako standard pracowni i używaj go w kolejnych projektach.',name:'Nazwa standardu',save:'Zapisz w bibliotece'},
} as const;

export function ModuleStandardPanel({projectId,cabinets,locale}:Props){
  if(!cabinets.length)return null;const t=copy[locale]??copy.en;
  return <section className="pageContent compact"><div className="panel"><div className="panelHeader"><div><span className="eyebrow">PHASE 2 · WORKSHOP LIBRARY</span><h2>{t.title}</h2><p className="muted">{t.help}</p></div></div><div className="stackForm padded">{cabinets.map((row)=><form action={saveCabinetAsTemplate} key={row.id} className="panel" style={{padding:14}}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="cabinetId" value={row.id}/><div className="panelHeader"><div><strong>{row.name}</strong><p className="muted">{Number(row.width_mm)} × {Number(row.height_mm)} × {Number(row.depth_mm)} mm</p></div></div><div className="fieldGrid two"><label>{t.name}<input name="templateName" defaultValue={row.name} maxLength={200}/></label><div className="formActions" style={{alignItems:'end'}}><button className="secondary" type="submit">{t.save}</button></div></div></form>)}</div></div></section>;
}
