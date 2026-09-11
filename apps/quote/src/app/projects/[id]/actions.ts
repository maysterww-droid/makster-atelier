'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  calculateCabinetPreview,
  costPreviewToJson,
  type BackMode,
  type ModuleKey,
  type PriceBookItem,
} from '@/lib/engineering';
import { requireWorkspace } from '@/lib/workspace';

function numberField(formData: FormData, name: string, fallback: number) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) ? value : fallback;
}

export async function saveCabinet(formData: FormData) {
  const { supabase, organization, userId } = await requireWorkspace();
  const projectId = String(formData.get('projectId') ?? '');
  const cabinetId = String(formData.get('cabinetId') ?? '') || null;
  const moduleKeyRaw = String(formData.get('moduleKey') ?? 'b-door');
  const moduleKey = (['b-door', 'b-drawer', 'generic'].includes(moduleKeyRaw) ? moduleKeyRaw : 'generic') as ModuleKey;
  const backModeRaw = String(formData.get('backMode') ?? 'groove');
  const backMode = (['none', 'overlay', 'groove'].includes(backModeRaw) ? backModeRaw : 'groove') as BackMode;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, current_revision_id, currency, settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/?error=project');

  const { data: priceBook, error: priceError } = await supabase
    .from('quote_price_book_items')
    .select('id, category, name, unit, currency, purchase_price_minor, parameters_json')
    .eq('organization_id', organization.id)
    .eq('active', true);
  if (priceError) redirect(`/projects/${projectId}?error=pricebook`);

  const input = {
    moduleKey,
    widthMm: numberField(formData, 'widthMm', 800),
    heightMm: numberField(formData, 'heightMm', 720),
    depthMm: numberField(formData, 'depthMm', 560),
    thicknessMm: numberField(formData, 'thicknessMm', 18),
    gapMm: numberField(formData, 'gapMm', 2),
    drawers: numberField(formData, 'drawers', 2),
    doors: numberField(formData, 'doors', 1),
    shelfCount: numberField(formData, 'shelfCount', moduleKey === 'b-door' ? 1 : 0),
    stretcherDepthMm: numberField(formData, 'stretcherDepthMm', 100),
    shelfSetbackMm: numberField(formData, 'shelfSetbackMm', 20),
    backMode,
    backThicknessMm: numberField(formData, 'backThicknessMm', 4),
    backInsetMm: numberField(formData, 'backInsetMm', 10),
    backGrooveDepthMm: numberField(formData, 'backGrooveDepthMm', 8),
    frontEdgeIncluded: String(formData.get('frontEdgeMode') ?? 'included') !== 'same-edge',
    boardItemId: String(formData.get('boardItemId') ?? '') || undefined,
    frontItemId: String(formData.get('frontItemId') ?? '') || undefined,
    backItemId: String(formData.get('backItemId') ?? '') || undefined,
    edgeItemId: String(formData.get('edgeItemId') ?? '') || undefined,
    hingeItemId: String(formData.get('hingeItemId') ?? '') || undefined,
    drawerItemId: String(formData.get('drawerItemId') ?? '') || undefined,
    labourItemId: String(formData.get('labourItemId') ?? '') || undefined,
    labourHours: numberField(formData, 'labourHours', 0),
  };

  if (input.widthMm <= 0 || input.heightMm <= 0 || input.depthMm <= 0 || input.thicknessMm <= 0) {
    redirect(`/projects/${projectId}?error=dimensions`);
  }

  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const taxBps = Number((project.settings as Record<string, unknown> | null)?.taxBps ?? 0);
  const preview = calculateCabinetPreview(input, (priceBook ?? []) as PriceBookItem[], {
    targetMarginBps,
    overheadBps,
    taxBps,
  });

  const name = String(formData.get('name') ?? '').trim()
    || (moduleKey === 'b-drawer' ? 'Шкаф с ящиками' : moduleKey === 'b-door' ? 'Шкаф с дверью' : 'Корпус');

  const payload = {
    organization_id: organization.id,
    project_id: projectId,
    project_revision_id: project.current_revision_id,
    module_key: moduleKey,
    name,
    width_mm: input.widthMm,
    height_mm: input.heightMm,
    depth_mm: input.depthMm,
    quantity: 1,
    construction_json: {
      thicknessMm: input.thicknessMm,
      gapMm: input.gapMm,
      drawers: input.drawers,
      doors: input.doors,
      shelfCount: input.shelfCount,
      stretcherDepthMm: input.stretcherDepthMm,
      shelfSetbackMm: input.shelfSetbackMm,
      backMode: input.backMode,
      backThicknessMm: input.backThicknessMm,
      backInsetMm: input.backInsetMm,
      backGrooveDepthMm: input.backGrooveDepthMm,
      frontEdgeIncluded: input.frontEdgeIncluded,
      labourHours: input.labourHours,
    },
    material_refs_json: {
      boardItemId: input.boardItemId ?? null,
      frontItemId: input.frontItemId ?? null,
      backItemId: input.backItemId ?? null,
      edgeItemId: input.edgeItemId ?? null,
      labourItemId: input.labourItemId ?? null,
    },
    hardware_refs_json: {
      hingeItemId: input.hingeItemId ?? null,
      drawerItemId: input.drawerItemId ?? null,
    },
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
    updated_at: new Date().toISOString(),
  };

  const result = cabinetId
    ? await supabase.from('quote_cabinets').update(payload).eq('id', cabinetId).eq('project_id', projectId).eq('organization_id', organization.id)
    : await supabase.from('quote_cabinets').insert(payload);

  if (result.error) redirect(`/projects/${projectId}?error=save`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/');
}
