import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { formatMinor } from '@/lib/calculation';
import { getAnalyticsMessages } from '@/lib/i18n-analytics';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES } from '@/lib/i18n';
import { minorFromUnknown } from '@/lib/project-pricing';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
type QuoteRow = { id:string; project_id:string; client_name:string; currency:string; issued_at:string; valid_until:string; total_amount_minor:number|string };
type StatusRow = { quote_id:string; status:string; created_at:string };
const terminalStatuses=new Set(['accepted','rejected','expired','superseded']);
const openStatuses=new Set(['approved','sent']);
function daysBetween(start:string,end:string){return Math.max(0,(new Date(end).getTime()-new Date(start).getTime())/86_400_000);}
function addAmount(map:Map<string,bigint>,currency:string,amount:unknown){map.set(currency,(map.get(currency)??0n)+minorFromUnknown(amount));}

export default async function AnalyticsPage(){
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale();
  const m=getAnalyticsMessages(locale);
  const intl=INTL_LOCALES[locale];
  const since=new Date(); since.setUTCDate(since.getUTCDate()-180);
  const [{data:quotes,error:quoteError},{data:subscription}]=await Promise.all([
    supabase.from('client_commercial_quotes').select('id, project_id, client_name, currency, issued_at, valid_until, total_amount_minor').eq('organization_id',organization.id).gte('issued_at',since.toISOString()).order('issued_at',{ascending:false}).limit(500),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
  ]);
  if(quoteError)throw new Error(`Failed to load quote analytics: ${quoteError.message}`);
  const rows=(quotes??[]) as QuoteRow[]; const quoteIds=rows.map((quote)=>quote.id);
  const {data:statuses,error:statusError}=quoteIds.length?await supabase.from('client_quote_status_events').select('quote_id, status, created_at').eq('organization_id',organization.id).in('quote_id',quoteIds).order('created_at',{ascending:false}):{data:[] as StatusRow[],error:null};
  if(statusError)throw new Error(`Failed to load analytics statuses: ${statusError.message}`);
  const latestStatus=new Map<string,StatusRow>(); const terminalEvent=new Map<string,StatusRow>();
  for(const event of (statuses??[]) as StatusRow[]){if(!latestStatus.has(event.quote_id))latestStatus.set(event.quote_id,event);if(!terminalEvent.has(event.quote_id)&&terminalStatuses.has(event.status))terminalEvent.set(event.quote_id,event);}
  const statusFor=(quote:QuoteRow)=>latestStatus.get(quote.id)?.status??'approved';
  const contactAnchor=(quote:QuoteRow)=>latestStatus.get(quote.id)?.created_at??quote.issued_at;
  const nowDate=new Date(); const now=nowDate.toISOString(); const nowMs=nowDate.getTime();
  const accepted=rows.filter((quote)=>statusFor(quote)==='accepted'); const rejected=rows.filter((quote)=>statusFor(quote)==='rejected');
  const decided=accepted.length+rejected.length; const conversion=decided?Math.round((accepted.length/decided)*100):0;
  const openQuotes=rows.filter((quote)=>openStatuses.has(statusFor(quote))); const overdueOpen=openQuotes.filter((quote)=>new Date(quote.valid_until).getTime()<nowMs); const activeOpen=openQuotes.filter((quote)=>new Date(quote.valid_until).getTime()>=nowMs); const followUps=activeOpen.filter((quote)=>daysBetween(contactAnchor(quote),now)>=3);
  const acceptedByCurrency=new Map<string,bigint>(); const openByCurrency=new Map<string,bigint>(); const overdueByCurrency=new Map<string,bigint>();
  for(const quote of accepted)addAmount(acceptedByCurrency,quote.currency,quote.total_amount_minor); for(const quote of activeOpen)addAmount(openByCurrency,quote.currency,quote.total_amount_minor); for(const quote of overdueOpen)addAmount(overdueByCurrency,quote.currency,quote.total_amount_minor);
  const primaryAccepted=acceptedByCurrency.get(organization.currency)??0n; const primaryOpen=openByCurrency.get(organization.currency)??0n; const primaryOverdue=overdueByCurrency.get(organization.currency)??0n; const primaryAcceptedRows=accepted.filter((quote)=>quote.currency===organization.currency); const avgAccepted=primaryAcceptedRows.length?primaryAccepted/BigInt(primaryAcceptedRows.length):0n;
  const responseDays=rows.flatMap((quote)=>{const event=terminalEvent.get(quote.id);return event&&['accepted','rejected'].includes(event.status)?[daysBetween(quote.issued_at,event.created_at)]:[];}); const avgResponse=responseDays.length?responseDays.reduce((sum,value)=>sum+value,0)/responseDays.length:0;
  const thirtyDaysAgo=nowMs-30*86_400_000; const issued30d=rows.filter((quote)=>new Date(quote.issued_at).getTime()>=thirtyDaysAgo).length; const accepted30d=accepted.filter((quote)=>{const event=terminalEvent.get(quote.id);return quote.currency===organization.currency&&event?.status==='accepted'&&new Date(event.created_at).getTime()>=thirtyDaysAgo;}); const accepted30dValue=accepted30d.reduce((sum,quote)=>sum+minorFromUnknown(quote.total_amount_minor),0n);
  const ageBuckets=[{label:m.days0_2,count:0,amount:0n},{label:m.days3_7,count:0,amount:0n},{label:m.days8_14,count:0,amount:0n},{label:m.days15plus,count:0,amount:0n}];
  for(const quote of activeOpen.filter((item)=>item.currency===organization.currency)){const age=daysBetween(contactAnchor(quote),now);const bucket=age<3?ageBuckets[0]:age<8?ageBuckets[1]:age<15?ageBuckets[2]:ageBuckets[3];bucket.count+=1;bucket.amount+=minorFromUnknown(quote.total_amount_minor);}

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">SALES ANALYTICS · MQ 0.1.15</span><h1>{m.title}</h1></div><div className="topActions"><Link href="/quotes" className="secondary linkButton">{m.quotes}</Link><Link href="/" className="textLink">{m.back}</Link></div></header>
    <div className="pageContent">
      <section className="metricGrid">
        <article className="metricCard"><span>{m.conversion}</span><strong>{conversion}%</strong><small>{accepted.length} {m.accepted} · {rejected.length} {m.rejected}</small></article>
        <article className="metricCard"><span>{m.openPipeline}</span><strong>{formatMinor(primaryOpen,organization.currency,intl)}</strong><small>{activeOpen.filter((quote)=>quote.currency===organization.currency).length} {m.activeNotExpired}</small></article>
        <article className="metricCard"><span>{m.accepted30}</span><strong>{formatMinor(accepted30dValue,organization.currency,intl)}</strong><small>{accepted30d.length} {m.wonQuotes}</small></article>
        <article className="metricCard"><span>{m.accepted180}</span><strong>{formatMinor(primaryAccepted,organization.currency,intl)}</strong><small>{primaryAcceptedRows.length} {m.quotesInCurrency} · {organization.currency}</small></article>
        <article className="metricCard"><span>{m.avgAccepted}</span><strong>{formatMinor(avgAccepted,organization.currency,intl)}</strong><small>{primaryAcceptedRows.length} {m.acceptedPrimary}</small></article>
        <article className="metricCard"><span>{m.avgDecision}</span><strong>{avgResponse?`${avgResponse.toFixed(1)} ${m.days}`:'—'}</strong><small>{m.issuedToDecision}</small></article>
        <article className="metricCard"><span>{m.issued30}</span><strong>{issued30d}</strong><small>{m.newVersions}</small></article>
        <article className="metricCard"><span>{m.needsFollowUp}</span><strong>{followUps.length}</strong><small>{m.afterLastStatus}</small></article>
        <article className="metricCard"><span>{m.overdueNoDecision}</span><strong>{formatMinor(primaryOverdue,organization.currency,intl)}</strong><small>{overdueOpen.filter((quote)=>quote.currency===organization.currency).length} {m.openQuotes}</small></article>
      </section>
      <div className="twoColumnPage">
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">FOLLOW-UP</span><h2>{m.noDecisionClients}</h2><p className="muted">{m.followUpHelp}</p></div></div>
          {!followUps.length?<div className="emptyState"><h3>{m.noFollowUp}</h3><p>{m.noFollowUpHelp}</p></div>:<div className="tableWrap"><table><thead><tr><th>{m.client}</th><th>{m.noMovement}</th><th>{m.amount}</th><th></th></tr></thead><tbody>{followUps.sort((a,b)=>new Date(contactAnchor(a)).getTime()-new Date(contactAnchor(b)).getTime()).slice(0,12).map((quote)=><tr key={quote.id}><td><strong>{quote.client_name}</strong></td><td>{Math.floor(daysBetween(contactAnchor(quote),now))} {m.days}</td><td>{formatMinor(minorFromUnknown(quote.total_amount_minor),quote.currency,intl)}</td><td><Link href={`/projects/${quote.project_id}/quote/${quote.id}`} className="textLink">{m.open}</Link></td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.pipelineAge}</span><h2>{m.pipelineMoney}</h2><p className="muted">{m.pipelineMoneyHelp}</p></div></div><div className="priceList">{ageBuckets.map((bucket)=><article className="priceRow" key={bucket.label}><div><strong>{bucket.label}</strong><small>{bucket.count} {m.quotesCount}</small></div><div className="priceValue"><strong>{formatMinor(bucket.amount,organization.currency,intl)}</strong></div></article>)}</div></section>
      </div>
      <section className="panel" style={{marginTop:24}}><div className="panelHeader"><div><span className="eyebrow">{m.acceptedSection}</span><h2>{m.revenueByCurrency}</h2><p className="muted">{m.revenueHelp}</p></div></div>
        {!acceptedByCurrency.size?<div className="emptyState"><h3>{m.noAccepted}</h3><p>{m.noAcceptedHelp}</p></div>:<div className="priceList">{[...acceptedByCurrency.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([currency,amount])=><article className="priceRow" key={currency}><div><strong>{currency}</strong><small>{m.accepted180Short}</small></div><div className="priceValue"><strong>{formatMinor(amount,currency,intl)}</strong></div></article>)}</div>}
      </section>
    </div>
  </AppShell>;
}
