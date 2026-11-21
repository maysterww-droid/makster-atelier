import { mm } from '../../project-model/src/types.js';
export const wardrobeRulesV05 = {
    id: 'wardrobe-modular-boxes-release-v0.7',
    carcassMode: 'modular_boxes',
    frontGap: mm(2),
    shelfRearClearance: mm(20),
    backPanelMargin: mm(4),
    defaultEdgeThickness: mm(0.8),
    maxPanelLength: mm(2800),
    maxPanelWidth: mm(2070),
    minShelfWidth: mm(200),
    maxShelfSpanWithoutSupport: mm(900),
    railEndClearance: mm(2),
    hingeCountByDoorHeight: [
        { maxHeight: mm(900), count: 2 },
        { maxHeight: mm(1600), count: 3 },
        { maxHeight: mm(2200), count: 4 },
        { maxHeight: mm(2600), count: 5 },
        { maxHeight: mm(3200), count: 6 },
    ],
    blum: {
        // CLIP top BLUMOTION planning defaults. TB remains configurable per selected hinge/application.
        hingeCupDiameter: mm(35),
        hingeCupDepth: mm(13),
        defaultHingeDrillingDistance: mm(5),
        mountingPlateSetback: mm(37),
        mountingPlateHoleSpacing: mm(32),
        hingeEndMargin: mm(100),
        maxStandardDoorWidth: mm(600),
        // MOVENTO and TANDEM 11–16 mm drawer planning: SKW = LW - 42; SKL = NL - 10.
        moventoTandemSideClearanceTotal: mm(42),
        runnerLengthReduction: mm(10),
        runnerRearSpace: mm(3),
        defaultDrawerSideThickness: mm(16),
        defaultDrawerSideHeight: mm(140),
        defaultDrawerBottomThickness: mm(8),
        defaultDrawerFrontGap: mm(2.5),
    },
    backGroove: {
        // Makster workshop defaults. These are configurable construction rules, not Blum catalogue values.
        defaultInset: mm(10),
        defaultDepth: mm(8),
        defaultClearance: mm(0.5),
    },
    system32: {
        enabled: true,
        pitch: mm(32),
        rowFromFront: mm(37),
        rowFromRear: mm(37),
        holeDiameter: mm(5),
        holeDepth: mm(12),
        endMargin: mm(64),
    },
};
