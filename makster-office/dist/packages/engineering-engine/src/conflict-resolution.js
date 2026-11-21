import { mm, toMm } from '../../project-model/src/types.js';
import { analyzeInstallationCollisions } from './installation-collision-check.js';
function pos(v) { return toMm(v); }
function dim(v) { return v?.value == null ? 0 : toMm(v.value); }
function furnitureInsideRoom(project, index, x, y) {
    const f = project.furniture[index];
    if (!f)
        return false;
    const room = (f.roomId ? project.site.rooms.find(r => r.id === f.roomId) : project.site.rooms[0]);
    if (!room?.dimensions)
        return true;
    const rw = dim(room.dimensions.width), rd = dim(room.dimensions.depth);
    const w = dim(f.dimensions.width), d = dim(f.dimensions.depth);
    const rot = f.transform.rotationZDeg === 90 || f.transform.rotationZDeg === 270;
    const fw = rot ? d : w, fd = rot ? w : d;
    return x >= 0 && y >= 0 && (!rw || x + fw <= rw) && (!rd || y + fd <= rd);
}
function tryMove(project, furnitureIndex, dx, dy, currentBlocking) {
    const f = project.furniture[furnitureIndex];
    if (!f)
        return;
    const x = pos(f.transform.position.x) + dx, y = pos(f.transform.position.y) + dy;
    if (!furnitureInsideRoom(project, furnitureIndex, x, y))
        return;
    const clone = structuredClone(project);
    clone.furniture[furnitureIndex].transform.position.x = mm(x);
    clone.furniture[furnitureIndex].transform.position.y = mm(y);
    const result = analyzeInstallationCollisions(clone);
    if (result.blockingCount >= currentBlocking)
        return;
    return { x, y, reduction: currentBlocking - result.blockingCount, warningCount: result.warningCount };
}
function bestShift(project, item, currentBlocking) {
    if (!item.furnitureId)
        return;
    const fi = project.furniture.findIndex(f => f.id === item.furnitureId);
    if (fi < 0)
        return;
    const candidates = [];
    for (let step = 50; step <= 1000; step += 50) {
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
            const r = tryMove(project, fi, dx, dy, currentBlocking);
            if (r)
                candidates.push({ ...r, distance: step });
        }
        if (candidates.some(x => x.reduction >= 1))
            break;
    }
    candidates.sort((a, b) => b.reduction - a.reduction || a.warningCount - b.warningCount || a.distance - b.distance);
    const best = candidates[0];
    if (!best)
        return;
    return { fi, ...best };
}
export function buildConflictResolutionReport(project) {
    const check = analyzeInstallationCollisions(project);
    const suggestions = [];
    for (const item of check.items) {
        if (item.severity === 'blocking' && (item.kind === 'opening_collision' || item.kind === 'obstacle_collision')) {
            const shift = bestShift(project, item, check.blockingCount);
            if (shift) {
                suggestions.push({
                    id: `resolution:${item.id}:move`, conflictId: item.id, mode: 'auto_preview',
                    title: 'Сдвинуть мебель до выхода из коллизии',
                    detail: `Предварительно сдвинуть корпус в позицию X ${Math.round(shift.x)} / Y ${Math.round(shift.y)} мм. После применения Makster создаст новую Revision и перепроверит все коллизии.`,
                    priority: 1, safeToAutoApply: true, decisionPolicy: 'physical_fix_required',
                    visualCommand: { type: 'set_furniture_position', furnitureIndex: shift.fi, xMm: Math.round(shift.x), yMm: Math.round(shift.y) },
                    expectedBlockingReduction: shift.reduction
                });
            }
            else {
                suggestions.push({
                    id: `resolution:${item.id}:layout`, conflictId: item.id, mode: 'manual_decision',
                    title: 'Перестроить компоновку',
                    detail: 'Безопасного простого сдвига до 1000 мм не найдено. Измените длину ряда, состав модулей, ориентацию или положение проёма/препятствия только после проверки замера.',
                    priority: 1, safeToAutoApply: false, decisionPolicy: 'physical_fix_required'
                });
            }
        }
        else if (item.kind === 'worktop_window') {
            suggestions.push({
                id: `resolution:${item.id}:worktop`, conflictId: item.id, mode: 'manual_decision',
                title: 'Согласовать столешницу и подоконник',
                detail: 'Проверьте чистовую отметку пола, толщину столешницы и подоконника. Возможные решения: изменить высоту базы, изменить подоконник или сделать конструктивное сопряжение. Автоматически высоту Makster не меняет.',
                priority: item.severity === 'blocking' ? 1 : 2, safeToAutoApply: false,
                decisionPolicy: item.severity === 'blocking' ? 'physical_fix_required' : 'record_design_decision'
            });
        }
        else if (item.kind === 'utility_access') {
            const site = item.title.toLowerCase().includes('розет') || item.title.toLowerCase().includes('коммуникац');
            suggestions.push({
                id: `resolution:${item.id}:utility`, conflictId: item.id, mode: site ? 'site_work' : 'manual_decision',
                title: site ? 'Предусмотреть сервисный доступ / перенос точки' : 'Согласовать доступ к коммуникации',
                detail: 'Варианты: технологический вырез в задней стенке/корпусе, сервисная зона или перенос точки электриком/сантехником. Точное решение должно быть зафиксировано в проекте.',
                priority: item.severity === 'blocking' ? 1 : 2, safeToAutoApply: false,
                decisionPolicy: item.severity === 'blocking' ? 'physical_fix_required' : 'record_site_task',
                addressedWarningCode: item.id
            });
        }
        else if (item.kind === 'hood_vent_alignment') {
            suggestions.push({
                id: `resolution:${item.id}:hood`, conflictId: item.id, mode: 'manual_decision',
                title: 'Скорректировать трассу вытяжки',
                detail: 'Проверьте диаметр, допустимые повороты и место короба. При возможности переместите модуль вытяжки ближе к подтверждённому hood_vent.',
                priority: 2, safeToAutoApply: false, decisionPolicy: 'record_design_decision'
            });
        }
        else if (item.kind === 'ceiling_collision') {
            suggestions.push({
                id: `resolution:${item.id}:ceiling`, conflictId: item.id, mode: 'manual_decision',
                title: 'Уменьшить высоту мебели или проверить потолок',
                detail: 'Makster не уменьшает высоту автоматически: нужно подтвердить чистовую высоту помещения и конструкцию верхнего добора/пенала.',
                priority: 1, safeToAutoApply: false, decisionPolicy: 'physical_fix_required'
            });
        }
    }
    suggestions.sort((a, b) => a.priority - b.priority || Number(b.safeToAutoApply) - Number(a.safeToAutoApply));
    return {
        version: '2.8.9', projectId: project.projectId, revision: project.revision, conflictStatus: check.status,
        suggestions, autoApplicableCount: suggestions.filter(x => x.safeToAutoApply).length,
        manualCount: suggestions.filter(x => !x.safeToAutoApply).length
    };
}
