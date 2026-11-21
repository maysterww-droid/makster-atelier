import { randomUUID } from 'node:crypto';
import {
  applyProjectChangeSet,
  mm,
  toMm,
  type FurnitureModule,
  type InteriorElement,
  type ProjectChangeSet,
  type ProjectModelV1,
  type Room,
  type FurnitureItem,
  type WallOpening,
  type Obstacle,
} from '../../project-model/src/index.js';
import { VISUAL_PRODUCT_VERSION, type VisualContentKind, type VisualEditorCommand, type VisualScene } from './types.js';

const measured = (valueMm: number) => ({ value: mm(valueMm), state: 'confirmed' as const });
const measuredMm10 = (valueMm10: number) => ({ value: valueMm10 as ReturnType<typeof mm>, state: 'confirmed' as const });
const pos = (valueMm: number) => mm(valueMm);

function dimMm(value: { value: ReturnType<typeof mm> | null } | undefined): number {
  return value?.value == null ? 0 : toMm(value.value);
}

function assertBoxInsideRoom(
  room: Room,
  box: { xMm: number; yMm: number; zMm: number; widthMm: number; depthMm: number; heightMm: number },
  prefix = 'room_feature',
) {
  assertPositive(`${prefix}_x`, box.xMm, 0, 20000);
  assertPositive(`${prefix}_y`, box.yMm, 0, 20000);
  assertPositive(`${prefix}_z`, box.zMm, 0, 6000);
  assertPositive(`${prefix}_width`, box.widthMm, 10, 20000);
  assertPositive(`${prefix}_depth`, box.depthMm, 10, 20000);
  assertPositive(`${prefix}_height`, box.heightMm, 10, 6000);
  const rw = dimMm(room.dimensions?.width);
  const rd = dimMm(room.dimensions?.depth);
  const rh = dimMm(room.dimensions?.height);
  const tolerance = 0.1;
  if (rw && box.xMm + box.widthMm > rw + tolerance) throw new Error(`visual_${prefix}_outside_room_width`);
  if (rd && box.yMm + box.depthMm > rd + tolerance) throw new Error(`visual_${prefix}_outside_room_depth`);
  if (rh && box.zMm + box.heightMm > rh + tolerance) throw new Error(`visual_${prefix}_outside_room_height`);
}

function featureBox(xMm: number, yMm: number, zMm: number, widthMm: number, depthMm: number, heightMm: number) {
  return {
    origin: { x: mm(xMm), y: mm(yMm), z: mm(zMm) },
    size: { width: measured(widthMm), depth: measured(depthMm), height: measured(heightMm) },
  };
}

function boxMm(feature: WallOpening | Obstacle) {
  return {
    xMm: toMm(feature.bounds.origin.x),
    yMm: toMm(feature.bounds.origin.y),
    zMm: toMm(feature.bounds.origin.z),
    widthMm: dimMm(feature.bounds.size.width),
    depthMm: dimMm(feature.bounds.size.depth),
    heightMm: dimMm(feature.bounds.size.height),
  };
}

function cloneFurnitureWithFreshIds(item: FurnitureItem, name?: string): FurnitureItem {
  const clone = structuredClone(item);
  clone.id = randomUUID();
  if (name) clone.name = name;
  const moduleIdMap = new Map<string, string>();
  clone.modules.forEach((module, index) => {
    const oldId = module.id;
    module.id = randomUUID();
    moduleIdMap.set(oldId, module.id);
    module.name = module.name ?? `Секция ${index + 1}`;
    module.contents.forEach((element) => element.id = randomUUID());
  });
  clone.fronts.forEach((front) => {
    front.id = randomUUID();
    front.moduleIds = front.moduleIds.map((id) => moduleIdMap.get(id) ?? id);
  });
  return clone;
}

function localWidthDirection(rotationZDeg: number): { x: number; y: number } {
  // Transform positions in ProjectModel are the top-left/min corner of the furniture footprint.
  // Width maps to room X at 0/180° and to room Y at 90/270°.
  if (rotationZDeg === 90 || rotationZDeg === 270) return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

function assertPositive(name: string, value: number, min = 1, max = 20000) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`visual_invalid_${name}`);
}
function furnitureIndex(command: { furnitureIndex?: number }, project: ProjectModelV1): number {
  const index = command.furnitureIndex ?? 0;
  if (!project.furniture[index]) throw new Error('visual_furniture_not_found');
  return index;
}
function roomIndex(command: { roomIndex?: number }, project: ProjectModelV1): number {
  const index = command.roomIndex ?? 0;
  if (!project.site.rooms[index]) throw new Error('visual_room_not_found');
  return index;
}

function assertFurnitureInsideRoom(
  item: ProjectModelV1['furniture'][number],
  room: Room | undefined,
  overrides: { xMm?: number; yMm?: number; zMm?: number; widthMm?: number; heightMm?: number; depthMm?: number; rotationZDeg?: number } = {},
) {
  const xMm = overrides.xMm ?? toMm(item.transform.position.x);
  const yMm = overrides.yMm ?? toMm(item.transform.position.y);
  const zMm = overrides.zMm ?? toMm(item.transform.position.z);
  const widthMm = overrides.widthMm ?? (item.dimensions.width.value !== null ? toMm(item.dimensions.width.value) : 0);
  const heightMm = overrides.heightMm ?? (item.dimensions.height.value !== null ? toMm(item.dimensions.height.value) : 0);
  const depthMm = overrides.depthMm ?? (item.dimensions.depth.value !== null ? toMm(item.dimensions.depth.value) : 0);
  const rotationZDeg = overrides.rotationZDeg ?? item.transform.rotationZDeg;
  if (![0, 90, 180, 270].includes(rotationZDeg)) throw new Error('visual_invalid_furniture_rotation');
  assertPositive('furniture_x', xMm, 0, 20000);
  assertPositive('furniture_y', yMm, 0, 20000);
  assertPositive('furniture_z', zMm, 0, 6000);
  if (!room || !widthMm || !heightMm || !depthMm) return;
  const roomWidthMm = room.dimensions?.width.value !== null && room.dimensions?.width.value !== undefined ? toMm(room.dimensions.width.value) : 0;
  const roomDepthMm = room.dimensions?.depth.value !== null && room.dimensions?.depth.value !== undefined ? toMm(room.dimensions.depth.value) : 0;
  const roomHeightMm = room.dimensions?.height.value !== null && room.dimensions?.height.value !== undefined ? toMm(room.dimensions.height.value) : 0;
  const rotated = Math.abs(rotationZDeg % 180) === 90;
  const footprintWidthMm = rotated ? depthMm : widthMm;
  const footprintDepthMm = rotated ? widthMm : depthMm;
  const tolerance = 0.1;
  if (roomWidthMm && xMm + footprintWidthMm > roomWidthMm + tolerance) throw new Error('visual_furniture_outside_room_width');
  if (roomDepthMm && yMm + footprintDepthMm > roomDepthMm + tolerance) throw new Error('visual_furniture_outside_room_depth');
  if (roomHeightMm && zMm + heightMm > roomHeightMm + tolerance) throw new Error('visual_furniture_outside_room_height');
}

function roomForFurniture(project: ProjectModelV1, furnitureIndexValue: number): Room | undefined {
  const item = project.furniture[furnitureIndexValue]!;
  return (item.roomId ? project.site.rooms.find((room) => room.id === item.roomId) : undefined) ?? project.site.rooms[0];
}

