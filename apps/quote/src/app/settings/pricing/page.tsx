import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { calculateQuote, formatMinor } from '@/lib/calculation';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES } from '@/lib/i18n';
import { getSettingsMessages } from '@/lib/i18n-settings';
import { requireWorkspace } from '@/lib/workspace';
import { savePricingSettings } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function integer(value: unknown, fallback: number) { const parsed=Number(value); return Number.isInteger(parsed)&&parsed>=0&&parsed<10_000?parsed:fallback; }

export default async function PricingSettingsPage({ searchParams }: Props) {
  const query=await searchParams;
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale(); const m=getSettingsMessages(locale); const intl=INTL_LOCALES[locale];
  const {data:subscription}=await supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle();
  const quote=record(record(organization.settings).quote); const targetMarginBps=integer(quote.targetMarginBps,3500); const minimumMarginBps=Math.min(targetMarginBps,integer(quote.minimumMarginBps,1500)); const overheadBps=integer(quote.overheadBps,0); const editable=['owner','admin'].includes(role);
  const exampleDirect=100_000n; const example=calculateQuote({costs:{board:exampleDirect,fronts:0n,edges:0n,hardware:0n,production:0n,labour:0n,delivery:0n,installation:0n,other:0n},overheadBps,targetMarginBps,taxBps:0});
  const errorText:Record<string,string>={permission:m.ownerAdminOnly,margin:m.targetMargin,'minimum-margin':m.minimumMargin,'minimum-above-target':`${m.minimumMargin} > ${m.targetMargin}`,overhead:m.overhead,save:m.billingError};

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICING ENGINE · MAKSTER QUOTE</span><h1>{m.pricingTitle}</h1></div><Link href="/dashboard" className="textLink">{m.back}</Link></header>
    <div className="pageContent">
      {query.saved==='1'?<div className="notice success"><strong>{m.pricingSaved}</strong> {m.pricingUpdated}</div>:null}
      {query.error?<div className="notice error">{errorText[query.error]??query.error}</div>:null}
      <section className="metricGrid">
        <article className="metricCard"><span>{m.targetMargin}</span><strong>{(targetMarginBps/100).toFixed(2)}%</strong><small>{m.usualTarget}</small></article>
        <article className="metricCard"><span>{m.minimumMargin}</span><strong>{(minimumMarginBps/100).toFixed(2)}%</strong><small>{m.publishBlockedBelow}</small></article>
        <article className="metricCard"><span>{m.overhead}</span><strong>{(overheadBps/100).toFixed(2)}%</strong><small>{m.addedToDirect}</small></article>
        <article className="metricCard"><span>{m.equivalentMarkup}</span><strong>{(example.markupBps/100).toFixed(2)}%</strong><small>{m.atTargetMargin}</small></article>
      </section>
      <div className="twoColumnPage">
        <section className="panel formPanel"><div className="panelHeader"><div><span className="eyebrow">{m.workshopSettings}</span><h2>{m.priceFormula}</h2><p className="muted">{m.immutableHelp}</p></div></div>
          <form action={savePricingSettings} className="stackForm padded"><label>{m.targetMargin}, %<input name="targetMarginPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(targetMarginBps/100).toFixed(2)} disabled={!editable}/><small>{m.targetHelp}</small></label><label>{m.minimumMargin}, %<input name="minimumMarginPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(minimumMarginBps/100).toFixed(2)} disabled={!editable}/><small>{m.minimumHelp}</small></label><label>{m.overhead}, %<input name="overheadPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(overheadBps/100).toFixed(2)} disabled={!editable}/><small>{m.overheadHelp}</small></label>{editable?<button className="primary" type="submit">{m.saveParams}</button>:<div className="notice warning">{m.ownerAdminOnly}</div>}</form>
        </section>
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.formulaControl}</span><h2>{m.howPriceCalculated}</h2><p className="muted">{m.exampleDirect} {formatMinor(exampleDirect,organization.currency,intl)}.</p></div></div><div className="costRows"><div><span>{m.directCost}</span><strong>{formatMinor(example.directCostMinor,organization.currency,intl)}</strong></div><div><span>{m.overhead} {(overheadBps/100).toFixed(2)}%</span><strong>{formatMinor(example.overheadMinor,organization.currency,intl)}</strong></div><div className="soft"><span>{m.trueCost}</span><strong>{formatMinor(example.trueCostMinor,organization.currency,intl)}</strong></div></div><div className="priceHero"><span>{m.priceAtMargin} {(targetMarginBps/100).toFixed(2)}%</span><strong>{formatMinor(example.netSalesMinor,organization.currency,intl)}</strong><small>{m.profit} {formatMinor(example.profitMinor,organization.currency,intl)} · {m.markup} {(example.markupBps/100).toFixed(2)}%</small></div><div className="engineNote"><strong>Profit Guardrail</strong><span>{m.guardrailText} {(minimumMarginBps/100).toFixed(2)}%.</span></div><div className="engineNote"><strong>{m.marginVsMarkup}</strong><span>{m.marginFormula}</span></div></section>
      </div>
    </div>
  </AppShell>;
}
