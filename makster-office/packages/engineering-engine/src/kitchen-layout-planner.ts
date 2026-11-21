import { mm, type FurnitureItem, type ProjectModelV1, type Transform3D } from '../../project-model/src/types.js';
import { composeKitchenRun, applyKitchenRunComposition, type KitchenRunComposerInput, type KitchenRunComposeResult, type KitchenRunRequirement } from './kitchen-run-composer.js';

export type KitchenLayoutKind = 'straight' | 'l_shape' | 'u_shape' | 'parallel' | 'island';
export type KitchenRunSide = 'south' | 'east' | 'north' | 'west' | 'island';

export interface KitchenUtilityPoint {
  kind: 'water' | 'drain' | 'power' | 'hood_vent' | 'gas';
  side: Exclude<KitchenRunSide, 'island'>;
  offsetMm: number;
  toleranceMm?: number;
}

export interface KitchenLayoutPlannerInput {
  layoutId: string;
  kind: KitchenLayoutKind;
  roomWidthMm: number;
  roomDepthMm: number;
  runDepthMm?: number;
  minAisleMm?: number;
  islandDepthMm?: number;
  islandLengthMm?: number;
  cornerReserveMm?: number;
  /** Optional exact run lengths. Missing values are derived from room geometry. */
  runLengthsMm?: Partial<Record<KitchenRunSide, number>>;
  /** Requirements can be assigned to a specific run. Unassigned requirements go to the first wall run. */
  requirements?: Array<KitchenRunRequirement & { side?: KitchenRunSide }>;
  utilities?: KitchenUtilityPoint[];
  standardWidthsMm?: number[];
}

export interface KitchenLayoutRun {
  id: string;
  side: KitchenRunSide;
  transform: Transform3D;
  lengthMm: number;
  depthMm: number;
  composition: KitchenRunComposeResult;
}

export interface KitchenLayoutIssue {
  code:
    | 'ROOM_GEOMETRY_INVALID'
    | 'AISLE_TOO_NARROW'
    | 'ISLAND_DOES_NOT_FIT'
    | 'RUN_COMPOSITION_BLOCKED'
    | 'UTILITY_NOT_NEAR_REQUIRED_MODULE'
    | 'UTILITY_SIDE_HAS_NO_RUN';
  severity: 'warning' | 'blocking';
  message: string;
}

export interface KitchenLayoutPlan {
  layoutId: string;
  kind: KitchenLayoutKind;
  roomWidthMm: number;
  roomDepthMm: number;
  runs: KitchenLayoutRun[];
  aisleMm?: number;
  issues: KitchenLayoutIssue[];
  ready: boolean;
}

const DEFAULT_DEPTH = 600;
const DEFAULT_MIN_AISLE = 900;
const DEFAULT_CORNER_RESERVE = 650;

function t(xMm: number, yMm: number, rotationZDeg: 0 | 90 | 180 | 270): Transform3D {
  return { position: { x: mm(xMm), y: mm(yMm), z: mm(0) }, rotationZDeg };
}

function runSides(kind: KitchenLayoutKind): KitchenRunSide[] {
  switch (kind) {
    case 'straight': return ['south'];
    case 'l_shape': return ['south', 'east'];
    case 'u_shape': return ['south', 'east', 'north'];
    case 'parallel': return ['south', 'north'];
    case 'island': return ['south', 'island'];
  }
}

function derivedLength(side: KitchenRunSide, input: KitchenLayoutPlannerInput, corner: number): number {
  const exact = input.runLengthsMm?.[side];
  if (exact != null) return Math.round(exact);
  if (side === 'island') return Math.round(input.islandLengthMm ?? Math.min(2400, Math.max(900, input.roomWidthMm - 2 * 900)));
  if (input.kind === 'l_shape') return side === 'south' ? Math.max(0, input.roomWidthMm - corner) : Math.max(0, input.roomDepthMm - corner);
  if (input.kind === 'u_shape') return side === 'east' ? Math.max(0, input.roomDepthMm - 2 * corner) : Math.max(0, input.roomWidthMm - corner);
  return side === 'east' || side === 'west' ? Math.round(input.roomDepthMm) : Math.round(input.roomWidthMm);
}

