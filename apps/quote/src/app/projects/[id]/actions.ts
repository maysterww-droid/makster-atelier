'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateQuoteCabinetPreview } from '@/lib/cabinet-overrides';
import { costPreviewToJson, type BackMode, type ModuleKey, type PriceBookItem } from '@/lib/engineering';
import type { SpecialHardwareRole } from '@/lib/special-hardware-presets';
import { requireWorkspace } from '@/lib/workspace';

const cabinetRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);
const moduleKeys = new Set<ModuleKey>(['b-door','b-drawer','b-oven','w-door','t-door','t-oven','t-fridge','dishwasher','open','generic']);

function numberField(formData:FormData,name:string,fallback:number){const value=Number(formData.get(name));return Number.isFinite(value)?value:fallback;}
function idField(formData:FormData,name:string){const value=String(formData.get(name)??'').trim();return /^[0-9a-fA-F-]{36}$/.test(value)?value:'';}
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function safeBps(value:unknown,fallback:number,max=9_500){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,Math.min(max,Math.round(parsed))):fallback;}
function defaultShelfCount(moduleKey:ModuleKey){if(moduleKey==='b-door')return 1;if(moduleKey==='w-door'||moduleKey==='open')return 2;if(moduleKey==='t-door')return 4;if(moduleKey==='t-oven')return 2;if(moduleKey==='t-fridge')return 1;return 0;}
function defaultModuleName(moduleKey:ModuleKey){const names:Record<ModuleKey,string>={'b-door':'Нижний шкаф с дверью','b-drawer':'Нижний шкаф с ящиками','b-oven':'Нижний модуль под духовку','w-door':'Верхний шкаф с дверью','t-door':'Высокий пенал','t-oven':'Пенал под духовку','t-fridge':'Пенал под холодильник',dishwasher:'ПММ · мебельный фасад',open:'Открытый модуль',generic:'Универсальный корпус'};return names[moduleKey];}
function specialRole(value:unknown):SpecialHardwareRole|undefined{const role=String(value??'');return role==='cargo'||role==='lift'||role==='corner'?role:undefined;}

