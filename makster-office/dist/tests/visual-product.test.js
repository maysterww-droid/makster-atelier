import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmptyProjectModel } from '../packages/project-model/src/index.js';
import { applyVisualCommand, buildVisualScene, compileVisualCommand } from '../packages/visual-product/src/index.js';
async function fixture() {
    return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
}
test('visual room command creates confirmed rectangle room and revision', async () => {
    const p = createEmptyProjectModel({ projectId: '11111111-1111-4111-8111-111111111111', title: 'Visual room' });
    const next = applyVisualCommand(p, { type: 'create_rect_room', name: 'Bedroom', widthMm: 4200, depthMm: 3600, heightMm: 2650 });
    assert.equal(next.revision, p.revision + 1);
    assert.equal(next.site.rooms.length, 1);
    assert.equal(next.site.rooms[0]?.walls.length, 4);
    const scene = buildVisualScene(next);
    assert.equal(scene.room?.widthMm, 4200);
    assert.equal(scene.room?.depthMm, 3600);
});
test('visual dimension edit is a protected typed changeset', async () => {
    const p = await fixture();
    const change = compileVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 3400, heightMm: 2700, depthMm: 620 });
    assert.equal(change.source, 'user');
    assert.ok(change.patches.every(x => x.path.startsWith('/furniture/0/dimensions/') || x.path === '/furniture/0/modules'));
    const next = applyVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 3400, heightMm: 2700, depthMm: 620 });
    assert.equal(Number(next.furniture[0]?.dimensions.width.value), 34000);
    const scene = buildVisualScene(next);
    assert.ok(Math.abs(scene.furniture[0].modules.reduce((a, m) => a + m.widthMm, 0) - 3400) < 0.01);
    assert.equal(scene.warnings.length, 0);
});
test('module width edit appears immediately in visual scene and warns on mismatch', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_module_width', moduleIndex: 2, widthMm: 800 });
    const scene = buildVisualScene(next);
    assert.equal(scene.furniture[0]?.modules[2]?.widthMm, 800);
    assert.ok(scene.warnings.some(w => w.includes('do not match overall width')));
});
test('equalize modules resolves overall width exactly', async () => {
    let p = await fixture();
    p = applyVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 3400 });
    p = applyVisualCommand(p, { type: 'set_module_count', count: 6 });
    p = applyVisualCommand(p, { type: 'equalize_modules' });
    const widths = buildVisualScene(p).furniture[0].modules.map(x => x.widthMm);
    assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - 3400) < 0.01);
});
test('visual module content turns section into drawers without arbitrary patch', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_module_content', moduleIndex: 1, kind: 'drawers', count: 4 });
    const module = next.furniture[0].modules[1];
    assert.equal(module.kind, 'drawers');
    assert.equal(module.contents[0]?.kind, 'drawer_stack');
    if (module.contents[0]?.kind === 'drawer_stack')
        assert.equal(module.contents[0].count, 4);
});
test('visual module count preserves one canonical furniture model and hinged fronts references', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_module_count', count: 5 });
    assert.equal(next.furniture[0]?.modules.length, 5);
    assert.equal(next.furniture[0]?.fronts[0]?.moduleIds.length, 5);
    assert.equal(next.furniture[0]?.fronts[0]?.hingeSides?.length, 5);
});
test('visual command refuses invalid geometry', async () => {
    const p = await fixture();
    assert.throws(() => compileVisualCommand(p, { type: 'set_module_width', moduleIndex: 0, widthMm: 20 }), /visual_invalid_module_width/);
    assert.throws(() => compileVisualCommand(p, { type: 'set_module_count', count: 0 }), /visual_invalid_module_count/);
});
test('dragging a divider changes adjacent modules atomically and preserves total width', async () => {
    const p = await fixture();
    const scene0 = buildVisualScene(p);
    const before = scene0.furniture[0].modules.slice(0, 2).map(x => x.widthMm);
    const total = before[0] + before[1];
    const change = compileVisualCommand(p, { type: 'move_module_divider', leftModuleIndex: 0, deltaMm: 40 });
    assert.equal(change.patches.length, 2);
    const next = applyVisualCommand(p, { type: 'move_module_divider', leftModuleIndex: 0, deltaMm: 40 });
    const widths = buildVisualScene(next).furniture[0].modules.slice(0, 2).map(x => x.widthMm);
    assert.equal(widths[0], before[0] + 40);
    assert.equal(widths[1], before[1] - 40);
    assert.equal(widths[0] + widths[1], total);
});
test('resizing a room preserves openings and obstacles instead of silently deleting site facts', async () => {
    const p = await fixture();
    const beforeOpenings = p.site.rooms[0]?.openings.length ?? 0;
    const beforeObstacles = p.site.rooms[0]?.obstacles.length ?? 0;
    const next = applyVisualCommand(p, { type: 'set_room_dimensions', roomIndex: 0, widthMm: 4300, depthMm: 3900, heightMm: 2750 });
    assert.equal(next.site.rooms[0]?.openings.length, beforeOpenings);
    assert.equal(next.site.rooms[0]?.obstacles.length, beforeObstacles);
});
test('furniture width resize scales fixed modules atomically and keeps exact overall width', async () => {
    const p = await fixture();
    const before = buildVisualScene(p).furniture[0].modules.map(m => m.widthMm);
    const change = compileVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 3600 });
    assert.ok(change.patches.some(patch => patch.path === '/furniture/0/dimensions/width'));
    assert.ok(change.patches.some(patch => patch.path === '/furniture/0/modules'));
    const next = applyVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 3600 });
    const scene = buildVisualScene(next);
    const widths = scene.furniture[0].modules.map(m => m.widthMm);
    assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - 3600) < 0.01);
    assert.equal(scene.warnings.length, 0);
    assert.ok(Math.abs(widths[0] / widths[1] - before[0] / before[1]) < 0.002);
});
test('shelf elevation is persisted in ProjectModel and projected back to Front scene', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_shelf_elevation', moduleIndex: 2, shelfIndex: 2, elevationMm: 1320 });
    const shelf = next.furniture[0].modules[2].contents.find(x => x.kind === 'shelf_stack');
    assert.ok(shelf && shelf.kind === 'shelf_stack');
    if (!shelf || shelf.kind !== 'shelf_stack')
        return;
    assert.equal(Number(shelf.elevationsFromBottom?.[2]?.value), 13200);
    const projected = buildVisualScene(next).furniture[0].modules[2].shelfElevationsMm;
    assert.equal(projected?.[2], 1320);
});
test('shelf elevation refuses crossings closer than system pitch', async () => {
    const p = await fixture();
    const seeded = applyVisualCommand(p, { type: 'set_shelf_elevation', moduleIndex: 2, shelfIndex: 0, elevationMm: 440 });
    assert.throws(() => compileVisualCommand(seeded, { type: 'set_shelf_elevation', moduleIndex: 2, shelfIndex: 1, elevationMm: 460 }), /visual_shelf_spacing_too_small/);
});
test('furniture width resize refuses proportional module widths below safe visual minimum', async () => {
    const p = await fixture();
    assert.throws(() => compileVisualCommand(p, { type: 'set_furniture_dimensions', widthMm: 500 }), /visual_invalid_scaled_module_width/);
});
test('plan move is accepted inside the room and rejected outside server-side bounds', async () => {
    const p = await fixture();
    const inside = applyVisualCommand(p, { type: 'set_furniture_position', xMm: 200, yMm: 300 });
    const scene = buildVisualScene(inside);
    assert.equal(scene.furniture[0].xMm, 200);
    assert.equal(scene.furniture[0].yMm, 300);
    assert.throws(() => compileVisualCommand(p, { type: 'set_furniture_position', xMm: 1200, yMm: 0 }), /visual_furniture_outside_room_width/);
    assert.throws(() => compileVisualCommand(p, { type: 'set_furniture_position', xMm: -10, yMm: 0 }), /visual_invalid_furniture_x/);
});
test('room resize cannot silently clip furniture already assigned to that room', async () => {
    const p = await fixture();
    assert.throws(() => compileVisualCommand(p, { type: 'set_room_dimensions', widthMm: 3000 }), /visual_furniture_outside_room_width/);
});
test('duplicate furniture creates a second real object with fresh nested ids', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'duplicate_furniture', furnitureIndex: 0, offsetXMm: 3360, offsetYMm: 0, rotationZDeg: 90, name: 'Return wardrobe' });
    assert.equal(next.furniture.length, 2);
    assert.notEqual(next.furniture[0].id, next.furniture[1].id);
    assert.equal(next.furniture[1].transform.rotationZDeg, 90);
    assert.equal(Number(next.furniture[1].transform.position.x), 33600);
    const ids0 = new Set(next.furniture[0].modules.map(m => m.id));
    assert.ok(next.furniture[1].modules.every(m => !ids0.has(m.id)));
    const scene = buildVisualScene(next);
    assert.equal(scene.furniture.length, 2);
    assert.equal(scene.furniture[1].name, 'Return wardrobe');
});
test('left-edge resize keeps the opposite footprint edge fixed and scales modules atomically', async () => {
    const p = await fixture();
    const moved = applyVisualCommand(p, { type: 'set_furniture_position', xMm: 200, yMm: 0 });
    const before = buildVisualScene(moved).furniture[0];
    const rightEdge = before.xMm + before.widthMm;
    const change = compileVisualCommand(moved, { type: 'resize_furniture_edge', furnitureIndex: 0, edge: 'left', deltaMm: 100 });
    assert.ok(change.patches.some(x => x.path === '/furniture/0/dimensions/width'));
    assert.ok(change.patches.some(x => x.path === '/furniture/0/transform/position/x'));
    assert.ok(change.patches.some(x => x.path === '/furniture/0/modules'));
    const next = applyVisualCommand(moved, { type: 'resize_furniture_edge', furnitureIndex: 0, edge: 'left', deltaMm: 100 });
    const f = buildVisualScene(next).furniture[0];
    assert.equal(f.xMm, 300);
    assert.equal(f.widthMm, before.widthMm - 100);
    assert.equal(f.xMm + f.widthMm, rightEdge);
    assert.ok(Math.abs(f.modules.reduce((sum, m) => sum + m.widthMm, 0) - f.widthMm) < 0.01);
});
test('bottom-edge resize preserves top elevation and refuses to go below floor', async () => {
    const p = await fixture();
    const before = buildVisualScene(p).furniture[0];
    const next = applyVisualCommand(p, { type: 'resize_furniture_edge', edge: 'bottom', deltaMm: 100 });
    const f = buildVisualScene(next).furniture[0];
    assert.equal(f.zMm, 100);
    assert.equal(f.heightMm, before.heightMm - 100);
    assert.equal(f.zMm + f.heightMm, before.zMm + before.heightMm);
    assert.throws(() => compileVisualCommand(p, { type: 'resize_furniture_edge', edge: 'bottom', deltaMm: -10 }), /visual_invalid_furniture_z/);
});
test('room openings are revisioned, movable and projected into PLAN scene', async () => {
    const p = await fixture();
    const added = applyVisualCommand(p, { type: 'add_room_opening', kind: 'door', xMm: 200, yMm: 0, zMm: 0, widthMm: 900, depthMm: 100, heightMm: 2100, note: 'Entry' });
    assert.equal(added.site.rooms[0].openings.length, 1);
    let scene = buildVisualScene(added);
    assert.equal(scene.room.openings[0].xMm, 200);
    assert.equal(scene.room.openings[0].kind, 'door');
    const moved = applyVisualCommand(added, { type: 'move_room_opening', openingIndex: 0, xMm: 500, yMm: 0 });
    scene = buildVisualScene(moved);
    assert.equal(scene.room.openings[0].xMm, 500);
    const removed = applyVisualCommand(moved, { type: 'remove_room_opening', openingIndex: 0 });
    assert.equal(removed.site.rooms[0].openings.length, 0);
});
test('room obstacles cannot be dragged or left outside resized room', async () => {
    const p = await fixture();
    const added = applyVisualCommand(p, { type: 'add_room_obstacle', kind: 'column', xMm: 3800, yMm: 3000, zMm: 0, widthMm: 400, depthMm: 400, heightMm: 2700 });
    assert.equal(buildVisualScene(added).room.obstacles.length, 1);
    assert.throws(() => compileVisualCommand(added, { type: 'move_room_obstacle', obstacleIndex: 0, xMm: 4200 }), /visual_obstacle_outside_room_width/);
    assert.throws(() => compileVisualCommand(added, { type: 'set_room_dimensions', widthMm: 4000 }), /visual_obstacle_outside_room_width/);
});
test('room resize preserves wall identities used by hosted openings', async () => {
    const base = createEmptyProjectModel({ projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Hosted opening' });
    const roomProject = applyVisualCommand(base, { type: 'create_rect_room', name: 'Room', widthMm: 4200, depthMm: 3600, heightMm: 2700 });
    const wallId = roomProject.site.rooms[0].walls[0].id;
    const withDoor = applyVisualCommand(roomProject, { type: 'add_room_opening', kind: 'door', xMm: 200, yMm: 0, zMm: 0, widthMm: 900, depthMm: 100, heightMm: 2100, hostWallId: wallId });
    const resized = applyVisualCommand(withDoor, { type: 'set_room_dimensions', widthMm: 4400, depthMm: 3600, heightMm: 2700 });
    assert.equal(resized.site.rooms[0].walls[0].id, wallId);
    assert.equal(resized.site.rooms[0].openings[0].hostWallId, wallId);
});
test('2.3 CAD projection exposes structural panels without persisting a second geometry model', async () => {
    const p = await fixture();
    const scene = buildVisualScene(p);
    const f = scene.furniture[0];
    assert.equal(f.carcassThicknessMm, 18);
    assert.equal(f.cadPanels.filter(x => x.kind === 'side_left').length, 1);
    assert.equal(f.cadPanels.filter(x => x.kind === 'side_right').length, 1);
    assert.equal(f.cadPanels.filter(x => x.kind === 'divider').length, f.modules.length - 1);
    assert.deepEqual(f.moduleDimensionChainMm, f.modules.map(x => x.widthMm));
});
test('2.3 carcass thickness command mutates ProjectModel construction and CAD projection together', async () => {
    const p = await fixture();
    const change = compileVisualCommand(p, { type: 'set_carcass_thickness', thicknessMm: 19 });
    assert.equal(change.patches.length, 1);
    assert.equal(change.patches[0]?.path, '/furniture/0/construction/carcassThickness');
    const next = applyVisualCommand(p, { type: 'set_carcass_thickness', thicknessMm: 19 });
    assert.equal(Number(next.furniture[0]?.construction.carcassThickness.value), 190);
    assert.equal(buildVisualScene(next).furniture[0]?.carcassThicknessMm, 19);
});
test('2.3 wall clearance is a trusted placement command with exact derived clearances', async () => {
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_furniture_wall_clearance', wall: 'right', clearanceMm: 120 });
    const scene = buildVisualScene(next);
    assert.equal(scene.furniture[0]?.clearancesMm?.right, 120);
    assert.equal(scene.furniture[0]?.xMm, 1020);
});
test('2.3 furniture alignment places a second object beside the target with an exact gap', async () => {
    let p = await fixture();
    p = applyVisualCommand(p, { type: 'duplicate_furniture', offsetXMm: 0, offsetYMm: 1000, name: 'Return' });
    p = applyVisualCommand(p, { type: 'set_furniture_dimensions', furnitureIndex: 1, widthMm: 900, heightMm: 2650, depthMm: 600 });
    p = applyVisualCommand(p, { type: 'align_furniture_to_furniture', furnitureIndex: 1, targetFurnitureIndex: 0, side: 'right', gapMm: 40 });
    const scene = buildVisualScene(p);
    assert.equal(scene.furniture[1]?.xMm, 3400);
    assert.equal(scene.furniture[1]?.yMm, 1000);
});
test('2.3 CAD projection reports furniture and obstacle collisions as warnings without silently moving geometry', async () => {
    let p = await fixture();
    p = applyVisualCommand(p, { type: 'add_room_obstacle', kind: 'column', xMm: 100, yMm: 100, widthMm: 300, depthMm: 300, heightMm: 2500 });
    p = applyVisualCommand(p, { type: 'duplicate_furniture', offsetXMm: 100, offsetYMm: 100, name: 'Overlap' });
    const scene = buildVisualScene(p);
    assert.ok(scene.warnings.some(x => x.includes('overlaps room obstacle column')));
    assert.ok(scene.warnings.some(x => x.includes('overlaps furniture')));
});
test('2.3 alignment and wall clearance reject impossible placement rather than clipping it', async () => {
    const p = await fixture();
    assert.throws(() => compileVisualCommand(p, { type: 'set_furniture_wall_clearance', wall: 'right', clearanceMm: 2000 }), /visual_furniture_outside_room_width/);
    assert.throws(() => compileVisualCommand(p, { type: 'align_furniture_to_furniture', targetFurnitureIndex: 0, side: 'right', gapMm: 10 }), /visual_cannot_align_to_self/);
});
test('2.3 carcass thickness edit reaches deterministic Engineering parts, not only the canvas', async () => {
    const { MaksterEngineeringCompiler } = await import('../packages/engineering-engine/src/index.js');
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'set_carcass_thickness', thicknessMm: 19 });
    const engineering = new MaksterEngineeringCompiler().compile(next);
    const side = engineering.parts.find(x => x.kind === 'side');
    assert.ok(side);
    assert.equal(Number(side.thickness), 190);
});
test('2.3 first-class L-corner layout creates one grouped return in one atomic revision', async () => {
    const p = await fixture();
    const change = compileVisualCommand(p, { type: 'create_l_corner_layout', hand: 'right', returnWidthMm: 1000, gapMm: 20, name: 'Right return' });
    assert.equal(change.patches.length, 2);
    const next = applyVisualCommand(p, { type: 'create_l_corner_layout', hand: 'right', returnWidthMm: 1000, gapMm: 20, name: 'Right return' });
    assert.equal(next.furniture.length, 2);
    const scene = buildVisualScene(next);
    const main = scene.furniture[0], ret = scene.furniture[1];
    assert.equal(ret.rotationZDeg, 90);
    assert.equal(ret.widthMm, 1000);
    assert.equal(ret.xMm, 3380);
    assert.equal(main.layoutKind, 'l_corner');
    assert.equal(main.layoutRole, 'main');
    assert.equal(ret.layoutRole, 'return');
    assert.equal(main.layoutGroupId, ret.layoutGroupId);
    assert.equal(ret.modules.reduce((a, m) => a + m.widthMm, 0), 1000);
});
test('2.3 L-corner layout reaches Engineering as two real furniture objects', async () => {
    const { MaksterEngineeringCompiler } = await import('../packages/engineering-engine/src/index.js');
    const p = await fixture();
    const next = applyVisualCommand(p, { type: 'create_l_corner_layout', hand: 'right', returnWidthMm: 1000, gapMm: 0 });
    const engineering = new MaksterEngineeringCompiler().compile(next);
    assert.equal(engineering.furniture.length, 2);
    assert.ok(engineering.parts.some(x => x.furnitureId === next.furniture[1].id));
});
test('2.3 L-corner layout rejects a return that cannot fit the room instead of clipping it', async () => {
    const p = await fixture();
    assert.throws(() => compileVisualCommand(p, { type: 'create_l_corner_layout', hand: 'left', returnWidthMm: 5000, gapMm: 0 }), /visual_corner_layout_too_deep_for_room/);
});
