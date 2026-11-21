import { toMm } from '../../project-model/src/types.js';
const mmv = (v) => v?.value == null ? undefined : toMm(v.value);
const pos = (v) => toMm(v);
const overlap = (a1, a2, b1, b2) => Math.min(a2, b2) > Math.max(a1, b1);
const overlap3 = (a, b) => overlap(a.x1, a.x2, b.x1, b.x2) && overlap(a.y1, a.y2, b.y1, b.y2) && overlap(a.z1, a.z2, b.z1, b.z2);
const center = (a1, a2) => (a1 + a2) / 2;
function furnitureBox(f) {
    const w = mmv(f.dimensions.width), d = mmv(f.dimensions.depth), h = mmv(f.dimensions.height);
    if (w == null || d == null || h == null)
        return;
    const x = pos(f.transform.position.x), y = pos(f.transform.position.y), z = pos(f.transform.position.z);
    const rot = Math.abs(f.transform.rotationZDeg % 180) === 90;
    const fw = rot ? d : w, fd = rot ? w : d;
    return { x1: x, x2: x + fw, y1: y, y2: y + fd, z1: z, z2: z + h };
}
function roomBox(b) {
    const w = mmv(b?.size?.width), d = mmv(b?.size?.depth), h = mmv(b?.size?.height);
    if (w == null || d == null || h == null)
        return;
    const x = pos(b.origin.x), y = pos(b.origin.y), z = pos(b.origin.z);
    return { x1: x, x2: x + w, y1: y, y2: y + d, z1: z, z2: z + h };
}
function sourceId(note) {
    const m = note?.match(/source id ([^;]+)/i);
    return m?.[1];
}
function latestRoomScene(project) {
    const n = [...project.notes].reverse().find(x => typeof x.text === 'string' && x.text.startsWith('MAKSTER_ROOM_SCENE_V1:'));
    if (!n)
        return;
    try {
        return JSON.parse(n.text.slice('MAKSTER_ROOM_SCENE_V1:'.length));
    }
    catch {
        return;
    }
}
function moduleWidths(f) {
    const total = mmv(f.dimensions.width) ?? 0;
    const fixed = f.modules.map(m => m.width.mode === 'fixed' ? mmv(m.width.value) : undefined);
    const known = fixed.reduce((sum, x) => sum + (x ?? 0), 0);
    const missing = fixed.filter(x => x == null).length;
    const fallback = missing ? Math.max(0, (total - known) / missing) : 0;
    let cursor = 0;
    return f.modules.map((module, i) => { const width = fixed[i] ?? fallback; const out = { module, start: cursor, width }; cursor += width; return out; });
}
function localModuleBox(f, start, width, height, depth) {
    const x = pos(f.transform.position.x), y = pos(f.transform.position.y), z = pos(f.transform.position.z);
    const r = f.transform.rotationZDeg;
    if (r === 0)
        return { x1: x + start, x2: x + start + width, y1: y, y2: y + depth, z1: z, z2: z + height };
    if (r === 90)
        return { x1: x, x2: x + depth, y1: y + start, y2: y + start + width, z1: z, z2: z + height };
    if (r === 180)
        return { x1: x - start - width, x2: x - start, y1: y - depth, y2: y, z1: z, z2: z + height };
    return { x1: x - depth, x2: x, y1: y - start - width, y2: y - start, z1: z, z2: z + height };
}
function sceneUtilityBySource(scene, id) { return id ? (scene?.utilities ?? []).find((u) => String(u.id) === id) : undefined; }
export function analyzeInstallationCollisions(project) {
    const items = [];
    const scene = latestRoomScene(project);
    const roomById = new Map(project.site.rooms.map(r => [r.id, r]));
    for (const furniture of project.furniture) {
        const room = (furniture.roomId ? roomById.get(furniture.roomId) : project.site.rooms[0]);
        if (!room)
            continue;
        const fb = furnitureBox(furniture);
        if (!fb)
            continue;
        const roomHeight = mmv(room.dimensions?.height);
        if (roomHeight != null && fb.z2 > roomHeight + 0.5) {
            items.push({ id: `ceiling:${furniture.id}`, kind: 'ceiling_collision', severity: 'blocking', title: 'Мебель выше помещения',
                detail: `${furniture.name}: верх ${Math.round(fb.z2)} мм, высота помещения ${Math.round(roomHeight)} мм.`,
                furnitureId: furniture.id, distanceMm: Math.round(fb.z2 - roomHeight) });
        }
        for (const opening of room.openings) {
            const ob = roomBox(opening.bounds);
            if (!ob)
                continue;
            if (overlap3(fb, ob)) {
                items.push({ id: `opening:${furniture.id}:${opening.id}`, kind: 'opening_collision', severity: 'blocking',
                    title: `Мебель пересекает ${opening.kind === 'window' ? 'окно' : 'дверной/стенной проём'}`,
                    detail: `${furniture.name} физически входит в подтверждённый объём проёма.`,
                    furnitureId: furniture.id, roomFeatureId: opening.id, ...(sourceId(opening.note) ? { sourceId: sourceId(opening.note) } : {}) });
            }
        }
        for (const obstacle of room.obstacles) {
            const ob = roomBox(obstacle.bounds);
            if (!ob)
                continue;
            if (!overlap3(fb, ob))
                continue;
            const sid = sourceId(obstacle.note);
            if (['radiator', 'column', 'duct', 'boiler'].includes(obstacle.kind)) {
                items.push({ id: `obstacle:${furniture.id}:${obstacle.id}`, kind: 'obstacle_collision', severity: 'blocking',
                    title: `Мебель пересекает ${obstacle.kind}`, detail: `${furniture.name} пересекает подтверждённый объём препятствия ${obstacle.kind}.`,
                    furnitureId: furniture.id, roomFeatureId: obstacle.id, ...(sid ? { sourceId: sid } : {}) });
            }
            else if (obstacle.kind === 'socket' || obstacle.kind === 'switch') {
                items.push({ id: `utility:${furniture.id}:${obstacle.id}`, kind: 'utility_access', severity: obstacle.kind === 'switch' ? 'blocking' : 'warning',
                    title: `${obstacle.kind === 'switch' ? 'Выключатель' : 'Розетка'} попадает за мебель`,
                    detail: `${furniture.name} перекрывает точку ${obstacle.kind}. Нужен доступ, перенос точки или технологический вырез.`,
                    furnitureId: furniture.id, roomFeatureId: obstacle.id, ...(sid ? { sourceId: sid } : {}) });
            }
            else if (obstacle.kind === 'pipe') {
                items.push({ id: `pipe:${furniture.id}:${obstacle.id}`, kind: 'utility_access', severity: 'warning',
                    title: 'Коммуникация проходит в зоне мебели',
                    detail: `${furniture.name}: вода/слив/газ требуют сервисного доступа и проверки отверстий/задней стенки.`,
                    furnitureId: furniture.id, roomFeatureId: obstacle.id, ...(sid ? { sourceId: sid } : {}) });
            }
            else if (obstacle.kind === 'vent') {
                items.push({ id: `vent:${furniture.id}:${obstacle.id}`, kind: 'utility_access', severity: 'warning',
                    title: 'Вентиляционный вывод попадает в зону мебели',
                    detail: `Проверьте совмещение вытяжки/канала и доступ к соединению.`,
                    furnitureId: furniture.id, roomFeatureId: obstacle.id, ...(sid ? { sourceId: sid } : {}) });
            }
        }
        // Module-aware checks: worktop vs sill, hood vs hood vent.
        for (const { module, start, width } of moduleWidths(furniture)) {
            if (!module.kitchen)
                continue;
            const mh = mmv(module.height) ?? mmv(furniture.dimensions.height) ?? 0;
            const md = mmv(module.depth) ?? mmv(furniture.dimensions.depth) ?? 0;
            const mb = localModuleBox(furniture, start, width, mh, md);
            if (module.kitchen.worktop?.enabled) {
                const wt = mmv(module.kitchen.worktop.thickness) ?? 0;
                const worktopTop = mb.z2 + wt;
                for (const opening of room.openings.filter(x => x.kind === 'window')) {
                    const wb = roomBox(opening.bounds);
                    if (!wb)
                        continue;
                    const planOverlap = overlap(mb.x1, mb.x2, wb.x1, wb.x2) && overlap(mb.y1, mb.y2, wb.y1, wb.y2);
                    if (planOverlap && wb.z1 < worktopTop - 0.5) {
                        items.push({ id: `sill:${module.id}:${opening.id}`, kind: 'worktop_window', severity: 'blocking',
                            title: 'Столешница выше низа окна/подоконника',
                            detail: `Столешница ≈ ${Math.round(worktopTop)} мм, низ окна ${Math.round(wb.z1)} мм. Нужна корректировка высоты/геометрии.`,
                            furnitureId: furniture.id, moduleId: module.id, roomFeatureId: opening.id, distanceMm: Math.round(worktopTop - wb.z1) });
                    }
                    else if (planOverlap && Math.abs(wb.z1 - worktopTop) <= 30) {
                        items.push({ id: `sill-review:${module.id}:${opening.id}`, kind: 'worktop_window', severity: 'warning',
                            title: 'Столешница почти совпадает с подоконником',
                            detail: `Разница ${Math.round(Math.abs(wb.z1 - worktopTop))} мм. Проверьте фактическую толщину подоконника, отделку и монтажный зазор.`,
                            furnitureId: furniture.id, moduleId: module.id, roomFeatureId: opening.id });
                    }
                }
            }
            if (module.kitchen.function === 'hood') {
                const vents = room.obstacles.filter(x => x.kind === 'vent');
                if (!vents.length) {
                    items.push({ id: `hood-no-vent:${module.id}`, kind: 'hood_vent_alignment', severity: 'warning',
                        title: 'Для вытяжки не найден подтверждённый вывод', detail: 'Нужна точка hood_vent с подтверждённой X/Y/Z привязкой.',
                        furnitureId: furniture.id, moduleId: module.id });
                }
                else {
                    const mcx = center(mb.x1, mb.x2), mcy = center(mb.y1, mb.y2);
                    let best;
                    for (const v of vents) {
                        const vb = roomBox(v.bounds);
                        if (!vb)
                            continue;
                        const d = Math.hypot(center(vb.x1, vb.x2) - mcx, center(vb.y1, vb.y2) - mcy);
                        if (!best || d < best.d)
                            best = { d, id: v.id };
                    }
                    if (best && best.d > 450) {
                        items.push({ id: `hood-offset:${module.id}:${best.id}`, kind: 'hood_vent_alignment', severity: 'warning',
                            title: 'Вытяжка далеко от вентиляционного вывода',
                            detail: `Плановое смещение центров ≈ ${Math.round(best.d)} мм. Проверьте трассу канала, повороты и короб.`,
                            furnitureId: furniture.id, moduleId: module.id, roomFeatureId: best.id, distanceMm: Math.round(best.d) });
                    }
                }
            }
        }
    }
    const addressedWarnings = new Set((project.installationDecisions ?? [])
        .filter(d => d.status !== 'cancelled' && d.addressesWarning === true)
        .map(d => d.conflictId));
    for (const item of items) {
        if (item.severity === 'warning' && addressedWarnings.has(item.id)) {
            item.severity = 'info';
            item.detail = `${item.detail} Covered by approved installation/site task in this Revision.`;
        }
    }
    const blockingCount = items.filter(x => x.severity === 'blocking').length;
    const warningCount = items.filter(x => x.severity === 'warning').length;
    const infoCount = items.filter(x => x.severity === 'info').length;
    return {
        version: '2.8.8', projectId: project.projectId, revision: project.revision,
        status: blockingCount ? 'BLOCKED' : warningCount ? 'REVIEW' : 'PASS',
        blockingCount, warningCount, infoCount, items
    };
}