function transformFor(side: KitchenRunSide, roomW: number, roomD: number, depth: number, islandLength: number, islandDepth: number): Transform3D {
  switch (side) {
    case 'south': return t(0, 0, 0);
    case 'east': return t(roomW - depth, 0, 90);
    case 'north': return t(roomW, roomD - depth, 180);
    case 'west': return t(depth, roomD, 270);
    case 'island': return t((roomW - islandLength) / 2, (roomD - islandDepth) / 2, 0);
  }
}

function requiredUtility(moduleId: string): KitchenUtilityPoint['kind'][] {
  if (moduleId === 'base.sink') return ['water', 'drain'];
  if (moduleId === 'base.dishwasher') return ['water', 'drain', 'power'];
  if (moduleId === 'base.oven_hob' || moduleId === 'tall.oven' || moduleId === 'tall.fridge') return ['power'];
  if (moduleId === 'wall.hood') return ['hood_vent'];
  return [];
}

function validateUtilities(runs: KitchenLayoutRun[], utilities: KitchenUtilityPoint[] | undefined, issues: KitchenLayoutIssue[]): void {
  if (!utilities?.length) return;
  for (const utility of utilities) {
    if (!runs.some(r => r.side === utility.side)) {
      issues.push({ code: 'UTILITY_SIDE_HAS_NO_RUN', severity: 'warning', message: `${utility.kind} utility is on ${utility.side}, but this layout has no run on that side.` });
    }
  }
  for (const run of runs) {
    for (const placement of run.composition.placements) {
      const needs = requiredUtility(String(placement.module.libraryModuleId ?? ''));
      for (const need of needs) {
        const candidates = utilities.filter(u => u.kind === need && u.side === run.side);
        if (!candidates.length) continue; // unknown service position is not fabricated evidence
        const moduleCentre = placement.xMm + placement.widthMm / 2;
        const near = candidates.some(u => Math.abs(u.offsetMm - moduleCentre) <= (u.toleranceMm ?? 750));
        if (!near) issues.push({
          code: 'UTILITY_NOT_NEAR_REQUIRED_MODULE', severity: 'warning',
          message: `${placement.module.libraryModuleId} on ${run.side} is not near the declared ${need} point.`,
        });
      }
    }
  }
}

export function planKitchenLayout(input: KitchenLayoutPlannerInput): KitchenLayoutPlan {
  const issues: KitchenLayoutIssue[] = [];
  const roomW = Math.round(input.roomWidthMm);
  const roomD = Math.round(input.roomDepthMm);
  const depth = Math.max(300, Math.round(input.runDepthMm ?? DEFAULT_DEPTH));
  const minAisle = Math.max(600, Math.round(input.minAisleMm ?? DEFAULT_MIN_AISLE));
  const islandDepth = Math.max(600, Math.round(input.islandDepthMm ?? 900));
  const corner = Math.max(depth, Math.round(input.cornerReserveMm ?? DEFAULT_CORNER_RESERVE));

  if (!Number.isFinite(roomW) || !Number.isFinite(roomD) || roomW <= 0 || roomD <= 0) {
    issues.push({ code: 'ROOM_GEOMETRY_INVALID', severity: 'blocking', message: 'Kitchen room width and depth must be positive finite millimetre values.' });
    return { layoutId: input.layoutId, kind: input.kind, roomWidthMm: roomW, roomDepthMm: roomD, runs: [], issues, ready: false };
  }

  let aisle: number | undefined;
  if (input.kind === 'parallel' || input.kind === 'u_shape') {
    aisle = roomD - 2 * depth;
    if (aisle < minAisle) issues.push({ code: 'AISLE_TOO_NARROW', severity: 'blocking', message: `Available aisle is ${aisle} mm; minimum requested is ${minAisle} mm.` });
  }
  if (input.kind === 'island') {
    aisle = (roomD - depth - islandDepth) / 2;
    if (aisle < minAisle) issues.push({ code: 'ISLAND_DOES_NOT_FIT', severity: 'blocking', message: `Island leaves only ${Math.round(aisle)} mm average clearance; minimum requested is ${minAisle} mm.` });
  }

  const sides = runSides(input.kind);
  const islandLength = derivedLength('island', input, corner);
  const requirements = input.requirements ?? [];
  const defaultSide = sides.find(s => s !== 'island') ?? sides[0]!;
  const runs: KitchenLayoutRun[] = [];

  for (const side of sides) {
    const length = derivedLength(side, input, corner);
    const sideRequirements = requirements
      .filter(r => (r.side ?? defaultSide) === side)
      .map(({ side: _side, ...r }) => r);
    const composerInput: KitchenRunComposerInput = {
      runId: `${input.layoutId}:${side}`,
      widthMm: length,
      type: 'base',
      requirements: sideRequirements,
      ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
    };
    const composition = composeKitchenRun(composerInput);
    if (!composition.ready) issues.push({ code: 'RUN_COMPOSITION_BLOCKED', severity: 'blocking', message: `${side} run cannot be composed within ${length} mm.` });
    runs.push({
      id: `${input.layoutId}:${side}`,
      side,
      transform: transformFor(side, roomW, roomD, depth, islandLength, islandDepth),
      lengthMm: length,
      depthMm: side === 'island' ? islandDepth : depth,
      composition,
    });
  }

  validateUtilities(runs, input.utilities, issues);
  return {
    layoutId: input.layoutId,
    kind: input.kind,
    roomWidthMm: roomW,
    roomDepthMm: roomD,
    runs,
    ...(aisle != null ? { aisleMm: Math.round(aisle) } : {}),
    issues,
    ready: !issues.some(i => i.severity === 'blocking') && runs.every(r => r.composition.ready),
  };
}

