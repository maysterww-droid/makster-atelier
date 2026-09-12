import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { checkoutConfigured, PAID_PLANS, PLAN_LABELS, type QuotePlan, webhookConfigured } from '@/lib/billing';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES } from '@/lib/i18n';
import { billingPlanDescription, billingStatusLabel, getSettingsMessages } from '@/lib/i18n-settings';
import { requireWorkspace } from '@/lib/workspace';
import { openCustomerPortal, startCheckout } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ checkout?: string; error?: string }> };

export default async function BillingPage({ searchParams }: Props) {
  const query=await searchParams;
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale(); const m=getSettingsMessages(locale);
  const {data:subscription,error}=await supabase.from('quote_subscriptions').select('plan, status, provider, provider_subscription_id, current_period_end, provider_variant_id, test_mode').eq('organization_id',organization.id).maybeSingle();
  if(error)throw new Error(`Failed to load subscription: ${error.message}`);
  const currentPlan=(subscription?.plan??'free') as QuotePlan; const currentStatus=subscription?.status??'inactive'; const canManage=['owner','admin'].includes(role);
  const hasManagedSubscription=subscription?.provider==='lemonsqueezy'&&Boolean(subscription.provider_subscription_id)&&currentStatus!=='expired'&&currentStatus!=='inactive';
  const periodEnd=subscription?.current_period_end?new Intl.DateTimeFormat(INTL_LOCALES[locale],{dateStyle:'medium'}).format(new Date(subscription.current_period_end)):null;
  const description=(plan:QuotePlan)=>billingPlanDescription(locale,plan); const status=billingStatusLabel(locale,currentStatus);

  return <AppShell organizationName={organization.name} role={role} plan={PLAN_LABELS[currentPlan].toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">BILLING · MAKSTER QUOTE</span><h1>{m.billingTitle}</h1></div><Link href="/" className="textLink">{m.back}</Link></header>
    <div className="pageContent">
      {query.checkout==='success'?<div className="notice success"><strong>{m.checkoutSuccess}</strong> {m.checkoutWebhook}</div>:null}
      {query.error==='existing-subscription'?<div className="notice warning">{m.existingSubscription}</div>:null}
      {query.error&&query.error!=='existing-subscription'?<div className="notice error">{m.billingError} ({query.error})</div>:null}
      <section className="metricGrid">
        <article className="metricCard"><span>{m.currentPlan}</span><strong>{PLAN_LABELS[currentPlan]}</strong><small>{m.forWorkshop}</small></article>
        <article className="metricCard"><span>{m.status}</span><strong>{status}</strong><small>{periodEnd?`${m.until} ${periodEnd}`:m.noEndDate}</small></article>
        <article className="metricCard"><span>{m.billingBackend}</span><strong>{webhookConfigured()?'Ready':'Setup'}</strong><small>{subscription?.test_mode?'Lemon Squeezy test mode':(subscription?'live billing state':m.awaitsSetup)}</small></article>
      </section>
      <section className="panel" style={{marginBottom:18}}><div className="panelHeader"><div><span className="eyebrow">{m.currentSubscription}</span><h2>{PLAN_LABELS[currentPlan]}</h2></div>{canManage&&subscription?.provider==='lemonsqueezy'&&subscription.provider_subscription_id?<form action={openCustomerPortal}><button className="secondary" type="submit">{m.managePayment}</button></form>:null}</div><div className="emptyState" style={{textAlign:'left'}}><h3>{status}</h3><p style={{marginLeft:0}}>{description(currentPlan)}{periodEnd?` ${m.currentPaidUntil} ${periodEnd}.`:''}</p></div></section>
      <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.plans}</span><h2>{hasManagedSubscription?m.changePlan:m.choosePlan}</h2><p className="muted">{m.pricesFromProvider}</p></div></div>
        {hasManagedSubscription?<div className="emptyState"><h3>{m.subscriptionActive}</h3><p>{m.portalHelp}</p>{canManage?<form action={openCustomerPortal}><button className="primary" type="submit">{m.openPortal}</button></form>:null}</div>:<div className="metricGrid" style={{padding:16,marginBottom:0}}><article className="metricCard"><span>FREE</span><strong>Free</strong><small>{description('free')}</small></article>{PAID_PLANS.map((plan)=>{const configured=checkoutConfigured(plan);return <article className="metricCard" key={plan}><span>{plan.toUpperCase()}</span><strong>{PLAN_LABELS[plan]}</strong><small>{description(plan)}</small><div className="formActions" style={{marginTop:14}}>{canManage&&configured?<form action={startCheckout}><input type="hidden" name="plan" value={plan}/><button className="primary" type="submit">{m.choose} {PLAN_LABELS[plan]}</button></form>:null}{!configured?<span className="muted">{m.variantNotConfigured}</span>:null}{!canManage&&configured?<span className="muted">{m.planPermission}</span>:null}</div></article>;})}</div>}
      </section>
    </div>
  </AppShell>;
}
