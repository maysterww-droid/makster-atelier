'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateCabinetPreview, costPreviewToJson } from '@/lib/engineering';
import { quoteModulePreset } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';

const libraryRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function uuid(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(text) ? text : '';
}

export async function addPresetToProject(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!libraryRoles.has(role)) redirect('/library?error=permission');

  const projectId = uuid(formData.get('projectId'));
  const presetKey = String(formData.get('presetKey') ?? '').trim();
  const preset = quoteModulePreset(presetKey);
  if (!projectId) redirect('/library?error=project');
  if (!preset) redirect(`/library?project=${projectId}&error=preset`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, current_revision_id, settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .is('archived_at', null)
    .maybeSingle();
  if (projectError || !project) redirect('/library?error=project');

  const quoteSettings = organization.settings?.quote && typeof organization.settings.quote === 'object' && !Array.isArray(organization.settings.quote)
    ? organization.settings.quote as Record<string, unknown>
    : {};
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const projectSettings = project.settings && typeof project.settings === 'object' && !Array.isArray(project.settings)
    ? project.settings as Record<string, unknown>
    : {};
  const taxBps = Number(projectSettings.taxBps ?? 0);

  const input = {
    moduleKey: preset.moduleKey,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    depthMm: preset.depthMm,
    thicknessMm: preset.thicknessMm,
    gapMm: preset.gapMm,
    drawers: preset.drawers,
    doors: preset.doors,
    shelfCount: preset.shelfCount,
    stretcherDepthMm: preset.stretcherDepthMm,
    shelfSetbackMm: preset.shelfSetbackMm,
    backMode: preset.backMode,
    backThicknessMm: preset.backThicknessMm,
    backInsetMm: preset.backInsetMm,
    backGrooveDepthMm: preset.backGrooveDepthMm,
    frontEdgeIncluded: preset.frontEdgeIncluded,
    labourHours: 0,
  };

  const preview = calculateCabinetPreview(input, [], { targetMarginBps, overheadBps, taxBps });
  const now = new Date().toISOString();
  const { error } = await supabase.from('quote_cabinets').insert({
    organization_id: organization.id,
    project_id: projectId,
    project_revision_id: project.current_revision_id,
    module_key: preset.moduleKey,
    name: preset.name,
    width_mm: preset.widthMm,
    height_mm: preset.heightMm,
    depth_mm: preset.depthMm,
    quantity: 1,
    construction_json: {
      thicknessMm: preset.thicknessMm,
      gapMm: preset.gapMm,
      drawers: preset.drawers,
      doors: preset.doors,
      shelfCount: preset.shelfCount,
      stretcherDepthMm: preset.stretcherDepthMm,
      shelfSetbackMm: preset.shelfSetbackMm,
      backMode: preset.backMode,
      backThicknessMm: preset.backThicknessMm,
      backInsetMm: preset.backInsetMm,
      backGrooveDepthMm: preset.backGrooveDepthMm,
      frontEdgeIncluded: preset.frontEdgeIncluded,
      labourHours: 0,
      presetKey: preset.key,
    },
    material_refs_json: {},
    hardware_refs_json: {},
    computed_parts_json: {
      usage: preview.usage,
      parts: preview.parts,
      hardware: preview.hardware.map((line) => ({ ...line, costMinor: line.costMinor.toString() })),
      operations: preview.operations.map((line) => ({ ...line, costMinor: line.costMinor.toString() })),
      notes: preview.notes,
    },
    computed_cost_json: costPreviewToJson(preview),
    engine_version: 'mq-0.1.2-engineering',
    created_by: userId,
    created_at: now,
    updated_at: now,
  });
  if (error) redirect(`/library?project=${projectId}&error=add`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/');
  redirect(`/projects/${projectId}?saved=module-added`);
}
