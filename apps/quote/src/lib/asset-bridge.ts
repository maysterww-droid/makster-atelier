import type { QuoteModulePreset } from './module-presets';

export type ReadyModuleLibraryRow = {
  module_code: string;
  template_code: string;
  version: number;
  release_status: string;
  width_mm: number | string;
  depth_mm: number | string;
  body_height_mm: number | string;
  preview_bucket: string | null;
  preview_path: string | null;
  preview_mime_type: string | null;
};

export type ReadyModulePreview = {
  moduleCode: string;
  version: number;
  bucket: string;
  path: string;
};

const TEMPLATE_CODES_BY_GROUP: Partial<Record<QuoteModulePreset['group'], string[]>> = {
  'base-door': ['M_BASE_DOOR'],
  'base-drawer': [
    'M_BASE_DRAWER',
    'M_BASE_DRAWER_TANDEMBOX',
    'M_BASE_DRAWER_WOOD_UNDERMOUNT',
  ],
};

function sameMm(value: number | string, expected: number) {
  return Math.abs(Number(value) - expected) < 0.001;
}

export function findReadyModulePreview(
  preset: QuoteModulePreset,
  rows: ReadyModuleLibraryRow[],
): ReadyModulePreview | null {
  const templateCodes = TEMPLATE_CODES_BY_GROUP[preset.group];
  if (!templateCodes?.length) return null;

  const matches = rows
    .filter((row) =>
      row.release_status === 'READY' &&
      templateCodes.includes(row.template_code) &&
      sameMm(row.width_mm, preset.widthMm) &&
      sameMm(row.body_height_mm, preset.heightMm) &&
      sameMm(row.depth_mm, preset.depthMm) &&
      Boolean(row.preview_bucket) &&
      Boolean(row.preview_path),
    )
    .sort((a, b) => Number(b.version) - Number(a.version));

  const row = matches[0];
  if (!row?.preview_bucket || !row.preview_path) return null;

  return {
    moduleCode: row.module_code,
    version: Number(row.version),
    bucket: row.preview_bucket,
    path: row.preview_path,
  };
}
