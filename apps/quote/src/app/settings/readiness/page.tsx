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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export default async function ReadinessPage() {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/?error=permission');

  const [subscriptionResult, priceBookResult, projectResult, quoteResult, clientResult] = await Promise.all([
    supabase.from('quote_subscriptions').select('plan, status, provider, test_mode').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category').eq('organization_id', organization.id).eq('active', true),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).is('archived_at', null),
    supabase.from('client_commercial_quotes').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).is('archived_at', null),
  ]);

  if (priceBookResult.error) throw new Error(`Не удалось проверить Price Book: ${priceBookResult.error.message}`);

  const checks = environmentReadiness();
  const brand = readQuoteBrand(organization.settings, organization.name);
  const brandReady = Boolean(brand.tradeName && brand.address && (brand.email || brand.phone));
  const priceItems = priceBookResult.data ?? [];
  const categories = new Set(priceItems.map((item) => item.category));
  const requiredCategories = ['board', 'front', 'edge', 'hardware', 'operation'];
  const missingCategories = requiredCategories.filter((category) => !categories.has(category));
  const priceReady = priceItems.length > 0 && missingCategories.length === 0;

  const quoteSettings = record(record(organization.settings).quote);
  const pricingConfigured = Number.isInteger(Number(quoteSettings.targetMarginBps))
    && Number(quoteSettings.targetMarginBps) >= 0
    && Number(quoteSettings.targetMarginBps) < 10_000
    && Number.isInteger(Number(quoteSettings.overheadBps))
    && Number(quoteSettings.overheadBps) >= 0
    && Number(quoteSettings.overheadBps) < 10_000;
  const margin = pricingConfigured ? Number(quoteSettings.targetMarginBps) / 100 : 35;
  const overhead = pricingConfigured ? Number(quoteSettings.overheadBps) / 100 : 0;

  checks.push(
    {
      key: 'price-book',
      label: 'Прайс-лист мастерской',
      state: priceReady ? 'ready' : 'blocked',
      detail: priceReady
        ? `${priceItems.length} активных позиций; базовые категории для инженерного расчёта присутствуют.`
        : missingCategories.length
          ? `Не хватает категорий: ${missingCategories.join(', ')}. Без них типовые модули не смогут пройти полный расчёт.`
          : 'Без реальных закупочных цен Quote не должен выпускать коммерческое предложение.',
    },
    {
      key: 'pricing-policy',
      label: 'Маржа и накладные',
      state: pricingConfigured ? 'ready' : 'warning',
      detail: pricingConfigured
        ? `Целевая маржа ${margin.toFixed(2)}%, накладные ${overhead.toFixed(2)}%.`
        : 'Используются безопасные значения по умолчанию 35% / 0%. Перед production-заказом подтвердите свою маржу и накладные в настройках.',
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
          <tr><th>Прайс-лист</th><td>{priceItems.length} активных позиций</td></tr>
          <tr><th>Целевая маржа</th><td>{margin.toFixed(2)}%</td></tr>
          <tr><th>Накладные</th><td>{overhead.toFixed(2)}%</td></tr>
        </tbody></table></div>
      </section>
    </div>
  </AppShell>;
}
