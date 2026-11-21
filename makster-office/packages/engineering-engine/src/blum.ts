import {
  mm,
  type BlumHingeApplication,
  type BlumRunnerTechnicalSpec,
  type HardwareSelection,
  type LegraboxHeightCode,
  type MaterialSelection,
  type Mm10,
} from '../../project-model/src/types.js';
import type { WardrobeRuleSetV05 } from './types.js';

export interface ResolvedBlumHinge {
  hardwareSelectionId: string;
  application: BlumHingeApplication;
  openingAngleDeg: number;
  drillingDistance: Mm10;
  mountingPlateSpacing: Mm10;
  estimated: boolean;
}

export interface ResolvedBlumRunner {
  hardwareSelectionId: string;
  system: 'movento' | 'tandem' | 'legrabox';
  nominalLength: Mm10;
  motion: 'blumotion' | 'tip_on' | 'tip_on_blumotion';
  capacityKg?: number;
  legraboxHeightCode?: LegraboxHeightCode;
  estimated: boolean;
}

function isBlum(selection: HardwareSelection): boolean {
  const haystack = `${selection.manufacturer ?? ''} ${selection.name ?? ''} ${selection.code ?? ''}`.toLowerCase();
  return haystack.includes('blum');
}

export function resolveBlumHinge(selection: HardwareSelection | undefined, rules: WardrobeRuleSetV05): ResolvedBlumHinge | null {
  if (!selection || selection.role !== 'hinge' || !isBlum(selection)) return null;
  const technical = selection.technical;
  if (technical?.kind === 'blum_hinge') {
    return {
      hardwareSelectionId: selection.id,
      application: technical.application,
      openingAngleDeg: technical.openingAngleDeg ?? 110,
      drillingDistance: technical.drillingDistance?.value ?? rules.blum.defaultHingeDrillingDistance,
      mountingPlateSpacing: technical.mountingPlateSpacing?.value ?? mm(0),
      estimated: technical.drillingDistance?.state !== 'confirmed',
    };
  }
  const name = `${selection.name ?? ''} ${selection.code ?? ''}`.toLowerCase();
  if (name.includes('clip') && name.includes('blum')) {
    return {
      hardwareSelectionId: selection.id,
      application: 'overlay',
      openingAngleDeg: 110,
      drillingDistance: rules.blum.defaultHingeDrillingDistance,
      mountingPlateSpacing: mm(0),
      estimated: true,
    };
  }
  return null;
}

export function resolveBlumRunner(selection: HardwareSelection | undefined): ResolvedBlumRunner | null {
  if (!selection || selection.role !== 'runner' || !isBlum(selection)) return null;
  const technical = selection.technical;
  if (technical?.kind !== 'blum_runner' || technical.nominalLength.value == null) return null;
  const result: ResolvedBlumRunner = {
    hardwareSelectionId: selection.id,
    system: technical.system,
    nominalLength: technical.nominalLength.value,
    motion: technical.motion ?? 'blumotion',
    estimated: technical.nominalLength.state !== 'confirmed',
  };
  if (technical.capacityKg != null) result.capacityKg = technical.capacityKg;
  if (technical.legraboxHeightCode) result.legraboxHeightCode = technical.legraboxHeightCode;
  return result;
}

export function estimateFrontWeightKg(length: Mm10, width: Mm10, thickness: Mm10, material?: MaterialSelection): number {
  const density = material?.densityKgM3 ?? 650;
  const l = Number(length) / 10000;
  const w = Number(width) / 10000;
  const t = Number(thickness) / 10000;
  return l * w * t * density;
}

export interface BlumHingePlan {
  count: number;
  centers: Mm10[];
  weightKg: number;
  weightAboveDocumentedBasicBand: boolean;
  widthNeedsAdditionalHinge: boolean;
}

export function planBlumHinges(height: Mm10, width: Mm10, thickness: Mm10, material: MaterialSelection | undefined, rules: WardrobeRuleSetV05): BlumHingePlan {
  const baseCount = rules.hingeCountByDoorHeight.find((r) => Number(height) <= Number(r.maxHeight))?.count
    ?? rules.hingeCountByDoorHeight.at(-1)?.count
    ?? 6;
  const weightKg = estimateFrontWeightKg(height, width, thickness, material);
  // Blum explicitly documents 2 hinges for 4–6 kg and 3 for 6–12 kg. Above this,
  // Makster keeps the conservative height-derived count and emits a verification warning.
  const weightFloor = weightKg <= 6 ? 2 : 3;
  const widthNeedsAdditionalHinge = Number(width) > Number(rules.blum.maxStandardDoorWidth);
  const count = Math.max(baseCount, weightFloor) + (widthNeedsAdditionalHinge ? 1 : 0);
  const end = Math.min(Number(rules.blum.hingeEndMargin), Math.floor(Number(height) / 4));
  const usable = Math.max(0, Number(height) - 2 * end);
  const centers: Mm10[] = [];
  if (count === 1) centers.push(Math.round(Number(height) / 2) as Mm10);
  else {
    for (let i = 0; i < count; i++) {
      centers.push(Math.round(end + usable * (i / (count - 1))) as Mm10);
    }
  }
  return {
    count,
    centers,
    weightKg,
    weightAboveDocumentedBasicBand: weightKg > 12,
    widthNeedsAdditionalHinge,
  };
}

export function timberDrawerEnvelope(internalCabinetWidth: Mm10, runner: ResolvedBlumRunner, rules: WardrobeRuleSetV05): { outerWidth: Mm10; boxLength: Mm10 } {
  if (runner.system !== 'movento' && runner.system !== 'tandem') throw new Error('timber_drawer_requires_movento_or_tandem');
  return {
    outerWidth: (Number(internalCabinetWidth) - Number(rules.blum.moventoTandemSideClearanceTotal)) as Mm10,
    boxLength: (Number(runner.nominalLength) - Number(rules.blum.runnerLengthReduction)) as Mm10,
  };
}

export function legraboxCutDimensions(internalCabinetWidth: Mm10, runner: ResolvedBlumRunner): { bottomWidth: Mm10; bottomLength: Mm10; backWidth: Mm10; backHeight: Mm10 } {
  if (runner.system !== 'legrabox') throw new Error('legrabox_runner_required');
  const code = runner.legraboxHeightCode ?? 'M';
  const heights: Record<LegraboxHeightCode, Mm10> = {
    M: mm(63),
    K: mm(101),
    C: mm(148),
    F: mm(212),
  };
  return {
    bottomWidth: (Number(internalCabinetWidth) - Number(mm(35))) as Mm10,
    bottomLength: (Number(runner.nominalLength) - Number(mm(10))) as Mm10,
    backWidth: (Number(internalCabinetWidth) - Number(mm(38))) as Mm10,
    backHeight: heights[code],
  };
}

export function runnerDepthFits(cabinetDepth: Mm10, runner: ResolvedBlumRunner, rules: WardrobeRuleSetV05): boolean {
  return Number(runner.nominalLength) + Number(rules.blum.runnerRearSpace) <= Number(cabinetDepth);
}

export function runnerTechnical(selection: HardwareSelection | undefined): BlumRunnerTechnicalSpec | undefined {
  return selection?.technical?.kind === 'blum_runner' ? selection.technical : undefined;
}
