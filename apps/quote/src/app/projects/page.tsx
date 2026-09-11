import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

const statusLabel: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активный',
  quoted: 'Отправлен',
  approved: 'Принят',
  engineering: 'Инженерия',
  production: 'Производство',
  installed: 'Монтаж',
  completed: 'Завершён',
  archived: 'Архив',
};

export default async function ProjectsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const search = String(query.q ?? '').trim().slice(0, 120);
  const status = String(query.status ?? '').trim().slice(0, 40);

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, project_type, status, currency, client_id, updated_at')
    .eq('organization_id', organization.id)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (search) projectsQuery = projectsQuery.ilike('name', `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`);
  if (status) projectsQuery = projectsQuery.eq('status', status);

  const [{ data: projects, error: projectsError }, { data: clients, error: clientsError }, { data: subscription }] = await Promise.all([
    projectsQuery,
    supabase.from('clients').select('id, display_name').eq('organization_id', organization.id).is('archived_at', null),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);

  if (projectsError) throw new Error(`Не удалось загрузить проекты: ${projectsError.message}`);
  if (clientsError) throw new Error(`Не удалось загрузить клиентов: ${clientsError.message}`);

  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.display_name]));
  const rows = projects ?? [];

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · PROJECTS</span><h1>Проекты</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ Новый расчёт</Link>
      </header>

      <div className="pageContent">
        <section className="panel formPanel">
          <form className="stackForm padded" method="get">
            <div className="formGrid3">
              <label>Поиск<input name="q" defaultValue={search} placeholder="Название проекта" /></label>
              <label>Статус<select name="status" defaultValue={status}><option value="">Все статусы</option>{Object.entries(statusLabel).filter(([key]) => key !== 'archived').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <div className="formActions" style={{alignItems:'end'}}><button type="submit" className="secondary">Найти</button><Link href="/projects" className="textLink">Сбросить</Link></div>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">ВСЕ ПРОЕКТЫ</span><h2>{rows.length ? `${rows.length} найдено` : 'Ничего не найдено'}</h2></div></div>
          {rows.length === 0 ? (
            <div className="emptyState"><h3>Нет проектов по выбранному фильтру</h3><p>Измените поиск или создайте новый расчёт.</p><Link href="/projects/new" className="primary linkButton">Создать расчёт</Link></div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead><tr><th>Проект</th><th>Клиент</th><th>Тип</th><th>Статус</th><th>Валюта</th><th>Изменён</th><th></th></tr></thead>
                <tbody>{rows.map((project) => <tr key={project.id}>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.client_id ? (clientNames.get(project.client_id) ?? 'Клиент') : '—'}</td>
                  <td>{project.project_type}</td>
                  <td><span className="pill">{statusLabel[project.status] ?? project.status}</span></td>
                  <td>{project.currency}</td>
                  <td>{new Intl.DateTimeFormat('ru-RU').format(new Date(project.updated_at))}</td>
                  <td><Link className="textLink" href={`/projects/${project.id}`}>Открыть →</Link></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
