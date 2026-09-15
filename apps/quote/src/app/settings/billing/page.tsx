import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { PLAN_LABELS, PLAN_MONTHLY_EUR, normalizeQuotePlan, type CanonicalQuotePlan } from '@/lib/billing';
import { getBillingMessages, billingPlanDescription, billingStatusLabel } from '@/lib/i18n-billing';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES } from '@/lib/i18n';
import { stripeCheckoutConfigured, stripeWebhookConfigured } from '@/lib/stripe-billing';
import { requireWorkspace } from '@/lib/workspace';
import { openCustomerPortal, startCheckout } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ checkout?: string; error?: string }> };
const BILLING_TIME_ZONE = 'Europe/Prague';
const ALL_PLANS:CanonicalQuotePlan[]=['free','starter','workshop','atelier'];

export default async function BillingPage({ searchParams }: Props) {
  const query=await searchParams;
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale(); const m=getBillingMessages(locale);
  const {data:subscription,error}=await supabase.from('quote_subscriptions').select('plan, status, provider, provider_subscription_id, current_period_end, provider_variant_id, test_mode').eq('organization_id',organization.id).maybeSingle();
  if(error)throw new Error(`Failed to load subscription: ${error.message}`);
  const currentPlan=normalizeQuotePlan(subscription?.plan); const currentStatus=subscription?.status??'inactive'; const canManage=['owner','admin'].includes(role);
  const hasManagedSubscription=subscription?.provider==='stripe'&&Boolean(subscription.provider_subscription_id)&&currentStatus!=='expired'&&currentStatus!=='inactive';
  const periodEnd=subscription?.current_period_end?new Intl.DateTimeFormat(INTL_LOCALES[locale],{dateStyle:'medium',timeZone:BILLING_TIME_ZONE}).format(new Date(subscription.current_period_end)):null;
  const description=(plan:CanonicalQuotePlan)=>billingPlanDescription(locale,plan); const status=billingStatusLabel(locale,currentStatus);

  return <AppShell organizationName={organization.name} role={role} plan={PLAN_LABELS[currentPlan]}>
    <header className="topbar"><div><span className="eyebrow">BILLING · MAKSTER QUOTE</span><h1>{m.title}</h1></div><Link href="/dashboard" className="textLink">{m.back}</Link></header>
    <div className="pageContent">
      {query.checkout==='success'?<div className="notice success"><strong>{m.checkoutSuccess}</strong> {m.checkoutWebhook}</div>:null}
      {query.error==='existing-subscription'?<div className="notice warning">{m.existingSubscription}</div>:null}
      {query.error&&query.error!=='existing-subscription'?<div className="notice error">{m.billingError} ({query.error})</div>:null}
      <section className="metricGrid">
        <article className="metricCard"><span>{m.currentPlan}</span><strong>{PLAN_LABELS[currentPlan]}</strong><small>{m.forWorkshop}</small></article>
        <article className="metricCard"><span>{m.status}</span><strong>{status}</strong><small>{periodEnd?`${m.until} ${periodEnd}`:m.noEndDate}</small></article>
        <article className="metricCard"><span>{m.billingBackend}</span><strong>{stripeWebhookConfigured()?'Stripe · Ready':'Stripe · Setup'}</strong><small>{subscription?.test_mode?'Stripe sandbox':(subscription?.provider==='stripe'?'Stripe billing state':m.awaitsSetup)}</small></article>
      </section>

      <section className="panel" style={{marginBottom:18}}>
        <div className="panelHeader"><div><span className="eyebrow">{m.currentSubscription}</span><h2>{PLAN_LABELS[currentPlan]}</h2></div>{canManage&&hasManagedSubscription?<form action={openCustomerPortal}><button className="secondary" type="submit">{m.managePayment}</button></form>:null}</div>
        <div className="emptyState" style={{textAlign:'left'}}><h3>{status}</h3><p style={{marginLeft:0}}>{description(currentPlan)}{periodEnd?` ${m.currentPaidUntil} ${periodEnd}.`:''}</p></div>
      </section>

      <section className="panel">
        <div className="panelHeader"><div><span className="eyebrow">{m.plans}</span><h2>{hasManagedSubscription?m.changePlan:m.choosePlan}</h2><p className="muted">{m.pricesFromProvider}</p></div></div>
        <div className="metricGrid billingPlanGrid" style={{padding:16,marginBottom:0,gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}>
          {ALL_PLANS.map((plan)=>{
            const isCurrent=plan===currentPlan;
            const configured=plan==='free'||stripeCheckoutConfigured(plan);
            const price=PLAN_MONTHLY_EUR[plan];
            return <article className="metricCard" key={plan} style={isCurrent?{outline:'2px solid var(--accent, #8b5e3c)'}:undefined}>
              <span>{isCurrent?m.currentPlan:PLAN_LABELS[plan].toUpperCase()}</span>
              <strong>{PLAN_LABELS[plan]}</strong>
              <div style={{fontSize:24,fontWeight:700,margin:'8px 0'}}>{plan==='free'?`€0 · ${m.free}`:`€${price} / ${m.monthly}`}</div>
              <small>{description(plan)}</small>
              {plan!=='free'?<div className={`notice ${configured?'success':'warning'}`} style={{marginTop:12,padding:10}}><strong>{configured?m.configured:m.pending}</strong>{!configured?<><br/><span>{m.pendingHelp}</span></>:null}</div>:null}
              <div className="formActions" style={{marginTop:14}}>
                {isCurrent?<span className="pill">{m.currentPlan}</span>:hasManagedSubscription?(canManage?<form action={openCustomerPortal}><button className="secondary" type="submit">{m.openPortal}</button></form>:<span className="muted">{m.planPermission}</span>):plan==='free'?<span className="muted">€0</span>:configured?(canManage?<form action={startCheckout}><input type="hidden" name="plan" value={plan}/><button className="primary" type="submit">{m.choose} {PLAN_LABELS[plan]}</button></form>:<span className="muted">{m.planPermission}</span>):<button className="secondary" type="button" disabled>{m.pending}</button>}
              </div>
            </article>;
          })}
        </div>
        <div className="engineNote" style={{margin:16}}><strong>VAT</strong><span>{m.vatNote}</span></div>
      </section>
    </div>
  </AppShell>;
}
