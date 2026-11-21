import { analyzeProjectAutoComplete } from './project-auto-complete.js';
import { analyzeRoomMeasurementCompleteness } from './room-measurement-completeness.js';
import { analyzeInstallationCollisions } from './installation-collision-check.js';
export function analyzeProductionReadiness(project, engineering) {
    const ac = analyzeProjectAutoComplete(project);
    const measurements = analyzeRoomMeasurementCompleteness(project);
    const installation = analyzeInstallationCollisions(project);
    const openSiteIssues = (project.installationSiteIssues ?? []).filter(x => x.status === 'open');
    const blockers = [];
    const warnings = [];
    if (project.furniture.length === 0 || engineering.parts.length === 0) {
        blockers.push({
            code: 'NO_PRODUCTION_CONTENT', severity: 'blocking', source: 'engineering',
            message: 'Current Revision has no manufacturable furniture/panel parts. Production release is not meaningful.'
        });
    }
    for (const issue of engineering.issues) {
        const item = {
            code: issue.code,
            severity: (issue.severity === 'blocking' || issue.severity === 'error') ? 'blocking' : issue.severity === 'warning' ? 'warning' : 'info',
            source: 'engineering',
            message: issue.message,
            ...(issue.targetId ? { targetId: String(issue.targetId) } : {})
        };
        if (item.severity === 'blocking')
            blockers.push(item);
        else if (item.severity === 'warning')
            warnings.push(item);
    }
    for (const issue of openSiteIssues) {
        const target = issue.targetFurnitureId ?? issue.targetModuleId;
        if (issue.severity === 'blocking') {
            blockers.push({ code: 'INSTALLATION_SITE_ISSUE', severity: 'blocking', source: 'engineering',
                message: `Site issue: ${issue.title}: ${issue.detail}`, ...(target ? { targetId: target } : {}) });
        }
        else if (issue.severity === 'warning') {
            warnings.push({ code: 'INSTALLATION_SITE_ISSUE_REVIEW', severity: 'warning', source: 'engineering',
                message: `Site issue: ${issue.title}: ${issue.detail}`, ...(target ? { targetId: target } : {}) });
        }
    }
    for (const item of installation.items) {
        if (item.severity === 'blocking') {
            blockers.push({
                code: `INSTALLATION_${item.kind.toUpperCase()}`, severity: 'blocking', source: 'engineering',
                message: `${item.title}: ${item.detail}`, ...(item.roomFeatureId ? { targetId: item.roomFeatureId } : {})
            });
        }
        else if (item.severity === 'warning') {
            warnings.push({
                code: `INSTALLATION_${item.kind.toUpperCase()}_REVIEW`, severity: 'warning', source: 'engineering',
                message: `${item.title}: ${item.detail}`, ...(item.roomFeatureId ? { targetId: item.roomFeatureId } : {})
            });
        }
    }
    for (const item of measurements.items) {
        if (item.status === 'missing') {
            blockers.push({
                code: 'ROOM_MEASUREMENT_MISSING', severity: 'blocking', source: 'engineering',
                message: `${item.title}: ${item.detail}`, ...(item.sourceId ? { targetId: item.sourceId } : {})
            });
        }
        else if (item.status === 'review') {
            warnings.push({
                code: 'ROOM_MEASUREMENT_REVIEW', severity: 'warning', source: 'engineering',
                message: `${item.title}: ${item.detail}`, ...(item.sourceId ? { targetId: item.sourceId } : {})
            });
        }
    }
    for (const item of ac.items) {
        if (item.status === 'blocking' || item.status === 'needs_measurement' || item.status === 'needs_approval') {
            blockers.push({
                code: `AUTO_COMPLETE_${item.status.toUpperCase()}`,
                severity: 'blocking', source: 'auto_complete', message: `${item.title}: ${item.detail}`,
                ...(item.moduleId ? { targetId: item.moduleId } : {})
            });
        }
    }
    // CNC blockers are reported separately because a project can be ready for manual production
    // while still not safe for automated drilling. They are warnings for generic production,
    // but keep cncReady false.
    for (const b of engineering.cncRelease.blockers) {
        warnings.push({
            code: b.code, severity: 'warning', source: 'cnc', message: b.message,
            ...(b.targetId ? { targetId: b.targetId } : b.hardwareSelectionId ? { targetId: b.hardwareSelectionId } : {})
        });
    }
    const unique = (xs) => [...new Map(xs.map(x => [`${x.source}:${x.code}:${x.targetId ?? ''}`, x])).values()];
    const hard = unique(blockers), warn = unique(warnings);
    const productionReady = engineering.readyForProduction && hard.length === 0;
    const total = Math.max(1, ac.items.length + engineering.checks.blocking + engineering.checks.errors);
    const closed = ac.summary.complete + ac.summary.safeAuto;
    const readinessPercent = productionReady ? 100 : Math.min(99, Math.max(0, Math.round((closed / total) * 100)));
    return {
        version: '2.8.4', projectId: project.projectId, revision: project.revision,
        status: productionReady ? 'READY' : 'HOLD', productionReady,
        cncReady: productionReady && engineering.cncReady,
        readinessPercent, blockers: hard, warnings: warn, autoComplete: ac.summary, checks: engineering.checks
    };
}
