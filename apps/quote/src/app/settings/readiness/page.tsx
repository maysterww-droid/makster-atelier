import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getSettingsMessages } from '@/lib/i18n-settings';
import { environmentReadiness, overallReadiness, type ReadinessState } from '@/lib/readiness';
import { readQuoteBrand } from '@/lib/quote-brand';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}

export default async function ReadinessPage(){
  const {supabase,organization,role}=await requireWorkspace(); if(!['owner','admin'].includes(role))redirect('/dashboard?error=permission');
  const locale=await getInterfaceLocale(); const m=getSettingsMessages(locale);
  const stateLabel:Record<ReadinessState,string>={ready:m.ready,warning:m.warning,blocked:m.blocked};
  const [subscriptionResult,priceBookResult,projectResult,quoteResult,clientResult]=await Promise.all([
    supabase.from('quote_subscriptions').select('plan, status, provider, test_mode').eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category').eq('organization_id',organization.id).eq('active',true),
    supabase.from('projects').select('id',{count:'exact',head:true}).eq('organization_id',organization.id).is('archived_at',null),
    supabase.from('client_commercial_quotes').select('id',{count:'exact',head:true}).eq('organization_id',organization.id),
    supabase.from('clients').select('id',{count:'exact',head:true}).eq('organization_id',organization.id).is('archived_at',null),
  ]);
  if(priceBookResult.error)throw new Error(`Failed to check Price Book: ${priceBookResult.error.message}`);
  const checks=environmentReadiness(); const brand=readQuoteBrand(organization.settings,organization.name); const brandReady=Boolean(brand.tradeName&&brand.address&&(brand.email||brand.phone));
  const priceItems=priceBookResult.data??[]; const categories=new Set(priceItems.map((item)=>item.category)); const requiredCategories=['board','front','edge','hardware','operation']; const missingCategories=requiredCategories.filter((category)=>!categories.has(category)); const priceReady=priceItems.length>0&&missingCategories.length===0;
  const quoteSettings=record(record(organization.settings).quote); const pricingConfigured=Number.isInteger(Number(quoteSettings.targetMarginBps))&&Number(quoteSettings.targetMarginBps)>=0&&Number(quoteSettings.targetMarginBps)<10_000&&Number.isInteger(Number(quoteSettings.overheadBps))&&Number(quoteSettings.overheadBps)>=0&&Number(quoteSettings.overheadBps)<10_000; const margin=pricingConfigured?Number(quoteSettings.targetMarginBps)/100:35; const overhead=pricingConfigured?Number(quoteSettings.overheadBps)/100:0;
  checks.push(
    {key:'price-book',label:m.priceBook,state:priceReady?'ready':'blocked',detail:priceReady?`${priceItems.length} ${m.activeItems}`:missingCategories.length?`${m.missingCategories}: ${missingCategories.join(', ')}.`:m.noRealPrices},
    {key:'pricing-policy',label:m.pricingPolicy,state:pricingConfigured?'ready':'warning',detail:pricingConfigured?`${m.targetMargin} ${margin.toFixed(2)}%, ${m.overhead.toLowerCase()} ${overhead.toFixed(2)}%.`:m.pricingDefaults},
    {key:'document-brand',label:m.documentBrand,state:brandReady?'ready':'warning',detail:brandReady?m.brandReady:m.brandMissing},
  );
  const overall=overallReadiness(checks); const subscription=subscriptionResult.data; const readyCount=checks.filter((check)=>check.state==='ready').length;
  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRODUCTION READINESS · MAKSTER QUOTE</span><h1>{m.readinessTitle}</h1></div><Link href="/dashboard" className="textLink">{m.back}</Link></header>
    <div className="pageContent">
      <section className="metricGrid"><article className="metricCard"><span>{m.overallStatus}</span><strong>{stateLabel[overall]}</strong><small>{readyCount} / {checks.length} {m.checksReady}</small></article><article className="metricCard"><span>{m.workData}</span><strong>{projectResult.count??0}</strong><small>{m.projects} · {clientResult.count??0} {m.clients}</small></article><article className="metricCard"><span>{m.issued}</span><strong>{quoteResult.count??0}</strong><small>{m.quoteVersions}</small></article></section>
      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">{m.checks}</span><h2>{m.beforeProduction}</h2><p className="muted">{m.secretsHidden}</p></div></div><div className="priceList">{checks.map((check)=><article className="priceRow" key={check.key}><div><span className="pill">{stateLabel[check.state]}</span><strong>{check.label}</strong><small>{check.detail}</small></div></article>)}</div></section>
      <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.liveState}</span><h2>{m.currentConfig}</h2></div></div><div className="tableWrap"><table><tbody><tr><th>{m.currentPlan}</th><td>{String(subscription?.plan??'free').toUpperCase()}</td></tr><tr><th>{m.subscriptionStatus}</th><td>{subscription?.status??'inactive'}</td></tr><tr><th>{m.billingProvider}</th><td>{subscription?.provider??m.notConnected}</td></tr><tr><th>{m.billingMode}</th><td>{subscription?.test_mode?'test':'live / not set'}</td></tr><tr><th>{m.priceBook}</th><td>{priceItems.length} {m.activeItems}</td></tr><tr><th>{m.targetMargin}</th><td>{margin.toFixed(2)}%</td></tr><tr><th>{m.overhead}</th><td>{overhead.toFixed(2)}%</td></tr></tbody></table></div></section>
    </div>
  </AppShell>;
}
