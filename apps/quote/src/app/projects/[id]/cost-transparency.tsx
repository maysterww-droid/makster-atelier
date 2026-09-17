import { formatMinor } from '@/lib/calculation';
import type { CabinetCostPreview, PriceBookItem } from '@/lib/engineering';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';

type Props={
  preview:CabinetCostPreview;
  priceBook:PriceBookItem[];
  currency:string;
  locale:Locale;
  boardItemId:string;
  frontItemId:string;
  backItemId:string;
  edgeItemId:string;
  labourItemId:string;
};

type Copy={title:string;help:string;carcass:string;back:string;front:string;edge:string;hardware:string;operations:string;labour:string;missing:string;demo:string;direct:string;overhead:string;trueCost:string;sale:string;margin:string;sheet:string;waste:string};
const copy:Record<Locale,Copy>={
  ru:{title:'Откуда эта цена?',help:'Каждая строка показывает источник из Price Book, объём и формулу. Так можно проверить расчёт до отправки клиенту.',carcass:'Корпус',back:'Задняя стенка',front:'Фасады',edge:'Кромка',hardware:'Фурнитура',operations:'Операции',labour:'Работа',missing:'Цена не выбрана',demo:'DEMO — заменить реальной ценой',direct:'Прямая себестоимость',overhead:'Накладные',trueCost:'Полная себестоимость',sale:'Рекомендованная цена',margin:'Маржа',sheet:'листа',waste:'отход'},
  en:{title:'Where does this price come from?',help:'Each row shows the Price Book source, usage and formula so the estimate can be checked before it reaches the customer.',carcass:'Carcass',back:'Back panel',front:'Fronts',edge:'Edge band',hardware:'Hardware',operations:'Operations',labour:'Labour',missing:'Price not selected',demo:'DEMO — replace with real price',direct:'Direct cost',overhead:'Overhead',trueCost:'True cost',sale:'Recommended price',margin:'Margin',sheet:'sheet',waste:'waste'},
  cs:{title:'Odkud se bere tato cena?',help:'Každý řádek ukazuje zdroj z ceníku, množství a vzorec pro kontrolu kalkulace před odesláním klientovi.',carcass:'Korpus',back:'Zadní stěna',front:'Čela',edge:'Hrana',hardware:'Kování',operations:'Operace',labour:'Práce',missing:'Cena není vybrána',demo:'DEMO — nahraďte skutečnou cenou',direct:'Přímé náklady',overhead:'Režie',trueCost:'Skutečné náklady',sale:'Doporučená cena',margin:'Marže',sheet:'desky',waste:'odpad'},
  de:{title:'Woher kommt dieser Preis?',help:'Jede Zeile zeigt Quelle, Menge und Formel aus der Preisliste zur Prüfung vor dem Kundenangebot.',carcass:'Korpus',back:'Rückwand',front:'Fronten',edge:'Kante',hardware:'Beschläge',operations:'Operationen',labour:'Arbeit',missing:'Preis nicht gewählt',demo:'DEMO — durch realen Preis ersetzen',direct:'Direktkosten',overhead:'Gemeinkosten',trueCost:'Vollkosten',sale:'Empfohlener Preis',margin:'Marge',sheet:'Platte',waste:'Verschnitt'},
  pl:{title:'Skąd bierze się ta cena?',help:'Każdy wiersz pokazuje źródło z cennika, ilość i wzór, aby sprawdzić kalkulację przed wysłaniem klientowi.',carcass:'Korpus',back:'Plecy',front:'Fronty',edge:'Obrzeże',hardware:'Okucia',operations:'Operacje',labour:'Robocizna',missing:'Nie wybrano ceny',demo:'DEMO — zastąp realną ceną',direct:'Koszt bezpośredni',overhead:'Koszty ogólne',trueCost:'Pełny koszt',sale:'Cena rekomendowana',margin:'Marża',sheet:'arkusza',waste:'odpad'},
};

