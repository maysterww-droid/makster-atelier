import type { Locale } from '@/lib/i18n';
import { requireWorkspace } from '@/lib/workspace';
import { DimensionSourcePanel } from './dimension-source-panel';

type Props={projectId:string;locale:Locale};

export async function DimensionSourceProjectPanel({projectId,locale}:Props){
  const {supabase,organization}=await requireWorkspace();
  const {data}=await supabase.from('quote_cabinets').select('id,name,width_mm,height_mm,depth_mm,dimension_source,measurement_reference').eq('project_id',projectId).eq('organization_id',organization.id).order('sort_order').order('created_at');
  return <DimensionSourcePanel projectId={projectId} cabinets={data??[]} locale={locale}/>;
}
