'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateQuoteCabinetPreview } from '@/lib/cabinet-overrides';
import { costPreviewToJson, type PriceBookItem } from '@/lib/engineering';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { localizePreset } from '@/lib/i18n-library';
import { quoteModulePreset } from '@/lib/module-presets';
import { validatedPriceBookDefaults } from '@/lib/price-book-defaults';
import { requireWorkspace } from '@/lib/workspace';

const libraryRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function uuid(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(text) ? text : '';
}
function quantityValue(value: FormDataEntryValue | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(999, Math.round(number)));
}
function safeBps(value: unknown, fallback: number, max = 9_500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(max, Math.round(parsed)));
}

export async function addPresetToProject(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!libraryRoles.has(role)) redirect('/library?error=permission');
  const projectId = uuid(formData.get('projectId'));
  const presetKey = String(formData.get('presetKey') ?? '').trim();
  const quantity = quantityValue(formData.get('quantity'));
  const preset = quoteModulePreset(presetKey);
  if (!projectId) redirect('/library?error=project');
  if (!preset) redirect(`/library?project=${projectId}&error=preset`);

  const [{ data: project, error: projectError }, { data: lastModule, error: orderError }, { data: priceBook, error: priceError }] = await Promise.all([
    supabase.from('projects').select('id, current_revision_id, currency, settings').eq('id', projectId).eq('organization_id', organization.id).is('archived_at', null).maybeSingle(),
    supabase.from('quote_cabinets').select('sort_order').eq('project_id', projectId).eq('organization_id', organization.id).order('sort_order', { ascending:false }).limit(1).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category, name, unit, currency, purchase_price_minor, parameters_json').eq('organization_id', organization.id).eq('active', true),
  ]);
  if (projectError || !project) redirect('/library?error=project');
  if (orderError) redirect(`/library?project=${projectId}&error=order`);
  if (priceError) redirect(`/library?project=${projectId}&error=pricebook`);

  const projectPriceBook = (priceBook ?? []).filter((item) => item.currency === project.currency) as PriceBookItem[];
  const defaults = validatedPriceBookDefaults(organization.settings, projectPriceBook);
  const quoteSettings = organization.settings?.quote && typeof organization.settings.quote === 'object' && !Array.isArray(organization.settings.quote) ? organization.settings.quote as Record<string, unknown> : {};
  const targetMarginBps = safeBps(quoteSettings.targetMarginBps, 3500);
  const overheadBps = safeBps(quoteSettings.overheadBps, 0);
  const projectSettings = project.settings && typeof project.settings === 'object' && !Array.isArray(project.settings) ? project.settings as Record<string, unknown> : {};
  const taxBps = safeBps(projectSettings.taxBps, 0, 100_000);
  const locale = await getInterfaceLocale();
  const localizedPreset = localizePreset(locale, preset);

  const input = {
    moduleKey:preset.moduleKey, widthMm:preset.widthMm, heightMm:preset.heightMm, depthMm:preset.depthMm, thicknessMm:preset.thicknessMm, gapMm:preset.gapMm,
    drawers:preset.drawers, doors:preset.doors, shelfCount:preset.shelfCount, stretcherDepthMm:preset.stretcherDepthMm, shelfSetbackMm:preset.shelfSetbackMm,
    applianceOpeningHeightMm:preset.applianceOpeningHeightMm, frontWidthMm:preset.frontWidthMm,
    backMode:preset.backMode, backThicknessMm:preset.backThicknessMm, backInsetMm:preset.backInsetMm, backGrooveDepthMm:preset.backGrooveDepthMm,
    frontEdgeIncluded:preset.frontEdgeIncluded, labourHours:0,
    boardItemId:defaults.boardItemId, frontItemId:defaults.frontItemId, backItemId:defaults.backItemId, edgeItemId:defaults.edgeItemId,
    hingeItemId:defaults.hingeItemId, drawerItemId:defaults.drawerItemId, labourItemId:defaults.labourItemId,
  };
  const preview = calculateQuoteCabinetPreview(input, projectPriceBook, { targetMarginBps, overheadBps, taxBps });
  const now = new Date().toISOString();
  const sortOrder = Number(lastModule?.sort_order ?? 0) + 100;
  const { error } = await supabase.from('quote_cabinets').insert({
    organization_id:organization.id, project_id:projectId, project_revision_id:project.current_revision_id, module_key:preset.moduleKey, name:localizedPreset.name, sort_order:sortOrder,
    width_mm:preset.widthMm, height_mm:preset.heightMm, depth_mm:preset.depthMm, quantity,
    dimension_source:'standard', measurement_reference:null,
    construction_json:{
      thicknessMm:preset.thicknessMm, gapMm:preset.gapMm, drawers:preset.drawers, doors:preset.doors, shelfCount:preset.shelfCount,
      stretcherDepthMm:preset.stretcherDepthMm, shelfSetbackMm:preset.shelfSetbackMm, applianceOpeningHeightMm:preset.applianceOpeningHeightMm ?? null,
      frontWidthMm:preset.frontWidthMm ?? null, backMode:preset.backMode, backThicknessMm:preset.backThicknessMm, backInsetMm:preset.backInsetMm,
      backGrooveDepthMm:preset.backGrooveDepthMm, frontEdgeIncluded:preset.frontEdgeIncluded, labourHours:0, presetKey:preset.key,
    },
    material_refs_json:{boardItemId:defaults.boardItemId??null,frontItemId:defaults.frontItemId??null,backItemId:defaults.backItemId??null,edgeItemId:defaults.edgeItemId??null,labourItemId:defaults.labourItemId??null},
    hardware_refs_json:{hingeItemId:defaults.hingeItemId??null,drawerItemId:defaults.drawerItemId??null},
    computed_parts_json:{usage:preview.usage,parts:preview.parts,hardware:preview.hardware.map((line)=>({...line,costMinor:line.costMinor.toString()})),operations:preview.operations.map((line)=>({...line,costMinor:line.costMinor.toString()})),notes:preview.notes},
    computed_cost_json:costPreviewToJson(preview), engine_version:'mq-0.1.11-engineering', created_by:userId, created_at:now, updated_at:now,
  });
  if (error) redirect(`/library?project=${projectId}&error=add`);
  const {data:pref}=await supabase.from('quote_library_prefs').select('is_favorite,use_count').eq('organization_id',organization.id).eq('user_id',userId).eq('preset_key',presetKey).maybeSingle();
  await supabase.from('quote_library_prefs').upsert({organization_id:organization.id,user_id:userId,preset_key:presetKey,is_favorite:Boolean(pref?.is_favorite),use_count:Number(pref?.use_count??0)+1,last_used_at:now,updated_at:now},{onConflict:'organization_id,user_id,preset_key'});
  revalidatePath('/library'); revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard');
  redirect(`/projects/${projectId}?saved=module-added`);
}

