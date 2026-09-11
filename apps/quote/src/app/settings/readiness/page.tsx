import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { environmentReadiness, overallReadiness, type ReadinessState } from '@/lib/readiness';
import { readQuoteBrand } from '@/lib/quote-brand';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const stateLabel: Record<ReadinessState, string> = {
  ready: 'Готово',
  warning: 'Нужна настройка',
  blocked: 'Блокирует запуск',
};

export default async function ReadinessPage() {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/?error=permission');

  const [subscriptionResult, priceBookResult, projectResult, quoteResult, clientResult] = await Promise.all([
    supabase.from('quote_subscriptions').select('plan, status, provider, test_mode').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('active', true),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).is('archived_at', null),
    supabase.from('client_commercial_quotes').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).is('archived_at', null),
  ]);

  const checks = environmentReadiness();
  const brand = readQuoteBrand(organization.settings, organization.name);
  const brandReady = Boolean(brand.tradeName && brand.address && (brand.email || brand.phone));
  const priceReady = (priceBookResult.count ?? 0) > 0;

  checks.push(
    {
      key: 'price-book',
      label: 'Прайс-лист мастерской',
      state: priceReady ? 'ready' : 'blocked',
      detail: priceReady ? `${priceBookResult.count ?? 0} активных позиций.` : 'Без реальных закупочных цен Quote не должен выпускать коммерческое предложение.',
    },
    {
      key: 'document-brand',
      label: 'Реквизиты документа',
      state: brandReady ? 'ready' : 'warning',
      detail: brandReady ? 'Торговое имя, контакт и адрес заполнены.' : 'Заполните торговое имя, адрес и хотя бы один контакт для клиентского PDF.',
    },
  );

  const overall = overallReadiness(checks);
  const subscription = subscriptionResult.data;
  const readyCount = checks.filter((check) => check.state === 'ready').length;

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar">
      <div><span className="eyebrow">PRODUCTION READINESS · MAKSTER QUOTE</span><h1>Готовность системы</h1></div>
      <Link href="/" className="textLink">← Главная</Link>
    </header>

    <div className="pageContent">
      <section className="metricGrid">
        <article className="metricCard"><span>Общий статус</span><strong>{stateLabel[overall]}</strong><small>{readyCount} из {checks.length} проверок готовы</small></article>
        <article className="metricCard"><span>Рабочие данные</span><strong>{projectResult.count ?? 0}</strong><small>проектов · {clientResult.count ?? 0} клиентов</small></article>
        <article className="metricCard"><span>Выпущено</span><strong>{quoteResult.count ?? 0}</strong><small>версий коммерческих предложений</small></article>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panelHeader"><div><span className="eyebrow">ПРОВЕРКИ</span><h2>Перед первым production-заказом</h2><p className="muted">Показываются только статусы. Секретные ключи и их значения никогда не выводятся.</p></div></div>
        <div className="priceList">
          {checks.map((check) => <article className="priceRow" key={check.key}>
            <div><span className="pill">{stateLabel[check.state]}</span><strong>{check.label}</strong><small>{check.detail}</small></div>
          </article>)}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader"><div><span className="eyebrow">LIVE STATE</span><h2>Текущая конфигурация</h2></div></div>
        <div className="tableWrap"><table><tbody>
          <tr><th>Тариф</th><td>{String(subscription?.plan ?? 'free').toUpperCase()}</td></tr>
          <tr><th>Статус подписки</th><td>{subscription?.status ?? 'inactive'}</td></tr>
          <tr><th>Billing provider</th><td>{subscription?.provider ?? 'не подключён'}</td></tr>
          <tr><th>Billing mode</th><td>{subscription?.test_mode ? 'test' : 'live / not set'}</td></tr>
          <tr><th>Прайс-лист</th><td>{priceBookResult.count ?? 0} активных позиций</td></tr>
        </tbody></table></div>
      </section>
    </div>
  </AppShell>;
}
