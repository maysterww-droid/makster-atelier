import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { PLAN_LABELS, PLAN_MONTHLY_EUR, normalizeQuotePlan, type CanonicalQuotePlan } from '@/lib/billing';
import { getBillingMessages, billingPlanDescription, billingStatusLabel } from '@/lib/i18n-billing';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';
import { stripeCheckoutConfigured, stripeWebhookConfigured } from '@/lib/stripe-billing';
import { requireWorkspace } from '@/lib/workspace';
import { openCustomerPortal, startCheckout } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ checkout?: string; error?: string }> };
const BILLING_TIME_ZONE = 'Europe/Prague';
const ALL_PLANS:CanonicalQuotePlan[]=['free','starter','workshop','atelier'];

const PLAN_FEATURES:Record<Locale,Record<CanonicalQuotePlan,string[]>>={
  ru:{
    free:['Проверка на реальном проекте','Базовый расчёт проекта','Клиентское предложение','Без обязательной платной подписки'],
    starter:['1 мебельщик','Проекты и клиенты','Price Book и полная библиотека','Расчёт себестоимости','PDF и отправка предложения'],
    workshop:['До 5 пользователей','Общие цены для команды','История изменений','Расширенные шаблоны','Командная работа'],
    atelier:['До 15 пользователей','Роли и права доступа','Несколько рабочих пространств','Интеграция Makster Pro','Приоритетная поддержка'],
  },
  en:{
    free:['Test on a real project','Core project costing','Client quotation','No required paid subscription'],
    starter:['1 furniture maker','Projects and clients','Price Book and full library','True-cost calculation','PDF and quote delivery'],
    workshop:['Up to 5 users','Shared team pricing','Change history','Advanced templates','Team collaboration'],
    atelier:['Up to 15 users','Roles and permissions','Multiple workspaces','Makster Pro integration','Priority support'],
  },
  cs:{
    free:['Vyzkoušení na reálném projektu','Základní kalkulace projektu','Nabídka pro klienta','Bez povinného placeného tarifu'],
    starter:['1 nábytkář','Projekty a klienti','Ceník a plná knihovna','Výpočet skutečných nákladů','PDF a odeslání nabídky'],
    workshop:['Až 5 uživatelů','Sdílené týmové ceny','Historie změn','Rozšířené šablony','Týmová spolupráce'],
    atelier:['Až 15 uživatelů','Role a oprávnění','Více pracovních prostorů','Integrace Makster Pro','Prioritní podpora'],
  },
  de:{
    free:['Test mit einem echten Projekt','Basis-Projektkalkulation','Kundenangebot','Kein Pflicht-Abonnement'],
    starter:['1 Möbelbauer','Projekte und Kunden','Preisliste und volle Bibliothek','Vollkostenberechnung','PDF und Angebotsversand'],
    workshop:['Bis zu 5 Benutzer','Gemeinsame Team-Preise','Änderungsverlauf','Erweiterte Vorlagen','Teamarbeit'],
    atelier:['Bis zu 15 Benutzer','Rollen und Rechte','Mehrere Arbeitsbereiche','Makster Pro Integration','Prioritäts-Support'],
  },
  pl:{
    free:['Test na prawdziwym projekcie','Podstawowa kalkulacja projektu','Oferta dla klienta','Bez obowiązkowej płatnej subskrypcji'],
    starter:['1 stolarz','Projekty i klienci','Cennik i pełna biblioteka','Kalkulacja pełnych kosztów','PDF i wysyłka oferty'],
    workshop:['Do 5 użytkowników','Wspólne ceny zespołu','Historia zmian','Rozszerzone szablony','Praca zespołowa'],
    atelier:['Do 15 użytkowników','Role i uprawnienia','Wiele przestrzeni roboczych','Integracja Makster Pro','Priorytetowe wsparcie'],
  },
};

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

      <section className="panel billingPlansPanel">
        <div className="panelHeader"><div><span className="eyebrow">{m.plans}</span><h2>{hasManagedSubscription?m.changePlan:m.choosePlan}</h2><p className="muted">{m.pricesFromProvider}</p></div></div>
        <div className="billingPlanGrid">
          {ALL_PLANS.map((plan)=>{
            const isCurrent=plan===currentPlan;
            const configured=plan==='free'||stripeCheckoutConfigured(plan);
            const price=PLAN_MONTHLY_EUR[plan];
            return <article className={`billingPlanCard ${isCurrent?'billingPlanCardCurrent':''}`} key={plan}>
              <div className="billingPlanTop">
                <div className="billingPlanEyebrow">{isCurrent?m.currentPlan:PLAN_LABELS[plan]}</div>
                <h3>{PLAN_LABELS[plan]}</h3>
                <div className="billingPlanPrice">{plan==='free'?<><strong>€0</strong><span>{m.free}</span></>:<><strong>€{price}</strong><span>/ {m.monthly}</span></>}</div>
                <p className="billingPlanLead">{description(plan)}</p>
              </div>

              <ul className="billingFeatureList">
                {PLAN_FEATURES[locale][plan].map((feature)=><li key={feature}><span className="billingFeatureCheck" aria-hidden="true">✓</span><span>{feature}</span></li>)}
              </ul>

              <div className="billingPlanBottom">
                {plan!=='free'?<div className={`billingTechNote ${configured?'billingTechNoteReady':'billingTechNotePending'}`}><span className="billingTechDot" aria-hidden="true"/><span>{configured?m.configured:m.pending}</span>{!configured?<small>{m.pendingHelp}</small>:null}</div>:<div className="billingTechNote billingTechNoteFree"><span className="billingTechDot" aria-hidden="true"/><span>Free Pilot</span></div>}
                <div className="billingPlanAction">
                  {isCurrent?<span className="billingCurrentBadge">✓ {m.currentPlan}</span>:hasManagedSubscription?(canManage?<form action={openCustomerPortal}><button className="secondary wide" type="submit">{m.openPortal}</button></form>:<span className="muted">{m.planPermission}</span>):plan==='free'?<span className="billingFreeLabel">€0</span>:configured?(canManage?<form action={startCheckout}><input type="hidden" name="plan" value={plan}/><button className="primary wide" type="submit">{m.choose} {PLAN_LABELS[plan]}</button></form>:<span className="muted">{m.planPermission}</span>):<button className="secondary wide" type="button" disabled>{m.pending}</button>}
                </div>
              </div>
            </article>;
          })}
        </div>
        <div className="engineNote" style={{margin:16}}><strong>VAT</strong><span>{m.vatNote}</span></div>
      </section>
    </div>
  </AppShell>;
}