function params(item:PriceBookItem|undefined){return item?.parameters_json&&typeof item.parameters_json==='object'&&!Array.isArray(item.parameters_json)?item.parameters_json as Record<string,unknown>:{};}
function isDemo(item:PriceBookItem|undefined){return Boolean(params(item).demo);}
function itemById(items:PriceBookItem[],id:string){return id?items.find((item)=>item.id===id):undefined;}
function rate(item:PriceBookItem|undefined,currency:string,locale:Locale){if(!item)return '';return `${formatMinor(BigInt(Math.round(Number(item.purchase_price_minor)||0)),currency,INTL_LOCALES[locale])} / ${item.unit}`;}
function areaFormula(item:PriceBookItem|undefined,area:number,currency:string,locale:Locale,m:Copy){
  if(!item)return m.missing;
  if(item.unit==='m2')return `${area.toFixed(3)} m² × ${rate(item,currency,locale)}`;
  if(item.unit==='sheet'){
    const p=params(item);const w=Number(p.sheetWidthMm??0);const h=Number(p.sheetHeightMm??0);const waste=Math.max(0,Number(p.wastePct??0));
    if(w>0&&h>0){const sheetArea=w*h/1_000_000;const allocated=sheetArea>0?(area/sheetArea)*(1+waste/100):0;return `${area.toFixed(3)} m² → ${allocated.toFixed(3)} ${m.sheet} × ${rate(item,currency,locale)} · ${m.waste} ${waste.toFixed(1)}%`;}
  }
  return `${area.toFixed(3)} m² · ${rate(item,currency,locale)}`;
}
function linearFormula(item:PriceBookItem|undefined,length:number,currency:string,locale:Locale,m:Copy){return item?`${length.toFixed(2)} m × ${rate(item,currency,locale)}`:m.missing;}
function labourFormula(item:PriceBookItem|undefined,hours:number,currency:string,locale:Locale,m:Copy){return item?`${hours.toFixed(2)} h × ${rate(item,currency,locale)}`:hours>0?m.missing:'0 h';}

function SourceLine({label,item,formula,cost,currency,locale,m}:{label:string;item:PriceBookItem|undefined;formula:string;cost:bigint;currency:string;locale:Locale;m:Copy}){
  return <div><span>{label}<br/><small>{item?.name??m.missing}{isDemo(item)?` · ${m.demo}`:''}<br/>{formula}</small></span><strong>{formatMinor(cost,currency,INTL_LOCALES[locale])}</strong></div>;
}

export function CostTransparency({preview,priceBook,currency,locale,boardItemId,frontItemId,backItemId,edgeItemId,labourItemId}:Props){
  const m=copy[locale];
  const board=itemById(priceBook,boardItemId);const front=itemById(priceBook,frontItemId);const back=itemById(priceBook,backItemId);const edge=itemById(priceBook,edgeItemId);const labour=itemById(priceBook,labourItemId);
  return <details className="engineNote" style={{marginTop:12}} open>
    <summary><strong>{m.title}</strong></summary>
    <span>{m.help}</span>
    <div className="costRows" style={{marginTop:10}}>
      <SourceLine label={m.carcass} item={board} formula={areaFormula(board,preview.usage.boardM2,currency,locale,m)} cost={preview.detailCosts.carcass} currency={currency} locale={locale} m={m}/>
      {preview.usage.backM2>0?<SourceLine label={m.back} item={back} formula={areaFormula(back,preview.usage.backM2,currency,locale,m)} cost={preview.detailCosts.back} currency={currency} locale={locale} m={m}/>:null}
      {preview.usage.frontM2>0?<SourceLine label={m.front} item={front} formula={areaFormula(front,preview.usage.frontM2,currency,locale,m)} cost={preview.detailCosts.fronts} currency={currency} locale={locale} m={m}/>:null}
      {preview.usage.edgeM>0?<SourceLine label={m.edge} item={edge} formula={linearFormula(edge,preview.usage.edgeM,currency,locale,m)} cost={preview.detailCosts.edges} currency={currency} locale={locale} m={m}/>:null}
      {preview.hardware.map((line)=><div key={`t-${line.key}`}><span>{m.hardware} · {line.label}<br/><small>{line.itemName??m.missing} · {line.quantity}</small></span><strong>{formatMinor(line.costMinor,currency,INTL_LOCALES[locale])}</strong></div>)}
      {preview.operations.map((line)=><div key={`t-op-${line.key}`}><span>{m.operations} · {line.label}<br/><small>{line.itemName??m.missing} · {line.quantity.toFixed(line.unit==='m'?2:0)} {line.unit}</small></span><strong>{formatMinor(line.costMinor,currency,INTL_LOCALES[locale])}</strong></div>)}
      {preview.usage.labourHours>0?<SourceLine label={m.labour} item={labour} formula={labourFormula(labour,preview.usage.labourHours,currency,locale,m)} cost={preview.detailCosts.labour} currency={currency} locale={locale} m={m}/>:null}
      <div className="soft"><span>{m.direct}</span><strong>{formatMinor(preview.pricing.directCostMinor,currency,INTL_LOCALES[locale])}</strong></div>
      <div><span>{m.overhead}</span><strong>{formatMinor(preview.pricing.overheadMinor,currency,INTL_LOCALES[locale])}</strong></div>
      <div className="soft"><span>{m.trueCost}</span><strong>{formatMinor(preview.pricing.trueCostMinor,currency,INTL_LOCALES[locale])}</strong></div>
      <div><span>{m.sale}<br/><small>{m.margin} {(preview.pricing.marginBps/100).toFixed(2)}%</small></span><strong>{formatMinor(preview.pricing.netSalesMinor,currency,INTL_LOCALES[locale])}</strong></div>
    </div>
  </details>;
}
