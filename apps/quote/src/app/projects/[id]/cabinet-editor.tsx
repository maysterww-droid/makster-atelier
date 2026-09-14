import type { PriceBookItem } from '@/lib/engineering';
import { getInterfaceLocale } from '@/lib/interface-locale';
import CabinetEditorClient from './cabinet-editor-client';

type CabinetRow={id:string;module_key:string;name:string;width_mm:number|string;height_mm:number|string;depth_mm:number|string;quantity:number|string;construction_json:Record<string,unknown>;material_refs_json:Record<string,unknown>;hardware_refs_json:Record<string,unknown>;computed_cost_json:Record<string,unknown>};
type Props={projectId:string;currency:string;cabinets:CabinetRow[];priceBook:PriceBookItem[];targetMarginBps:number;overheadBps:number;taxBps:number};

export default async function CabinetEditor(props:Props){
  const locale=await getInterfaceLocale();
  return <section id="materials"><CabinetEditorClient {...props} locale={locale}/></section>;
}
