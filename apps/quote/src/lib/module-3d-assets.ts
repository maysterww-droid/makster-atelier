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

type LibraryModuleRow = {
  id: string;
  module_code: string;
  template_code: string;
};

type LibraryVersionRow = {
  id: string;
  module_id: string;
  version: number;
  width_mm: number | string;
  depth_mm: number | string;
  body_height_mm: number | string;
  leg_height_mm: number | string;
  metadata: Record<string, unknown> | null;
};

type LibraryAssetRow = {
  module_version_id: string;
  asset_role: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
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

function isGlb(asset: LibraryAssetRow) {
  const role = asset.asset_role.toLowerCase();
  const mime = asset.mime_type.toLowerCase();
  return role === 'glb' || role === 'model' || role === 'model_glb' || mime === 'model/gltf-binary' || asset.storage_path.toLowerCase().endsWith('.glb');
}

function isPreview(asset: LibraryAssetRow) {
  const role = asset.asset_role.toLowerCase();
  const mime = asset.mime_type.toLowerCase();
  return role === 'preview' || role === 'thumbnail' || role === 'render' || mime.startsWith('image/');
}

export async function loadPublishedModule3DAssets(supabase: SupabaseClient): Promise<Module3DAsset[]> {
  const { data: modulesData, error: modulesError } = await supabase
    .from('library_modules')
    .select('id, module_code, template_code')
    .eq('status', 'PUBLISHED');
  if (modulesError || !modulesData?.length) return [];

  const modules = modulesData as LibraryModuleRow[];
  const moduleIds = modules.map((row) => row.id);
  const { data: versionsData, error: versionsError } = await supabase
    .from('library_module_versions')
    .select('id, module_id, version, width_mm, depth_mm, body_height_mm, leg_height_mm, metadata')
    .in('module_id', moduleIds)
    .eq('library_status', 'PUBLISHED')
    .order('version', { ascending: false });
  if (versionsError || !versionsData?.length) return [];

  const latestByModule = new Map<string, LibraryVersionRow>();
  for (const raw of versionsData as LibraryVersionRow[]) {
    if (!latestByModule.has(raw.module_id)) latestByModule.set(raw.module_id, raw);
  }
  const versions = [...latestByModule.values()];
  const versionIds = versions.map((row) => row.id);
  const { data: assetsData, error: assetsError } = await supabase
    .from('library_module_assets')
    .select('module_version_id, asset_role, storage_bucket, storage_path, mime_type')
    .in('module_version_id', versionIds);
  if (assetsError || !assetsData?.length) return [];

  const assets = assetsData as LibraryAssetRow[];
  const moduleById = new Map(modules.map((row) => [row.id, row]));
  const result: Module3DAsset[] = [];

  for (const version of versions) {
    const module = moduleById.get(version.module_id);
    if (!module) continue;
    const versionAssets = assets.filter((asset) => asset.module_version_id === version.id);
    const glb = versionAssets.find(isGlb);
    if (!glb) continue;
    const preview = versionAssets.find(isPreview);
    const metadata = version.metadata ?? {};
    const metadataKeys = [
      textValue(metadata.quote_module_key),
      textValue(metadata.quoteModuleKey),
      textValue(metadata.module_key),
      textValue(metadata.template_code),
    ];
    const matchKeys = [...new Set([
      module.template_code,
      inferredQuoteKey(module.module_code),
      ...metadataKeys,
    ].map((value) => value.trim()).filter(Boolean))];

    result.push({
      moduleCode: module.module_code,
      templateCode: module.template_code,
      matchKeys,
      version: Number(version.version) || 1,
      glbUrl: publicUrl(supabase, glb.storage_bucket, glb.storage_path),
      previewUrl: preview ? publicUrl(supabase, preview.storage_bucket, preview.storage_path) : null,
      widthMm: numberValue(version.width_mm, 600),
      heightMm: numberValue(version.body_height_mm, 720) + Math.max(0, Number(version.leg_height_mm) || 0),
      depthMm: numberValue(version.depth_mm, 560),
    });
  }

  return result;
}
