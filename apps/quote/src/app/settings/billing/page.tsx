import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import {
  checkoutConfigured,
  PAID_PLANS,
  PLAN_LABELS,
  type QuotePlan,
  webhookConfigured,
} from '@/lib/billing';
import { requireWorkspace } from '@/lib/workspace';
import { openCustomerPortal, startCheckout } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ checkout?: string; error?: string }> };

const planDescription: Record<QuotePlan, string> = {
  free: 'Базовая работа с расчётами и коммерческими предложениями.',
  founder: 'Ранний доступ для первых мастерских и расширенный набор возможностей.',
  pro: 'Основной тариф для мебельщика, который регулярно считает и отправляет предложения.',
  workshop: 'Тариф для мастерской и командной работы с большим объёмом проектов.',
};

const statusLabel: Record<string, string> = {
  inactive: 'Неактивна',
  trialing: 'Пробный период',
  active: 'Активна',
  past_due: 'Нужна оплата',
  paused: 'Приостановлена',
  cancelled: 'Отменена до конца периода',
  expired: 'Истекла',
};

export default async function BillingPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const { data: subscription, error } = await supabase
    .from('quote_subscriptions')
    .select('plan, status, provider, provider_subscription_id, current_period_end, provider_variant_id, test_mode')
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить подписку: ${error.message}`);

  const currentPlan = (subscription?.plan ?? 'free') as QuotePlan;
  const currentStatus = subscription?.status ?? 'inactive';
  const canManage = ['owner', 'admin'].includes(role);
  const hasManagedSubscription = subscription?.provider === 'lemonsqueezy'
    && Boolean(subscription.provider_subscription_id)
    && currentStatus !== 'expired'
    && currentStatus !== 'inactive';
  const periodEnd = subscription?.current_period_end
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(subscription.current_period_end))
    : null;

  return <AppShell organizationName={organization.name} role={role} plan={PLAN_LABELS[currentPlan].toUpperCase()}>
    <header className="topbar">
      <div><span className="eyebrow">BILLING · MAKSTER QUOTE</span><h1>Тариф и подписка</h1></div>
      <Link href="/" className="textLink">← Главная</Link>
    </header>

    <div className="pageContent">
      {query.checkout === 'success' ? <div className="notice success"><strong>Оплата завершена.</strong> Подписка обновится после подтверждённого webhook от Lemon Squeezy.</div> : null}
      {query.error === 'existing-subscription' ? <div className="notice warning">У мастерской уже есть подписка Lemon Squeezy. Для смены тарифа используйте управление подпиской, чтобы не создать вторую параллельную подписку.</div> : null}
      {query.error && query.error !== 'existing-subscription' ? <div className="notice error">Не удалось выполнить действие с подпиской ({query.error}).</div> : null}

      <section className="metricGrid">
        <article className="metricCard"><span>Текущий тариф</span><strong>{PLAN_LABELS[currentPlan]}</strong><small>для этой мастерской</small></article>
        <article className="metricCard"><span>Статус</span><strong>{statusLabel[currentStatus] ?? currentStatus}</strong><small>{periodEnd ? `до ${periodEnd}` : 'без даты окончания'}</small></article>
        <article className="metricCard"><span>Billing backend</span><strong>{webhookConfigured() ? 'Ready' : 'Setup'}</strong><small>{subscription?.test_mode ? 'Lemon Squeezy test mode' : (subscription ? 'live billing state' : 'ожидает настройки')}</small></article>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panelHeader">
          <div><span className="eyebrow">ТЕКУЩАЯ ПОДПИСКА</span><h2>{PLAN_LABELS[currentPlan]}</h2></div>
          {canManage && subscription?.provider === 'lemonsqueezy' && subscription.provider_subscription_id ? (
            <form action={openCustomerPortal}><button className="secondary" type="submit">Управлять оплатой</button></form>
          ) : null}
        </div>
        <div className="emptyState" style={{ textAlign: 'left' }}>
          <h3>{statusLabel[currentStatus] ?? currentStatus}</h3>
          <p style={{ marginLeft: 0 }}>{planDescription[currentPlan]}{periodEnd ? ` Текущий оплаченный период действует до ${periodEnd}.` : ''}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader"><div><span className="eyebrow">ТАРИФЫ</span><h2>{hasManagedSubscription ? 'Смена плана' : 'Выбрать план'}</h2><p className="muted">Цены и период оплаты берутся непосредственно из настроенных вариантов Lemon Squeezy.</p></div></div>
        {hasManagedSubscription ? (
          <div className="emptyState">
            <h3>Подписка уже активна</h3>
            <p>Смена плана, отмена и платёжные данные выполняются через Customer Portal Lemon Squeezy. Так мы не создаём дубликаты подписок.</p>
            {canManage ? <form action={openCustomerPortal}><button className="primary" type="submit">Открыть управление подпиской</button></form> : null}
          </div>
        ) : (
          <div className="metricGrid" style={{ padding: 16, marginBottom: 0 }}>
            <article className="metricCard">
              <span>FREE</span><strong>Free</strong><small>{planDescription.free}</small>
            </article>
            {PAID_PLANS.map((plan) => {
              const configured = checkoutConfigured(plan);
              return <article className="metricCard" key={plan}>
                <span>{plan.toUpperCase()}</span>
                <strong>{PLAN_LABELS[plan]}</strong>
                <small>{planDescription[plan]}</small>
                <div className="formActions" style={{ marginTop: 14 }}>
                  {canManage && configured ? <form action={startCheckout}><input type="hidden" name="plan" value={plan}/><button className="primary" type="submit">Выбрать {PLAN_LABELS[plan]}</button></form> : null}
                  {!configured ? <span className="muted">Вариант Lemon Squeezy ещё не настроен</span> : null}
                  {!canManage && configured ? <span className="muted">Изменить тариф может владелец или администратор</span> : null}
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  </AppShell>;
}