export async function saveCabinet(formData:FormData){
  const {supabase,organization,userId,role}=await requireWorkspace();
  const projectId=idField(formData,'projectId'); const cabinetId=idField(formData,'cabinetId')||null;
  if(!projectId)redirect('/projects?error=project'); if(!cabinetRoles.has(role))redirect(`/projects/${projectId}?error=permission`);
  const moduleKeyRaw=String(formData.get('moduleKey')??'b-door') as ModuleKey; const moduleKey=moduleKeys.has(moduleKeyRaw)?moduleKeyRaw:'generic';
  const backModeRaw=String(formData.get('backMode')??'groove'); const backMode=(['none','overlay','groove'].includes(backModeRaw)?backModeRaw:'groove') as BackMode;
  const quantity=Math.max(1,Math.min(999,Math.round(numberField(formData,'quantity',1))));

  const [{data:project,error:projectError},{data:priceBook,error:priceError},{data:existing,error:existingError}]=await Promise.all([
    supabase.from('projects').select('id, current_revision_id, currency, settings').eq('id',projectId).eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category, name, unit, currency, purchase_price_minor, parameters_json').eq('organization_id',organization.id).eq('active',true),
    cabinetId ? supabase.from('quote_cabinets').select('construction_json, hardware_refs_json').eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id).maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  if(projectError||!project)redirect('/dashboard?error=project'); if(priceError)redirect(`/projects/${projectId}?error=pricebook`); if(existingError)redirect(`/projects/${projectId}?error=module-source`);
  const projectPriceBook=(priceBook??[]).filter((item)=>item.currency===project.currency) as PriceBookItem[];
  const existingConstruction=record(existing?.construction_json); const existingHardware=record(existing?.hardware_refs_json);
  const explicitFrontWidth=formData.has('frontWidthMm')?numberField(formData,'frontWidthMm',0):Number(existingConstruction.frontWidthMm??0);
  const preservedSpecialRole=specialRole(existingConstruction.specialHardwareRole);
  const preservedSpecialQty=preservedSpecialRole?Math.max(1,Math.round(Number(existingConstruction.specialHardwareQty??1)||1)):undefined;
  const storedSpecialItemId=String(existingHardware.specialHardwareItemId??'')||undefined;
  const submittedSpecialItemId=idField(formData,'specialHardwareItemId')||undefined;
  const preservedSpecialItemId=preservedSpecialRole?(formData.has('specialHardwareItemId')?submittedSpecialItemId:storedSpecialItemId):undefined;

  const input={
    moduleKey,widthMm:numberField(formData,'widthMm',800),heightMm:numberField(formData,'heightMm',720),depthMm:numberField(formData,'depthMm',560),thicknessMm:numberField(formData,'thicknessMm',18),gapMm:numberField(formData,'gapMm',2),
    drawers:numberField(formData,'drawers',2),doors:numberField(formData,'doors',moduleKey==='t-fridge'||moduleKey==='t-oven'?2:1),shelfCount:numberField(formData,'shelfCount',defaultShelfCount(moduleKey)),stretcherDepthMm:numberField(formData,'stretcherDepthMm',100),shelfSetbackMm:numberField(formData,'shelfSetbackMm',20),applianceOpeningHeightMm:numberField(formData,'applianceOpeningHeightMm',600),frontWidthMm:explicitFrontWidth>0?explicitFrontWidth:undefined,
    backMode,backThicknessMm:numberField(formData,'backThicknessMm',4),backInsetMm:numberField(formData,'backInsetMm',10),backGrooveDepthMm:numberField(formData,'backGrooveDepthMm',8),frontEdgeIncluded:String(formData.get('frontEdgeMode')??'included')!=='same-edge',
    boardItemId:String(formData.get('boardItemId')??'')||undefined,frontItemId:String(formData.get('frontItemId')??'')||undefined,backItemId:String(formData.get('backItemId')??'')||undefined,edgeItemId:String(formData.get('edgeItemId')??'')||undefined,hingeItemId:String(formData.get('hingeItemId')??'')||undefined,drawerItemId:String(formData.get('drawerItemId')??'')||undefined,labourItemId:String(formData.get('labourItemId')??'')||undefined,labourHours:numberField(formData,'labourHours',0),
    specialHardwareRole:preservedSpecialRole,specialHardwareQty:preservedSpecialQty,specialHardwareItemId:preservedSpecialItemId,
  };
  if(input.widthMm<=0||input.heightMm<=0||input.depthMm<=0||input.thicknessMm<=0)redirect(`/projects/${projectId}?error=dimensions`);
  const quoteSettings=(organization.settings?.quote??{}) as Record<string,unknown>; const targetMarginBps=safeBps(quoteSettings.targetMarginBps,3500); const overheadBps=safeBps(quoteSettings.overheadBps,0); const taxBps=safeBps((project.settings as Record<string,unknown>|null)?.taxBps,0,100_000);
  const preview=calculateQuoteCabinetPreview(input,projectPriceBook,{targetMarginBps,overheadBps,taxBps});
  const name=String(formData.get('name')??'').trim()||defaultModuleName(moduleKey);

  let nextSortOrder=0;
  if(!cabinetId){const {data:lastRow,error:orderError}=await supabase.from('quote_cabinets').select('sort_order').eq('project_id',projectId).eq('organization_id',organization.id).order('sort_order',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle();if(orderError)redirect(`/projects/${projectId}?error=module-order`);nextSortOrder=Number(lastRow?.sort_order??-10)+10;}

  const payload={organization_id:organization.id,project_id:projectId,project_revision_id:project.current_revision_id,module_key:moduleKey,name,width_mm:input.widthMm,height_mm:input.heightMm,depth_mm:input.depthMm,quantity,...(!cabinetId?{sort_order:nextSortOrder}:{}),
    construction_json:{thicknessMm:input.thicknessMm,gapMm:input.gapMm,drawers:input.drawers,doors:input.doors,shelfCount:input.shelfCount,stretcherDepthMm:input.stretcherDepthMm,shelfSetbackMm:input.shelfSetbackMm,applianceOpeningHeightMm:input.applianceOpeningHeightMm,frontWidthMm:input.frontWidthMm??null,backMode:input.backMode,backThicknessMm:input.backThicknessMm,backInsetMm:input.backInsetMm,backGrooveDepthMm:input.backGrooveDepthMm,frontEdgeIncluded:input.frontEdgeIncluded,labourHours:input.labourHours,presetKey:existingConstruction.presetKey??null,specialHardwareRole:input.specialHardwareRole??null,specialHardwareQty:input.specialHardwareQty??0},
    material_refs_json:{boardItemId:input.boardItemId??null,frontItemId:input.frontItemId??null,backItemId:input.backItemId??null,edgeItemId:input.edgeItemId??null,labourItemId:input.labourItemId??null},hardware_refs_json:{hingeItemId:input.hingeItemId??null,drawerItemId:input.drawerItemId??null,specialHardwareItemId:input.specialHardwareItemId??null},
    computed_parts_json:{usage:preview.usage,parts:preview.parts,hardware:preview.hardware.map((line)=>({...line,costMinor:line.costMinor.toString()})),operations:preview.operations.map((line)=>({...line,costMinor:line.costMinor.toString()})),notes:preview.notes},computed_cost_json:costPreviewToJson(preview),engine_version:input.specialHardwareRole?'mq-0.2-special-hardware':'mq-0.1.11-engineering',created_by:userId,updated_at:new Date().toISOString()};
  const result=cabinetId?await supabase.from('quote_cabinets').update(payload).eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id):await supabase.from('quote_cabinets').insert(payload);
  if(result.error)redirect(`/projects/${projectId}?error=save`); revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard'); redirect(`/projects/${projectId}?saved=module-saved`);
}

export async function duplicateCabinet(formData:FormData){
  const {supabase,organization,userId,role}=await requireWorkspace(); const projectId=idField(formData,'projectId'); const cabinetId=idField(formData,'cabinetId');
  if(!projectId||!cabinetId)redirect('/projects?error=module'); if(!cabinetRoles.has(role))redirect(`/projects/${projectId}?error=permission`);
  const {data:source,error}=await supabase.from('quote_cabinets').select('project_revision_id, module_key, name, sort_order, width_mm, height_mm, depth_mm, quantity, construction_json, material_refs_json, hardware_refs_json, computed_parts_json, computed_cost_json, engine_version').eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id).maybeSingle();
  if(error||!source)redirect(`/projects/${projectId}?error=module-source`);
  const {error:insertError}=await supabase.from('quote_cabinets').insert({organization_id:organization.id,project_id:projectId,project_revision_id:source.project_revision_id,module_key:source.module_key,name:`${source.name} — копия`.slice(0,200),sort_order:Number(source.sort_order??0)+1,width_mm:source.width_mm,height_mm:source.height_mm,depth_mm:source.depth_mm,quantity:source.quantity,construction_json:source.construction_json,material_refs_json:source.material_refs_json,hardware_refs_json:source.hardware_refs_json,computed_parts_json:source.computed_parts_json,computed_cost_json:source.computed_cost_json,engine_version:source.engine_version,created_by:userId,updated_at:new Date().toISOString()});
  if(insertError)redirect(`/projects/${projectId}?error=module-duplicate`); revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard'); redirect(`/projects/${projectId}?saved=module-duplicated`);
}

