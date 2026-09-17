import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace';
import { VisualWorkspace } from '../visual-workspace';

export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};

function money(value:unknown,currency:string){const n=Number(value);if(!Number.isFinite(n))return'—';try{return new Intl.NumberFormat('ru-RU',{style:'currency',currency,maximumFractionDigits:0}).format(n);}catch{return`${currency} ${Math.round(n)}`;}}

export default async function PlannerDesignPage({params}:Props){
  const {id}=await params;
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale();
  const admin=createAdminClient();
  const [{data:project,error:projectError},{data:cabinets,error:cabinetError},{data:subscription},{data:entitlement},{data:plannerImport}]=await Promise.all([
    supabase.from('projects').select('id,name,currency,status').eq('id',id).eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id,module_key,name,width_mm,height_mm,depth_mm,quantity,construction_json,material_refs_json,hardware_refs_json,computed_cost_json').eq('project_id',id).eq('organization_id',organization.id).order('sort_order').order('created_at'),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle(),
    admin.from('makster_product_entitlements').select('status,features').eq('organization_id',organization.id).eq('product','DREAM_PLANNER').maybeSingle(),
    admin.from('quote_planner_imports').select('id,intake_stage,status,source_project_id,planner_snapshot,pricing_snapshot,visualization_snapshot,created_at').eq('organization_id',organization.id).eq('project_id',id).maybeSingle(),
  ]);
  if(projectError||!project||cabinetError)notFound();
  const plannerActive=Boolean(entitlement&&['active','trialing'].includes(String(entitlement.status)));
  if(!plannerActive||!plannerImport)notFound();
  const pricing=(plannerImport.pricing_snapshot??{}) as Record<string,unknown>;
  const total=(pricing.totalGross??pricing.total_gross??null) as unknown;
  const title=locale==='ru'?'Dream Planner · 3D-проект':locale==='cs'?'Dream Planner · 3D projekt':locale==='de'?'Dream Planner · 3D-Projekt':locale==='pl'?'Dream Planner · projekt 3D':'Dream Planner · 3D project';
  const subtitle=locale==='ru'?'Кухня пришла из Planner целиком. Геометрия, материалы, техника и визуальная сцена сохранены вместе с коммерческим проектом.':locale==='cs'?'Kuchyně byla převzata z Planneru jako celek včetně geometrie, materiálů a vizualizace.':'This kitchen arrived from Dream Planner as a complete design with geometry, materials and visualization.';
  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PLANNER IMPORT · {String(plannerImport.intake_stage).replaceAll('_',' ')}</span><h1>{project.name}</h1></div><div className="topActions"><Link href={`/projects/${id}`} className="textLink">← Project</Link></div></header>
    <section className="pageContent compact"><div className="notice success"><strong>{title}</strong><br/>{subtitle}<br/><small>Source project: {plannerImport.source_project_id} · imported {new Date(plannerImport.created_at).toLocaleString()} · preliminary {money(total,project.currency)}</small></div></section>
    <VisualWorkspace projectId={project.id} currency={project.currency} locale={locale} cabinets={(cabinets??[]) as never[]}/>
    <section className="pageContent compact"><div className="notice warning">Planner 3D is a commercial review view. READY library geometry is preserved; modules marked REVIEW must be verified before a final quote or manufacturing release.</div></section>
  </AppShell>;
}
