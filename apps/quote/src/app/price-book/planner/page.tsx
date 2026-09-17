import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace';
import { publishPlannerPriceBook } from '../planner-actions';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{plannerPublished?:string;plannerError?:string}>};
const labels={
  ru:{title:'Цены Dream Planner',intro:'Это клиентские ориентировочные цены Planner. Они не раскрывают и не заменяют ваши закупочные цены Makster Quote.',publish:'Опубликовать в Dream Planner',vat:'НДС, %',back:'← Прайс-лист Quote',need:'Для публикации этой организации нужен активный Dream Planner.',ok:'Опубликовано',error:'Не удалось опубликовать Planner Price Book.',door:'Нижний шкаф с дверью 600',drawer:'Нижний шкаф с ящиками 600',sink:'Тумба под мойку 600',hob:'Тумба под варочную 600',oven:'Тумба под духовку 600',dishwasher:'ПММ 600',tall:'Пенал 600',wall:'Верхний шкаф 600',corner_blind:'Глухой угол',corner_l:'Угловой L'},
  en:{title:'Dream Planner Prices',intro:'These are client-facing preliminary Planner prices. They never expose or replace your Makster Quote purchase prices.',publish:'Publish to Dream Planner',vat:'VAT, %',back:'← Quote Price Book',need:'This organization needs an active Dream Planner entitlement to publish.',ok:'Published',error:'Could not publish Planner Price Book.',door:'Base door 600',drawer:'Base drawers 600',sink:'Sink base 600',hob:'Hob base 600',oven:'Oven base 600',dishwasher:'Dishwasher 600',tall:'Tall cabinet 600',wall:'Wall cabinet 600',corner_blind:'Blind corner',corner_l:'L corner'},
  cs:{title:'Ceny Dream Planneru',intro:'Jde o orientační ceny pro klienta v Planneru. Nákupní ceny Makster Quote se nezveřejňují ani nenahrazují.',publish:'Publikovat do Dream Planneru',vat:'DPH, %',back:'← Ceník Quote',need:'Pro publikování musí mít organizace aktivní Dream Planner.',ok:'Publikováno',error:'Planner ceník se nepodařilo publikovat.',door:'Spodní skříňka 600',drawer:'Spodní zásuvky 600',sink:'Dřezová skříňka 600',hob:'Skříňka varné desky 600',oven:'Skříňka trouby 600',dishwasher:'Myčka 600',tall:'Vysoká skříň 600',wall:'Horní skříňka 600',corner_blind:'Slepý roh',corner_l:'Roh L'},
  de:{title:'Dream Planner Preise',intro:'Dies sind vorläufige Kundenpreise im Planner. Einkaufspreise aus Makster Quote werden weder offengelegt noch ersetzt.',publish:'In Dream Planner veröffentlichen',vat:'MwSt., %',back:'← Quote-Preisliste',need:'Zum Veröffentlichen benötigt die Organisation einen aktiven Dream Planner.',ok:'Veröffentlicht',error:'Planner-Preisliste konnte nicht veröffentlicht werden.',door:'Unterschrank Tür 600',drawer:'Unterschrank Schubladen 600',sink:'Spülenschrank 600',hob:'Kochfeldschrank 600',oven:'Backofenschrank 600',dishwasher:'Geschirrspüler 600',tall:'Hochschrank 600',wall:'Oberschrank 600',corner_blind:'Blinde Ecke',corner_l:'L-Ecke'},
  pl:{title:'Ceny Dream Planner',intro:'To orientacyjne ceny widoczne dla klienta w Plannerze. Nie ujawniają ani nie zastępują cen zakupu Makster Quote.',publish:'Opublikuj w Dream Planner',vat:'VAT, %',back:'← Cennik Quote',need:'Organizacja potrzebuje aktywnego Dream Planner, aby publikować.',ok:'Opublikowano',error:'Nie udało się opublikować cennika Planner.',door:'Szafka dolna 600',drawer:'Szuflady dolne 600',sink:'Szafka zlewu 600',hob:'Szafka płyty 600',oven:'Szafka piekarnika 600',dishwasher:'Zmywarka 600',tall:'Słupek 600',wall:'Szafka górna 600',corner_blind:'Ślepy narożnik',corner_l:'Narożnik L'},
} as const;
const kinds=['door','drawer','sink','hob','oven','dishwasher','tall','wall','corner_blind','corner_l'] as const;

export default async function PlannerPricesPage({searchParams}:Props){
  const query=await searchParams;const {supabase,organization,role}=await requireWorkspace();const locale=await getInterfaceLocale();const t=labels[locale];const admin=createAdminClient();
  const [{data:subscription},{data:entitlement},{data:active}]=await Promise.all([
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
    admin.from('makster_product_entitlements').select('status').eq('organization_id',organization.id).eq('product','DREAM_PLANNER').maybeSingle(),
    admin.from('makster_commercial_pricebooks').select('revision,currency,vat_rate,payload,updated_at').eq('organization_id',organization.id).eq('active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  const plannerActive=Boolean(entitlement&&['active','trialing'].includes(String(entitlement.status)));const canManage=['owner','admin'].includes(role);const prices=((active?.payload as any)?.modulePrice600??{}) as Record<string,number>;const vatPct=Math.round(Number(active?.vat_rate??0.21)*10000)/100;
  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">DREAM PLANNER · PUBLIC PRICE BOOK</span><h1>{t.title}</h1></div><Link href="/price-book" className="textLink">{t.back}</Link></header>
    <div className="pageContent">
      {query.plannerPublished?<div className="notice success"><strong>{t.ok}</strong> · {query.plannerPublished}</div>:null}
      {query.plannerError?<div className="notice error">{t.error} ({query.plannerError})</div>:null}
      <div className="notice warning"><strong>PRELIMINARY</strong> · {t.intro}</div>
      {!plannerActive?<div className="notice error">{t.need}</div>:null}
      <section className="panel formPanel"><div className="panelHeader"><div><span className="eyebrow">{organization.currency}</span><h2>{active?.revision??'Not published'}</h2><p className="muted">{active?.updated_at?new Date(active.updated_at).toLocaleString():''}</p></div></div>
        <form action={publishPlannerPriceBook} className="stackForm padded">
          <div className="formGrid2">{kinds.map(kind=><label key={kind}>{t[kind]}<input name={kind} type="number" min="0.01" step="0.01" defaultValue={prices[kind]??''} required disabled={!plannerActive||!canManage}/><small>{organization.currency}</small></label>)}</div>
          <label>{t.vat}<input name="vatPct" type="number" min="0" max="30" step="0.1" defaultValue={vatPct} required disabled={!plannerActive||!canManage}/></label>
          <button className="primary" type="submit" disabled={!plannerActive||!canManage}>{t.publish}</button>
        </form>
      </section>
    </div>
  </AppShell>;
}
