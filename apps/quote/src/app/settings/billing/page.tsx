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

const billingStyles=`
.billingPlanGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:16px;align-items:stretch}
.billingPlanCard{min-width:0;display:flex;flex-direction:column;min-height:510px;padding:20px 18px 17px;border:1px solid #ded5cf;border-radius:18px;background:linear-gradient(180deg,#fff 0%,#fffdfa 100%);box-shadow:0 8px 24px rgba(71,47,35,.055);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.billingPlanCard:hover{transform:translateY(-2px);border-color:#b79b89;box-shadow:0 14px 34px rgba(71,47,35,.09)}
.billingPlanCardCurrent{border:2px solid #4f3022;background:linear-gradient(180deg,#fffaf6 0%,#fff 68%);box-shadow:0 0 0 3px rgba(79,48,34,.08),0 14px 34px rgba(71,47,35,.10)}
.billingPlanEyebrow{min-height:20px;color:#8b6d5c;font-size:10px;font-weight:800;letter-spacing:.10em;text-transform:uppercase}
.billingPlanTop h3{font-size:24px;line-height:1.1;margin:8px 0 0;color:#2f241f}
.billingPlanPrice{display:flex;align-items:baseline;gap:7px;margin:14px 0 13px;white-space:nowrap}
.billingPlanPrice strong{font-size:30px;line-height:1;color:#2f241f;letter-spacing:-.035em}
.billingPlanPrice span{font-size:13px;color:#786b64;font-weight:650}
.billingPlanLead{min-height:64px;color:#625751;font-size:13px;line-height:1.55}
.billingFeatureList{list-style:none;margin:18px 0 20px;padding:17px 0 0;border-top:1px solid #eee5df;display:grid;gap:11px}
.billingFeatureList li{display:grid;grid-template-columns:19px 1fr;gap:8px;align-items:start;color:#342b26;font-size:13.5px;line-height:1.38;font-weight:560}
.billingFeatureCheck{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#f1e7df;color:#593928;font-size:11px;font-weight:900;margin-top:1px}
.billingPlanBottom{margin-top:auto;padding-top:4px}
.billingTechNote{min-height:52px;padding:9px 10px;border-radius:11px;display:grid;grid-template-columns:8px 1fr;column-gap:7px;align-items:start;font-size:11px;line-height:1.35}
.billingTechNote small{grid-column:2;color:inherit;opacity:.78;font-size:10px;line-height:1.35;margin-top:2px}
.billingTechDot{width:7px;height:7px;border-radius:50%;margin-top:4px;background:currentColor;opacity:.7}
.billingTechNotePending{background:#fbf4e8;color:#89602a;border:1px solid #ead8bb}
.billingTechNoteReady{background:#edf6f1;color:#28634d;border:1px solid #d0e5da}
.billingTechNoteFree{background:#f4f1ef;color:#725f54;border:1px solid #e2d9d4}
.billingPlanAction{margin-top:12px;min-height:42px;display:flex;align-items:center}
.billingPlanAction form{width:100%}
.billingCurrentBadge{width:100%;display:flex;justify-content:center;align-items:center;gap:6px;padding:10px 12px;border-radius:11px;background:#4f3022;color:#fff;font-size:12px;font-weight:800}
.billingFreeLabel{font-size:12px;color:#776a62;font-weight:700}
.billingPlansPanel .primary{background:#4f3022}
.billingPlansPanel .secondary{background:#f1e7df;color:#4f3022}
@media(max-width:900px){.billingPlanGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.billingPlanCard{min-height:470px}}
@media(max-width:640px){.billingPlanGrid{grid-template-columns:1fr;padding:12px}.billingPlanCard{min-height:0}.billingPlanLead{min-height:0}}
`;

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
    <style>{billingStyles}</style>
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
