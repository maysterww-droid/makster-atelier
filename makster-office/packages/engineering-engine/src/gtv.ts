import { mm, type GtvModernSlideTechnicalSpec, type HardwareSelection, type Mm10 } from '../../project-model/src/types.js';

export interface ResolvedGtvModernSlideRunner {
  hardwareSelectionId: string;
  family: 'modern_slide_18';
  nominalLength: Mm10;
  motion: 'soft_close' | 'push_to_open';
  drawerInternalWidthReduction: Mm10;
  boxLengthReduction: Mm10;
  maxSideThickness: Mm10;
  maxBottomRecess: Mm10;
  estimated: boolean;
}

function isGtv(selection: HardwareSelection): boolean {
  const haystack = `${selection.manufacturer ?? ''} ${selection.name ?? ''} ${selection.code ?? ''}`.toLowerCase();
  return haystack.includes('gtv');
}

export function resolveGtvModernSlideRunner(selection: HardwareSelection | undefined): ResolvedGtvModernSlideRunner | null {
  if (!selection || selection.role !== 'runner' || !isGtv(selection)) return null;
  const technical = selection.technical;
  if (technical?.kind !== 'gtv_modern_slide' || technical.nominalLength.value == null) return null;
  const spec: GtvModernSlideTechnicalSpec = technical;
  const widthReduction = spec.drawerInternalWidthReduction.value;
  const lengthReduction = spec.boxLengthReduction.value;
  if (widthReduction == null || lengthReduction == null) return null;
  return {
    hardwareSelectionId: selection.id,
    family: spec.family,
    nominalLength: spec.nominalLength.value!,
    motion: spec.motion ?? 'soft_close',
    drawerInternalWidthReduction: widthReduction,
    boxLengthReduction: lengthReduction,
    maxSideThickness: spec.maxSideThickness?.value ?? mm(19),
    maxBottomRecess: spec.maxBottomRecess?.value ?? mm(13),
    estimated: [spec.nominalLength, spec.drawerInternalWidthReduction, spec.boxLengthReduction].some(x => x.state !== 'confirmed'),
  };
}

export function gtvModernSlideEnvelope(internalCabinetWidth: Mm10, sideThickness: Mm10, runner: ResolvedGtvModernSlideRunner): {
  innerDrawerWidth: Mm10;
  outerWidth: Mm10;
  boxLength: Mm10;
} {
  const innerDrawerWidth = (Number(internalCabinetWidth) - Number(runner.drawerInternalWidthReduction)) as Mm10;
  return {
    innerDrawerWidth,
    outerWidth: (Number(innerDrawerWidth) + 2 * Number(sideThickness)) as Mm10,
    boxLength: (Number(runner.nominalLength) - Number(runner.boxLengthReduction)) as Mm10,
  };
}

export function gtvRunnerDepthFits(cabinetDepth: Mm10, runner: ResolvedGtvModernSlideRunner): boolean {
  // GTV planning sheet: cabinet depth requires at least NL + 5 mm.
  return Number(runner.nominalLength) + Number(mm(5)) <= Number(cabinetDepth);
}
