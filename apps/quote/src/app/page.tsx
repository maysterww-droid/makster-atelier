import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = {
  draft: 'Черновик', active: 'Активный', quoted: 'Отправлен', approved: 'Принят',
  engineering: 'Инженерия', production: 'Производство', installed: 'Монтаж',
  completed: 'Завершён', archived: 'Архив',
};

export default async function DashboardPage() {
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: projects, error: projectsError }, { data: subscription }, priceBookResult] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, status, currency, updated_at').eq('organization_id', organization.id).is('archived_at', null).order('updated_at', { ascending: false }).limit(12),
    supabase.from('quote_subscriptions').select('plan, status').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('active', true),
  ]);

  if (projectsError) throw new Error(`Не удалось загрузить проекты: ${projectsError.message}`);
  const rows = projects ?? [];
  const priceCount = priceBookResult.count ?? 0;
  const draftCount = rows.filter((p) => p.status === 'draft' || p.status === 'active').length;

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · MQ 0.1.1</span><h1>Главная</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ Новый расчёт</Link>
      </header>
      <div className="pageContent">
        {priceCount === 0 ? <div className="notice warning"><strong>Прайс-лист пуст.</strong> До добавления своих закупочных цен Makster не будет подставлять вымышленные стоимости. <Link href="/price-book">Заполнить прайс-лист →</Link></div> : null}
        <section className="metricGrid">
          <article className="metricCard"><span>Проектов</span><strong>{rows.length}</strong><small>последние активные</small></article>
          <article className="metricCard"><span>В работе</span><strong>{draftCount}</strong><small>черновики и активные</small></article>
          <article className="metricCard"><span>Прайс-лист</span><strong>{priceCount}</strong><small>активных позиций</small></article>
        </section>
        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">ПРОЕКТЫ</span><h2>Последние расчёты</h2></div><Link href="/projects/new" className="textLink">Создать →</Link></div>
          {rows.length === 0 ? (
            <div className="emptyState"><h3>Пока нет ни одного расчёта</h3><p>Создайте первый проект. Makster сохранит его в общей базе и подготовит для будущего перехода в Makster Pro.</p><Link href="/projects/new" className="primary linkButton">Создать первый расчёт</Link></div>
          ) : (
            <div className="tableWrap"><table><thead><tr><th>Проект</th><th>Тип</th><th>Статус</th><th>Валюта</th><th></th></tr></thead><tbody>{rows.map((project) => <tr key={project.id}><td><strong>{project.name}</strong></td><td>{project.project_type}</td><td><span className="pill">{statusLabel[project.status] ?? project.status}</span></td><td>{project.currency}</td><td><Link className="textLink" href={`/projects/${project.id}`}>Открыть →</Link></td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