/**
 * Applies a layout plan to a ProjectModel using one existing kitchen item as the construction/material template.
 * This keeps the existing engineering compiler as the sole manufacturing authority.
 */
export function applyKitchenLayoutPlan(project: ProjectModelV1, templateFurnitureId: string, plan: KitchenLayoutPlan): ProjectModelV1 {
  const next = structuredClone(project);
  const templateIndex = next.furniture.findIndex(f => f.id === templateFurnitureId);
  if (templateIndex < 0) throw new Error(`Kitchen template furniture ${templateFurnitureId} was not found.`);
  const template = next.furniture[templateIndex]!;
  if (template.kind !== 'kitchen') throw new Error(`Furniture ${templateFurnitureId} is not a kitchen item.`);

  const generated: FurnitureItem[] = plan.runs.map((run, index) => {
    const composed = applyKitchenRunComposition(template, run.composition);
    return {
      ...composed,
      id: `${template.id}:layout:${String(index + 1).padStart(2, '0')}`,
      name: `${template.name} · ${run.side}`,
      transform: run.transform,
      dimensions: {
        ...composed.dimensions,
        width: { value: mm(run.lengthMm), state: 'confirmed' },
        depth: { value: mm(run.depthMm), state: 'confirmed' },
      },
      modules: composed.modules.map((m, mIndex) => ({ ...m, id: `${template.id}:layout:${index + 1}:module:${mIndex + 1}` })),
      fronts: composed.fronts.map((f, fIndex) => ({
        ...f,
        id: `${template.id}:layout:${index + 1}:front:${fIndex + 1}`,
        moduleIds: f.moduleIds.map(oldId => {
          const oldIndex = composed.modules.findIndex(m => m.id === oldId);
          return oldIndex >= 0 ? `${template.id}:layout:${index + 1}:module:${oldIndex + 1}` : oldId;
        }),
      })),
      tags: [...new Set([...(composed.tags ?? []), 'kitchen-layout-planner', `layout:${plan.kind}`, `run:${run.side}`])],
    };
  });

  next.furniture.splice(templateIndex, 1, ...generated);
  next.revision += 1;
  next.notes.push({
    id: `${plan.layoutId}:note`,
    text: `Kitchen Layout Planner ${plan.kind}: generated ${generated.length} run(s).`,
    authorType: 'system',
    createdAt: new Date(0).toISOString(),
  });
  return next;
}
