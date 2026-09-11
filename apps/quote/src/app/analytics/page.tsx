import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { formatMinor } from '@/lib/calculation';
import { minorFromUnknown } from '@/lib/project-pricing';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type QuoteRow = {
  id: string;
  project_id: string;
  client_name: string;
  currency: string;
  issued_at: string;
  valid_until: string;
  total_amount_minor: number | string;
};

type StatusRow = {
  quote_id: string;
  status: string;
  created_at: string;
};

const terminalStatuses = new Set(['accepted', 'rejected', 'expired', 'superseded']);
const openStatuses = new Set(['approved', 'sent']);

function daysBetween(start: string, end: string) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
}

export default async function AnalyticsPage() {
  const { supabase, organization, role } = await requireWorkspace();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 180);

  const [{ data: quotes, error: quoteError }, { data: subscription }] = await Promise.all([
    supabase
      .from('client_commercial_quotes')
      .select('id, project_id, client_name, currency, issued_at, valid_until, total_amount_minor')
      .eq('organization_id', organization.id)
      .gte('issued_at', since.toISOString())
      .order('issued_at', { ascending: false })
      .limit(500),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (quoteError) throw new Error(`Не удалось загрузить аналитику предложений: ${quoteError.message}`);

  const rows = (quotes ?? []) as QuoteRow[];
  const quoteIds = rows.map((quote) => quote.id);
  const { data: statuses, error: statusError } = quoteIds.length
    ? await supabase
        .from('client_quote_status_events')
        .select('quote_id, status, created_at')
        .eq('organization_id', organization.id)
        .in('quote_id', quoteIds)
        .order('created_at', { ascending: false })
    : { data: [] as StatusRow[], error: null };
  if (statusError) throw new Error(`Не удалось загрузить статусы аналитики: ${statusError.message}`);

  const latestStatus = new Map<string, StatusRow>();
  const terminalEvent = new Map<string, StatusRow>();
  for (const event of (statuses ?? []) as StatusRow[]) {
    if (!latestStatus.has(event.quote_id)) latestStatus.set(event.quote_id, event);
    if (!terminalEvent.has(event.quote_id) && terminalStatuses.has(event.status)) terminalEvent.set(event.quote_id, event);
  }

  const accepted = rows.filter((quote) => latestStatus.get(quote.id)?.status === 'accepted');
  const rejected = rows.filter((quote) => latestStatus.get(quote.id)?.status === 'rejected');
  const decided = accepted.length + rejected.length;
  const conversion = decided ? Math.round((accepted.length / decided) * 100) : 0;
  const now = new Date().toISOString();
  const followUps = rows.filter((quote) => {
    const status = latestStatus.get(quote.id)?.status ?? 'approved';
    return openStatuses.has(status) && daysBetween(quote.issued_at, now) >= 3;
  });

  const acceptedByCurrency = new Map<string, bigint>();
  for (const quote of accepted) {
    acceptedByCurrency.set(
      quote.currency,
      (acceptedByCurrency.get(quote.currency) ?? 0n) + minorFromUnknown(quote.total_amount_minor),
    );
  }

  const primaryAccepted = acceptedByCurrency.get(organization.currency) ?? 0n;
  const primaryAcceptedRows = accepted.filter((quote) => quote.currency === organization.currency);
  const avgAccepted = primaryAcceptedRows.length ? primaryAccepted / BigInt(primaryAcceptedRows.length) : 0n;

  const responseDays = rows.flatMap((quote) => {
    const event = terminalEvent.get(quote.id);
    return event && ['accepted', 'rejected'].includes(event.status) ? [daysBetween(quote.issued_at, event.created_at)] : [];
  });
  const avgResponse = responseDays.length
    ? responseDays.reduce((sum, value) => sum + value, 0) / responseDays.length
    : 0;

  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const issued30d = rows.filter((quote) => new Date(quote.issued_at).getTime() >= thirtyDaysAgo).length;

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar">
      <div><span className="eyebrow">SALES ANALYTICS · 180 DAYS</span><h1>Аналитика предложений</h1></div>
      <div className="topActions"><Link href="/quotes" className="secondary linkButton">Предложения</Link><Link href="/" className="textLink">← Главная</Link></div>
    </header>

    <div className="pageContent">
      <section className="metricGrid">
        <article className="metricCard"><span>Конверсия</span><strong>{conversion}%</strong><small>{accepted.length} принято · {rejected.length} отклонено</small></article>
        <article className="metricCard"><span>Принято на сумму</span><strong>{formatMinor(primaryAccepted, organization.currency)}</strong><small>за последние 180 дней · {organization.currency}</small></article>
        <article className="metricCard"><span>Средний принятый заказ</span><strong>{formatMinor(avgAccepted, organization.currency)}</strong><small>{primaryAcceptedRows.length} принятых в основной валюте</small></article>
        <article className="metricCard"><span>Среднее решение клиента</span><strong>{avgResponse ? `${avgResponse.toFixed(1)} дн.` : '—'}</strong><small>от выпуска до принятия/отказа</small></article>
        <article className="metricCard"><span>Выпущено за 30 дней</span><strong>{issued30d}</strong><small>новых версий предложений</small></article>
        <article className="metricCard"><span>Нужен follow-up</span><strong>{followUps.length}</strong><small>без решения 3 дня и дольше</small></article>
      </section>

      <div className="twoColumnPage">
        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">FOLLOW-UP</span><h2>Клиенты без решения</h2><p className="muted">Сначала показываются самые старые открытые предложения.</p></div></div>
          {!followUps.length ? <div className="emptyState"><h3>Просроченных follow-up нет</h3><p>Все активные предложения либо свежие, либо уже получили решение клиента.</p></div> : <div className="tableWrap"><table><thead><tr><th>Клиент</th><th>Возраст</th><th>Сумма</th><th></th></tr></thead><tbody>{followUps.sort((a, b) => new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()).slice(0, 12).map((quote) => <tr key={quote.id}><td><strong>{quote.client_name}</strong></td><td>{Math.floor(daysBetween(quote.issued_at, now))} дн.</td><td>{formatMinor(minorFromUnknown(quote.total_amount_minor), quote.currency)}</td><td><Link href={`/projects/${quote.project_id}/quote/${quote.id}`} className="textLink">Открыть →</Link></td></tr>)}</tbody></table></div>}
        </section>

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">ПРИНЯТО</span><h2>Выручка по валютам</h2><p className="muted">Суммируем только предложения со статусом «Принято».</p></div></div>
          {!acceptedByCurrency.size ? <div className="emptyState"><h3>Принятых предложений пока нет</h3><p>После первого принятого предложения здесь появится коммерческая статистика.</p></div> : <div className="priceList">{[...acceptedByCurrency.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => <article className="priceRow" key={currency}><div><strong>{currency}</strong><small>принятые предложения за 180 дней</small></div><div className="priceValue"><strong>{formatMinor(amount, currency)}</strong></div></article>)}</div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
