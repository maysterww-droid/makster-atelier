import { mm, } from '../../project-model/src/types.js';
import { legraboxCutDimensions, planBlumHinges, resolveBlumHinge, resolveBlumRunner, runnerDepthFits, timberDrawerEnvelope, } from './blum.js';
import { gtvModernSlideEnvelope, gtvRunnerDepthFits, resolveGtvModernSlideRunner } from './gtv.js';
import { deterministicId, requireMeasured } from './utils.js';
function issue(ctx, value) {
    ctx.issues.push({
        id: deterministicId('issue', value.code, value.targetId ?? value.moduleId ?? value.furnitureId ?? ctx.furniture.id),
        ...value,
    });
}
function materialGrain(ctx, materialSelectionId) {
    if (!materialSelectionId)
        return 'none';
    return ctx.materials.get(materialSelectionId)?.grainDirection ?? 'none';
}
function materialThickness(ctx, materialSelectionId, fallback) {
    if (!materialSelectionId)
        return fallback;
    const value = ctx.materials.get(materialSelectionId)?.thickness?.value;
    return value ?? fallback;
}
function edgeFront(ctx, materialSelectionId) {
    return [{
            side: 'right',
            ...(materialSelectionId ? { materialSelectionId } : {}),
            thickness: ctx.rules.defaultEdgeThickness,
            note: 'Visible/front edge',
        }];
}
function allEdges(ctx, materialSelectionId) {
    return ['top', 'right', 'bottom', 'left'].map((side) => ({
        side,
        ...(materialSelectionId ? { materialSelectionId } : {}),
        thickness: ctx.rules.defaultEdgeThickness,
    }));
}
function addPart(ctx, part) {
    if (Number(part.length) <= 0 || Number(part.width) <= 0 || Number(part.thickness) <= 0) {
        issue(ctx, {
            code: 'INVALID_PART_DIMENSION',
            severity: 'blocking',
            category: 'geometry',
            message: `Invalid part size for ${part.name}`,
            furnitureId: ctx.furniture.id,
            ...(part.moduleId ? { moduleId: part.moduleId } : {}),
            targetId: part.id,
            metadata: { length: part.length, width: part.width, thickness: part.thickness },
        });
        return;
    }
    ctx.parts.push(part);
    if (Number(part.length) > Number(ctx.rules.maxPanelLength) || Number(part.width) > Number(ctx.rules.maxPanelWidth)) {
        issue(ctx, {
            code: 'PANEL_EXCEEDS_DEFAULT_SHEET',
            severity: 'blocking',
            category: 'manufacturing',
            message: `${part.name} exceeds the default 2800×2070 mm sheet envelope`,
            furnitureId: ctx.furniture.id,
            ...(part.moduleId ? { moduleId: part.moduleId } : {}),
            targetId: part.id,
            metadata: { length: part.length, width: part.width },
        });
    }
}
function resolveModuleWidth(module) {
    if (module.width.mode === 'fixed')
        return module.width.value.value;
    return null;
}
function measuredOr(value, fallback) {
    return value?.value ?? fallback;
}
function compileBackGrooves(ctx, module, moduleIndex, bodyHeight, bodyDepth, backThickness) {
    const back = ctx.furniture.construction.backPanel;
    if (back.mode !== 'groove')
        return;
    const inset = back.grooveInset?.value ?? ctx.rules.backGroove.defaultInset;
    const depth = back.grooveDepth?.value ?? ctx.rules.backGroove.defaultDepth;
    const clearance = back.grooveClearance?.value ?? ctx.rules.backGroove.defaultClearance;
    const toolWidth = (Number(backThickness) + Number(clearance));
    const x = (Number(bodyDepth) - Number(inset));
    const estimated = back.grooveInset?.state !== 'confirmed' || back.grooveDepth?.state !== 'confirmed' || back.grooveClearance?.state !== 'confirmed';
    const targets = [
        { kind: 'side', name: 'left side', face: 'right', length: bodyHeight },
        { kind: 'side', name: 'right side', face: 'left', length: bodyHeight },
        { kind: 'top', name: 'top', face: 'bottom', length: null },
        { kind: 'bottom', name: 'bottom', face: 'top', length: null },
    ];
    for (const item of targets) {
        const target = ctx.parts.find((part) => part.moduleId === module.id && part.kind === item.kind && part.name.includes(item.name));
        if (!target)
            continue;
        ctx.machining.push({
            id: deterministicId(ctx.furniture.id, module.id, `back-groove-${item.name}`),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetPartId: target.id,
            kind: 'groove',
            face: item.face,
            x,
            y: mm(0),
            depth,
            length: item.length ?? target.length,
            toolWidth,
            reference: 'front-edge',
            estimated,
            verificationSource: estimated ? 'estimated' : 'makster_rule',
            note: `M${moduleIndex + 1} back-panel groove`,
        });
    }
}
function compileSystem32ShelfRows(ctx, module, bodyHeight, bodyDepth) {
    if (!ctx.rules.system32.enabled)
        return;
    if (!module.contents.some((element) => element.kind === 'shelf_stack' && element.adjustable))
        return;
    const pitch = Number(ctx.rules.system32.pitch);
    const margin = Number(ctx.rules.system32.endMargin);
    const rows = [ctx.rules.system32.rowFromFront, (Number(bodyDepth) - Number(ctx.rules.system32.rowFromRear))];
    const ys = [];
    for (let y = margin; y <= Number(bodyHeight) - margin; y += pitch)
        ys.push(y);
    for (const sideName of ['left', 'right']) {
        const target = ctx.parts.find((part) => part.moduleId === module.id && part.kind === 'side' && part.name.includes(sideName));
        if (!target)
            continue;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            for (let i = 0; i < ys.length; i++) {
                ctx.machining.push({
                    id: deterministicId(ctx.furniture.id, module.id, `system32-${sideName}-${rowIndex}-${i}`),
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetPartId: target.id,
                    kind: 'drill',
                    face: sideName === 'left' ? 'right' : 'left',
                    x: rows[rowIndex],
                    y: ys[i],
                    diameter: ctx.rules.system32.holeDiameter,
                    depth: ctx.rules.system32.holeDepth,
                    reference: 'front-edge/module-bottom',
                    estimated: false,
                    verificationSource: 'makster_rule',
                    note: 'Makster System 32 adjustable-shelf row',
                });
            }
        }
    }
}
function addDrawerFront(ctx, module, element, moduleIndex, drawerIndex, innerWidth, carcassMaterial) {
    const cfg = element.drawerBox;
    const frontHeight = measuredOr(cfg?.frontHeight, mm(180));
    const frontMaterial = cfg?.materialSelectionId ?? ctx.furniture.construction.defaultFrontMaterialSelectionId ?? carcassMaterial;
    const thickness = materialThickness(ctx, frontMaterial, mm(18));
    const gap = ctx.rules.blum.defaultDrawerFrontGap;
    addPart(ctx, {
        id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${drawerIndex + 1}-front`),
        furnitureId: ctx.furniture.id,
        moduleId: module.id,
        sourceElementId: element.id,
        kind: 'drawer_front',
        name: `M${moduleIndex + 1} drawer ${drawerIndex + 1} front`,
        quantity: 1,
        ...(frontMaterial ? { materialSelectionId: frontMaterial } : {}),
        length: (Number(innerWidth) - 2 * Number(gap)),
        width: frontHeight,
        thickness,
        grainDirection: materialGrain(ctx, frontMaterial),
        edges: allEdges(ctx, ctx.furniture.construction.defaultEdgeMaterialSelectionId),
        estimated: cfg?.frontHeight?.state !== 'confirmed',
        tags: ['drawer-visible-front'],
    });
    if (cfg?.frontHeight?.value == null) {
        issue(ctx, {
            code: 'DRAWER_FRONT_HEIGHT_DEFAULTED',
            severity: 'warning',
            category: 'construction',
            message: `Module ${moduleIndex + 1}: drawer front height defaulted to 180 mm; confirm before final CNC release`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
        });
    }
}
function compileDrawerStack(ctx, module, element, moduleIndex, innerWidth, bodyDepth, carcassThickness) {
    const selection = element.runnerHardwareSelectionId
        ? ctx.hardwareSelections.get(element.runnerHardwareSelectionId)
        : undefined;
    const blumRunner = resolveBlumRunner(selection);
    const gtvRunner = resolveGtvModernSlideRunner(selection);
    if (!element.runnerHardwareSelectionId || !selection) {
        ctx.hardware.push({
            id: deterministicId(ctx.furniture.id, module.id, element.id, 'runner'),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            sourceElementId: element.id,
            role: 'runner',
            name: 'Drawer runner set',
            quantity: element.count,
            unit: 'set',
            estimated: true,
        });
        issue(ctx, {
            code: 'DRAWER_RUNNER_UNRESOLVED',
            severity: 'blocking',
            category: 'hardware',
            message: `Module ${moduleIndex + 1}: drawer runner system must be selected before drawer box dimensions can be generated`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
            metadata: { drawerCount: element.count, frontMode: element.frontMode },
        });
        return;
    }
    if (!blumRunner && !gtvRunner) {
        ctx.hardware.push({
            id: deterministicId(ctx.furniture.id, module.id, element.id, 'runner'),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            sourceElementId: element.id,
            role: 'runner',
            hardwareSelectionId: selection.id,
            name: selection.name ?? `${selection.manufacturer ?? 'Selected'} drawer runner`,
            quantity: element.count,
            unit: 'set',
            estimated: true,
            note: 'Selected hardware is recorded in BOM, but its verified dimensional profile is not available.',
        });
        issue(ctx, {
            code: 'DRAWER_RUNNER_PROFILE_UNVERIFIED',
            severity: 'blocking',
            category: 'hardware',
            message: `Module ${moduleIndex + 1}: selected ${selection.manufacturer ?? 'runner'} system has no verified Makster dimensional profile; drawer dimensions cannot be released`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
            metadata: { hardwareSelectionId: selection.id, manufacturer: selection.manufacturer, name: selection.name },
        });
        return;
    }
    const cfg = element.drawerBox;
    const drawerMaterial = cfg?.materialSelectionId ?? ctx.furniture.construction.defaultCarcassMaterialSelectionId;
    const bottomMaterial = cfg?.bottomMaterialSelectionId ?? drawerMaterial;
    const bottomThickness = measuredOr(cfg?.bottomThickness, ctx.rules.blum.defaultDrawerBottomThickness);
    const sideThickness = measuredOr(cfg?.sideThickness, ctx.rules.blum.defaultDrawerSideThickness);
    const sideHeight = measuredOr(cfg?.sideHeight, ctx.rules.blum.defaultDrawerSideHeight);
    const runnerName = gtvRunner
        ? `GTV Modern Slide ${Number(gtvRunner.nominalLength) / 10} mm runner set`
        : `Blum ${blumRunner.system.toUpperCase()} runner set`;
    const runnerNote = gtvRunner
        ? `${Number(gtvRunner.nominalLength) / 10} mm · ${gtvRunner.motion} · 18 mm timber-drawer profile`
        : `${Number(blumRunner.nominalLength) / 10} mm · ${blumRunner.motion}`;
    ctx.hardware.push({
        id: deterministicId(ctx.furniture.id, module.id, element.id, 'runner'),
        furnitureId: ctx.furniture.id,
        moduleId: module.id,
        sourceElementId: element.id,
        role: 'runner',
        hardwareSelectionId: selection.id,
        name: runnerName,
        quantity: element.count,
        unit: 'set',
        estimated: gtvRunner ? gtvRunner.estimated : blumRunner.estimated,
        note: runnerNote,
    });
    const depthFits = gtvRunner
        ? gtvRunnerDepthFits(bodyDepth, gtvRunner)
        : runnerDepthFits(bodyDepth, blumRunner, ctx.rules);
    if (!depthFits) {
        const nl = gtvRunner?.nominalLength ?? blumRunner.nominalLength;
        issue(ctx, {
            code: 'DRAWER_RUNNER_TOO_DEEP',
            severity: 'blocking',
            category: 'geometry',
            message: `Module ${moduleIndex + 1}: ${Number(nl) / 10} mm runner does not fit ${Number(bodyDepth) / 10} mm cabinet depth`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
        });
        return;
    }
    if (gtvRunner && Number(sideThickness) > Number(gtvRunner.maxSideThickness)) {
        issue(ctx, {
            code: 'GTV_MODERN_SLIDE_SIDE_THICKNESS_EXCEEDED',
            severity: 'blocking',
            category: 'hardware',
            message: `Module ${moduleIndex + 1}: drawer side ${Number(sideThickness) / 10} mm exceeds verified GTV Modern Slide maximum ${Number(gtvRunner.maxSideThickness) / 10} mm`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
        });
        return;
    }
    if (blumRunner?.system === 'legrabox') {
        const cut = legraboxCutDimensions(innerWidth, blumRunner);
        ctx.hardware.push({
            id: deterministicId(ctx.furniture.id, module.id, element.id, 'legrabox-sides'),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            sourceElementId: element.id,
            role: 'runner',
            hardwareSelectionId: blumRunner.hardwareSelectionId,
            name: `Blum LEGRABOX ${blumRunner.legraboxHeightCode ?? 'M'} side/profile set`,
            quantity: element.count,
            unit: 'set',
            estimated: blumRunner.estimated,
        });
        for (let i = 0; i < element.count; i++) {
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-bottom`),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'drawer_bottom',
                name: `M${moduleIndex + 1} LEGRABOX ${i + 1} bottom`,
                quantity: 1,
                ...(bottomMaterial ? { materialSelectionId: bottomMaterial } : {}),
                length: cut.bottomLength,
                width: cut.bottomWidth,
                thickness: measuredOr(cfg?.bottomThickness, mm(16)),
                grainDirection: materialGrain(ctx, bottomMaterial),
                edges: [],
                estimated: cfg?.bottomThickness?.state !== 'confirmed',
                tags: ['blum-legrabox', 'official-cut-formula'],
            });
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-back`),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'drawer_back',
                name: `M${moduleIndex + 1} LEGRABOX ${i + 1} back`,
                quantity: 1,
                ...(drawerMaterial ? { materialSelectionId: drawerMaterial } : {}),
                length: cut.backWidth,
                width: cut.backHeight,
                thickness: sideThickness,
                grainDirection: materialGrain(ctx, drawerMaterial),
                edges: edgeFront(ctx, ctx.furniture.construction.defaultEdgeMaterialSelectionId),
                estimated: cfg?.sideThickness?.state !== 'confirmed',
                tags: ['blum-legrabox', 'official-cut-formula'],
            });
            addDrawerFront(ctx, module, element, moduleIndex, i, innerWidth, drawerMaterial);
        }
    }
    else {
        const envelope = gtvRunner
            ? gtvModernSlideEnvelope(innerWidth, sideThickness, gtvRunner)
            : (() => {
                const e = timberDrawerEnvelope(innerWidth, blumRunner, ctx.rules);
                return {
                    innerDrawerWidth: (Number(e.outerWidth) - 2 * Number(sideThickness)),
                    outerWidth: e.outerWidth,
                    boxLength: e.boxLength,
                };
            })();
        const betweenSides = gtvRunner ? envelope.innerDrawerWidth : (Number(envelope.outerWidth) - 2 * Number(sideThickness));
        if (Number(betweenSides) <= 0) {
            issue(ctx, {
                code: 'DRAWER_BOX_TOO_NARROW',
                severity: 'blocking',
                category: 'geometry',
                message: `Module ${moduleIndex + 1}: drawer box is too narrow after runner clearances`,
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                targetId: element.id,
            });
            return;
        }
        const bottomInstall = cfg?.bottomInstallation;
        const grooved = bottomInstall?.mode === 'groove';
        let grooveDepth = null;
        let bottomCutWidth = null;
        let bottomCutLength = null;
        if (grooved) {
            const gw = bottomInstall.grooveWidth;
            const gd = bottomInstall.grooveDepth;
            const recess = bottomInstall.bottomRecessFromLowerEdge;
            const boxJoint = bottomInstall.boxJoint;
            const confirmed = gw?.value != null && gd?.value != null && recess?.value != null
                && gw.state === 'confirmed' && gd.state === 'confirmed' && recess.state === 'confirmed'
                && boxJoint === 'front_back_between_sides';
            if (!confirmed) {
                issue(ctx, {
                    code: 'DRAWER_BOTTOM_GROOVE_PROFILE_REQUIRED',
                    severity: 'blocking',
                    category: 'construction',
                    message: `Module ${moduleIndex + 1}: grooved drawer bottom requires confirmed groove width/depth, bottom recess and box-joint convention`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: element.id,
                });
                return;
            }
            grooveDepth = gd.value;
            if (Number(bottomThickness) > Number(gw.value)) {
                issue(ctx, {
                    code: 'DRAWER_BOTTOM_TOO_THICK_FOR_GROOVE',
                    severity: 'blocking',
                    category: 'construction',
                    message: `Module ${moduleIndex + 1}: ${Number(bottomThickness) / 10} mm bottom does not fit ${Number(gw.value) / 10} mm groove`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: element.id,
                });
                return;
            }
            if (gtvRunner && Number(recess.value) > Number(gtvRunner.maxBottomRecess)) {
                issue(ctx, {
                    code: 'GTV_MODERN_SLIDE_BOTTOM_RECESS_EXCEEDED',
                    severity: 'blocking',
                    category: 'hardware',
                    message: `Module ${moduleIndex + 1}: bottom recess ${Number(recess.value) / 10} mm exceeds verified GTV Modern Slide maximum ${Number(gtvRunner.maxBottomRecess) / 10} mm`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: element.id,
                });
                return;
            }
            bottomCutWidth = (Number(betweenSides) + 2 * Number(grooveDepth));
            bottomCutLength = (Number(envelope.boxLength) - 2 * Number(sideThickness) + 2 * Number(grooveDepth));
        }
        for (let i = 0; i < element.count; i++) {
            const tags = gtvRunner ? ['gtv-modern-slide', 'verified-dimensional-profile', 'makster-timber-drawer-box'] : [`blum-${blumRunner.system}`, 'makster-timber-drawer-box'];
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-sides`),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'drawer_side',
                name: `M${moduleIndex + 1} drawer ${i + 1} sides`,
                quantity: 2,
                ...(drawerMaterial ? { materialSelectionId: drawerMaterial } : {}),
                length: envelope.boxLength,
                width: sideHeight,
                thickness: sideThickness,
                grainDirection: materialGrain(ctx, drawerMaterial),
                edges: edgeFront(ctx, ctx.furniture.construction.defaultEdgeMaterialSelectionId),
                estimated: cfg?.sideThickness?.state !== 'confirmed' || cfg?.sideHeight?.state !== 'confirmed',
                tags,
            });
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-back`),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'drawer_back',
                name: `M${moduleIndex + 1} drawer ${i + 1} back`,
                quantity: 1,
                ...(drawerMaterial ? { materialSelectionId: drawerMaterial } : {}),
                length: betweenSides,
                width: sideHeight,
                thickness: sideThickness,
                grainDirection: materialGrain(ctx, drawerMaterial),
                edges: edgeFront(ctx, ctx.furniture.construction.defaultEdgeMaterialSelectionId),
                estimated: cfg?.sideThickness?.state !== 'confirmed' || cfg?.sideHeight?.state !== 'confirmed',
                tags,
            });
            if (grooved) {
                addPart(ctx, {
                    id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-inner-front`),
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    sourceElementId: element.id,
                    kind: 'drawer_back',
                    name: `M${moduleIndex + 1} drawer ${i + 1} inner front`,
                    quantity: 1,
                    ...(drawerMaterial ? { materialSelectionId: drawerMaterial } : {}),
                    length: betweenSides,
                    width: sideHeight,
                    thickness: sideThickness,
                    grainDirection: materialGrain(ctx, drawerMaterial),
                    edges: [],
                    estimated: false,
                    tags: [...tags, 'drawer-inner-front', 'front-back-between-sides'],
                });
            }
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${i + 1}-bottom`),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'drawer_bottom',
                name: `M${moduleIndex + 1} drawer ${i + 1} bottom`,
                quantity: 1,
                ...(bottomMaterial ? { materialSelectionId: bottomMaterial } : {}),
                length: grooved ? bottomCutLength : envelope.boxLength,
                width: grooved ? bottomCutWidth : envelope.outerWidth,
                thickness: bottomThickness,
                grainDirection: materialGrain(ctx, bottomMaterial),
                edges: [],
                estimated: cfg?.bottomThickness?.state !== 'confirmed',
                tags: grooved ? [...tags, 'grooved-bottom', 'shop-profile-3x10'] : [...tags, 'makster-overlay-bottom'],
            });
            addDrawerFront(ctx, module, element, moduleIndex, i, innerWidth, drawerMaterial);
        }
    }
    if (gtvRunner && selection.machiningMethod === 'manual_template') {
        issue(ctx, {
            code: 'GTV_RUNNER_MANUAL_TEMPLATE',
            severity: 'info',
            category: 'manufacturing',
            message: `Module ${moduleIndex + 1}: GTV runner installation is manual-template; Makster releases cut sizing but intentionally emits no CNC runner drilling`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: element.id,
            metadata: { hardwareSelectionId: selection.id, nominalLengthMm: Number(gtvRunner.nominalLength) / 10 },
        });
        return;
    }
    const runnerForMachining = blumRunner;
    if (!runnerForMachining)
        return;
    const pattern = ctx.manufacturingData.getRunnerCabinetDrillingPattern(selection);
    const runnerLines = cfg?.runnerLinesFromBottom;
    const linesConfirmed = runnerLines?.length === element.count && runnerLines.every((line) => line.value != null && line.state === 'confirmed');
    if (pattern?.verified && linesConfirmed) {
        for (const sideName of ['left', 'right']) {
            const target = ctx.parts.find((part) => part.moduleId === module.id && part.kind === 'side' && part.name.includes(sideName));
            if (!target)
                continue;
            for (let drawerIndex = 0; drawerIndex < element.count; drawerIndex++) {
                const runnerLine = runnerLines[drawerIndex].value;
                for (let holeIndex = 0; holeIndex < pattern.holes.length; holeIndex++) {
                    const hole = pattern.holes[holeIndex];
                    ctx.machining.push({
                        id: deterministicId(ctx.furniture.id, module.id, element.id, `drawer-${drawerIndex + 1}-${sideName}-runner-hole-${holeIndex + 1}`),
                        furnitureId: ctx.furniture.id,
                        moduleId: module.id,
                        sourceElementId: element.id,
                        targetPartId: target.id,
                        kind: 'drill',
                        face: sideName === 'left' ? 'right' : 'left',
                        x: hole.fromFront,
                        y: runnerLine,
                        diameter: hole.diameter,
                        depth: hole.depth,
                        reference: 'front-edge/module-bottom',
                        hardwareSelectionId: runnerForMachining.hardwareSelectionId,
                        estimated: false,
                        verificationSource: pattern.sourceKind,
                        verificationDetail: {
                            manufacturer: pattern.manufacturer,
                            hardwareCode: pattern.hardwareCode,
                            catalogVersion: pattern.catalogVersion,
                            ...(pattern.sourceChecksumSha256 ? { sourceChecksumSha256: pattern.sourceChecksumSha256 } : {}),
                            ...(pattern.schemaFingerprint ? { schemaFingerprint: pattern.schemaFingerprint } : {}),
                            ...(pattern.adapterId ? { adapterId: pattern.adapterId } : {}),
                            ...(pattern.manualVerificationId ? { manualVerificationId: pattern.manualVerificationId } : {}),
                            ...(pattern.verifiedBy ? { verifiedBy: pattern.verifiedBy } : {}),
                            ...(pattern.verifiedAt ? { verifiedAt: pattern.verifiedAt } : {}),
                        },
                        note: `${pattern.manufacturer} ${pattern.hardwareCode} runner fixing · ${hole.fastener}${hole.optional ? ' · optional' : ''}`,
                    });
                }
            }
        }
    }
    else {
        if (!pattern?.verified) {
            issue(ctx, {
                code: 'RUNNER_MANUFACTURING_DATA_REQUIRED',
                severity: 'warning',
                category: 'manufacturing',
                message: `Module ${moduleIndex + 1}: exact runner drilling requires manufacturer BXF/CAD-CAM data or a verified drilling profile`,
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                targetId: element.id,
                metadata: { hardwareCode: selection.code, runnerSystem: runnerForMachining.system },
            });
        }
        if (!linesConfirmed) {
            issue(ctx, {
                code: 'RUNNER_VERTICAL_LINES_REQUIRED',
                severity: 'warning',
                category: 'manufacturing',
                message: `Module ${moduleIndex + 1}: confirmed runner mounting lines are required for automatic CNC drilling`,
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                targetId: element.id,
                metadata: { drawerCount: element.count, providedLines: runnerLines?.length ?? 0 },
            });
        }
        for (const sideName of ['left', 'right']) {
            const target = ctx.parts.find((part) => part.moduleId === module.id && part.kind === 'side' && part.name.includes(sideName));
            if (target) {
                ctx.machining.push({
                    id: deterministicId(ctx.furniture.id, module.id, element.id, `runner-ref-${sideName}`),
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    sourceElementId: element.id,
                    targetPartId: target.id,
                    kind: 'reference_line',
                    face: sideName === 'left' ? 'right' : 'left',
                    x: mm(37),
                    y: runnerLines?.[0]?.value ?? mm(0),
                    reference: 'front-edge/module-bottom',
                    hardwareSelectionId: runnerForMachining.hardwareSelectionId,
                    estimated: true,
                    verificationSource: 'estimated',
                    note: 'Runner reference only. CNC release is held until exact manufacturer drilling data and confirmed vertical lines are present.',
                });
            }
        }
    }
}
function compileModule(ctx, module, moduleIndex, bodyHeight, bodyDepth, carcassThickness) {
    const externalWidth = resolveModuleWidth(module);
    if (externalWidth == null) {
        issue(ctx, {
            code: 'MODULE_WIDTH_NOT_FIXED',
            severity: 'blocking',
            category: 'geometry',
            message: `Module ${moduleIndex + 1} must have a fixed width in Engineering 0.6`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: module.id,
        });
        return;
    }
    const innerWidth = (Number(externalWidth) - 2 * Number(carcassThickness));
    if (Number(innerWidth) <= 0) {
        issue(ctx, {
            code: 'MODULE_TOO_NARROW',
            severity: 'blocking',
            category: 'geometry',
            message: `Module ${moduleIndex + 1} is too narrow for the selected carcass thickness`,
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            targetId: module.id,
        });
        return;
    }
    const carcassMaterial = ctx.furniture.construction.defaultCarcassMaterialSelectionId;
    const edgeMaterial = ctx.furniture.construction.defaultEdgeMaterialSelectionId;
    const grain = materialGrain(ctx, carcassMaterial);
    for (const side of ['left', 'right']) {
        addPart(ctx, {
            id: deterministicId(ctx.furniture.id, module.id, `side-${side}`),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            kind: 'side',
            name: `M${moduleIndex + 1} ${side} side`,
            quantity: 1,
            ...(carcassMaterial ? { materialSelectionId: carcassMaterial } : {}),
            length: bodyHeight,
            width: bodyDepth,
            thickness: carcassThickness,
            grainDirection: grain,
            edges: edgeFront(ctx, edgeMaterial),
            estimated: false,
        });
    }
    for (const kind of ['top', 'bottom']) {
        addPart(ctx, {
            id: deterministicId(ctx.furniture.id, module.id, kind),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            kind,
            name: `M${moduleIndex + 1} ${kind}`,
            quantity: 1,
            ...(carcassMaterial ? { materialSelectionId: carcassMaterial } : {}),
            length: innerWidth,
            width: bodyDepth,
            thickness: carcassThickness,
            grainDirection: 'horizontal',
            edges: edgeFront(ctx, edgeMaterial),
            estimated: false,
        });
    }
    const back = ctx.furniture.construction.backPanel;
    if (back.mode !== 'none') {
        const backThickness = back.thickness?.value ?? mm(8);
        const backMaterial = back.materialSelectionId;
        const backMargin = ctx.rules.backPanelMargin;
        const grooveDepth = back.grooveDepth?.value ?? ctx.rules.backGroove.defaultDepth;
        const grooveMode = back.mode === 'groove';
        const innerHeight = (Number(bodyHeight) - 2 * Number(carcassThickness));
        const grooveLength = (Number(innerHeight) + 2 * Number(grooveDepth));
        const grooveWidth = (Number(innerWidth) + 2 * Number(grooveDepth));
        addPart(ctx, {
            id: deterministicId(ctx.furniture.id, module.id, 'back'),
            furnitureId: ctx.furniture.id,
            moduleId: module.id,
            kind: 'back',
            name: `M${moduleIndex + 1} back`,
            quantity: 1,
            ...(backMaterial ? { materialSelectionId: backMaterial } : {}),
            length: grooveMode ? grooveLength : (Number(bodyHeight) - Number(backMargin)),
            width: grooveMode ? grooveWidth : (Number(externalWidth) - Number(backMargin)),
            thickness: backThickness,
            grainDirection: materialGrain(ctx, backMaterial),
            edges: [],
            estimated: back.mode === 'recessed' || (grooveMode && (back.grooveDepth?.state !== 'confirmed' || back.grooveInset?.state !== 'confirmed')),
        });
        compileBackGrooves(ctx, module, moduleIndex, bodyHeight, bodyDepth, backThickness);
    }
    for (const element of module.contents) {
        if (element.kind === 'shelf_stack') {
            const shelfMaterial = element.materialSelectionId ?? carcassMaterial;
            const shelfThickness = materialThickness(ctx, shelfMaterial, carcassThickness);
            const shelfDepth = (Number(bodyDepth) - Number(ctx.rules.shelfRearClearance));
            addPart(ctx, {
                id: deterministicId(ctx.furniture.id, module.id, element.id, 'shelf'),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                kind: 'shelf',
                name: `M${moduleIndex + 1} shelves`,
                quantity: element.count,
                ...(shelfMaterial ? { materialSelectionId: shelfMaterial } : {}),
                length: innerWidth,
                width: shelfDepth,
                thickness: shelfThickness,
                grainDirection: materialGrain(ctx, shelfMaterial),
                edges: edgeFront(ctx, edgeMaterial),
                estimated: false,
            });
            if (Number(innerWidth) > Number(ctx.rules.maxShelfSpanWithoutSupport)) {
                issue(ctx, {
                    code: 'SHELF_SPAN_WARNING',
                    severity: 'warning',
                    category: 'construction',
                    message: `Shelf span ${Number(innerWidth) / 10} mm exceeds the default unsupported span`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: element.id,
                    metadata: { innerWidth },
                });
            }
        }
        if (element.kind === 'clothes_rail') {
            const length = (Number(innerWidth) - 2 * Number(ctx.rules.railEndClearance));
            ctx.hardware.push({
                id: deterministicId(ctx.furniture.id, module.id, element.id, 'rail'),
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceElementId: element.id,
                role: 'rail',
                ...(element.railHardwareSelectionId ? { hardwareSelectionId: element.railHardwareSelectionId } : {}),
                name: 'Clothes rail',
                quantity: element.count,
                unit: 'pcs',
                length,
                estimated: !element.railHardwareSelectionId,
            });
        }
        if (element.kind === 'drawer_stack') {
            compileDrawerStack(ctx, module, element, moduleIndex, innerWidth, bodyDepth, carcassThickness);
        }
    }
    compileSystem32ShelfRows(ctx, module, bodyHeight, bodyDepth);
}
function frontHingeSide(front, index) {
    const explicit = front.hingeSides?.[index];
    if (explicit)
        return { side: explicit, estimated: false };
    if (front.opening === 'left')
        return { side: 'left', estimated: true };
    if (front.opening === 'right')
        return { side: 'right', estimated: true };
    return { side: index % 2 === 0 ? 'left' : 'right', estimated: true };
}
function compileFronts(ctx, bodyHeight) {
    const frontDefault = ctx.furniture.construction.defaultFrontMaterialSelectionId;
    const edgeMaterial = ctx.furniture.construction.defaultEdgeMaterialSelectionId;
    const defaultHingeSelection = [...ctx.hardwareSelections.values()].find((item) => item.role === 'hinge');
    for (const front of ctx.furniture.fronts) {
        const selectedHingeSelection = front.hingeHardwareSelectionId
            ? ctx.hardwareSelections.get(front.hingeHardwareSelectionId)
            : defaultHingeSelection;
        const blumHinge = resolveBlumHinge(selectedHingeSelection, ctx.rules);
        if (front.kind !== 'hinged')
            continue;
        const moduleIds = front.moduleIds;
        if (!moduleIds.length || front.count <= 0)
            continue;
        const pairedDouble = moduleIds.length === 1 && front.count === 2 && front.split === 'vertical';
        if (front.count !== moduleIds.length && !pairedDouble) {
            issue(ctx, {
                code: 'FRONT_COUNT_MAPPING_UNSUPPORTED',
                severity: 'blocking',
                category: 'construction',
                message: `Engineering 0.7 supports one hinged front per referenced module or one paired double front on a single module`,
                furnitureId: ctx.furniture.id,
                targetId: front.id,
                metadata: { count: front.count, moduleCount: moduleIds.length },
            });
            continue;
        }
        const material = front.materialSelectionId ?? frontDefault;
        const materialInfo = material ? ctx.materials.get(material) : undefined;
        const thickness = materialThickness(ctx, material, mm(18));
        const frontHeight = (Number(bodyHeight) - 2 * Number(ctx.rules.frontGap));
        let totalHinges = 0;
        let anyDerivedSide = false;
        const leafEntries = pairedDouble
            ? [{ moduleId: moduleIds[0], leafIndex: 0, paired: true }, { moduleId: moduleIds[0], leafIndex: 1, paired: true }]
            : moduleIds.map((moduleId, leafIndex) => ({ moduleId, leafIndex, paired: false }));
        leafEntries.forEach(({ moduleId, leafIndex, paired }, index) => {
            const module = ctx.furniture.modules.find((item) => item.id === moduleId);
            const moduleWidth = module ? resolveModuleWidth(module) : null;
            if (!module || moduleWidth == null) {
                issue(ctx, {
                    code: 'FRONT_MODULE_UNRESOLVED',
                    severity: 'blocking',
                    category: 'geometry',
                    message: `Front references a module without a fixed width`,
                    furnitureId: ctx.furniture.id,
                    targetId: front.id,
                });
                return;
            }
            const frontWidth = (paired
                ? (Number(moduleWidth) - 3 * Number(ctx.rules.frontGap)) / 2
                : Number(moduleWidth) - 2 * Number(ctx.rules.frontGap));
            const frontPartId = deterministicId(ctx.furniture.id, front.id, module.id, paired ? `front-${leafIndex + 1}` : 'front');
            addPart(ctx, {
                id: frontPartId,
                furnitureId: ctx.furniture.id,
                moduleId: module.id,
                sourceFrontId: front.id,
                kind: 'front',
                name: paired ? `Front ${ctx.furniture.modules.indexOf(module) + 1}${leafIndex === 0 ? 'L' : 'R'}` : `Front ${index + 1}`,
                quantity: 1,
                ...(material ? { materialSelectionId: material } : {}),
                length: frontHeight,
                width: frontWidth,
                thickness,
                grainDirection: materialGrain(ctx, material),
                edges: allEdges(ctx, edgeMaterial),
                estimated: false,
            });
            const plan = planBlumHinges(frontHeight, frontWidth, thickness, materialInfo, ctx.rules);
            totalHinges += plan.count;
            if (plan.weightAboveDocumentedBasicBand) {
                issue(ctx, {
                    code: 'BLUM_HINGE_WEIGHT_VERIFY',
                    severity: 'warning',
                    category: 'hardware',
                    message: `Front ${index + 1}: estimated mass ${plan.weightKg.toFixed(1)} kg exceeds Blum's simple 2/3-hinge guidance band; ${plan.count} hinges are planned conservatively and should be verified in Product Configurator`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: frontPartId,
                    metadata: { estimatedWeightKg: plan.weightKg, plannedHingeCount: plan.count },
                });
            }
            if (plan.widthNeedsAdditionalHinge) {
                issue(ctx, {
                    code: 'BLUM_WIDE_FRONT_EXTRA_HINGE',
                    severity: 'info',
                    category: 'hardware',
                    message: `Front ${index + 1} is wider than 600 mm; an additional hinge was added`,
                    furnitureId: ctx.furniture.id,
                    moduleId: module.id,
                    targetId: frontPartId,
                });
            }
            if (blumHinge) {
                const hingeSide = paired
                    ? { side: leafIndex === 0 ? 'left' : 'right', estimated: false }
                    : frontHingeSide(front, index);
                anyDerivedSide ||= hingeSide.estimated;
                const cupCenterFromEdge = (Number(blumHinge.drillingDistance) + Number(ctx.rules.blum.hingeCupDiameter) / 2);
                const sidePart = ctx.parts.find((part) => part.moduleId === module.id && part.kind === 'side' && part.name.includes(`${hingeSide.side} side`));
                for (const [hingeIndex, center] of plan.centers.entries()) {
                    const cupX = hingeSide.side === 'left'
                        ? cupCenterFromEdge
                        : (Number(frontWidth) - Number(cupCenterFromEdge));
                    ctx.machining.push({
                        id: deterministicId(ctx.furniture.id, front.id, module.id, `hinge-${hingeIndex + 1}-cup`),
                        furnitureId: ctx.furniture.id,
                        moduleId: module.id,
                        sourceFrontId: front.id,
                        targetPartId: frontPartId,
                        kind: 'hinge_cup',
                        face: 'back',
                        x: cupX,
                        y: center,
                        diameter: ctx.rules.blum.hingeCupDiameter,
                        depth: ctx.rules.blum.hingeCupDepth,
                        reference: `${hingeSide.side}-hinge-edge`,
                        hardwareSelectionId: blumHinge.hardwareSelectionId,
                        estimated: blumHinge.estimated || hingeSide.estimated,
                        verificationSource: 'manufacturer_catalog',
                        verificationDetail: {
                            manufacturer: 'Blum',
                            hardwareCode: selectedHingeSelection?.code ?? 'CLIP-TOP-BLUMOTION-110',
                            catalogVersion: '2027/2028',
                        },
                        note: `CLIP top BLUMOTION ${blumHinge.openingAngleDeg}°; TB ${Number(blumHinge.drillingDistance) / 10} mm`,
                    });
                    if (sidePart) {
                        const halfSpacing = Number(ctx.rules.blum.mountingPlateHoleSpacing) / 2;
                        for (const [holeIndex, dy] of [-halfSpacing, halfSpacing].entries()) {
                            ctx.machining.push({
                                id: deterministicId(ctx.furniture.id, front.id, module.id, `hinge-${hingeIndex + 1}-plate-${holeIndex + 1}`),
                                furnitureId: ctx.furniture.id,
                                moduleId: module.id,
                                sourceFrontId: front.id,
                                targetPartId: sidePart.id,
                                kind: 'drill',
                                face: hingeSide.side === 'left' ? 'right' : 'left',
                                x: ctx.rules.blum.mountingPlateSetback,
                                y: (Number(center) + dy),
                                diameter: mm(5),
                                reference: 'front-edge/system-32',
                                hardwareSelectionId: blumHinge.hardwareSelectionId,
                                estimated: blumHinge.estimated || hingeSide.estimated,
                                verificationSource: 'manufacturer_catalog',
                                verificationDetail: {
                                    manufacturer: 'Blum',
                                    hardwareCode: selectedHingeSelection?.code ?? 'CLIP-TOP-BLUMOTION-110',
                                    catalogVersion: '2027/2028',
                                },
                                note: 'Mounting plate hole pair, 32 mm vertical spacing',
                            });
                        }
                    }
                }
            }
        });
        ctx.hardware.push({
            id: deterministicId(ctx.furniture.id, front.id, 'hinges'),
            furnitureId: ctx.furniture.id,
            sourceFrontId: front.id,
            role: 'hinge',
            ...((blumHinge?.hardwareSelectionId ?? selectedHingeSelection?.id) ? { hardwareSelectionId: blumHinge?.hardwareSelectionId ?? selectedHingeSelection.id } : {}),
            name: blumHinge ? 'Blum CLIP top BLUMOTION hinge' : (selectedHingeSelection?.name ?? 'Concealed hinge'),
            quantity: totalHinges,
            unit: 'pcs',
            estimated: !blumHinge || blumHinge.estimated,
            ...(!blumHinge && selectedHingeSelection ? { note: 'Selected hinge is recorded in BOM, but its verified cup/plate drilling profile is not available.' } : {}),
        });
        if (!blumHinge) {
            const selected = selectedHingeSelection;
            if (selected?.machiningMethod === 'manual_template') {
                issue(ctx, {
                    code: 'HINGE_MANUAL_TEMPLATE',
                    severity: 'info',
                    category: 'manufacturing',
                    message: `Selected ${selected.manufacturer ?? 'hinge'} system is installed manually with a physical template; Makster intentionally emits no CNC hinge drilling`,
                    furnitureId: ctx.furniture.id,
                    targetId: front.id,
                    metadata: { estimatedHingeQuantity: totalHinges, hardwareSelectionId: selected.id, manufacturer: selected.manufacturer, name: selected.name },
                });
            }
            else {
                issue(ctx, {
                    code: selected ? 'HINGE_PROFILE_UNVERIFIED' : 'HINGE_SYSTEM_UNRESOLVED',
                    severity: 'blocking',
                    category: 'hardware',
                    message: selected
                        ? `Selected ${selected.manufacturer ?? 'hinge'} system has no verified Makster drilling profile; hinge machining cannot be released`
                        : `Hinge system is not selected; drilling pattern cannot be released to production`,
                    furnitureId: ctx.furniture.id,
                    targetId: front.id,
                    metadata: { estimatedHingeQuantity: totalHinges, ...(selected ? { hardwareSelectionId: selected.id, manufacturer: selected.manufacturer, name: selected.name } : {}) },
                });
            }
        }
        else if (anyDerivedSide) {
            issue(ctx, {
                code: 'HINGE_SIDE_DERIVED',
                severity: 'warning',
                category: 'hardware',
                message: 'One or more hinge sides were derived from front opening/mixed order. Set front.hingeSides for production-confirmed machining.',
                furnitureId: ctx.furniture.id,
                targetId: front.id,
            });
        }
    }
}
function checkFurnitureGeometry(ctx, totalWidth, totalHeight) {
    const widths = ctx.furniture.modules.map(resolveModuleWidth);
    if (widths.some((width) => width == null))
        return;
    const sum = widths.reduce((acc, width) => acc + Number(width), 0);
    if (sum !== Number(totalWidth)) {
        issue(ctx, {
            code: 'MODULE_WIDTH_SUM_MISMATCH',
            severity: 'blocking',
            category: 'geometry',
            message: `Module widths total ${sum / 10} mm but furniture width is ${Number(totalWidth) / 10} mm`,
            furnitureId: ctx.furniture.id,
            targetId: ctx.furniture.id,
            metadata: { moduleWidthTotal: sum, furnitureWidth: totalWidth },
        });
    }
    const room = ctx.project.site.rooms.find((item) => item.id === ctx.furniture.roomId);
    const roomHeight = room?.dimensions?.height.value;
    if (roomHeight != null) {
        const clearance = Number(roomHeight) - Number(totalHeight);
        for (const constraint of ctx.project.constraints.filter((item) => item.kind === 'ceiling_clearance' && item.targetIds.includes(ctx.furniture.id))) {
            const minimum = Number(constraint.params.minimumMm10 ?? 0);
            if (clearance < minimum) {
                issue(ctx, {
                    code: 'CEILING_CLEARANCE_TOO_SMALL',
                    severity: constraint.severity,
                    category: 'manufacturing',
                    message: `Ceiling clearance ${clearance / 10} mm is below required ${minimum / 10} mm`,
                    furnitureId: ctx.furniture.id,
                    targetId: constraint.id,
                    metadata: { clearanceMm10: clearance, minimumMm10: minimum },
                });
            }
        }
    }
}
function checkUnresolvedMaterials(ctx) {
    const carcass = ctx.furniture.construction.defaultCarcassMaterialSelectionId;
    if (!carcass) {
        issue(ctx, {
            code: 'CARCASS_MATERIAL_UNRESOLVED',
            severity: 'blocking',
            category: 'material',
            message: 'Carcass material must be selected before production',
            furnitureId: ctx.furniture.id,
            targetId: ctx.furniture.id,
        });
    }
    if (!ctx.furniture.construction.defaultEdgeMaterialSelectionId) {
        issue(ctx, {
            code: 'EDGE_MATERIAL_UNRESOLVED',
            severity: 'warning',
            category: 'edge',
            message: 'Edge band material is not selected; edge operations are generated with the default 0.8 mm thickness only',
            furnitureId: ctx.furniture.id,
            targetId: ctx.furniture.id,
        });
    }
}
export function compileWardrobe(project, furniture, rules, manufacturingData) {
    const ctx = {
        project,
        furniture,
        rules,
        manufacturingData,
        materials: new Map(project.selections.materials.map((item) => [item.id, item])),
        hardwareSelections: new Map(project.selections.hardware.map((item) => [item.id, item])),
        parts: [],
        hardware: [],
        machining: [],
        issues: [],
    };
    const totalWidth = requireMeasured('furniture.width', furniture.dimensions.width);
    const totalHeight = requireMeasured('furniture.height', furniture.dimensions.height);
    const totalDepth = requireMeasured('furniture.depth', furniture.dimensions.depth);
    const carcassThickness = requireMeasured('carcassThickness', furniture.construction.carcassThickness);
    const plinthHeight = furniture.construction.plinth?.mode === 'separate'
        ? (furniture.construction.plinth.height?.value ?? 0)
        : 0;
    const bodyHeight = (Number(totalHeight) - Number(plinthHeight));
    checkFurnitureGeometry(ctx, totalWidth, totalHeight);
    checkUnresolvedMaterials(ctx);
    furniture.modules.forEach((module, index) => compileModule(ctx, module, index, bodyHeight, totalDepth, carcassThickness));
    if (furniture.kind === 'wardrobe' && furniture.fronts.length === 0) {
        issue(ctx, {
            code: 'FRONTS_NOT_DEFINED',
            severity: 'blocking',
            category: 'construction',
            message: 'Wardrobe fronts are not defined; carcass can be calculated, but production cannot be released',
            furnitureId: furniture.id,
            targetId: furniture.id,
        });
    }
    compileFronts(ctx, bodyHeight);
    if (furniture.construction.backPanel.mode === 'recessed') {
        issue(ctx, {
            code: 'BACK_PANEL_DETAIL_ESTIMATED',
            severity: 'warning',
            category: 'construction',
            message: 'Recessed back panels remain a non-grooved generic construction. Use backPanel.mode="groove" with confirmed groove parameters for CNC machining.',
            furnitureId: furniture.id,
            targetId: furniture.id,
        });
    }
    return {
        furnitureId: furniture.id,
        name: furniture.name,
        parts: ctx.parts,
        hardware: ctx.hardware,
        machining: ctx.machining,
        issues: ctx.issues,
    };
}