export async function moveCabinet(formData:FormData){
  const {supabase,organization,role}=await requireWorkspace(); const projectId=idField(formData,'projectId'); const cabinetId=idField(formData,'cabinetId'); const direction=String(formData.get('direction')??'');
  if(!projectId||!cabinetId)redirect('/projects?error=module'); if(!cabinetRoles.has(role))redirect(`/projects/${projectId}?error=permission`); if(direction!=='up'&&direction!=='down')redirect(`/projects/${projectId}?error=module-order`);
  const {data:rows,error}=await supabase.from('quote_cabinets').select('id').eq('project_id',projectId).eq('organization_id',organization.id).order('sort_order').order('created_at'); if(error||!rows)redirect(`/projects/${projectId}?error=module-order`);
  const currentIndex=rows.findIndex((row)=>row.id===cabinetId); if(currentIndex<0)redirect(`/projects/${projectId}?error=module-order`); const targetIndex=direction==='up'?currentIndex-1:currentIndex+1; if(targetIndex<0||targetIndex>=rows.length)redirect(`/projects/${projectId}?saved=module-order-unchanged`);
  const ordered=[...rows]; [ordered[currentIndex],ordered[targetIndex]]=[ordered[targetIndex],ordered[currentIndex]]; const now=new Date().toISOString();
  const results=await Promise.all(ordered.map((row,index)=>supabase.from('quote_cabinets').update({sort_order:index*10,updated_at:now}).eq('id',row.id).eq('project_id',projectId).eq('organization_id',organization.id))); if(results.some((result)=>result.error))redirect(`/projects/${projectId}?error=module-order`);
  revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard'); redirect(`/projects/${projectId}?saved=module-moved`);
}

export async function deleteCabinet(formData:FormData){
  const {supabase,organization,role}=await requireWorkspace(); const projectId=idField(formData,'projectId'); const cabinetId=idField(formData,'cabinetId'); if(!projectId||!cabinetId)redirect('/projects?error=module'); if(!cabinetRoles.has(role))redirect(`/projects/${projectId}?error=permission`);
  const {error}=await supabase.from('quote_cabinets').delete().eq('id',cabinetId).eq('project_id',projectId).eq('organization_id',organization.id); if(error)redirect(`/projects/${projectId}?error=module-delete`); revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard'); redirect(`/projects/${projectId}?saved=module-deleted`);
}
