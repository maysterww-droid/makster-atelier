import type { SupabaseClient } from '@supabase/supabase-js';

export type Module3DAsset = {
  moduleCode: string;
  templateCode: string;
  matchKeys: string[];
  version: number;
  glbUrl: string;
  previewUrl: string | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

type ReadyModuleRow = {
  module_code: string;
  template_code: string;
  version: number | string;
  release_status: string;
  width_mm: number | string;
  depth_mm: number | string;
  body_height_mm: number | string;
  leg_height_mm: number | string;
  metadata: Record<string, unknown> | null;
  preview_bucket: string | null;
  preview_path: string | null;
  glb_bucket: string | null;
  glb_path: string | null;
};

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function inferredQuoteKey(moduleCode: string) {
  const code = moduleCode.toUpperCase();
  if (code.includes('DRAWER')) return 'b-drawer';
  if (code.includes('DISHWASHER') || code.includes('PMM')) return 'dishwasher';
  if (code.includes('BASE_OVEN') || code.includes('OVEN_BASE')) return 'b-oven';
  if (code.includes('TALL_FRIDGE') || code.includes('FRIDGE_TALL')) return 't-fridge';
  if (code.includes('TALL_OVEN') || code.includes('OVEN_TALL')) return 't-oven';
  if (code.includes('WALL') || code.includes('UPPER')) return 'w-door';
  if (code.includes('BASE_DOOR') || code.includes('SINK')) return 'b-door';
  return '';
}

function publicUrl(supabase: SupabaseClient, bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Consumer contract for Makster Asset Bridge 0.1.
 * ready_module_library is the only discovery surface: it already resolves
 * one active READY version per module and hides Draft/failed/older versions.
 */
export async function loadPublishedModule3DAssets(supabase: SupabaseClient): Promise<Module3DAsset[]> {
  const { data, error } = await supabase
    .from('ready_module_library')
    .select('module_code,template_code,version,release_status,width_mm,depth_mm,body_height_mm,leg_height_mm,metadata,preview_bucket,preview_path,glb_bucket,glb_path');

  if (error || !data?.length) return [];

  const result: Module3DAsset[] = [];
  for (const row of data as ReadyModuleRow[]) {
    if (row.release_status !== 'READY' || !row.glb_bucket || !row.glb_path) continue;

    const metadata = row.metadata ?? {};
    const metadataKeys = [
      textValue(metadata.quote_module_key),
      textValue(metadata.quoteModuleKey),
      textValue(metadata.module_key),
      textValue(metadata.template_code),
    ];
    const matchKeys = [...new Set([
      row.template_code,
      inferredQuoteKey(row.module_code),
      ...metadataKeys,
    ].map((value) => value.trim()).filter(Boolean))];

    result.push({
      moduleCode: row.module_code,
      templateCode: row.template_code,
      matchKeys,
      version: Number(row.version) || 1,
      glbUrl: publicUrl(supabase, row.glb_bucket, row.glb_path),
      previewUrl: row.preview_bucket && row.preview_path ? publicUrl(supabase, row.preview_bucket, row.preview_path) : null,
      widthMm: numberValue(row.width_mm, 600),
      heightMm: numberValue(row.body_height_mm, 720) + Math.max(0, Number(row.leg_height_mm) || 0),
      depthMm: numberValue(row.depth_mm, 560),
    });
  }

  return result;
}
