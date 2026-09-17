import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMessages } from '@/lib/i18n';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getMessages(locale);
  const statusLabel: Record<string, string> = {
    draft:m.statusDraft, active:m.statusActive, quoted:m.statusQuoted, approved:m.statusApproved,
    engineering:m.statusEngineering, production:m.statusProduction, installed:m.statusInstalled,
    completed:m.statusCompleted, archived:m.statusArchived,
  };
  const typeLabel: Record<string, string> = {
    kitchen:m.furnitureKitchen, wardrobe:m.furnitureWardrobe, built_in:m.furnitureBuiltIn,
    cabinet:m.furnitureCabinet, sideboard:m.furnitureSideboard, mixed:m.furnitureMixed,
  };

  const [projectsResult, subscriptionResult, priceBookResult, quotesResult, clientsResult] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, status, currency, updated_at', { count: 'exact' }).eq('organization_id', organization.id).is('archived_at', null).order('updated_at', { ascending: false }).limit(12),
    supabase.from('quote_subscriptions').select('plan, status').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('active', true),
    supabase.from('client_commercial_quotes').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).is('archived_at', null),
  ]);

  if (projectsResult.error) throw new Error(`Failed to load projects: ${projectsResult.error.message}`);
  if (priceBookResult.error) throw new Error(`Failed to load Price Book: ${priceBookResult.error.message}`);
  if (quotesResult.error) throw new Error(`Failed to load quotes: ${quotesResult.error.message}`);
  if (clientsResult.error) throw new Error(`Failed to load customers: ${clientsResult.error.message}`);

  const rows = projectsResult.data ?? [];
  const subscription = subscriptionResult.data;
  const projectCount = projectsResult.count ?? rows.length;
  const priceCount = priceBookResult.count ?? 0;
  const quoteCount = quotesResult.count ?? 0;
  const clientCount = clientsResult.count ?? 0;

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar">
        <div><span className="eyebrow">MAKSTER QUOTE · WORKSPACE</span><h1>{m.dashboard}</h1></div>
        <Link href="/projects/new" className="primary linkButton">+ {m.newQuote}</Link>
      </header>
      <div className="pageContent">
        {priceCount === 0 ? <div className="notice warning"><strong>{m.priceBookEmptyTitle}</strong> {m.priceBookEmptyText} <Link href="/price-book">{m.fillPriceBook}</Link></div> : null}
        <section className="metricGrid">
          <article className="metricCard"><span>{m.metricProjects}</span><strong>{projectCount}</strong><small><Link href="/projects" className="textLink">{m.allProjects}</Link></small></article>
          <article className="metricCard"><span>{m.metricQuotes}</span><strong>{quoteCount}</strong><small><Link href="/quotes" className="textLink">{m.quotePipeline}</Link></small></article>
          <article className="metricCard"><span>{m.metricCustomers}</span><strong>{clientCount}</strong><small><Link href="/clients" className="textLink">{m.customerBase}</Link></small></article>
          <article className="metricCard"><span>{m.metricPriceBook}</span><strong>{priceCount}</strong><small><Link href="/price-book" className="textLink">{m.activePrices}</Link></small></article>
        </section>
        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">{m.projects.toUpperCase()}</span><h2>{m.recentCalculations}</h2></div><Link href="/projects" className="textLink">{m.allProjects}</Link></div>
          {rows.length === 0 ? (
            <div className="emptyState"><h3>{m.noCalculationsTitle}</h3><p>{m.noCalculationsText}</p><Link href="/projects/new" className="primary linkButton">{m.createFirstQuote}</Link></div>
          ) : (
            <div className="tableWrap"><table><thead><tr><th>{m.project}</th><th>{m.type}</th><th>{m.status}</th><th>{m.currency}</th><th></th></tr></thead><tbody>{rows.map((project) => <tr key={project.id}><td><strong>{project.name}</strong></td><td>{typeLabel[project.project_type] ?? project.project_type}</td><td><span className="pill">{statusLabel[project.status] ?? project.status}</span></td><td>{project.currency}</td><td><Link className="textLink" href={`/projects/${project.id}`}>{m.open}</Link></td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
