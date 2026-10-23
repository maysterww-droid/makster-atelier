import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getSalesMessages } from '@/lib/i18n-sales';
import { requireWorkspace } from '@/lib/workspace';
import { createClient } from './actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ error?: string; created?: string; archived?: string }> };
type ClientRow = { id:string; display_name:string; email:string|null; phone:string|null; address:unknown; created_at:string };

function addressLabel(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const address = value as Record<string, unknown>;
  return String(address.formatted ?? address.street ?? '').trim();
}

export default async function ClientsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getSalesMessages(locale);
  const [{ data: clients, error: clientsError }, { data: projects, error: projectsError }, { data: subscription }] = await Promise.all([
    supabase.from('clients').select('id, display_name, email, phone, address, created_at').eq('organization_id', organization.id).is('archived_at', null).order('display_name'),
    supabase.from('projects').select('id, name, client_id, status').eq('organization_id', organization.id).is('archived_at', null),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);

  if (clientsError) throw new Error(`Failed to load customers: ${clientsError.message}`);
  if (projectsError) throw new Error(`Failed to load customer projects: ${projectsError.message}`);

  const rows = (clients ?? []) as ClientRow[];
  const projectsByClient = new Map<string, { id:string; name:string; status:string }[]>();
  for (const project of projects ?? []) {
    if (!project.client_id) continue;
    const list = projectsByClient.get(project.client_id) ?? [];
    list.push({ id:project.id, name:project.name, status:project.status });
    projectsByClient.set(project.client_id, list);
  }
  const canCreate = ['owner', 'admin', 'sales', 'designer', 'technologist'].includes(role);

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">MAKSTER QUOTE · CLIENTS</span><h1>{m.clientsTitle}</h1></div><Link href="/projects/new" className="primary linkButton">+ {m.newQuote}</Link></header>
    <div className="pageContent">
      {query.created ? <div className="notice success">{m.clientAdded}</div> : null}
      {query.archived ? <div className="notice success">{m.clientArchived}</div> : null}
      {query.error ? <div className="notice error">{m.clientSaveError} ({query.error})</div> : null}
      {canCreate ? <section className="panel formPanel"><div className="panelHeader"><div><span className="eyebrow">{m.newClient}</span><h2>{m.addToDatabase}</h2></div></div>
        <form action={createClient} className="stackForm padded"><div className="formGrid3"><label>{m.nameCompany}<input name="displayName" maxLength={200} required placeholder="Jan Novák" /></label><label>{m.email}<input name="email" type="email" maxLength={320} placeholder="client@example.com" /></label><label>{m.phone}<input name="phone" maxLength={80} /></label></div><label>{m.address}<input name="address" maxLength={500} placeholder={m.addressPlaceholder} /></label><div className="formActions"><button type="submit" className="primary">{m.addClient}</button></div></form>
      </section> : null}
      <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.clientDatabase}</span><h2>{rows.length ? `${rows.length} ${m.clientsCount}` : m.noClients}</h2></div></div>
        {rows.length === 0 ? <div className="emptyState"><h3>{m.addFirstClient}</h3><p>{m.firstClientHelp}</p></div> : <div className="tableWrap"><table><thead><tr><th>{m.client}</th><th>{m.contacts}</th><th>{m.address}</th><th>{m.projects}</th><th></th></tr></thead><tbody>{rows.map((client) => { const clientProjects=projectsByClient.get(client.id)??[]; return <tr key={client.id}><td><strong>{client.display_name}</strong></td><td>{client.email??'—'}{client.phone?<><br/>{client.phone}</>:null}</td><td>{addressLabel(client.address)||'—'}</td><td>{clientProjects.length}</td><td><Link className="textLink" href={`/clients/${client.id}`}>{m.card}</Link></td></tr>; })}</tbody></table></div>}
      </section>
    </div>
  </AppShell>;
}
