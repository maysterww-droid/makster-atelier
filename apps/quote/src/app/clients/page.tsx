import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';
import { createClient } from './actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ error?: string; created?: string; archived?: string }> };

type ClientRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  address: unknown;
  created_at: string;
};

function addressLabel(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const address = value as Record<string, unknown>;
  return String(address.formatted ?? address.street ?? '').trim();
}

export default async function ClientsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: clients, error: clientsError }, { data: projects, error: projectsError }, { data: subscription }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, display_name, email, phone, address, created_at')
      .eq('organization_id', organization.id)
      .is('archived_at', null)
      .order('display_name'),
    supabase
      .from('projects')
      .select('id, name, client_id, status')
      .eq('organization_id', organization.id)
      .is('archived_at', null),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);

  if (clientsError) throw new Error(`Не удалось загрузить клиентов: ${clientsError.message}`);
  if (projectsError) throw new Error(`Не удалось загрузить проекты клиентов: ${projectsError.message}`);

  const rows = (clients ?? []) as ClientRow[];
  const projectRows = projects ?? [];
  const projectsByClient = new Map<string, { id: string; name: string; status: string }[]>();
  for (const project of projectRows) {
    if (!project.client_id) continue;
    const list = projectsByClient.get(project.client_id) ?? [];
    list.push({ id: project.id, name: project.name, status: project.status });
    projectsByClient.set(project.client_id, list);
  }

  const canCreate = ['owner', 'admin', 'sales', 'designer', 'technologist'].includes(role);

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · CLIENTS</span><h1>Клиенты</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ Новый расчёт</Link>
      </header>

      <div className="pageContent">
        {query.created ? <div className="notice success">Клиент добавлен.</div> : null}
        {query.archived ? <div className="notice success">Клиент перемещён в архив.</div> : null}
        {query.error ? <div className="notice error">Не удалось сохранить клиента ({query.error}).</div> : null}

        {canCreate ? (
          <section className="panel formPanel">
            <div className="panelHeader"><div><span className="eyebrow">НОВЫЙ КЛИЕНТ</span><h2>Добавить в базу</h2></div></div>
            <form action={createClient} className="stackForm padded">
              <div className="formGrid3">
                <label>Имя / компания<input name="displayName" maxLength={200} required placeholder="Например, Jan Novák" /></label>
                <label>Email<input name="email" type="email" maxLength={320} placeholder="client@example.com" /></label>
                <label>Телефон<input name="phone" maxLength={80} /></label>
              </div>
              <label>Адрес<input name="address" maxLength={500} placeholder="Улица, город, индекс" /></label>
              <div className="formActions"><button type="submit" className="primary">Добавить клиента</button></div>
            </form>
          </section>
        ) : null}

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">БАЗА КЛИЕНТОВ</span><h2>{rows.length ? `${rows.length} клиентов` : 'Клиентов пока нет'}</h2></div></div>
          {rows.length === 0 ? (
            <div className="emptyState"><h3>Добавьте первого клиента</h3><p>После этого его можно будет выбирать в любом коммерческом расчёте без повторного ввода контактов.</p></div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead><tr><th>Клиент</th><th>Контакты</th><th>Адрес</th><th>Проекты</th><th></th></tr></thead>
                <tbody>
                  {rows.map((client) => {
                    const clientProjects = projectsByClient.get(client.id) ?? [];
                    return (
                      <tr key={client.id}>
                        <td><strong>{client.display_name}</strong></td>
                        <td>{client.email ?? '—'}{client.phone ? <><br />{client.phone}</> : null}</td>
                        <td>{addressLabel(client.address) || '—'}</td>
                        <td>{clientProjects.length}</td>
                        <td><Link className="textLink" href={`/clients/${client.id}`}>Карточка →</Link></td>
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
