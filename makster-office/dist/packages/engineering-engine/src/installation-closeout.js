import { buildInstallerModeReport } from './installer-mode.js';
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r & 3) | 8; return v.toString(16); }); }
export function buildInstallationCloseoutReport(project) {
    const installer = buildInstallerModeReport(project);
    const openPunch = (project.installationPunchItems ?? []).filter(x => x.status === 'open');
    const pendingChanges = (project.installationChangeRequests ?? []).filter(x => x.status === 'proposed' || x.status === 'approved');
    const blockers = [];
    if (installer.blockingIssueCount > 0)
        blockers.push(`${installer.blockingIssueCount} blocking installation issue(s) remain.`);
    if (installer.openTaskCount > 0)
        blockers.push(`${installer.openTaskCount} site task(s) remain open.`);
    if (installer.openIssueCount > 0)
        blockers.push(`${installer.openIssueCount} site issue(s) remain open.`);
    if (pendingChanges.length > 0)
        blockers.push(`${pendingChanges.length} site change request(s) remain unresolved.`);
    if (openPunch.some(x => x.severity === 'major'))
        blockers.push(`${openPunch.filter(x => x.severity === 'major').length} major punch-list item(s) remain open.`);
    const status = project.installationHandover ? 'SIGNED' : blockers.length ? 'NOT_READY' : 'READY_TO_SIGN';
    return { version: '2.9.3', projectId: project.projectId, revision: project.revision, status, blockers, openPunchCount: openPunch.length, openSiteTaskCount: installer.openTaskCount, openSiteIssueCount: installer.openIssueCount, pendingChangeCount: pendingChanges.length, ...(project.installationHandover ? { handover: project.installationHandover } : {}) };
}
export function addPunchItem(project, input) {
    if (!input.title.trim() || !input.detail.trim())
        throw new Error('punch_item_title_detail_required');
    const snapshot = structuredClone(project);
    snapshot.installationPunchItems ??= [];
    const item = { id: uuid(), status: 'open', severity: input.severity, title: input.title.trim(), detail: input.detail.trim(), createdBy: input.createdBy.trim() || 'installer', createdAt: new Date().toISOString(), sourceRevision: project.revision, ...(input.targetFurnitureId ? { targetFurnitureId: input.targetFurnitureId } : {}) };
    snapshot.installationPunchItems.push(item);
    snapshot.revision = project.revision + 1;
    return { snapshot, item };
}
export function closePunchItem(project, id, closedBy) {
    const snapshot = structuredClone(project), item = snapshot.installationPunchItems?.find(x => x.id === id);
    if (!item)
        throw new Error('punch_item_not_found');
    if (item.status === 'cancelled')
        throw new Error('punch_item_cancelled');
    item.status = 'closed';
    item.closedBy = closedBy.trim() || 'installer';
    item.closedAt = new Date().toISOString();
    snapshot.revision = project.revision + 1;
    return { snapshot, item };
}
export function signInstallationHandover(project, input) {
    const report = buildInstallationCloseoutReport(project);
    if (report.status !== 'READY_TO_SIGN')
        throw new Error('installation_closeout_not_ready');
    const snapshot = structuredClone(project);
    const handover = { id: uuid(), status: 'signed', signedBy: input.signedBy.trim() || 'client', signedAt: new Date().toISOString(), sourceRevision: project.revision, ...(input.installerName ? { installerName: input.installerName } : {}), ...(input.clientName ? { clientName: input.clientName } : {}), ...(input.notes ? { notes: input.notes } : {}) };
    snapshot.installationHandover = handover;
    snapshot.revision = project.revision + 1;
    return { snapshot, handover };
}
