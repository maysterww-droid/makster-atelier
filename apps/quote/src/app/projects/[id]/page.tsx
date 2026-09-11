import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';
import type { PriceBookItem } from '@/lib/engineering';
import CabinetEditor from './cabinet-editor';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params; const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: project, error: projectError }, { data: cabinets, error: cabinetsError }, { data: priceBook, error: priceError }, { data: subscription }] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, status, currency, settings, current_revision_id').eq('id', id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, module_key, name, width_mm, height_mm, depth_mm, construction_json, material_refs_json, hardware_refs_json, computed_cost_json').eq('project_id', id).eq('organization_id', organization.id).order('sort_order').order('created_at'),
    supabase.from('quote_price_book_items').select('id, category, name, unit, currency, purchase_price_minor, parameters_json').eq('organization_id', organization.id).eq('active', true).order('name'),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (projectError || !project) notFound();
  if (cabinetsError) throw new Error(`Не удалось загрузить шкафы: ${cabinetsError.message}`);
  if (priceError) throw new Error(`Не удалось загрузить прайс-лист: ${priceError.message}`);

  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const taxBps = Number((project.settings as Record<string, unknown> | null)?.taxBps ?? 0);

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}><header className="topbar"><div><span className="eyebrow">{project.project_type.toUpperCase()} · {project.status.toUpperCase()}</span><h1>{project.name}</h1></div><div className="topActions"><Link href="/" className="textLink">← Проекты</Link><Link href="/price-book" className="secondary linkButton">Прайс-лист</Link></div></header>{query.error ? <div className="pageContent compact"><div className="notice error">Не удалось сохранить изменения. Проверьте данные и попробуйте снова.</div></div> : null}{!priceBook?.length ? <div className="pageContent compact"><div className="notice warning">Прайс-лист пуст. <Link href="/price-book">Добавьте реальные цены</Link>, иначе стоимость останется нулевой.</div></div> : null}<CabinetEditor projectId={project.id} currency={project.currency} cabinets={(cabinets ?? []) as never[]} priceBook={(priceBook ?? []) as PriceBookItem[]} targetMarginBps={targetMarginBps} overheadBps={overheadBps} taxBps={taxBps}/></AppShell>;
}
