import type { BxfAdapter, BxfAdapterResult, NormalizedHardwareManufacturingProfile, XmlNode } from './types.js';
import { walkXml } from './xml.js';

function children(node: XmlNode, localName: string): XmlNode[] {
  return node.children.filter((child) => child.localName === localName);
}

function childText(node: XmlNode, localName: string): string | undefined {
  return node.children.find((child) => child.localName === localName)?.text || undefined;
}

/**
 * TEST ONLY. This adapter proves the importer -> normalized profile -> Engineering pipeline.
 * It deliberately does NOT claim compatibility with Blum's proprietary BXF schema.
 */
export class MaksterFixtureBxfAdapter implements BxfAdapter {
  readonly id = 'makster-fixture-bxf-v1';

  extract(root: XmlNode, source: { sha256: string; schemaFingerprint: string }): BxfAdapterResult {
    if (root.localName !== 'MaksterBxfFixture' || root.attributes['data-trust'] !== 'fixture-only') {
      return { adapterId: this.id, recognized: false, hardwareCodes: [], manufacturingProfiles: [], warnings: [] };
    }
    const hardwareCodes: string[] = [];
    const manufacturingProfiles: NormalizedHardwareManufacturingProfile[] = [];
    walkXml(root, (node) => {
      if (node.localName !== 'RunnerDrillingProfile') return;
      const hardwareCode = node.attributes['hardwareCode'];
      if (!hardwareCode) return;
      hardwareCodes.push(hardwareCode);
      const holes = children(node, 'Hole').map((hole) => ({
        fromFrontMm: Number(hole.attributes['fromFrontMm']),
        diameterMm: Number(hole.attributes['diameterMm']),
        depthMm: Number(hole.attributes['depthMm']),
        fastener: (hole.attributes['fastener'] ?? 'other') as 'chipboard_screw' | 'system_screw' | 'other',
        ...(hole.attributes['optional'] === 'true' ? { optional: true } : {}),
      }));
      manufacturingProfiles.push({
        manufacturer: 'Blum',
        hardwareCode,
        profileKind: 'runner_cabinet_drilling',
        catalogVersion: root.attributes['catalogVersion'] ?? 'fixture-only',
        sourceKind: 'fixture_only',
        sourceChecksumSha256: source.sha256,
        sourceSchemaFingerprint: source.schemaFingerprint,
        adapterId: this.id,
        verified: true,
        holes,
      });
    });
    return {
      adapterId: this.id,
      recognized: true,
      manufacturer: 'Blum',
      schemaVersion: root.attributes['schemaVersion'] ?? 'fixture-v1',
      ...(childText(root, 'ProjectReference') ? { projectReference: childText(root, 'ProjectReference')! } : {}),
      hardwareCodes,
      manufacturingProfiles,
      warnings: ['TEST FIXTURE ONLY — normalized data must never be used for real manufacturing.'],
    };
  }
}
