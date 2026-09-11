import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';
import type { PriceBookItem } from '@/lib/engineering';
import CabinetEditor from './cabinet-editor';
import { ProjectCommercial } from './project-commercial';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> };

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [projectResult, cabinetsResult, priceResult, subscriptionResult, clientsResult, quotesResult] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, status, currency, client_id, settings, current_revision_id').eq('id', id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, module_key, name, width_mm, height_mm, depth_mm, construction_json, material_refs_json, hardware_refs_json, computed_cost_json').eq('project_id', id).eq('organization_id', organization.id).order('sort_order').order('created_at'),
    supabase.from('quote_price_book_items').select('id, category, name, unit, currency, purchase_price_minor, parameters_json').eq('organization_id', organization.id).eq('active', true).order('name'),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('clients').select('id, display_name, email, phone').eq('organization_id', organization.id).is('archived_at', null).order('display_name'),
    supabase.from('client_commercial_quotes').select('id, quote_version, issued_at, valid_until, total_amount_minor, client_name').eq('project_id', id).eq('organization_id', organization.id).order('quote_version', { ascending:false }),
  ]);

  const project = projectResult.data;
  const cabinets = cabinetsResult.data;
  const priceBook = priceResult.data;
  const subscription = subscriptionResult.data;
  if (projectResult.error || !project) notFound();
  if (cabinetsResult.error) throw new Error(`Не удалось загрузить шкафы: ${cabinetsResult.error.message}`);
  if (priceResult.error) throw new Error(`Не удалось загрузить прайс-лист: ${priceResult.error.message}`);
  if (clientsResult.error) throw new Error(`Не удалось загрузить клиентов: ${clientsResult.error.message}`);
  if (quotesResult.error) throw new Error(`Не удалось загрузить историю предложений: ${quotesResult.error.message}`);

  const quoteHistory = quotesResult.data ?? [];
  let statusEvents: { quote_id:string; status:string; created_at:string; note:string | null }[] = [];
  if (quoteHistory.length) {
    const { data, error } = await supabase.from('client_quote_status_events').select('quote_id, status, created_at, note').eq('organization_id', organization.id).in('quote_id', quoteHistory.map((quote) => quote.id)).order('created_at', { ascending:false });
    if (error) throw new Error(`Не удалось загрузить статусы предложений: ${error.message}`);
    statusEvents = data ?? [];
  }

  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const taxBps = Number((project.settings as Record<string, unknown> | null)?.taxBps ?? 0);

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">{project.project_type.toUpperCase()} · {project.status.toUpperCase()}</span><h1>{project.name}</h1></div><div className="topActions"><Link href="/" className="textLink">← Проекты</Link><Link href="/price-book" className="secondary linkButton">Прайс-лист</Link><Link href={`/projects/${project.id}/quote`} className="secondary linkButton" target="_blank">Живой просмотр</Link></div></header>
    {query.error ? <div className="pageContent compact"><div className="notice error">Не удалось выполнить действие ({query.error}). Проверьте данные и попробуйте снова.</div></div> : null}
    {query.saved === 'commercial' ? <div className="pageContent compact"><div className="notice success">Итог проекта и параметры предложения сохранены.</div></div> : null}
    {!priceBook?.length ? <div className="pageContent compact"><div className="notice warning">Прайс-лист пуст. <Link href="/price-book">Добавьте реальные цены</Link>, иначе стоимость останется нулевой.</div></div> : null}
    <ProjectCommercial projectId={project.id} clientId={project.client_id} settings={project.settings as Record<string, unknown>} clients={clientsResult.data ?? []} priceBook={(priceBook ?? []) as never[]} cabinets={(cabinets ?? []) as never[]} currency={project.currency} targetMarginBps={targetMarginBps} overheadBps={overheadBps} role={role} quoteHistory={quoteHistory} statusEvents={statusEvents}/>
    <CabinetEditor projectId={project.id} currency={project.currency} cabinets={(cabinets ?? []) as never[]} priceBook={(priceBook ?? []) as PriceBookItem[]} targetMarginBps={targetMarginBps} overheadBps={overheadBps} taxBps={taxBps}/>
  </AppShell>;
}
