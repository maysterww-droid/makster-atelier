'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateQuoteCabinetPreview } from '@/lib/cabinet-overrides';
import { costPreviewToJson } from '@/lib/engineering';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { localizePreset } from '@/lib/i18n-library';
import { quoteModulePreset } from '@/lib/module-presets';
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

  const [{ data: project, error: projectError }, { data: lastModule, error: orderError }] = await Promise.all([
    supabase.from('projects').select('id, current_revision_id, currency, settings').eq('id', projectId).eq('organization_id', organization.id).is('archived_at', null).maybeSingle(),
    supabase.from('quote_cabinets').select('sort_order').eq('project_id', projectId).eq('organization_id', organization.id).order('sort_order', { ascending:false }).limit(1).maybeSingle(),
  ]);
  if (projectError || !project) redirect('/library?error=project');
  if (orderError) redirect(`/library?project=${projectId}&error=order`);

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
  };
  const preview = calculateQuoteCabinetPreview(input, [], { targetMarginBps, overheadBps, taxBps });
  const now = new Date().toISOString();
  const sortOrder = Number(lastModule?.sort_order ?? 0) + 100;
  const { error } = await supabase.from('quote_cabinets').insert({
    organization_id:organization.id, project_id:projectId, project_revision_id:project.current_revision_id, module_key:preset.moduleKey, name:localizedPreset.name, sort_order:sortOrder,
    width_mm:preset.widthMm, height_mm:preset.heightMm, depth_mm:preset.depthMm, quantity,
    construction_json:{
      thicknessMm:preset.thicknessMm, gapMm:preset.gapMm, drawers:preset.drawers, doors:preset.doors, shelfCount:preset.shelfCount,
      stretcherDepthMm:preset.stretcherDepthMm, shelfSetbackMm:preset.shelfSetbackMm, applianceOpeningHeightMm:preset.applianceOpeningHeightMm ?? null,
      frontWidthMm:preset.frontWidthMm ?? null, backMode:preset.backMode, backThicknessMm:preset.backThicknessMm, backInsetMm:preset.backInsetMm,
      backGrooveDepthMm:preset.backGrooveDepthMm, frontEdgeIncluded:preset.frontEdgeIncluded, labourHours:0, presetKey:preset.key,
    },
    material_refs_json:{}, hardware_refs_json:{},
    computed_parts_json:{usage:preview.usage,parts:preview.parts,hardware:preview.hardware.map((line)=>({...line,costMinor:line.costMinor.toString()})),operations:preview.operations.map((line)=>({...line,costMinor:line.costMinor.toString()})),notes:preview.notes},
    computed_cost_json:costPreviewToJson(preview), engine_version:'mq-0.1.11-engineering', created_by:userId, created_at:now, updated_at:now,
  });
  if (error) redirect(`/library?project=${projectId}&error=add`);
  revalidatePath(`/projects/${projectId}`); revalidatePath('/dashboard');
  redirect(`/projects/${projectId}?saved=module-added`);
}
