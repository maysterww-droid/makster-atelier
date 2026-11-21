import { mm } from '../../project-model/src/types.js';
function isGtv(selection) {
    const haystack = `${selection.manufacturer ?? ''} ${selection.name ?? ''} ${selection.code ?? ''}`.toLowerCase();
    return haystack.includes('gtv');
}
export function resolveGtvModernSlideRunner(selection) {
    if (!selection || selection.role !== 'runner' || !isGtv(selection))
        return null;
    const technical = selection.technical;
    if (technical?.kind !== 'gtv_modern_slide' || technical.nominalLength.value == null)
        return null;
    const spec = technical;
    const widthReduction = spec.drawerInternalWidthReduction.value;
    const lengthReduction = spec.boxLengthReduction.value;
    if (widthReduction == null || lengthReduction == null)
        return null;
    return {
        hardwareSelectionId: selection.id,
        family: spec.family,
        nominalLength: spec.nominalLength.value,
        motion: spec.motion ?? 'soft_close',
        drawerInternalWidthReduction: widthReduction,
        boxLengthReduction: lengthReduction,
        maxSideThickness: spec.maxSideThickness?.value ?? mm(19),
        maxBottomRecess: spec.maxBottomRecess?.value ?? mm(13),
        estimated: [spec.nominalLength, spec.drawerInternalWidthReduction, spec.boxLengthReduction].some(x => x.state !== 'confirmed'),
    };
}
export function gtvModernSlideEnvelope(internalCabinetWidth, sideThickness, runner) {
    const innerDrawerWidth = (Number(internalCabinetWidth) - Number(runner.drawerInternalWidthReduction));
    return {
        innerDrawerWidth,
        outerWidth: (Number(innerDrawerWidth) + 2 * Number(sideThickness)),
        boxLength: (Number(runner.nominalLength) - Number(runner.boxLengthReduction)),
    };
}
export function gtvRunnerDepthFits(cabinetDepth, runner) {
    // GTV planning sheet: cabinet depth requires at least NL + 5 mm.
    return Number(runner.nominalLength) + Number(mm(5)) <= Number(cabinetDepth);
}
