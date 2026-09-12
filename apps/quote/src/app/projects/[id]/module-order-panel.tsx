import type { Locale } from '@/lib/i18n';
import { moveCabinet } from './actions';

type CabinetOrderRow={id:string;name:string;quantity:number|string;width_mm:number|string;height_mm:number|string;depth_mm:number|string};
type Props={projectId:string;cabinets:CabinetOrderRow[];locale:Locale};
const text:Record<Locale,{eyebrow:string;title:string;help:string;up:string;down:string;mm:string}>={
  ru:{eyebrow:'ПОРЯДОК В ПРЕДЛОЖЕНИИ',title:'Порядок модулей',help:'Этот порядок используется в рабочем проекте и в следующих выпущенных предложениях. Уже выпущенные версии остаются неизменными.',up:'Выше',down:'Ниже',mm:'мм'},
  en:{eyebrow:'QUOTE ORDER',title:'Module order',help:'This order is used in the working project and future published quotes. Already published versions remain unchanged.',up:'Up',down:'Down',mm:'mm'},
  cs:{eyebrow:'POŘADÍ V NABÍDCE',title:'Pořadí modulů',help:'Toto pořadí se používá v pracovním projektu a v dalších vydaných nabídkách. Již vydané verze zůstávají beze změny.',up:'Výše',down:'Níže',mm:'mm'},
  de:{eyebrow:'REIHENFOLGE IM ANGEBOT',title:'Modulreihenfolge',help:'Diese Reihenfolge wird im Arbeitsprojekt und in künftigen veröffentlichten Angeboten verwendet. Bereits veröffentlichte Versionen bleiben unverändert.',up:'Höher',down:'Tiefer',mm:'mm'},
  pl:{eyebrow:'KOLEJNOŚĆ W OFERCIE',title:'Kolejność modułów',help:'Ta kolejność jest używana w projekcie roboczym i kolejnych opublikowanych ofertach. Już opublikowane wersje pozostają bez zmian.',up:'Wyżej',down:'Niżej',mm:'mm'},
};
function quantity(value:number|string){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(1,Math.round(parsed)):1;}

export function ModuleOrderPanel({projectId,cabinets,locale}:Props){
  if(cabinets.length<2)return null; const m=text[locale];
  return <section className="pageContent compact"><div className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.eyebrow} · MQ 0.1.15</span><h3>{m.title}</h3><p className="muted">{m.help}</p></div></div><div className="priceList">{cabinets.map((cabinet,index)=><article className="priceRow" key={cabinet.id}><div><span className="pill">{index+1}</span><strong>{cabinet.name}{quantity(cabinet.quantity)>1?` × ${quantity(cabinet.quantity)}`:''}</strong><small>{Number(cabinet.width_mm)} × {Number(cabinet.height_mm)} × {Number(cabinet.depth_mm)} {m.mm}</small></div><div className="topActions"><form action={moveCabinet}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="cabinetId" value={cabinet.id}/><button className="secondary" type="submit" name="direction" value="up" disabled={index===0}>↑ {m.up}</button></form><form action={moveCabinet}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="cabinetId" value={cabinet.id}/><button className="secondary" type="submit" name="direction" value="down" disabled={index===cabinets.length-1}>↓ {m.down}</button></form></div></article>)}</div></div></section>;
}
