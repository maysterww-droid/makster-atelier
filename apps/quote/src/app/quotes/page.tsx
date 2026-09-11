import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { formatMinor } from '@/lib/calculation';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type QuoteRow = {
  id: string;
  project_id: string;
  quote_version: number;
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
  note: string | null;
};

const statusName: Record<string, string> = {
  approved: 'Выпущено',
  sent: 'Отправлено',
  accepted: 'Принято',
  rejected: 'Отклонено',
  expired: 'Истекло',
  superseded: 'Заменено',
};

function asMinor(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export default async function QuotesPage() {
  const { supabase, organization, role } = await requireWorkspace();

  const [{ data: quotes, error: quotesError }, { data: subscription }] = await Promise.all([
    supabase
      .from('client_commercial_quotes')
      .select('id, project_id, quote_version, client_name, currency, issued_at, valid_until, total_amount_minor')
      .eq('organization_id', organization.id)
      .order('issued_at', { ascending: false })
      .limit(100),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);

  if (quotesError) throw new Error(`Не удалось загрузить предложения: ${quotesError.message}`);

  const rows = (quotes ?? []) as QuoteRow[];
  const quoteIds = rows.map((quote) => quote.id);
  const projectIds = [...new Set(rows.map((quote) => quote.project_id))];

  const [statusResult, projectsResult] = await Promise.all([
    quoteIds.length
      ? supabase
          .from('client_quote_status_events')
          .select('quote_id, status, created_at, note')
          .eq('organization_id', organization.id)
          .in('quote_id', quoteIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as StatusRow[], error: null }),
    projectIds.length
      ? supabase
          .from('projects')
          .select('id, name')
          .eq('organization_id', organization.id)
          .in('id', projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);

  if (statusResult.error) throw new Error(`Не удалось загрузить статусы: ${statusResult.error.message}`);
  if (projectsResult.error) throw new Error(`Не удалось загрузить проекты: ${projectsResult.error.message}`);

  const projectNames = new Map((projectsResult.data ?? []).map((project) => [project.id, project.name]));
  const latestStatus = new Map<string, StatusRow>();
  for (const event of (statusResult.data ?? []) as StatusRow[]) {
    if (!latestStatus.has(event.quote_id)) latestStatus.set(event.quote_id, event);
  }

  const now = Date.now();
  const activeStatuses = new Set(['approved', 'sent']);
  const awaiting = rows.filter((quote) => activeStatuses.has(latestStatus.get(quote.id)?.status ?? 'approved')).length;
  const accepted = rows.filter((quote) => latestStatus.get(quote.id)?.status === 'accepted').length;
  const rejected = rows.filter((quote) => latestStatus.get(quote.id)?.status === 'rejected').length;
  const decided = accepted + rejected;
  const conversion = decided > 0 ? Math.round((accepted / decided) * 100) : 0;

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · PIPELINE</span><h1>Предложения</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ Новый расчёт</Link>
      </header>

      <div className="pageContent">
        <section className="metricGrid">
          <article className="metricCard"><span>Выпущено</span><strong>{rows.length}</strong><small>последние 100 версий</small></article>
          <article className="metricCard"><span>Ожидают решения</span><strong>{awaiting}</strong><small>выпущено или отправлено</small></article>
          <article className="metricCard"><span>Принято</span><strong>{accepted}</strong><small>подтверждено клиентом</small></article>
          <article className="metricCard"><span>Конверсия</span><strong>{conversion}%</strong><small>среди принятых и отклонённых</small></article>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div><span className="eyebrow">КОММЕРЧЕСКИЙ PIPELINE</span><h2>Последние предложения</h2></div>
          </div>

          {rows.length === 0 ? (
            <div className="emptyState">
              <h3>Пока нет выпущенных предложений</h3>
              <p>Создайте проект, заполните расчёт и выпустите первую неизменяемую версию для клиента.</p>
              <Link href="/projects/new" className="primary linkButton">Создать расчёт</Link>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr><th>Проект</th><th>Клиент</th><th>Версия</th><th>Статус</th><th>Сумма</th><th>Действует до</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((quote) => {
                    const status = latestStatus.get(quote.id)?.status ?? 'approved';
                    const isOverdue = activeStatuses.has(status) && new Date(quote.valid_until).getTime() < now;
                    return (
                      <tr key={quote.id}>
                        <td><strong>{projectNames.get(quote.project_id) ?? 'Проект'}</strong></td>
                        <td>{quote.client_name}</td>
                        <td>v{quote.quote_version}</td>
                        <td><span className="pill">{isOverdue ? 'Просрочено' : (statusName[status] ?? status)}</span></td>
                        <td><strong>{formatMinor(asMinor(quote.total_amount_minor), quote.currency)}</strong></td>
                        <td>{new Intl.DateTimeFormat('ru-RU').format(new Date(quote.valid_until))}</td>
                        <td><Link className="textLink" href={`/projects/${quote.project_id}/quote/${quote.id}`}>Открыть →</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