function footprintMm(item: ProjectModelV1['furniture'][number], overrides: { widthMm?: number; depthMm?: number; rotationZDeg?: number } = {}) {
  const widthMm = overrides.widthMm ?? dimMm(item.dimensions.width);
  const depthMm = overrides.depthMm ?? dimMm(item.dimensions.depth);
  const rotationZDeg = overrides.rotationZDeg ?? item.transform.rotationZDeg;
  const rotated = Math.abs(rotationZDeg % 180) === 90;
  return { widthMm: rotated ? depthMm : widthMm, depthMm: rotated ? widthMm : depthMm };
}

function roomClearancesMm(item: ProjectModelV1['furniture'][number], room: Room | undefined) {
  if (!room) return undefined;
  const rw = dimMm(room.dimensions?.width), rd = dimMm(room.dimensions?.depth);
  if (!rw || !rd) return undefined;
  const fp = footprintMm(item);
  const x = toMm(item.transform.position.x), y = toMm(item.transform.position.y);
  return {
    left: Math.max(0, x),
    right: Math.max(0, rw - x - fp.widthMm),
    back: Math.max(0, y),
    front: Math.max(0, rd - y - fp.depthMm),
  };
}

function aabbOverlap2d(a: { x:number;y:number;width:number;depth:number }, b: { x:number;y:number;width:number;depth:number }, tolerance = 0.1) {
  return a.x < b.x + b.width - tolerance && a.x + a.width > b.x + tolerance && a.y < b.y + b.depth - tolerance && a.y + a.depth > b.y + tolerance;
}

function furniturePlanBox(item: ProjectModelV1['furniture'][number]) {
  const fp = footprintMm(item);
  return { x: toMm(item.transform.position.x), y: toMm(item.transform.position.y), width: fp.widthMm, depth: fp.depthMm };
}

function obstaclePlanBox(obstacle: Obstacle) {
  const b = boxMm(obstacle);
  return { x:b.xMm, y:b.yMm, width:b.widthMm, depth:b.depthMm };
}

function content(kind: VisualContentKind, count = 1): InteriorElement[] {
  const n = Math.max(1, Math.min(20, Math.round(count)));
  if (kind === 'shelves') return [{ id: randomUUID(), kind: 'shelf_stack', count: n, adjustable: true }];
  if (kind === 'drawers') return [{ id: randomUUID(), kind: 'drawer_stack', count: n, frontMode: 'external' }];
  if (kind === 'short_clothes' || kind === 'long_clothes') return [{ id: randomUUID(), kind: 'clothes_rail', count: n }];
  if (kind === 'mixed') return [
    { id: randomUUID(), kind: 'shelf_stack', count: Math.max(2, n), adjustable: true },
    { id: randomUUID(), kind: 'clothes_rail', count: 1 },
  ];
  return [{ id: randomUUID(), kind: 'open_space', label: 'Открытое пространство' }];
}

function moduleKind(kind: VisualContentKind): FurnitureModule['kind'] {
  return kind === 'open' ? 'open' : kind;
}

function makeModule(widthMm: number, kind: VisualContentKind, index: number): FurnitureModule {
  return {
    id: randomUUID(),
    kind: moduleKind(kind),
    name: `Секция ${index + 1}`,
    width: { mode: 'fixed', value: measured(widthMm) },
    contents: content(kind, kind === 'drawers' ? 3 : kind === 'shelves' ? 4 : 1),
  };
}

function makeKitchenModule(widthMm:number,index:number,moduleType:'base'|'wall'|'tall',heightMm:number,depthMm:number,opening:'handle'|'profile'|'gola'|'push_to_open'|'none'): FurnitureModule {
  return { id:randomUUID(), kind:'open', name:`Кухня ${index+1}`, width:{mode:'fixed',value:measured(widthMm)}, height:measured(heightMm), depth:measured(depthMm), contents:[{id:randomUUID(),kind:'open_space',label:'Kitchen storage'}], kitchen:{ type:moduleType,function:'storage',hasTop:true,hasBottom:true,hasBack:true,opening,worktop:{enabled:moduleType==='base',thickness:measured(38),depth:measured(Math.max(depthMm+40,600)),frontOverhang:measured(40),cutouts:[]},plinth:{enabled:moduleType==='base',height:measured(100),setback:measured(70),legCount:4} }, tags:['kitchen-module'] };
}

function rectangularRoom(name: string, widthMm: number, depthMm: number, heightMm: number): Room {
  const id = randomUUID();
  const z = mm(0);
  const h = measured(heightMm);
  const a = { x: mm(0), y: mm(0), z };
  const b = { x: mm(widthMm), y: mm(0), z };
  const c = { x: mm(widthMm), y: mm(depthMm), z };
  const d = { x: mm(0), y: mm(depthMm), z };
  return {
    id,
    name,
    origin: a,
    dimensions: { width: measured(widthMm), depth: measured(depthMm), height: measured(heightMm) },
    walls: [
      { id: randomUUID(), start: a, end: b, height: h },
      { id: randomUUID(), start: b, end: c, height: h },
      { id: randomUUID(), start: c, end: d, height: h },
      { id: randomUUID(), start: d, end: a, height: h },
    ],
    openings: [], obstacles: [],
  };
}

function fixedModuleWidths(project: ProjectModelV1, fi: number): number[] {
  const modules = project.furniture[fi]!.modules;
  return modules.map((m) => m.width.mode === 'fixed' && m.width.value.value !== null ? toMm(m.width.value.value) : 0);
}

function proportionalFixedWidthsMm10(project: ProjectModelV1, fi: number, targetWidthMm: number): number[] | null {
  const modules = project.furniture[fi]!.modules;
  if (!modules.length) return [];
  const current = modules.map((m) => m.width.mode === 'fixed' && m.width.value.value !== null ? Number(m.width.value.value) : 0);
  if (current.some((value) => value <= 0)) return null;
  const currentTotal = current.reduce((a, b) => a + b, 0);
  if (currentTotal <= 0) return null;
  const targetTotal = Number(mm(targetWidthMm));
  const exact = current.map((value) => value * targetTotal / currentTotal);
  const base = exact.map(Math.floor);
  let remainder = targetTotal - base.reduce((a, b) => a + b, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - base[index]! }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i++) base[order[i % order.length]!.index]! += 1;
  return base;
}

function patchFronts(project: ProjectModelV1, fi: number, modules: FurnitureModule[]) {
  const item = project.furniture[fi]!;
  const existingMaterial = item.fronts[0]?.materialSelectionId ?? item.construction.defaultFrontMaterialSelectionId;
  return [{
    id: randomUUID(),
    moduleIds: modules.map(m => m.id),
    kind: 'hinged' as const,
    count: modules.length,
    split: 'none' as const,
    opening: 'mixed' as const,
    hingeSides: modules.map((_, i) => i % 2 === 0 ? 'left' as const : 'right' as const),
    ...(existingMaterial ? { materialSelectionId: existingMaterial } : {}),
    handle: { mode: 'handle' as const },
  }];
}

