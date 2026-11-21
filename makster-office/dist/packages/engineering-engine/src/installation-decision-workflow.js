import { buildConflictResolutionReport } from './conflict-resolution.js';
import { analyzeInstallationCollisions } from './installation-collision-check.js';
function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function recordInstallationDecision(project, req) {
    if (!req.approvedBy?.trim())
        throw new Error('installation_decision_approver_required');
    const report = buildConflictResolutionReport(project);
    const suggestion = report.suggestions.find(x => x.id === req.suggestionId);
    if (!suggestion)
        throw new Error('installation_decision_suggestion_not_current');
    if (suggestion.decisionPolicy === 'physical_fix_required' || !suggestion.decisionPolicy)
        throw new Error('installation_decision_cannot_waive_physical_conflict');
    const collision = analyzeInstallationCollisions(project).items.find(x => x.id === suggestion.conflictId);
    if (!collision)
        throw new Error('installation_decision_conflict_not_current');
    if (collision.severity === 'blocking')
        throw new Error('installation_decision_blocking_conflict_requires_physical_fix');
    const snapshot = structuredClone(project);
    snapshot.installationDecisions ??= [];
    const decision = {
        id: randomUUID(),
        conflictId: suggestion.conflictId,
        resolutionSuggestionId: suggestion.id,
        kind: suggestion.decisionPolicy === 'record_site_task' ? 'site_task' : 'design_decision',
        status: 'approved',
        title: suggestion.title,
        detail: [suggestion.detail, req.note?.trim()].filter(Boolean).join(' '),
        approvedBy: req.approvedBy.trim(),
        approvedAt: new Date().toISOString(),
        addressesWarning: suggestion.decisionPolicy === 'record_site_task',
        ...(collision.furnitureId ? { targetFurnitureId: collision.furnitureId } : {}),
        ...(collision.moduleId ? { targetModuleId: collision.moduleId } : {}),
        sourceRevision: project.revision
    };
    snapshot.installationDecisions.push(decision);
    snapshot.revision = project.revision + 1;
    snapshot.notes.push({
        id: randomUUID(), authorType: 'system', createdAt: new Date().toISOString(),
        text: `INSTALLATION_DECISION_V1:${JSON.stringify(decision)}`
    });
    return { snapshot, decision };
}
export function completeInstallationDecision(project, decisionId, completedBy) {
    if (!completedBy?.trim())
        throw new Error('installation_decision_completer_required');
    const snapshot = structuredClone(project);
    const decision = snapshot.installationDecisions?.find(x => x.id === decisionId);
    if (!decision)
        throw new Error('installation_decision_not_found');
    if (decision.status === 'cancelled')
        throw new Error('installation_decision_cancelled');
    decision.status = 'completed';
    decision.completedAt = new Date().toISOString();
    snapshot.revision = project.revision + 1;
    snapshot.notes.push({
        id: randomUUID(), authorType: 'system', createdAt: new Date().toISOString(),
        text: `INSTALLATION_DECISION_COMPLETED_V1:${decision.id}:${completedBy.trim()}`
    });
    return { snapshot, decision };
}
export function activeInstallationDecisions(project) {
    return (project.installationDecisions ?? []).filter(x => x.status === 'approved' || x.status === 'completed');
}
