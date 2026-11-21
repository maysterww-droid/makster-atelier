import { compileWardrobe } from './wardrobe.js';
import { compileKitchen, KITCHEN_RULESET_ID } from './kitchen.js';
import { wardrobeRulesV05 } from './rules.js';
import { SafeCatalogManufacturingDataProvider } from './manufacturing-data.js';
import { ENGINEERING_ENGINE_VERSION } from './types.js';
import { mm10AreaToMm2, stableChecksum } from './utils.js';
import { getHardwareCatalogRecord, hardwareMayAuthorizeDrilling } from './master-catalog.js';
import { evaluateCatalogProductionIntelligence } from './catalog-production-intelligence.js';
function aggregateBom(parts, hardware) {
    const materialGroups = new Map();
    for (const part of parts) {
        const key = `${part.materialSelectionId ?? 'unresolved'}:${part.thickness}:${part.grainDirection}`;
        const existing = materialGroups.get(key);
        const area = mm10AreaToMm2(part.length, part.width, part.quantity);
        if (existing) {
            existing.quantity += part.quantity;
            existing.totalAreaMm2 += area;
            existing.partIds.push(part.id);
        }
        else {
            materialGroups.set(key, {
                kind: 'panel_material',
                ...(part.materialSelectionId ? { materialSelectionId: part.materialSelectionId } : {}),
                thickness: part.thickness,
                grainDirection: part.grainDirection,
                quantity: part.quantity,
                totalAreaMm2: area,
                partIds: [part.id],
            });
        }
    }
    const hardwareGroups = new Map();
    for (const req of hardware) {
        const key = `${req.hardwareSelectionId ?? 'unresolved'}:${req.role}:${req.name}:${req.unit}`;
        const existing = hardwareGroups.get(key);
        if (existing) {
            existing.quantity += req.quantity;
            existing.requirementIds.push(req.id);
        }
        else {
            hardwareGroups.set(key, {
                kind: 'hardware',
                ...(req.hardwareSelectionId ? { hardwareSelectionId: req.hardwareSelectionId } : {}),
                role: req.role,
                name: req.name,
                quantity: req.quantity,
                unit: req.unit,
                requirementIds: [req.id],
            });
        }
    }
    return [...materialGroups.values(), ...hardwareGroups.values()];
}
function catalogTraceability(project) {
    const out = [];
    for (const h of project.selections.hardware) {
        if (!h.catalogRecordId) continue;
        const master = getHardwareCatalogRecord(h.catalogRecordId);
        out.push({ targetType:'hardware', hardwareSelectionId:h.id, catalogRecordId:h.catalogRecordId,
            ...(h.manufacturer?{manufacturer:h.manufacturer}:{}), ...(h.code?{modelOrCode:h.code}:h.name?{modelOrCode:h.name}:{}),
            ...(h.catalogTrust?{trust:h.catalogTrust}:{}), ...(h.catalogSource?{source:h.catalogSource}:{}),
            productionDrillingAuthorized: master ? hardwareMayAuthorizeDrilling(master) : false });
    }
    for (const furniture of project.furniture) for (const module of furniture.modules) {
        const apps=[...(module.kitchen?.appliances??[]),...(module.kitchen?.appliance?[module.kitchen.appliance]:[])];
        for (const a of apps) if (a.catalogRecordId) out.push({targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,
            catalogRecordId:a.catalogRecordId,...(a.manufacturer?{manufacturer:a.manufacturer}:{}),...(a.model?{modelOrCode:a.model}:{}),
            ...(a.catalogTrust?{trust:a.catalogTrust}:{}),...(a.catalogSource?{source:a.catalogSource}:{})});
    }
    return out;
}
function summary(issues) {
    const result = { info: 0, warnings: 0, errors: 0, blocking: 0, passed: 0 };
    for (const issue of issues) {
        if (issue.severity === 'info')
            result.info++;
        if (issue.severity === 'warning')
            result.warnings++;
        if (issue.severity === 'error')
            result.errors++;
        if (issue.severity === 'blocking')
            result.blocking++;
    }
    // Engineering 0.3 exposes a small stable set of positive checks for UI progress.
    result.passed = Math.max(0, 8 - result.blocking - result.errors);
    return result;
}
export class MaksterEngineeringCompiler {
    manufacturingData;
    constructor(manufacturingData = new SafeCatalogManufacturingDataProvider()) {
        this.manufacturingData = manufacturingData;
    }
    compile(project) {
        const furnitureResults = project.furniture.map((furniture) => {
            if (furniture.kind === 'wardrobe' || furniture.kind === 'built_in' || furniture.kind === 'cabinet') {
                return compileWardrobe(project, furniture, wardrobeRulesV05, this.manufacturingData);
            }
            if (furniture.kind === 'kitchen') {
                return compileKitchen(project, furniture, this.manufacturingData);
            }
            return {
                furnitureId: furniture.id,
                name: furniture.name,
                parts: [],
                hardware: [],
                machining: [],
                issues: [{
                        id: `issue:unsupported:${furniture.id}`,
                        code: 'FURNITURE_KIND_NOT_IMPLEMENTED',
                        severity: 'blocking',
                        category: 'construction',
                        message: `Engineering 0.7 does not yet compile ${furniture.kind}`,
                        furnitureId: furniture.id,
                        targetId: furniture.id,
                    }],
            };
        });
        const parts = furnitureResults.flatMap((item) => item.parts);
        const hardware = furnitureResults.flatMap((item) => item.hardware);
        const machining = furnitureResults.flatMap((item) => item.machining);
        const issues = furnitureResults.flatMap((item) => item.issues);
        const productionIntelligence = evaluateCatalogProductionIntelligence(project);
        issues.push(...productionIntelligence.issues);
        const checks = summary(issues);
        const bom = aggregateBom(parts, hardware);
        const traceability = catalogTraceability(project);
        const cncBlockers = [...productionIntelligence.cncBlockers];
        if (checks.blocking > 0 || checks.errors > 0) {
            cncBlockers.push({
                code: 'ENGINEERING_NOT_PRODUCTION_READY',
                message: `Engineering has ${checks.blocking} blocking and ${checks.errors} error checks`,
            });
        }
        const issueBlockerCodes = new Set([
            'RUNNER_MANUFACTURING_DATA_REQUIRED',
            'RUNNER_VERTICAL_LINES_REQUIRED',
            'BACK_PANEL_DETAIL_ESTIMATED',
        ]);
        for (const item of issues) {
            if (!issueBlockerCodes.has(item.code))
                continue;
            if (cncBlockers.some((existing) => existing.code === item.code && existing.targetId === item.targetId))
                continue;
            cncBlockers.push({
                code: item.code,
                message: item.message,
                ...(item.targetId ? { targetId: String(item.targetId) } : {}),
            });
        }
        const unresolvedOps = machining.filter((op) => op.estimated || op.kind === 'reference_line');
        if (unresolvedOps.length > 0) {
            cncBlockers.push({
                code: 'UNVERIFIED_MACHINING_OPERATIONS',
                message: `${unresolvedOps.length} machining operations are estimated/reference-only and cannot be released to CNC`,
            });
        }
        const cncRelease = { ready: cncBlockers.length === 0, blockers: cncBlockers };
        return {
            artifactVersion: '1.3.0',
            engineVersion: ENGINEERING_ENGINE_VERSION,
            ruleSetId: project.furniture.some((item) => item.kind === 'kitchen') ? KITCHEN_RULESET_ID : wardrobeRulesV05.id,
            projectId: project.projectId,
            revision: project.revision,
            generatedAt: new Date().toISOString(),
            inputChecksum: stableChecksum(project),
            readyForProduction: checks.blocking === 0 && checks.errors === 0,
            cncReady: cncRelease.ready,
            cncRelease,
            furniture: furnitureResults,
            parts,
            hardware,
            machining,
            bom,
            catalogTraceability: traceability,
            productionIntelligenceActions: productionIntelligence.actions,
            issues,
            checks,
            stats: {
                furnitureCount: project.furniture.length,
                moduleCount: project.furniture.reduce((sum, item) => sum + item.modules.length, 0),
                panelPartCount: parts.reduce((sum, item) => sum + item.quantity, 0),
                uniquePanelCount: parts.length,
                hardwareRequirementCount: hardware.length,
                machiningOperationCount: machining.length,
                totalPanelAreaMm2: parts.reduce((sum, part) => sum + mm10AreaToMm2(part.length, part.width, part.quantity), 0),
            },
        };
    }
}