export function compileVisualCommand(project: ProjectModelV1, command: VisualEditorCommand): ProjectChangeSet {
  const patches: ProjectChangeSet['patches'] = [];
  if (command.type === 'create_rect_room') {
    assertPositive('room_width', command.widthMm, 500, 20000); assertPositive('room_depth', command.depthMm, 500, 20000); assertPositive('room_height', command.heightMm, 1500, 6000);
    const room=rectangularRoom(command.name ?? `Помещение ${project.site.rooms.length + 1}`, command.widthMm, command.depthMm, command.heightMm);
    patches.push({ op: 'add', path: '/site/rooms/-', value: room });
    if(project.furniture[0] && !project.furniture[0].roomId) patches.push({op:'set',path:'/furniture/0/roomId',value:room.id});
  } else if (command.type === 'set_room_dimensions') {
    const ri = roomIndex(command, project); const room = project.site.rooms[ri]!;
    const widthMm = command.widthMm ?? (room.dimensions?.width.value !== null && room.dimensions?.width.value !== undefined ? toMm(room.dimensions.width.value) : 4000);
    const depthMm = command.depthMm ?? (room.dimensions?.depth.value !== null && room.dimensions?.depth.value !== undefined ? toMm(room.dimensions.depth.value) : 3500);
    const heightMm = command.heightMm ?? (room.dimensions?.height.value !== null && room.dimensions?.height.value !== undefined ? toMm(room.dimensions.height.value) : 2600);
    assertPositive('room_width', widthMm, 500, 20000); assertPositive('room_depth', depthMm, 500, 20000); assertPositive('room_height', heightMm, 1500, 6000);
    const next = rectangularRoom(room.name, widthMm, depthMm, heightMm); next.id = room.id; if (room.walls.length === next.walls.length) next.walls.forEach((wall, index) => wall.id = room.walls[index]!.id); next.openings=structuredClone(room.openings); next.obstacles=structuredClone(room.obstacles);
    project.furniture.forEach((item, fi) => {
      if (item.roomId === room.id || (!item.roomId && ri === 0)) assertFurnitureInsideRoom(item, next);
    });
    next.openings.forEach((feature) => assertBoxInsideRoom(next, boxMm(feature), 'opening'));
    next.obstacles.forEach((feature) => assertBoxInsideRoom(next, boxMm(feature), 'obstacle'));
    patches.push({ op: 'replace', path: `/site/rooms/${ri}`, value: next });
  } else if (command.type === 'set_furniture_dimensions') {
    const fi = furnitureIndex(command, project); const item = project.furniture[fi]!; const base = `/furniture/${fi}/dimensions`;
    assertFurnitureInsideRoom(item, roomForFurniture(project, fi), { ...(command.widthMm !== undefined ? { widthMm: command.widthMm } : {}), ...(command.heightMm !== undefined ? { heightMm: command.heightMm } : {}), ...(command.depthMm !== undefined ? { depthMm: command.depthMm } : {}) });
    for (const [key,value] of [['width',command.widthMm],['height',command.heightMm],['depth',command.depthMm]] as const) {
      if (value !== undefined) { assertPositive(`furniture_${key}`, value, 100, 12000); patches.push({ op:'set', path:`${base}/${key}`, value: measured(value) }); }
    }
    if (command.widthMm !== undefined) {
      const widths = proportionalFixedWidthsMm10(project, fi, command.widthMm);
      if (widths) {
        widths.forEach((widthMm10) => assertPositive('scaled_module_width', widthMm10 / 10, 100, 4000));
        const modules = structuredClone(project.furniture[fi]!.modules);
        modules.forEach((module, index) => module.width = { mode: 'fixed', value: measuredMm10(widths[index]!) });
        patches.push({ op:'set', path:`/furniture/${fi}/modules`, value: modules });
      }
    }
  } else if (command.type === 'set_furniture_position') {
    const fi = furnitureIndex(command, project); const item = project.furniture[fi]!; const base = `/furniture/${fi}/transform`;
    assertFurnitureInsideRoom(item, roomForFurniture(project, fi), { ...(command.xMm !== undefined ? { xMm: command.xMm } : {}), ...(command.yMm !== undefined ? { yMm: command.yMm } : {}), ...(command.zMm !== undefined ? { zMm: command.zMm } : {}), ...(command.rotationZDeg !== undefined ? { rotationZDeg: command.rotationZDeg } : {}) });
    if (command.xMm !== undefined) patches.push({op:'set',path:`${base}/position/x`,value:pos(command.xMm)});
    if (command.yMm !== undefined) patches.push({op:'set',path:`${base}/position/y`,value:pos(command.yMm)});
    if (command.zMm !== undefined) patches.push({op:'set',path:`${base}/position/z`,value:pos(command.zMm)});
    if (command.rotationZDeg !== undefined) patches.push({op:'set',path:`${base}/rotationZDeg`,value:command.rotationZDeg});
  } else if (command.type === 'resize_furniture_edge') {
    const fi = furnitureIndex(command, project); const item = project.furniture[fi]!;
    if (!Number.isFinite(command.deltaMm) || Math.abs(command.deltaMm) > 12000) throw new Error('visual_invalid_resize_delta');
    const widthMm = dimMm(item.dimensions.width), heightMm = dimMm(item.dimensions.height), depthMm = dimMm(item.dimensions.depth);
    let xMm = toMm(item.transform.position.x), yMm = toMm(item.transform.position.y), zMm = toMm(item.transform.position.z);
    let nextWidth = widthMm, nextHeight = heightMm;
    if (command.edge === 'right') nextWidth = widthMm + command.deltaMm;
    if (command.edge === 'left') {
      nextWidth = widthMm - command.deltaMm;
      const dir = localWidthDirection(item.transform.rotationZDeg);
      xMm += command.deltaMm * dir.x;
      yMm += command.deltaMm * dir.y;
    }
    if (command.edge === 'top') nextHeight = heightMm + command.deltaMm;
    if (command.edge === 'bottom') { nextHeight = heightMm - command.deltaMm; zMm += command.deltaMm; }
    assertPositive('furniture_width', nextWidth, 200, 12000); assertPositive('furniture_height', nextHeight, 200, 6000);
    assertFurnitureInsideRoom(item, roomForFurniture(project, fi), { xMm, yMm, zMm, widthMm: nextWidth, heightMm: nextHeight, depthMm });
    if (nextWidth !== widthMm) {
      const widths = proportionalFixedWidthsMm10(project, fi, nextWidth);
      if (widths) {
        widths.forEach((widthMm10) => assertPositive('scaled_module_width', widthMm10 / 10, 100, 4000));
        const modules = structuredClone(item.modules);
        modules.forEach((module, index) => module.width = { mode: 'fixed', value: measuredMm10(widths[index]!) });
        patches.push({ op:'set', path:`/furniture/${fi}/modules`, value: modules });
      }
      patches.push({ op:'set', path:`/furniture/${fi}/dimensions/width`, value: measured(nextWidth) });
    }
    if (nextHeight !== heightMm) patches.push({ op:'set', path:`/furniture/${fi}/dimensions/height`, value: measured(nextHeight) });
    if (xMm !== toMm(item.transform.position.x)) patches.push({ op:'set', path:`/furniture/${fi}/transform/position/x`, value: pos(xMm) });
    if (yMm !== toMm(item.transform.position.y)) patches.push({ op:'set', path:`/furniture/${fi}/transform/position/y`, value: pos(yMm) });
    if (zMm !== toMm(item.transform.position.z)) patches.push({ op:'set', path:`/furniture/${fi}/transform/position/z`, value: pos(zMm) });
  } else if (command.type === 'duplicate_furniture') {
    const fi = furnitureIndex(command, project); const source = project.furniture[fi]!; const room = roomForFurniture(project, fi);
    const clone = cloneFurnitureWithFreshIds(source, command.name ?? `${source.name} copy`);
    const xMm = toMm(source.transform.position.x) + (command.offsetXMm ?? 100);
    const yMm = toMm(source.transform.position.y) + (command.offsetYMm ?? 100);
    clone.transform.position.x = pos(xMm); clone.transform.position.y = pos(yMm);
    if (command.rotationZDeg !== undefined) clone.transform.rotationZDeg = command.rotationZDeg;
    assertFurnitureInsideRoom(clone, room);
    patches.push({ op:'add', path:'/furniture/-', value: clone });
  } else if (command.type === 'remove_furniture') {
    const fi = furnitureIndex(command, project);
    patches.push({ op:'remove', path:`/furniture/${fi}` });
  } else if (command.type === 'add_room_opening') {
    const ri = roomIndex(command, project); const room = project.site.rooms[ri]!;
    const zMm = command.zMm ?? 0; const box = { xMm: command.xMm, yMm: command.yMm, zMm, widthMm: command.widthMm, depthMm: command.depthMm, heightMm: command.heightMm };
    assertBoxInsideRoom(room, box, 'opening');
    const opening: WallOpening = { id: randomUUID(), kind: command.kind, bounds: featureBox(box.xMm, box.yMm, box.zMm, box.widthMm, box.depthMm, box.heightMm), ...(command.hostWallId ? { hostWallId: command.hostWallId } : {}), ...(command.note ? { note: command.note } : {}) };
    patches.push({ op:'add', path:`/site/rooms/${ri}/openings/-`, value: opening });
  } else if (command.type === 'move_room_opening') {
    const ri = roomIndex(command, project); const room = project.site.rooms[ri]!; const opening = room.openings[command.openingIndex];
    if (!opening) throw new Error('visual_opening_not_found'); const current = boxMm(opening);
    const next = { ...current, ...(command.xMm !== undefined ? { xMm: command.xMm } : {}), ...(command.yMm !== undefined ? { yMm: command.yMm } : {}), ...(command.zMm !== undefined ? { zMm: command.zMm } : {}) };
    assertBoxInsideRoom(room, next, 'opening');
    patches.push({ op:'set', path:`/site/rooms/${ri}/openings/${command.openingIndex}/bounds/origin`, value:{ x:pos(next.xMm), y:pos(next.yMm), z:pos(next.zMm) } });
  } else if (command.type === 'remove_room_opening') {
    const ri = roomIndex(command, project); if (!project.site.rooms[ri]!.openings[command.openingIndex]) throw new Error('visual_opening_not_found');
    patches.push({ op:'remove', path:`/site/rooms/${ri}/openings/${command.openingIndex}` });
  } else if (command.type === 'add_room_obstacle') {
    const ri = roomIndex(command, project); const room = project.site.rooms[ri]!;
    const zMm = command.zMm ?? 0; const box = { xMm: command.xMm, yMm: command.yMm, zMm, widthMm: command.widthMm, depthMm: command.depthMm, heightMm: command.heightMm };
    assertBoxInsideRoom(room, box, 'obstacle');
    const obstacle: Obstacle = { id: randomUUID(), kind: command.kind, bounds: featureBox(box.xMm, box.yMm, box.zMm, box.widthMm, box.depthMm, box.heightMm), ...(command.hostWallId ? { hostWallId: command.hostWallId } : {}), ...(command.note ? { note: command.note } : {}) };
    patches.push({ op:'add', path:`/site/rooms/${ri}/obstacles/-`, value: obstacle });
  } else if (command.type === 'move_room_obstacle') {
    const ri = roomIndex(command, project); const room = project.site.rooms[ri]!; const obstacle = room.obstacles[command.obstacleIndex];
    if (!obstacle) throw new Error('visual_obstacle_not_found'); const current = boxMm(obstacle);
    const next = { ...current, ...(command.xMm !== undefined ? { xMm: command.xMm } : {}), ...(command.yMm !== undefined ? { yMm: command.yMm } : {}), ...(command.zMm !== undefined ? { zMm: command.zMm } : {}) };
    assertBoxInsideRoom(room, next, 'obstacle');
    patches.push({ op:'set', path:`/site/rooms/${ri}/obstacles/${command.obstacleIndex}/bounds/origin`, value:{ x:pos(next.xMm), y:pos(next.yMm), z:pos(next.zMm) } });
  } else if (command.type === 'remove_room_obstacle') {
    const ri = roomIndex(command, project); if (!project.site.rooms[ri]!.obstacles[command.obstacleIndex]) throw new Error('visual_obstacle_not_found');
    patches.push({ op:'remove', path:`/site/rooms/${ri}/obstacles/${command.obstacleIndex}` });
  } else if (command.type === 'set_carcass_thickness') {
    const fi = furnitureIndex(command, project);
    assertPositive('carcass_thickness', command.thicknessMm, 8, 60);
    const item = project.furniture[fi]!;
    const minModule = fixedModuleWidths(project, fi).filter((x) => x > 0).reduce((a,b) => Math.min(a,b), Number.POSITIVE_INFINITY);
    if (Number.isFinite(minModule) && minModule <= command.thicknessMm * 2 + 20) throw new Error('visual_carcass_too_thick_for_module');
    patches.push({ op:'set', path:`/furniture/${fi}/construction/carcassThickness`, value: measured(command.thicknessMm) });
  } else if (command.type === 'set_furniture_wall_clearance') {
    const fi = furnitureIndex(command, project); const item = project.furniture[fi]!; const room = roomForFurniture(project, fi);
    if (!room) throw new Error('visual_room_not_found');
    assertPositive('wall_clearance', command.clearanceMm, 0, 5000);
    const rw = dimMm(room.dimensions?.width), rd = dimMm(room.dimensions?.depth);
    const fp = footprintMm(item); let xMm = toMm(item.transform.position.x), yMm = toMm(item.transform.position.y);
    if (command.wall === 'left') xMm = command.clearanceMm;
    else if (command.wall === 'right') xMm = rw - fp.widthMm - command.clearanceMm;
    else if (command.wall === 'back') yMm = command.clearanceMm;
    else yMm = rd - fp.depthMm - command.clearanceMm;
    if (xMm < 0) throw new Error('visual_furniture_outside_room_width');
    if (yMm < 0) throw new Error('visual_furniture_outside_room_depth');
    assertFurnitureInsideRoom(item, room, { xMm, yMm });
    patches.push({ op:'set', path:`/furniture/${fi}/transform/position/x`, value: pos(xMm) });
    patches.push({ op:'set', path:`/furniture/${fi}/transform/position/y`, value: pos(yMm) });
  } else if (command.type === 'align_furniture_to_furniture') {
    const fi = furnitureIndex(command, project); const targetIndex = command.targetFurnitureIndex; const item = project.furniture[fi]!, target = project.furniture[targetIndex];
    if (!target) throw new Error('visual_target_furniture_not_found'); if (targetIndex === fi) throw new Error('visual_cannot_align_to_self');
    if ((item.roomId ?? project.site.rooms[0]?.id) !== (target.roomId ?? project.site.rooms[0]?.id)) throw new Error('visual_alignment_requires_same_room');
    const gapMm = command.gapMm ?? 0; assertPositive('furniture_gap', gapMm, 0, 2000);
    const room = roomForFurniture(project, fi); const fp = footprintMm(item), tp = footprintMm(target);
    let xMm=toMm(item.transform.position.x), yMm=toMm(item.transform.position.y); const tx=toMm(target.transform.position.x), ty=toMm(target.transform.position.y);
    if (command.side === 'left') xMm = tx - fp.widthMm - gapMm;
    else if (command.side === 'right') xMm = tx + tp.widthMm + gapMm;
    else if (command.side === 'back') yMm = ty - fp.depthMm - gapMm;
    else yMm = ty + tp.depthMm + gapMm;
    assertFurnitureInsideRoom(item, room, { xMm, yMm });
    patches.push({ op:'set', path:`/furniture/${fi}/transform/position/x`, value: pos(xMm) });
    patches.push({ op:'set', path:`/furniture/${fi}/transform/position/y`, value: pos(yMm) });
  } else if (command.type === 'create_l_corner_layout') {
    const fi = furnitureIndex(command, project); const source = project.furniture[fi]!; const room = roomForFurniture(project, fi);
    if (!room) throw new Error('visual_room_not_found');
    if (source.transform.rotationZDeg !== 0) throw new Error('visual_corner_layout_requires_rotation_0');
    const gapMm = command.gapMm ?? 0; assertPositive('corner_gap', gapMm, 0, 2000);
    const sourceWidth = dimMm(source.dimensions.width), sourceDepth = dimMm(source.dimensions.depth);
    const returnWidthMm = command.returnWidthMm ?? sourceWidth; assertPositive('corner_return_width', returnWidthMm, 200, 12000);
    const clone = cloneFurnitureWithFreshIds(source, command.name ?? `${source.name} · return`);
    clone.dimensions.width = measured(returnWidthMm);
    const widths = proportionalFixedWidthsMm10(project, fi, returnWidthMm);
    if (widths) {
      widths.forEach((widthMm10) => assertPositive('scaled_module_width', widthMm10 / 10, 100, 4000));
      clone.modules.forEach((module, index) => module.width = { mode:'fixed', value:measuredMm10(widths[index]!) });
    }
    clone.transform.rotationZDeg = 90;
    const roomWidth = dimMm(room.dimensions?.width), roomDepth = dimMm(room.dimensions?.depth);
    const originalX = toMm(source.transform.position.x), originalY = toMm(source.transform.position.y);
    const horizontalSpan = sourceWidth + sourceDepth + gapMm;
    if (horizontalSpan > roomWidth + 0.1) throw new Error('visual_corner_layout_too_wide_for_room');
    if (Math.max(sourceDepth, returnWidthMm) > roomDepth + 0.1) throw new Error('visual_corner_layout_too_deep_for_room');
    let mainX = originalX;
    if (command.hand === 'right') mainX = Math.max(0, Math.min(roomWidth - horizontalSpan, originalX));
    else mainX = Math.max(sourceDepth + gapMm, Math.min(roomWidth - sourceWidth, originalX));
    const mainY = Math.max(0, Math.min(roomDepth - Math.max(sourceDepth, returnWidthMm), originalY));
    const xMm = command.hand === 'right' ? mainX + sourceWidth + gapMm : mainX - sourceDepth - gapMm;
    const yMm = mainY;
    clone.transform.position.x = pos(xMm); clone.transform.position.y = pos(yMm);
    assertFurnitureInsideRoom(clone, room);
    assertFurnitureInsideRoom(source, room, { xMm:mainX, yMm:mainY });
    if (mainX !== originalX) patches.push({ op:'set', path:`/furniture/${fi}/transform/position/x`, value:pos(mainX) });
    if (mainY !== originalY) patches.push({ op:'set', path:`/furniture/${fi}/transform/position/y`, value:pos(mainY) });
    const groupId = randomUUID();
    const cleanTags = (source.tags ?? []).filter((tag) => !tag.startsWith('cad-group:') && !tag.startsWith('cad-layout:') && !tag.startsWith('cad-role:') && !tag.startsWith('cad-hand:'));
    patches.push({ op:'set', path:`/furniture/${fi}/tags`, value:[...cleanTags,`cad-group:${groupId}`,'cad-layout:l_corner','cad-role:main',`cad-hand:${command.hand}`] });
    clone.tags = [...cleanTags,`cad-group:${groupId}`,'cad-layout:l_corner','cad-role:return',`cad-hand:${command.hand}`];
    patches.push({ op:'add', path:'/furniture/-', value: clone });
  } else if (command.type === 'configure_kitchen_run') {
    const fi=furnitureIndex(command,project);
    if(!Array.isArray(command.widthsMm)||command.widthsMm.length<1||command.widthsMm.length>20) throw new Error('visual_invalid_kitchen_widths');
    command.widthsMm.forEach(w=>assertPositive('kitchen_module_width',w,150,1800));
    const moduleType=command.moduleType??'base'; const h=command.heightMm??(moduleType==='base'?720:moduleType==='wall'?900:2100); const d=command.depthMm??(moduleType==='wall'?330:560);
    assertPositive('kitchen_module_height',h,200,3000); assertPositive('kitchen_module_depth',d,200,900);
    const modules=command.widthsMm.map((w,i)=>makeKitchenModule(w,i,moduleType,h,d,command.opening??'gola'));
    patches.push({op:'set',path:`/furniture/${fi}/kind`,value:'kitchen'});
    patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules});
    patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:[]});
    patches.push({op:'set',path:`/furniture/${fi}/dimensions/width`,value:measured(command.widthsMm.reduce((a,b)=>a+b,0))});
    patches.push({op:'set',path:`/furniture/${fi}/dimensions/height`,value:measured(moduleType==='base'?h+100:h)});
    patches.push({op:'set',path:`/furniture/${fi}/dimensions/depth`,value:measured(d)});
    patches.push({op:'set',path:`/furniture/${fi}/mounting`,value:moduleType==='wall'?'wall_hung':'base_supported'});
  } else if (command.type === 'set_kitchen_module') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; const m=item.modules[command.moduleIndex]; if(!m) throw new Error('visual_module_not_found'); if(item.kind!=='kitchen') throw new Error('visual_not_kitchen');
    const next=structuredClone(m); const current=next.kitchen??{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:true};
    next.kitchen={...current,...(command.moduleType?{type:command.moduleType}:{}),...(command.function?{function:command.function}:{}),...(command.hasTop!==undefined?{hasTop:command.hasTop}:{}),...(command.hasBottom!==undefined?{hasBottom:command.hasBottom}:{}),...(command.hasBack!==undefined?{hasBack:command.hasBack}:{}),...(command.opening?{opening:command.opening}:{}),...(command.backPanelMode?{backPanelMode:command.backPanelMode}:{}),...(command.wallHangerHardwareSelectionId?{wallHangerHardwareSelectionId:command.wallHangerHardwareSelectionId}:{}),...(command.wallHangerCount!==undefined?{wallHangerCount:command.wallHangerCount}:{})};
    if(command.wallHangerHardwareSelectionId){const hanger=project.selections.hardware.find(x=>x.id===command.wallHangerHardwareSelectionId);if(!hanger)throw new Error('visual_wall_hanger_not_found')}
    if(command.wallHangerCount!==undefined&&(command.wallHangerCount<0||command.wallHangerCount>20))throw new Error('visual_invalid_wall_hanger_count');
    if(command.heightMm!==undefined){assertPositive('kitchen_module_height',command.heightMm,200,3000);next.height=measured(command.heightMm)}; if(command.depthMm!==undefined){assertPositive('kitchen_module_depth',command.depthMm,200,900);next.depth=measured(command.depthMm)};
    if(command.worktop!==undefined) next.kitchen.worktop={...(next.kitchen.worktop??{}),enabled:command.worktop}; if(command.plinth!==undefined) next.kitchen.plinth={...(next.kitchen.plinth??{}),enabled:command.plinth};
    if(command.function==='drawers') next.kind='drawers'; else if(command.function==='sink') next.kind='sink'; else if(['oven','dishwasher','fridge','hood','microwave','hob'].includes(command.function??'')) next.kind='appliance'; else next.kind='open';
    patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}`,value:next});
  } else if (command.type === 'set_kitchen_drawers') {
    const fi=furnitureIndex(command,project); const m=structuredClone(project.furniture[fi]!.modules[command.moduleIndex]); if(!m) throw new Error('visual_module_not_found'); if(project.furniture[fi]!.kind!=='kitchen') throw new Error('visual_not_kitchen'); if(command.count<1||command.count>10) throw new Error('visual_invalid_drawer_count');
    const runner=project.selections.hardware.find(x=>x.id===command.runnerHardwareSelectionId); if(!runner||runner.role!=='runner') throw new Error('visual_runner_not_found');
    const drawer={id:randomUUID(),kind:'drawer_stack' as const,count:Math.round(command.count),frontMode:'external' as const,runnerHardwareSelectionId:command.runnerHardwareSelectionId,drawerBox:{...(command.frontHeightMm?{frontHeight:measured(command.frontHeightMm)}:{}),...(command.sideHeightMm?{sideHeight:measured(command.sideHeightMm)}:{}),...(command.sideThicknessMm?{sideThickness:measured(command.sideThicknessMm)}:{}),...(command.bottomThicknessMm?{bottomThickness:measured(command.bottomThicknessMm)}:{})}};
    m.kind='drawers';m.contents=[drawer];m.kitchen={...(m.kitchen??{type:'base',hasTop:true,hasBottom:true,hasBack:true}),function:'drawers'}; patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}`,value:m});
  } else if (command.type === 'set_kitchen_appliance') {
    const fi=furnitureIndex(command,project); const m=structuredClone(project.furniture[fi]!.modules[command.moduleIndex]); if(!m) throw new Error('visual_module_not_found'); if(project.furniture[fi]!.kind!=='kitchen') throw new Error('visual_not_kitchen'); [command.widthMm,command.heightMm,command.depthMm].forEach(v=>assertPositive('appliance_dimension',v,20,3000));
    const requiredSpace={width:measured(command.widthMm),height:measured(command.heightMm),depth:measured(command.depthMm)}; const app={kind:command.kind,...(command.manufacturer?{manufacturer:command.manufacturer}:{}),...(command.model?{model:command.model}:{}),...(command.installation?{installation:command.installation}:{}),requiredSpace};
    const current=m.kitchen??{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:true};
    const existing=(current.appliances??(current.appliance?[current.appliance]:[])).filter((a:any)=>a.kind!==command.kind);
    const appliances=command.append?[...existing,app]:[app]; const primary=appliances[0]!;
    m.kind='appliance';m.contents=[...m.contents.filter((x:any)=>x.kind!=='appliance_space'),...appliances.map((a:any)=>({id:randomUUID(),kind:'appliance_space' as const,applianceKind:a.kind,requiredSpace:a.requiredSpace}))];
    m.kitchen={...current,function:command.append?current.function:(command.kind==='other'?'storage':command.kind),appliance:primary,appliances}; patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}`,value:m});
  } else if (command.type === 'set_kitchen_wall_trim') {
    const fi=furnitureIndex(command,project); const m=structuredClone(project.furniture[fi]!.modules[command.moduleIndex]); if(!m) throw new Error('visual_module_not_found'); if(project.furniture[fi]!.kind!=='kitchen') throw new Error('visual_not_kitchen');
    if(command.enabled){if(command.heightMm===undefined||command.depthMm===undefined)throw new Error('visual_wall_trim_dimensions_required');assertPositive('wall_trim_height',command.heightMm,5,500);assertPositive('wall_trim_depth',command.depthMm,2,100);if(command.materialSelectionId&&!project.selections.materials.some(x=>x.id===command.materialSelectionId))throw new Error('visual_wall_trim_material_not_found')}
    const current=m.kitchen??{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:true}; const worktop={...(current.worktop??{}),enabled:true};
    worktop.wallTrim=command.enabled?{enabled:true,height:measured(command.heightMm!),depth:measured(command.depthMm!),...(command.materialSelectionId?{materialSelectionId:command.materialSelectionId}:{})}:{enabled:false};
    m.kitchen={...current,worktop};patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}`,value:m});
  } else if (command.type === 'set_kitchen_cutout') {
    const fi=furnitureIndex(command,project); const m=structuredClone(project.furniture[fi]!.modules[command.moduleIndex]); if(!m) throw new Error('visual_module_not_found'); if(project.furniture[fi]!.kind!=='kitchen') throw new Error('visual_not_kitchen'); assertPositive('cutout_width',command.widthMm,20,1800); assertPositive('cutout_depth',command.depthMm,20,900); if(command.verifiedForCnc===true) throw new Error('visual_cnc_verification_requires_manufacturing_trust');
    const cutout={id:randomUUID(),kind:command.kind,width:measured(command.widthMm),depth:measured(command.depthMm),...(command.offsetXMm!==undefined?{offsetX:measured(command.offsetXMm)}:{}),...(command.offsetYMm!==undefined?{offsetY:measured(command.offsetYMm)}:{}),verifiedForCnc:false};
    m.kitchen={...(m.kitchen??{type:'base',function:command.kind==='sink'?'sink':'hob',hasTop:true,hasBottom:true,hasBack:true}),worktop:{...(m.kitchen?.worktop??{}),enabled:true,cutouts:[cutout]}}; patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}`,value:m});
  } else if (command.type === 'set_kitchen_materials') {
    const fi=furnitureIndex(command,project); if(project.furniture[fi]!.kind!=='kitchen') throw new Error('visual_not_kitchen'); const mats=project.selections.materials; const material=(id:string|undefined)=>id?mats.find(x=>x.id===id):undefined; const requireRole=(id:string|undefined,roles:string[])=>{if(!id)return;const found=material(id);if(!found||!roles.includes(found.role))throw new Error('visual_material_role_mismatch')};
    requireRole(command.carcassMaterialSelectionId,['carcass']); requireRole(command.frontMaterialSelectionId,['front']); requireRole(command.backMaterialSelectionId,['back']); requireRole(command.edgeMaterialSelectionId,['edge']); requireRole(command.worktopMaterialSelectionId,['worktop']);
    if(command.legHardwareSelectionId){const leg=project.selections.hardware.find(x=>x.id===command.legHardwareSelectionId);if(!leg||leg.role!=='leg')throw new Error('visual_leg_hardware_not_found')}
    patches.push({op:'set',path:`/furniture/${fi}/construction/defaultCarcassMaterialSelectionId`,value:command.carcassMaterialSelectionId}); if(command.frontMaterialSelectionId) patches.push({op:'set',path:`/furniture/${fi}/construction/defaultFrontMaterialSelectionId`,value:command.frontMaterialSelectionId}); if(command.edgeMaterialSelectionId) patches.push({op:'set',path:`/furniture/${fi}/construction/defaultEdgeMaterialSelectionId`,value:command.edgeMaterialSelectionId}); if(command.backMaterialSelectionId) patches.push({op:'set',path:`/furniture/${fi}/construction/backPanel/materialSelectionId`,value:command.backMaterialSelectionId});
    if(command.worktopMaterialSelectionId||command.legHardwareSelectionId){const modules=structuredClone(project.furniture[fi]!.modules);modules.forEach(m=>{if(!m.kitchen)return;if(command.worktopMaterialSelectionId&&m.kitchen.worktop?.enabled)m.kitchen.worktop.materialSelectionId=command.worktopMaterialSelectionId;if(command.legHardwareSelectionId&&m.kitchen.plinth?.enabled)m.kitchen.plinth.legHardwareSelectionId=command.legHardwareSelectionId});patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules});}
  } else if (command.type === 'set_kitchen_front') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; const module=item.modules[command.moduleIndex]; if(!module) throw new Error('visual_module_not_found'); if(item.kind!=='kitchen') throw new Error('visual_not_kitchen');
    if(command.materialSelectionId){const mat=project.selections.materials.find(x=>x.id===command.materialSelectionId);if(!mat||mat.role!=='front')throw new Error('visual_front_material_not_found')}
    const fronts=structuredClone(item.fronts).filter(front=>!front.moduleIds.includes(module.id));
    if(command.mode!=='none'){
      const double=command.mode==='double'; const left=command.mode==='single_left'; const right=command.mode==='single_right';
      fronts.push({id:randomUUID(),moduleIds:[module.id],kind:'hinged',count:double?2:1,split:double?'vertical':'none',opening:double?'paired':left?'left':right?'right':'left',hingeSides:double?['left','right']:[right?'right':'left'],...(command.materialSelectionId?{materialSelectionId:command.materialSelectionId}:item.construction.defaultFrontMaterialSelectionId?{materialSelectionId:item.construction.defaultFrontMaterialSelectionId}:{}),handle:{mode:command.openingMode??module.kitchen?.opening??'handle'}});
    }
    patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:fronts});
  } else if (command.type === 'set_module_width') {
    const fi = furnitureIndex(command, project); const modules = project.furniture[fi]!.modules;
    if (!modules[command.moduleIndex]) throw new Error('visual_module_not_found'); assertPositive('module_width',command.widthMm,100,4000);
    patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}/width`,value:{mode:'fixed',value:measured(command.widthMm)}});
  } else if (command.type === 'move_module_divider') {
    const fi=furnitureIndex(command,project); const modules=project.furniture[fi]!.modules; const li=command.leftModuleIndex; const left=modules[li]; const right=modules[li+1];
    if(!left||!right) throw new Error('visual_divider_not_found');
    const leftWidth=left.width.mode==='fixed'&&left.width.value.value!==null?toMm(left.width.value.value):0; const rightWidth=right.width.mode==='fixed'&&right.width.value.value!==null?toMm(right.width.value.value):0;
    if(!leftWidth||!rightWidth) throw new Error('visual_divider_requires_fixed_widths'); const nextLeft=leftWidth+command.deltaMm; const nextRight=rightWidth-command.deltaMm;
    assertPositive('module_width',nextLeft,100,4000); assertPositive('module_width',nextRight,100,4000);
    patches.push({op:'set',path:`/furniture/${fi}/modules/${li}/width`,value:{mode:'fixed',value:measured(nextLeft)}});
    patches.push({op:'set',path:`/furniture/${fi}/modules/${li+1}/width`,value:{mode:'fixed',value:measured(nextRight)}});
  } else if (command.type === 'set_shelf_elevation') {
    const fi = furnitureIndex(command, project); const item = project.furniture[fi]!; const module = item.modules[command.moduleIndex];
    if (!module) throw new Error('visual_module_not_found');
    const elementIndex = module.contents.findIndex((element) => element.kind === 'shelf_stack');
    const shelf = elementIndex >= 0 ? module.contents[elementIndex] : undefined;
    if (!shelf || shelf.kind !== 'shelf_stack') throw new Error('visual_shelf_stack_not_found');
    if (!Number.isInteger(command.shelfIndex) || command.shelfIndex < 0 || command.shelfIndex >= shelf.count) throw new Error('visual_shelf_not_found');
    const heightMm = item.dimensions.height.value !== null ? toMm(item.dimensions.height.value) : 0;
    if (!heightMm) throw new Error('visual_furniture_height_unknown');
    assertPositive('shelf_elevation', command.elevationMm, 50, Math.max(50, heightMm - 50));
    const existing = shelf.elevationsFromBottom?.length === shelf.count
      ? shelf.elevationsFromBottom.map((value) => Number(value.value ?? 0))
      : Array.from({ length: shelf.count }, (_, index) => Number(mm(heightMm * (index + 1) / (shelf.count + 1))));
    existing[command.shelfIndex] = Number(mm(command.elevationMm));
    for (let i = 1; i < existing.length; i++) {
      if (existing[i]! - existing[i - 1]! < Number(mm(32))) throw new Error('visual_shelf_spacing_too_small');
    }
    patches.push({
      op:'set',
      path:`/furniture/${fi}/modules/${command.moduleIndex}/contents/${elementIndex}/elevationsFromBottom`,
      value: existing.map((value) => measuredMm10(value)),
    });
  } else if (command.type === 'set_module_content') {
    const fi = furnitureIndex(command, project); const modules=project.furniture[fi]!.modules;
    if(!modules[command.moduleIndex]) throw new Error('visual_module_not_found');
    patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}/kind`,value:moduleKind(command.kind)});
    patches.push({op:'set',path:`/furniture/${fi}/modules/${command.moduleIndex}/contents`,value:content(command.kind,command.count??1)});
  } else if (command.type === 'set_module_count') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; const count=Math.round(command.count); if(count<1||count>20) throw new Error('visual_invalid_module_count');
    const totalMm10=item.dimensions.width.value !== null ? Number(item.dimensions.width.value) : 6000*count; const base=Math.floor(totalMm10/count); const remainder=totalMm10-base*count;
    const modules=Array.from({length:count},(_,i)=>{
      const exact=base+(i<remainder?1:0); const old=item.modules[i]; if(old){ const m=structuredClone(old); m.name=`Секция ${i+1}`; m.width={mode:'fixed',value:measuredMm10(exact)}; return m; }
      const m=makeModule(exact/10,'open',i); m.width={mode:'fixed',value:measuredMm10(exact)}; return m;
    });
    patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules});
    if(item.fronts.length) patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:patchFronts(project,fi,modules)});
  } else if (command.type === 'add_module') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; const modules=structuredClone(item.modules);
    const insert=Math.max(0,Math.min(modules.length,(command.afterModuleIndex??modules.length-1)+1));
    const width=command.widthMm??600; assertPositive('module_width',width,100,4000); modules.splice(insert,0,makeModule(width,command.kind??'open',insert));
    modules.forEach((m,i)=>m.name=`Секция ${i+1}`); patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules});
    if(item.fronts.length) patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:patchFronts(project,fi,modules)});
  } else if (command.type === 'remove_module') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; if(item.modules.length<=1) throw new Error('visual_cannot_remove_last_module');
    if(!item.modules[command.moduleIndex]) throw new Error('visual_module_not_found'); const modules=structuredClone(item.modules); modules.splice(command.moduleIndex,1); modules.forEach((m,i)=>m.name=`Секция ${i+1}`);
    patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules}); if(item.fronts.length) patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:patchFronts(project,fi,modules)});
  } else if (command.type === 'equalize_modules') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; const count=item.modules.length; if(!count) throw new Error('visual_no_modules');
    if(item.dimensions.width.value===null) throw new Error('visual_furniture_width_unknown'); const totalMm10=Number(item.dimensions.width.value); const base=Math.floor(totalMm10/count); const remainder=totalMm10-base*count;
    const modules=structuredClone(item.modules); modules.forEach((m,i)=>m.width={mode:'fixed',value:measuredMm10(base+(i<remainder?1:0))});
    patches.push({op:'set',path:`/furniture/${fi}/modules`,value:modules});
  } else if (command.type === 'set_style_note') {
    const fi=furnitureIndex(command,project); const current=project.furniture[fi]!.style??{};
    patches.push({op:'set',path:`/furniture/${fi}/style`,value:{...current,...(command.colorNote!==undefined?{colorNote:command.colorNote}:{}),...(command.finishNote!==undefined?{finishNote:command.finishNote}:{})}});
  } else if (command.type === 'set_hinged_fronts') {
    const fi=furnitureIndex(command,project); const item=project.furniture[fi]!; patches.push({op:'set',path:`/furniture/${fi}/fronts`,value:command.enabled?patchFronts(project,fi,item.modules):[]});
  }
  return { changeId: randomUUID(), projectId: project.projectId, basedOnRevision: project.revision, source: 'user', reason: `Visual editor: ${command.type}`, confidence: 1, patches };
}

export function applyVisualCommand(project: ProjectModelV1, command: VisualEditorCommand): ProjectModelV1 {
  return applyProjectChangeSet(project, compileVisualCommand(project, command));
}

function contentSummary(module: FurnitureModule): { kind: VisualContentKind; count: number; shelfElevationsMm?: number[] } {
  const drawers=module.contents.find(x=>x.kind==='drawer_stack'); if(drawers) return {kind:'drawers',count:drawers.count};
  const shelves=module.contents.find(x=>x.kind==='shelf_stack'); const rail=module.contents.find(x=>x.kind==='clothes_rail');
  const shelfElevationsMm = shelves?.elevationsFromBottom?.map((value) => value.value === null ? 0 : toMm(value.value));
  if(shelves&&rail) return {kind:'mixed',count:shelves.count,...(shelfElevationsMm?{shelfElevationsMm}:{})};
  if(shelves) return {kind:'shelves',count:shelves.count,...(shelfElevationsMm?{shelfElevationsMm}:{})};
  if(rail) return {kind:module.kind==='short_clothes'?'short_clothes':'long_clothes',count:rail.count}; return {kind:'open',count:1};
}

export function buildVisualScene(project: ProjectModelV1): VisualScene {
  const warnings:string[]=[]; const room=project.site.rooms[0];
  const projectFeature = (feature: WallOpening | Obstacle, index: number) => { const b=boxMm(feature); return {id:feature.id,index,kind:feature.kind,...b,...(feature.hostWallId?{hostWallId:feature.hostWallId}:{}),...(feature.note?{note:feature.note}:{})}; };
  const roomScene=room?{id:room.id,index:0,name:room.name,widthMm:room.dimensions?.width.value!==null&&room.dimensions?.width.value!==undefined?toMm(room.dimensions.width.value):0,depthMm:room.dimensions?.depth.value!==null&&room.dimensions?.depth.value!==undefined?toMm(room.dimensions.depth.value):0,heightMm:room.dimensions?.height.value!==null&&room.dimensions?.height.value!==undefined?toMm(room.dimensions.height.value):0,openings:room.openings.map(projectFeature),obstacles:room.obstacles.map(projectFeature)}:null;
  const furniture=project.furniture.map((item,index)=>{
    const total=item.dimensions.width.value!==null?toMm(item.dimensions.width.value):0; const raw=fixedModuleWidths(project,index); const rawTotal=raw.reduce((a,b)=>a+b,0); if(total&&Math.abs(rawTotal-total)>1) warnings.push(`Furniture ${index+1}: module widths ${rawTotal.toFixed(1)} mm do not match overall width ${total.toFixed(1)} mm.`);
    let x=0; const modules=item.modules.map((m,mi)=>{ let width=raw[mi]??0; if(!width&&total) width=total/item.modules.length; const summary=contentSummary(m); const out={id:m.id,index:mi,name:m.name??`Секция ${mi+1}`,kind:m.kind,xMm:x,widthMm:width,contentKind:summary.kind,contentCount:summary.count,...(summary.shelfElevationsMm?{shelfElevationsMm:summary.shelfElevationsMm}:{}),...(m.kitchen?{kitchen:{moduleType:m.kitchen.type,function:m.kitchen.function,heightMm:dimMm(m.height),depthMm:dimMm(m.depth),...(m.kitchen.opening?{opening:m.kitchen.opening}:{}),worktop:!!m.kitchen.worktop?.enabled,plinth:!!m.kitchen.plinth?.enabled,...(m.kitchen.appliance?{appliance:[m.kitchen.appliance.manufacturer,m.kitchen.appliance.model,m.kitchen.appliance.kind].filter(Boolean).join(' ')}:{})}}:{})}; x+=width; return out; });
    const heightMm=item.dimensions.height.value!==null?toMm(item.dimensions.height.value):0; const depthMm=item.dimensions.depth.value!==null?toMm(item.dimensions.depth.value):0; const thicknessMm=dimMm(item.construction.carcassThickness);
    const cadPanels = [] as Array<{id:string;kind:'side_left'|'side_right'|'top'|'bottom'|'divider';moduleIndex?:number;xMm:number;zMm:number;widthMm:number;heightMm:number;thicknessMm:number;editableBy:'resize'|'divider'|'thickness'}>;
    if(total&&heightMm&&thicknessMm){
      cadPanels.push({id:`${item.id}:side-left`,kind:'side_left',xMm:0,zMm:0,widthMm:thicknessMm,heightMm,thicknessMm,editableBy:'resize'});
      cadPanels.push({id:`${item.id}:side-right`,kind:'side_right',xMm:Math.max(0,total-thicknessMm),zMm:0,widthMm:thicknessMm,heightMm,thicknessMm,editableBy:'resize'});
      cadPanels.push({id:`${item.id}:top`,kind:'top',xMm:0,zMm:Math.max(0,heightMm-thicknessMm),widthMm:total,heightMm:thicknessMm,thicknessMm,editableBy:'resize'});
      cadPanels.push({id:`${item.id}:bottom`,kind:'bottom',xMm:0,zMm:0,widthMm:total,heightMm:thicknessMm,thicknessMm,editableBy:'resize'});
      for(let mi=0;mi<modules.length-1;mi++){const boundary=modules[mi]!.xMm+modules[mi]!.widthMm;cadPanels.push({id:`${item.id}:divider:${modules[mi]!.id}`,kind:'divider',moduleIndex:mi,xMm:Math.max(0,boundary-thicknessMm/2),zMm:0,widthMm:thicknessMm,heightMm,thicknessMm,editableBy:'divider'});}
    }
    const clearancesMm=roomClearancesMm(item,roomForFurniture(project,index));
    const tags=item.tags??[]; const layoutGroupId=tags.find((tag)=>tag.startsWith('cad-group:'))?.slice('cad-group:'.length); const layoutKind=tags.includes('cad-layout:l_corner')?'l_corner' as const:undefined; const layoutRoleTag=tags.find((tag)=>tag.startsWith('cad-role:'))?.slice('cad-role:'.length); const layoutHandTag=tags.find((tag)=>tag.startsWith('cad-hand:'))?.slice('cad-hand:'.length);
    const layoutRole: 'main'|'return'|undefined=layoutRoleTag==='main'||layoutRoleTag==='return'?layoutRoleTag:undefined; const layoutHand: 'left'|'right'|undefined=layoutHandTag==='left'||layoutHandTag==='right'?layoutHandTag:undefined;
    return {id:item.id,index,name:item.name,kind:item.kind,xMm:toMm(item.transform.position.x),yMm:toMm(item.transform.position.y),zMm:toMm(item.transform.position.z),rotationZDeg:item.transform.rotationZDeg,widthMm:total,heightMm,depthMm,modules,cadPanels,moduleDimensionChainMm:modules.map((m)=>m.widthMm),...(clearancesMm?{clearancesMm}:{}),carcassThicknessMm:thicknessMm,...(layoutGroupId?{layoutGroupId}:{}),...(layoutKind?{layoutKind}:{}),...(layoutRole?{layoutRole}:{}),...(layoutHand?{layoutHand}:{}),...(item.style?.colorNote?{colorNote:item.style.colorNote}:{}),...(item.style?.finishNote?{finishNote:item.style.finishNote}:{})};
  });
  // CAD warnings are derived only; they never mutate ProjectModel or Engineering truth.
  for(let i=0;i<project.furniture.length;i++){
    const a=project.furniture[i]!, ab=furniturePlanBox(a); const itemRoom=roomForFurniture(project,i);
    if(itemRoom){for(const obstacle of itemRoom.obstacles){if(aabbOverlap2d(ab,obstaclePlanBox(obstacle)))warnings.push(`Furniture ${i+1} overlaps room obstacle ${obstacle.kind}.`);}}
    for(let j=i+1;j<project.furniture.length;j++){const b=project.furniture[j]!;if((a.roomId??room?.id)!==(b.roomId??room?.id))continue;if(aabbOverlap2d(ab,furniturePlanBox(b)))warnings.push(`Furniture ${i+1} overlaps furniture ${j+1}.`);}
  }
  return {visualVersion:VISUAL_PRODUCT_VERSION,projectId:project.projectId,revision:project.revision,room:roomScene,furniture,warnings};
}
