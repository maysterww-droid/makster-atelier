import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMessages, INTL_LOCALES } from '@/lib/i18n';
import { requireWorkspace } from '@/lib/workspace';
import { archiveProject, duplicateProject } from './actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; status?: string; error?: string; archived?: string }> };

const errors = {
  ru:{project:'Проект не найден.',permission:'Недостаточно прав для этого действия.',archive:'Не удалось архивировать проект.',source:'Исходный проект для копирования не найден.','duplicate-create':'Не удалось создать копию проекта.'},
  en:{project:'Project not found.',permission:'You do not have permission for this action.',archive:'Could not archive the project.',source:'The source project for copying was not found.','duplicate-create':'Could not create a project copy.'},
  cs:{project:'Projekt nebyl nalezen.',permission:'Pro tuto akci nemáte oprávnění.',archive:'Projekt se nepodařilo archivovat.',source:'Zdrojový projekt pro kopii nebyl nalezen.','duplicate-create':'Kopii projektu se nepodařilo vytvořit.'},
  de:{project:'Projekt nicht gefunden.',permission:'Keine Berechtigung für diese Aktion.',archive:'Projekt konnte nicht archiviert werden.',source:'Quellprojekt für die Kopie wurde nicht gefunden.','duplicate-create':'Projektkopie konnte nicht erstellt werden.'},
  pl:{project:'Nie znaleziono projektu.',permission:'Brak uprawnień do tej operacji.',archive:'Nie udało się zarchiwizować projektu.',source:'Nie znaleziono projektu źródłowego do skopiowania.','duplicate-create':'Nie udało się utworzyć kopii projektu.'},
} as const;

export default async function ProjectsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getMessages(locale);
  const errorText = errors[locale];
  const statusLabel: Record<string, string> = {
    draft:m.statusDraft, active:m.statusActive, quoted:m.statusQuoted, approved:m.statusApproved,
    engineering:m.statusEngineering, production:m.statusProduction, installed:m.statusInstalled,
    completed:m.statusCompleted, archived:m.statusArchived,
  };
  const typeLabel: Record<string, string> = {
    kitchen:m.furnitureKitchen, wardrobe:m.furnitureWardrobe, built_in:m.furnitureBuiltIn,
    cabinet:m.furnitureCabinet, sideboard:m.furnitureSideboard, mixed:m.furnitureMixed,
  };
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

  if (projectsError) throw new Error(`Failed to load projects: ${projectsError.message}`);
  if (clientsError) throw new Error(`Failed to load customers: ${clientsError.message}`);

  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.display_name]));
  const rows = projects ?? [];
  const canManage = ['owner', 'admin', 'sales', 'designer', 'technologist'].includes(role);

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · PROJECTS</span><h1>{m.projects}</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ {m.newQuote}</Link>
      </header>

      <div className="pageContent">
        {query.archived ? <div className="notice success">{m.projectArchived}</div> : null}
        {query.error ? <div className="notice error">{errorText[query.error as keyof typeof errorText] ?? `${query.error}`}</div> : null}

        <section className="panel formPanel">
          <form className="stackForm padded" method="get">
            <div className="formGrid3">
              <label>{m.search}<input name="q" defaultValue={search} placeholder={m.projectName} /></label>
              <label>{m.status}<select name="status" defaultValue={status}><option value="">{m.allStatuses}</option>{Object.entries(statusLabel).filter(([key]) => key !== 'archived').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <div className="formActions" style={{alignItems:'end'}}><button type="submit" className="secondary">{m.find}</button><Link href="/projects" className="textLink">{m.reset}</Link></div>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">{m.allProjectsEyebrow}</span><h2>{rows.length ? `${rows.length} ${m.found}` : m.nothingFound}</h2></div></div>
          {rows.length === 0 ? (
            <div className="emptyState"><h3>{m.noProjectsFilterTitle}</h3><p>{m.noProjectsFilterText}</p><Link href="/projects/new" className="primary linkButton">{m.createQuote}</Link></div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead><tr><th>{m.project}</th><th>{m.customer}</th><th>{m.type}</th><th>{m.status}</th><th>{m.currency}</th><th>{m.modified}</th><th></th></tr></thead>
                <tbody>{rows.map((project) => <tr key={project.id}>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.client_id ? (clientNames.get(project.client_id) ?? m.customer) : '—'}</td>
                  <td>{typeLabel[project.project_type] ?? project.project_type}</td>
                  <td><span className="pill">{statusLabel[project.status] ?? project.status}</span></td>
                  <td>{project.currency}</td>
                  <td>{new Intl.DateTimeFormat(INTL_LOCALES[locale]).format(new Date(project.updated_at))}</td>
                  <td><div className="topActions"><Link className="textLink" href={`/projects/${project.id}`}>{m.open}</Link>{canManage ? <><form action={duplicateProject}><input type="hidden" name="projectId" value={project.id}/><button type="submit" className="textLink">{m.copy}</button></form><form action={archiveProject}><input type="hidden" name="projectId" value={project.id}/><button type="submit" className="textLink">{m.archive}</button></form></> : null}</div></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
