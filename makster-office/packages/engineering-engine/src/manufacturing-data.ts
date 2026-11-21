import { mm, type HardwareSelection, type Mm10 } from '../../project-model/src/types.js';
import type { NormalizedHardwareManufacturingProfile } from '../../bxf-intelligence/src/types.js';

export interface RunnerCabinetDrillingHole {
  /** Distance from the cabinet front edge along the side-panel depth. */
  fromFront: Mm10;
  diameter: Mm10;
  depth: Mm10;
  fastener: 'chipboard_screw' | 'system_screw' | 'other';
  optional?: boolean;
}

export interface RunnerCabinetDrillingPattern {
  hardwareCode: string;
  manufacturer: string;
  catalogVersion: string;
  sourceUrl?: string;
  sourceKind: 'manufacturer_catalog' | 'manufacturer_bxf' | 'manual_verified' | 'fixture_only';
  verified: boolean;
  sourceChecksumSha256?: string;
  schemaFingerprint?: string;
  adapterId?: string;
  manualVerificationId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  holes: RunnerCabinetDrillingHole[];
}

export interface ManufacturingDataProvider {
  getRunnerCabinetDrillingPattern(selection: HardwareSelection): RunnerCabinetDrillingPattern | null;
}

/**
 * Production default: never manufacture a runner pattern we cannot prove.
 * The Blum catalogue identifies compatible SKUs and points to BXF/CAD-CAM data,
 * but 0.6 deliberately requires imported/verified manufacturing data for exact holes.
 */
export class SafeCatalogManufacturingDataProvider implements ManufacturingDataProvider {
  getRunnerCabinetDrillingPattern(_selection: HardwareSelection): RunnerCabinetDrillingPattern | null {
    return null;
  }
}



/**
 * Provider backed by normalized manufacturing profiles imported through the BXF layer.
 * `manufacturer_bxf` is accepted only when the importer marked the profile verified.
 */
export class ImportedManufacturingDataProvider implements ManufacturingDataProvider {
  private readonly byCode = new Map<string, NormalizedHardwareManufacturingProfile>();

  constructor(profiles: NormalizedHardwareManufacturingProfile[]) {
    for (const profile of profiles) {
      if (!profile.verified) continue;
      if (profile.sourceKind !== 'manufacturer_bxf' && profile.sourceKind !== 'fixture_only') continue;
      this.byCode.set(profile.hardwareCode, profile);
    }
  }

  getRunnerCabinetDrillingPattern(selection: HardwareSelection): RunnerCabinetDrillingPattern | null {
    const code = selection.code ?? '';
    const profile = this.byCode.get(code);
    if (!profile || profile.profileKind !== 'runner_cabinet_drilling') return null;
    return {
      hardwareCode: profile.hardwareCode,
      manufacturer: profile.manufacturer,
      catalogVersion: profile.catalogVersion,
      sourceKind: profile.sourceKind,
      verified: profile.verified,
      sourceChecksumSha256: profile.sourceChecksumSha256,
      schemaFingerprint: profile.sourceSchemaFingerprint,
      adapterId: profile.adapterId,
      holes: profile.holes.map((hole) => ({
        fromFront: mm(hole.fromFrontMm),
        diameter: mm(hole.diameterMm),
        depth: mm(hole.depthMm),
        fastener: hole.fastener,
        ...(hole.optional ? { optional: true } : {}),
      })),
    };
  }
}

/**
 * Test/demo-only provider used to verify the CNC gate and coordinate pipeline.
 * These coordinates are intentionally labelled fixture data and MUST NOT be used for production.
 */
export class FixtureManufacturingDataProvider implements ManufacturingDataProvider {
  getRunnerCabinetDrillingPattern(selection: HardwareSelection): RunnerCabinetDrillingPattern | null {
    const code = selection.code ?? '';
    if (code === '760H5500S') {
      return {
        hardwareCode: code,
        manufacturer: 'Blum',
        catalogVersion: 'fixture-only',
        sourceKind: 'fixture_only',
        verified: true,
        holes: [
          { fromFront: mm(37), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
          { fromFront: mm(293), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
        ],
      };
    }
    if (code === '750.5501S') {
      return {
        hardwareCode: code,
        manufacturer: 'Blum',
        catalogVersion: 'fixture-only',
        sourceKind: 'fixture_only',
        verified: true,
        holes: [
          { fromFront: mm(37), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
          { fromFront: mm(320), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
        ],
      };
    }
    return null;
  }
}


/**
 * TEST ONLY. Simulates an internally signed-off manual manufacturing profile.
 * It exists to prove Release Trust + cryptographic signing without pretending
 * the coordinates are official Blum BXF data.
 */
export class ManualVerifiedFixtureManufacturingDataProvider implements ManufacturingDataProvider {
  getRunnerCabinetDrillingPattern(selection: HardwareSelection): RunnerCabinetDrillingPattern | null {
    const code = selection.code ?? '';
    const common = {
      manufacturer: 'Blum',
      catalogVersion: 'TEST-ONLY-MANUAL-VERIFY',
      sourceKind: 'manual_verified' as const,
      verified: true,
      manualVerificationId: `TEST-ONLY:${code}:verification-001`,
      verifiedBy: 'makster-test-suite',
      verifiedAt: '2026-09-03T00:00:00.000Z',
    };
    if (code === '760H5500S') return {
      hardwareCode: code, ...common,
      holes: [
        { fromFront: mm(37), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
        { fromFront: mm(293), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
      ],
    };
    if (code === '750.5501S') return {
      hardwareCode: code, ...common,
      holes: [
        { fromFront: mm(37), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
        { fromFront: mm(320), diameter: mm(5), depth: mm(12), fastener: 'chipboard_screw' },
      ],
    };
    return null;
  }
}
