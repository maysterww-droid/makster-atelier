import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';
import { archiveClient, updateClient } from '../actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

function addressLabel(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const address = value as Record<string, unknown>;
  return String(address.formatted ?? address.street ?? '').trim();
}

const errorText: Record<string, string> = {
  permission: 'Недостаточно прав для изменения клиента.',
  name: 'Укажите имя клиента или название компании.',
  update: 'Не удалось сохранить изменения.',
  projects: 'Не удалось проверить связанные проекты.',
  'active-projects': 'Нельзя архивировать клиента, пока у него есть активные проекты. Сначала архивируйте проекты.',
  archive: 'Не удалось архивировать клиента.',
};

export default async function ClientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();

  const [clientResult, projectsResult, subscriptionResult] = await Promise.all([
    supabase
      .from('clients')
      .select('id, display_name, email, phone, address, created_at, updated_at, archived_at')
      .eq('id', id)
      .eq('organization_id', organization.id)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id, name, status, updated_at')
      .eq('organization_id', organization.id)
      .eq('client_id', id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);

  if (clientResult.error || !clientResult.data || clientResult.data.archived_at) notFound();
  if (projectsResult.error) throw new Error(`Не удалось загрузить проекты клиента: ${projectsResult.error.message}`);

  const client = clientResult.data;
  const projects = projectsResult.data ?? [];
  const canEdit = ['owner', 'admin', 'sales', 'designer', 'technologist'].includes(role);

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscriptionResult.data?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">КЛИЕНТ</span><h1>{client.display_name}</h1></div>
        <Link href="/clients" className="textLink">← Клиенты</Link>
      </header>

      <div className="pageContent narrow">
        {query.saved ? <div className="notice success">Данные клиента сохранены.</div> : null}
        {query.error ? <div className="notice error">{errorText[query.error] ?? `Не удалось выполнить действие (${query.error}).`}</div> : null}

        <section className="panel formPanel">
          <div className="panelHeader"><div><span className="eyebrow">КОНТАКТЫ</span><h2>Карточка клиента</h2></div></div>
          <form action={updateClient} className="stackForm padded">
            <input type="hidden" name="clientId" value={client.id} />
            <label>Имя / компания<input name="displayName" maxLength={200} required defaultValue={client.display_name} disabled={!canEdit} /></label>
            <div className="formGrid2">
              <label>Email<input name="email" type="email" maxLength={320} defaultValue={client.email ?? ''} disabled={!canEdit} /></label>
              <label>Телефон<input name="phone" maxLength={80} defaultValue={client.phone ?? ''} disabled={!canEdit} /></label>
            </div>
            <label>Адрес<input name="address" maxLength={500} defaultValue={addressLabel(client.address)} disabled={!canEdit} /></label>
            {canEdit ? <div className="formActions"><button type="submit" className="primary">Сохранить</button></div> : null}
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">ПРОЕКТЫ</span><h2>{projects.length ? `${projects.length} активных` : 'Нет активных проектов'}</h2></div><Link href="/projects/new" className="secondary linkButton">+ Новый расчёт</Link></div>
          {projects.length ? <div className="priceList">{projects.map((project) => <article className="priceRow" key={project.id}><div><strong>{project.name}</strong><small>{project.status} · {new Intl.DateTimeFormat('ru-RU').format(new Date(project.updated_at))}</small></div><div className="priceValue"><Link href={`/projects/${project.id}`} className="textLink">Открыть →</Link></div></article>)}</div> : <div className="emptyState"><p>Этот клиент пока не привязан ни к одному активному проекту.</p></div>}
        </section>

        {canEdit ? <section className="panel formPanel"><div className="panelHeader"><div><span className="eyebrow">АРХИВ</span><h2>Архивировать клиента</h2><p className="muted">Опубликованные предложения останутся неизменяемыми. Архивация доступна только когда нет активных проектов.</p></div></div><form action={archiveClient} className="padded"><input type="hidden" name="clientId" value={client.id}/><button type="submit" className="secondary" disabled={projects.length > 0}>Архивировать клиента</button></form></section> : null}
      </div>
    </AppShell>
  );
}
