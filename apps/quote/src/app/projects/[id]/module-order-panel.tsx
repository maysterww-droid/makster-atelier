import { getInterfaceLocale } from '@/lib/interface-locale';
import { DimensionSourceProjectPanel } from './dimension-source-project-panel';
import { ModuleOrderList } from './module-order-list';

type CabinetOrderRow={id:string;name:string;quantity:number|string;width_mm:number|string;height_mm:number|string;depth_mm:number|string};
type Props={projectId:string;cabinets:CabinetOrderRow[]};

export async function ModuleOrderPanel({projectId,cabinets}:Props){
  if(!cabinets.length)return null;
  const locale=await getInterfaceLocale();
  return <>
    <ModuleOrderList projectId={projectId} cabinets={cabinets} locale={locale}/>
    <DimensionSourceProjectPanel projectId={projectId} locale={locale}/>
  </>;
}
