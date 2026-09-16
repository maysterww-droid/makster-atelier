import assert from 'node:assert/strict';
import { findReadyModulePreview, type ReadyModuleLibraryRow } from '../src/lib/asset-bridge.ts';

const rows: ReadyModuleLibraryRow[] = [
  {
    module_code: 'KITCHEN_BASE_001_BASE_DOOR',
    template_code: 'M_BASE_DOOR',
    version: 11,
    release_status: 'READY',
    width_mm: 600,
    depth_mm: 560,
    body_height_mm: 720,
    preview_bucket: 'makster-library',
    preview_path: 'door/V0011/preview.png',
    preview_mime_type: 'image/png',
  },
  {
    module_code: 'KITCHEN_BASE_001_TANDEMBOX',
    template_code: 'M_BASE_DRAWER_TANDEMBOX',
    version: 12,
    release_status: 'READY',
    width_mm: 600,
    depth_mm: 560,
    body_height_mm: 720,
    preview_bucket: 'makster-library',
    preview_path: 'tandembox/V0012/preview.png',
    preview_mime_type: 'image/png',
  },
  {
    module_code: 'KITCHEN_BASE_001_WOOD_DRAWER',
    template_code: 'M_BASE_DRAWER_WOOD_UNDERMOUNT',
    version: 13,
    release_status: 'READY',
    width_mm: 600,
    depth_mm: 560,
    body_height_mm: 720,
    preview_bucket: 'makster-library',
    preview_path: 'wood/V0013/preview.png',
    preview_mime_type: 'image/png',
  },
  {
    module_code: 'BROKEN_DRAFT_DRAWER',
    template_code: 'M_BASE_DRAWER_WOOD_UNDERMOUNT',
    version: 14,
    release_status: 'DRAFT',
    width_mm: 600,
    depth_mm: 560,
    body_height_mm: 720,
    preview_bucket: 'makster-library',
    preview_path: 'draft/V0014/preview.png',
    preview_mime_type: 'image/png',
  },
];

const baseDoorPreset = { group: 'base-door', widthMm: 600, heightMm: 720, depthMm: 560 } as any;
const baseDrawerPreset = { group: 'base-drawer', widthMm: 600, heightMm: 720, depthMm: 560 } as any;
const wrongSizePreset = { group: 'base-drawer', widthMm: 800, heightMm: 720, depthMm: 560 } as any;

const door = findReadyModulePreview(baseDoorPreset, rows);
assert.equal(door?.moduleCode, 'KITCHEN_BASE_001_BASE_DOOR');
assert.equal(door?.version, 11);

const drawer = findReadyModulePreview(baseDrawerPreset, rows);
assert.equal(drawer?.moduleCode, 'KITCHEN_BASE_001_WOOD_DRAWER');
assert.equal(drawer?.version, 13, 'latest READY supported drawer variant should win');

assert.equal(findReadyModulePreview(wrongSizePreset, rows), null, 'dimensions must match exactly');

console.log('PASS Asset Bridge READY-only module preview mapping');
console.log(`PASS base-door -> ${door?.moduleCode} V${door?.version}`);
console.log(`PASS base-drawer -> ${drawer?.moduleCode} V${drawer?.version}`);
console.log('PASS DRAFT V14 ignored');
console.log('PASS wrong-size module ignored');
