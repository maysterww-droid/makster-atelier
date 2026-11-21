import { mm, toMm } from '../../project-model/src/types.js';
import { analyzeInstallationCollisions } from './installation-collision-check.js';
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r & 3) | 8; return v.toString(16); }); }
export function proposeSiteChange(project, input) {
    const furniture = project.furniture.find(f => f.id === input.targetFurnitureId);
    if (!furniture)
        throw new Error('site_change_furniture_not_found');
    if (!input.title.trim() || !input.reason.trim())
        throw new Error('site_change_title_reason_required');
    const snapshot = structuredClone(project);
    snapshot.installationChangeRequests ??= [];
    const request = { id: uuid(), status: 'proposed', title: input.title.trim(), reason: input.reason.trim(), requestedBy: input.requestedBy.trim() || 'installer', requestedAt: new Date().toISOString(), targetFurnitureId: input.targetFurnitureId, proposedPositionMm: { ...(input.xMm != null ? { x: input.xMm } : {}), ...(input.yMm != null ? { y: input.yMm } : {}), ...(input.zMm != null ? { z: input.zMm } : {}) }, sourceRevision: project.revision };
    snapshot.installationChangeRequests.push(request);
    snapshot.revision = project.revision + 1;
    snapshot.notes.push({ id: uuid(), authorType: 'system', createdAt: new Date().toISOString(), text: `SITE_CHANGE_REQUEST_V1:${JSON.stringify(request)}` });
    return { snapshot, request };
}
export function reviewSiteChange(project, id, input) {
    const snapshot = structuredClone(project);
    const req = snapshot.installationChangeRequests?.find(x => x.id === id);
    if (!req)
        throw new Error('site_change_not_found');
    if (req.status !== 'proposed')
        throw new Error('site_change_already_reviewed');
    req.status = input.approved ? 'approved' : 'rejected';
    req.reviewedBy = input.reviewedBy.trim() || 'designer';
    req.reviewedAt = new Date().toISOString();
    snapshot.revision = project.revision + 1;
    return { snapshot, request: req };
}
export function applyApprovedSiteChange(project, id, appliedBy) {
    const req = project.installationChangeRequests?.find(x => x.id === id);
    if (!req)
        throw new Error('site_change_not_found');
    if (req.status !== 'approved')
        throw new Error('site_change_not_approved');
    if (!req.targetFurnitureId)
        throw new Error('site_change_target_required');
    const snapshot = structuredClone(project), f = snapshot.furniture.find(x => x.id === req.targetFurnitureId);
    if (!f)
        throw new Error('site_change_furniture_not_found');
    const before = analyzeInstallationCollisions(project);
    const p = req.proposedPositionMm ?? {};
    if (p.x != null)
        f.transform.position.x = mm(p.x);
    if (p.y != null)
        f.transform.position.y = mm(p.y);
    if (p.z != null)
        f.transform.position.z = mm(p.z);
    const after = analyzeInstallationCollisions(snapshot);
    if (after.blockingCount > before.blockingCount)
        throw new Error('site_change_creates_more_blocking_collisions');
    snapshot.revision = project.revision + 1;
    const target = snapshot.installationChangeRequests?.find(x => x.id === id);
    if (target) {
        target.status = 'applied';
        target.appliedRevision = snapshot.revision;
    }
    snapshot.asBuiltRecords ??= [];
    snapshot.asBuiltRecords.push({ id: uuid(), title: `Applied site change: ${req.title}`, detail: `${req.reason} Applied by ${appliedBy}. Position X=${Math.round(toMm(f.transform.position.x))}, Y=${Math.round(toMm(f.transform.position.y))}, Z=${Math.round(toMm(f.transform.position.z))} mm.`, recordedBy: appliedBy, recordedAt: new Date().toISOString(), sourceRevision: snapshot.revision, targetFurnitureId: f.id });
    return { snapshot, request: target, before, after };
}
