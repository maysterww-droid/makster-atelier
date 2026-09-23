import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { formatMinor } from '@/lib/calculation';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES } from '@/lib/i18n';
import { getSalesMessages } from '@/lib/i18n-sales';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ q?: string; status?: string; attention?: string }> };
type QuoteRow = { id:string; project_id:string; client_id:string|null; quote_version:number; client_name:string; currency:string; issued_at:string; valid_until:string; total_amount_minor:number|string };
type StatusRow = { quote_id:string; status:string; created_at:string; note:string|null };

function asMinor(value: number | string): bigint { const raw=typeof value==='number'?Math.trunc(value).toString():value; try{return BigInt(raw);}catch{return 0n;} }
function daysSince(iso:string,now:number){const timestamp=new Date(iso).getTime();return Number.isFinite(timestamp)?Math.max(0,Math.floor((now-timestamp)/86_400_000)):0;}

export default async function QuotesPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getSalesMessages(locale);
  const search = String(query.q ?? '').trim().toLowerCase().slice(0, 120);
  const statusFilter = String(query.status ?? '').trim().slice(0, 40);
  const attentionOnly = query.attention === '1';
  const statusName: Record<string,string> = { approved:m.statusIssued, sent:m.statusSent, accepted:m.statusAccepted, rejected:m.statusRejected, expired:m.statusExpired, superseded:'Superseded' };

  const [{ data: quotes, error: quotesError }, { data: subscription }] = await Promise.all([
    supabase.from('client_commercial_quotes').select('id, project_id, client_id, quote_version, client_name, currency, issued_at, valid_until, total_amount_minor').eq('organization_id', organization.id).order('issued_at', { ascending:false }).limit(200),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (quotesError) throw new Error(`Failed to load quotes: ${quotesError.message}`);

  const allRows=(quotes??[]) as QuoteRow[];
  const quoteIds=allRows.map((quote)=>quote.id);
  const projectIds=[...new Set(allRows.map((quote)=>quote.project_id))];
  const clientIds=[...new Set(allRows.map((quote)=>quote.client_id).filter((id):id is string=>Boolean(id)))];
  const [statusResult,projectsResult,clientsResult]=await Promise.all([
    quoteIds.length?supabase.from('client_quote_status_events').select('quote_id, status, created_at, note').eq('organization_id',organization.id).in('quote_id',quoteIds).order('created_at',{ascending:false}):Promise.resolve({data:[] as StatusRow[],error:null}),
    projectIds.length?supabase.from('projects').select('id, name').eq('organization_id',organization.id).in('id',projectIds):Promise.resolve({data:[] as {id:string;name:string}[],error:null}),
    clientIds.length?supabase.from('clients').select('id, email').eq('organization_id',organization.id).in('id',clientIds):Promise.resolve({data:[] as {id:string;email:string|null}[],error:null}),
  ]);
  if(statusResult.error)throw new Error(`Failed to load quote statuses: ${statusResult.error.message}`);
  if(projectsResult.error)throw new Error(`Failed to load projects: ${projectsResult.error.message}`);
  if(clientsResult.error)throw new Error(`Failed to load customer contacts: ${clientsResult.error.message}`);

  const projectNames=new Map((projectsResult.data??[]).map((project)=>[project.id,project.name]));
  const clientEmails=new Map((clientsResult.data??[]).map((client)=>[client.id,client.email]));
  const latestStatus=new Map<string,StatusRow>();
  for(const event of (statusResult.data??[]) as StatusRow[]) if(!latestStatus.has(event.quote_id)) latestStatus.set(event.quote_id,event);
  const now=Date.now(); const activeStatuses=new Set(['approved','sent']);
  const stateFor=(quote:QuoteRow)=>{const event=latestStatus.get(quote.id);const status=event?.status??'approved';const isOverdue=activeStatuses.has(status)&&new Date(quote.valid_until).getTime()<now;const waitDays=daysSince(event?.created_at??quote.issued_at,now);const needsFollowUp=activeStatuses.has(status)&&!isOverdue&&waitDays>=3;return {status,isOverdue,waitDays,needsFollowUp};};
  const awaiting=allRows.filter((quote)=>activeStatuses.has(stateFor(quote).status)).length;
  const accepted=allRows.filter((quote)=>stateFor(quote).status==='accepted').length;
  const rejected=allRows.filter((quote)=>stateFor(quote).status==='rejected').length;
  const attentionCount=allRows.filter((quote)=>stateFor(quote).needsFollowUp).length;
  const decided=accepted+rejected; const conversion=decided>0?Math.round((accepted/decided)*100):0;
  const rows=allRows.filter((quote)=>{const state=stateFor(quote);if(statusFilter==='overdue'&&!state.isOverdue)return false;if(statusFilter&&statusFilter!=='overdue'&&state.status!==statusFilter)return false;if(attentionOnly&&!state.needsFollowUp)return false;if(search){const haystack=`${projectNames.get(quote.project_id)??''} ${quote.client_name}`.toLowerCase();if(!haystack.includes(search))return false;}return true;});

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">MAKSTER QUOTE · PIPELINE</span><h1>{m.quotesTitle}</h1></div><Link href="/projects/new" className="primary linkButton">+ {m.newQuote}</Link></header>
    <div className="pageContent">
      <section className="metricGrid">
        <article className="metricCard"><span>{m.issued}</span><strong>{allRows.length}</strong><small>{m.latestVersions}</small></article>
        <article className="metricCard"><span>{m.awaitingDecision}</span><strong>{awaiting}</strong><small>{m.issuedOrSent}</small></article>
        <article className="metricCard"><span>{m.needsFollowUp}</span><strong>{attentionCount}</strong><small><Link className="textLink" href="/quotes?attention=1">{m.noReply3Days}</Link></small></article>
        <article className="metricCard"><span>{m.conversion}</span><strong>{conversion}%</strong><small>{accepted} {m.accepted} · {rejected} {m.rejected}</small></article>
      </section>
      <section className="panel formPanel"><form method="get" className="stackForm padded"><div className="formGrid3">
        <label>{m.search}<input name="q" defaultValue={String(query.q??'')} placeholder={m.projectOrClient}/></label>
        <label>{m.status}<select name="status" defaultValue={statusFilter}><option value="">{m.allStatuses}</option><option value="approved">{m.statusIssued}</option><option value="sent">{m.statusSent}</option><option value="accepted">{m.statusAccepted}</option><option value="rejected">{m.statusRejected}</option><option value="expired">{m.statusExpired}</option><option value="overdue">{m.statusOverdue}</option></select></label>
        <div className="formActions" style={{alignItems:'end'}}><label style={{display:'flex',flexDirection:'row',gap:8,alignItems:'center'}}><input type="checkbox" name="attention" value="1" defaultChecked={attentionOnly}/>{m.followUpOnly}</label><button type="submit" className="secondary">{m.apply}</button><Link href="/quotes" className="textLink">{m.reset}</Link></div>
      </div></form></section>
      <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.commercialPipeline}</span><h2>{rows.length?`${rows.length} ${m.quotesCount}`:m.nothingFound}</h2></div></div>
        {rows.length===0?<div className="emptyState"><h3>{m.noQuotesFilter}</h3><p>{m.resetOrCreate}</p><Link href="/quotes" className="secondary linkButton">{m.resetFilters}</Link></div>:<div className="tableWrap"><table><thead><tr><th>{m.project}</th><th>{m.client}</th><th>{m.version}</th><th>{m.status}</th><th>{m.amount}</th><th>{m.validUntil}</th><th>{m.followUp}</th><th></th></tr></thead><tbody>{rows.map((quote)=>{const state=stateFor(quote);const email=quote.client_id?clientEmails.get(quote.client_id):null;const projectName=projectNames.get(quote.project_id)??m.project;const subject=encodeURIComponent(`${projectName} — ${m.quoteSubject}`);return <tr key={quote.id}><td><strong>{projectName}</strong></td><td>{quote.client_name}</td><td>v{quote.quote_version}</td><td><span className="pill">{state.isOverdue?m.statusOverdue:(statusName[state.status]??state.status)}</span></td><td><strong>{formatMinor(asMinor(quote.total_amount_minor),quote.currency,INTL_LOCALES[locale])}</strong></td><td>{new Intl.DateTimeFormat(INTL_LOCALES[locale]).format(new Date(quote.valid_until))}</td><td>{state.needsFollowUp?<><strong>{m.noReply} {state.waitDays} {m.days}</strong>{email?<><br/><a className="textLink" href={`mailto:${email}?subject=${subject}`}>{m.write}</a></>:null}</>:<span className="muted">—</span>}</td><td><Link className="textLink" href={`/projects/${quote.project_id}/quote/${quote.id}`}>{m.open}</Link></td></tr>;})}</tbody></table></div>}
      </section>
    </div>
  </AppShell>;
}