export async function togglePresetFavorite(formData:FormData){
  const {supabase,organization,userId}=await requireWorkspace();
  const presetKey=String(formData.get('presetKey')??'').trim();
  if(!quoteModulePreset(presetKey))redirect('/library?error=preset');
  const {data:pref}=await supabase.from('quote_library_prefs').select('is_favorite,use_count,last_used_at').eq('organization_id',organization.id).eq('user_id',userId).eq('preset_key',presetKey).maybeSingle();
  const {error}=await supabase.from('quote_library_prefs').upsert({organization_id:organization.id,user_id:userId,preset_key:presetKey,is_favorite:!Boolean(pref?.is_favorite),use_count:Number(pref?.use_count??0),last_used_at:pref?.last_used_at??null,updated_at:new Date().toISOString()},{onConflict:'organization_id,user_id,preset_key'});
  if(error)redirect('/library?error=favorite');revalidatePath('/library');redirect('/library');
}

export async function addTemplateToProject(formData:FormData){
  const {supabase,organization,userId,role}=await requireWorkspace();
  const projectId=uuid(formData.get('projectId'));const templateId=uuid(formData.get('templateId'));const quantity=quantityValue(formData.get('quantity'));
  if(!projectId||!templateId||!libraryRoles.has(role))redirect('/library?error=permission');
  const [{data:project},{data:template},{data:lastModule}]=await Promise.all([
    supabase.from('projects').select('id,current_revision_id').eq('id',projectId).eq('organization_id',organization.id).is('archived_at',null).maybeSingle(),
    supabase.from('quote_module_templates').select('*').eq('id',templateId).eq('organization_id',organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('sort_order').eq('project_id',projectId).eq('organization_id',organization.id).order('sort_order',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(!project||!template)redirect('/library?error=template');const now=new Date().toISOString();
  const {error}=await supabase.from('quote_cabinets').insert({organization_id:organization.id,project_id:projectId,project_revision_id:project.current_revision_id,module_key:template.module_key,name:template.name,sort_order:Number(lastModule?.sort_order??0)+100,width_mm:template.width_mm,height_mm:template.height_mm,depth_mm:template.depth_mm,quantity,dimension_source:'standard',measurement_reference:null,construction_json:template.construction_json??{},material_refs_json:template.material_refs_json??{},hardware_refs_json:template.hardware_refs_json??{},computed_parts_json:{notes:['Recalculate workshop standard for this project.']},computed_cost_json:{complete:false,warnings:['Recalculate workshop standard for this project.']},engine_version:'mq-0.2-template',created_by:userId,created_at:now,updated_at:now});
  if(error)redirect(`/library?project=${projectId}&error=template-add`);
  await supabase.from('quote_module_templates').update({use_count:Number(template.use_count??0)+1,last_used_at:now,updated_at:now}).eq('id',templateId).eq('organization_id',organization.id);
  revalidatePath('/library');revalidatePath(`/projects/${projectId}`);redirect(`/projects/${projectId}?saved=module-added`);
}

export async function toggleTemplateFavorite(formData:FormData){
  const {supabase,organization,role}=await requireWorkspace();const templateId=uuid(formData.get('templateId'));if(!templateId||!libraryRoles.has(role))redirect('/library?error=permission');
  const {data}=await supabase.from('quote_module_templates').select('is_favorite').eq('id',templateId).eq('organization_id',organization.id).maybeSingle();if(!data)redirect('/library?error=template');
  const {error}=await supabase.from('quote_module_templates').update({is_favorite:!Boolean(data.is_favorite),updated_at:new Date().toISOString()}).eq('id',templateId).eq('organization_id',organization.id);if(error)redirect('/library?error=template');
  revalidatePath('/library');redirect('/library');
}

export async function deleteTemplate(formData:FormData){
  const {supabase,organization,role}=await requireWorkspace();const templateId=uuid(formData.get('templateId'));if(!templateId||!libraryRoles.has(role))redirect('/library?error=permission');
  const {error}=await supabase.from('quote_module_templates').delete().eq('id',templateId).eq('organization_id',organization.id);if(error)redirect('/library?error=template-delete');
  revalidatePath('/library');redirect('/library');
}
