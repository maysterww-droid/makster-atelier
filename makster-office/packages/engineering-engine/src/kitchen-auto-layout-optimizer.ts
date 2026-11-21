import type { KitchenLibraryModuleId } from './kitchen-module-library.js';
import {
  planKitchenLayout,
  type KitchenLayoutKind,
  type KitchenLayoutPlan,
  type KitchenLayoutPlannerInput,
  type KitchenRunSide,
  type KitchenUtilityPoint,
} from './kitchen-layout-planner.js';
import {
  evaluateKitchenConstraints,
  type KitchenConstraintInput,
  type KitchenConstraintResult,
  type KitchenCornerRequest,
} from './kitchen-constraint-corner-engine.js';
import type { KitchenRunRequirement } from './kitchen-run-composer.js';

export type KitchenOptimizationStrategy = 'compact' | 'utility_affinity' | 'distributed';

export interface KitchenAutoLayoutOptimizerInput {
  optimizationId: string;
  roomWidthMm: number;
  roomDepthMm: number;
  allowedKinds?: KitchenLayoutKind[];
  requirements?: KitchenRunRequirement[];
  utilities?: KitchenUtilityPoint[];
  constraints?: KitchenConstraintInput;
  runDepthMm?: number;
  minAisleMm?: number;
  islandDepthMm?: number;
  islandLengthMm?: number;
  cornerReserveMm?: number;
  standardWidthsMm?: number[];
  maxCandidates?: number;
  /** Optional weights. Missing values use workshop-oriented defaults. */
  weights?: Partial<KitchenOptimizerWeights>;
}

export interface KitchenOptimizerWeights {
  feasibility: number;
  aisle: number;
  utilities: number;
  technicalFill: number;
  workTriangle: number;
  simplicity: number;
}

export interface KitchenWorkTriangleResult {
  available: boolean;
  sink?: KitchenPoint2D;
  cooking?: KitchenPoint2D;
  fridge?: KitchenPoint2D;
  legsMm: number[];
  perimeterMm?: number;
  penalty: number;
  note: string;
}

export interface KitchenPoint2D { xMm: number; yMm: number; side: KitchenRunSide; moduleId: string; }

export interface KitchenOptimizationScoreBreakdown {
  feasibility: number;
  aisle: number;
  utilities: number;
  technicalFill: number;
  workTriangle: number;
  simplicity: number;
  total: number;
}

export interface KitchenLayoutCandidate {
  id: string;
  rank: number;
  kind: KitchenLayoutKind;
  strategy: KitchenOptimizationStrategy;
  plan: KitchenLayoutPlan;
  constraints: KitchenConstraintResult;
  workTriangle: KitchenWorkTriangleResult;
  technicalFillMm: number;
  technicalFillRatio: number;
  score: KitchenOptimizationScoreBreakdown;
  reasons: string[];
  ready: boolean;
}

export interface KitchenAutoLayoutOptimizationResult {
  optimizationId: string;
  candidates: KitchenLayoutCandidate[];
  recommended?: KitchenLayoutCandidate;
  readyCandidates: number;
  rejectedCandidates: number;
  issues: string[];
}

const DEFAULT_KINDS: KitchenLayoutKind[] = ['straight', 'l_shape', 'parallel', 'u_shape', 'island'];
const DEFAULT_WEIGHTS: KitchenOptimizerWeights = {
  feasibility: 0.35,
  aisle: 0.15,
  utilities: 0.15,
  technicalFill: 0.15,
  workTriangle: 0.12,
  simplicity: 0.08,
};

function clamp(n: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }

function wallSides(kind: KitchenLayoutKind): KitchenRunSide[] {
  switch (kind) {
    case 'straight': return ['south'];
    case 'l_shape': return ['south', 'east'];
    case 'u_shape': return ['south', 'east', 'north'];
    case 'parallel': return ['south', 'north'];
    case 'island': return ['south', 'island'];
  }
}

function utilityNeeds(id: KitchenLibraryModuleId): KitchenUtilityPoint['kind'][] {
  if (id === 'base.sink') return ['water', 'drain'];
  if (id === 'base.dishwasher') return ['water', 'drain', 'power'];
  if (id === 'base.oven_hob' || id === 'tall.oven' || id === 'tall.fridge') return ['power'];
  if (id === 'wall.hood') return ['hood_vent'];
  return [];
}

function strategyRequirements(
  requirements: KitchenRunRequirement[],
  kind: KitchenLayoutKind,
  strategy: KitchenOptimizationStrategy,
  utilities: KitchenUtilityPoint[],
): Array<KitchenRunRequirement & { side?: KitchenRunSide }> {
  const sides = wallSides(kind);
  const defaultSide = sides.find(s => s !== 'island') ?? sides[0]!;
  let rr = 0;
  return requirements.map((req) => {
    const supplied = req as KitchenRunRequirement & { side?: KitchenRunSide };
    if (supplied.side && sides.includes(supplied.side)) return { ...req, side: supplied.side };
    if (strategy === 'compact') return { ...req, side: defaultSide };
    if (strategy === 'distributed') {
      const usable = sides.filter(s => s !== 'island');
      const side = usable[rr % usable.length] ?? defaultSide;
      rr += Math.max(1, req.count ?? 1);
      return { ...req, side };
    }
    const needs = utilityNeeds(req.libraryModuleId as KitchenLibraryModuleId);
    const matching = sides.find(side => needs.some(need => utilities.some(u => u.side === side && u.kind === need)));
    return { ...req, side: matching ?? defaultSide };
  });
}

function inferCorners(kind: KitchenLayoutKind): KitchenCornerRequest[] {
  if (kind === 'l_shape') return [{ at: 'south_east' }];
  if (kind === 'u_shape') return [{ at: 'south_east' }, { at: 'north_east' }];
  return [];
}

function modulePoint(plan: KitchenLayoutPlan, runSide: KitchenRunSide, xMm: number, id: string): KitchenPoint2D {
  const run = plan.runs.find(r => r.side === runSide)!;
  const centre = xMm;
  switch (runSide) {
    case 'south': return { xMm: centre, yMm: run.depthMm / 2, side: runSide, moduleId: id };
    case 'north': return { xMm: plan.roomWidthMm - centre, yMm: plan.roomDepthMm - run.depthMm / 2, side: runSide, moduleId: id };
    case 'east': return { xMm: plan.roomWidthMm - run.depthMm / 2, yMm: centre, side: runSide, moduleId: id };
    case 'west': return { xMm: run.depthMm / 2, yMm: plan.roomDepthMm - centre, side: runSide, moduleId: id };
    case 'island': return {
      xMm: (plan.roomWidthMm - run.lengthMm) / 2 + centre,
      yMm: plan.roomDepthMm / 2,
      side: runSide,
      moduleId: id,
    };
  }
}

function firstFunctionPoint(plan: KitchenLayoutPlan, ids: KitchenLibraryModuleId[]): KitchenPoint2D | undefined {
  for (const run of plan.runs) {
    for (const p of run.composition.placements) {
      const id = p.module.libraryModuleId as KitchenLibraryModuleId | undefined;
      if (!id || !ids.includes(id)) continue;
      return modulePoint(plan, run.side, p.xMm + p.widthMm / 2, id);
    }
  }
}

function distance(a: KitchenPoint2D, b: KitchenPoint2D): number {
  return Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm);
}

function evaluateWorkTriangle(plan: KitchenLayoutPlan, constraints: KitchenConstraintInput | undefined): KitchenWorkTriangleResult {
  const sink = firstFunctionPoint(plan, ['base.sink']);
  const cooking = firstFunctionPoint(plan, ['base.oven_hob', 'tall.oven']);
  const fridge = firstFunctionPoint(plan, ['tall.fridge']);
  if (!sink || !cooking || !fridge) {
    return { available: false, ...(sink ? { sink } : {}), ...(cooking ? { cooking } : {}), ...(fridge ? { fridge } : {}), legsMm: [], penalty: 0, note: 'Work triangle not scored because sink, cooking and fridge are not all present.' };
  }
  const legs = [distance(sink, cooking), distance(cooking, fridge), distance(fridge, sink)];
  const min = constraints?.minWorkTriangleLegMm ?? 900;
  const max = constraints?.maxWorkTriangleLegMm ?? 2700;
  let penalty = 0;
  for (const leg of legs) {
    if (leg < min) penalty += Math.min(20, ((min - leg) / min) * 20);
    if (leg > max) penalty += Math.min(25, ((leg - max) / max) * 25);
  }
  const perimeter = legs.reduce((s, x) => s + x, 0);
  if (perimeter > 7500) penalty += Math.min(20, ((perimeter - 7500) / 7500) * 20);
  return {
    available: true, sink, cooking, fridge,
    legsMm: legs.map(Math.round), perimeterMm: Math.round(perimeter), penalty: round1(clamp(penalty, 0, 100)),
    note: penalty === 0 ? 'Work triangle is within configured leg limits.' : 'Work triangle carries a distance penalty.',
  };
}

function technicalFill(plan: KitchenLayoutPlan): { mm: number; ratio: number } {
  let fill = 0; let total = 0;
  for (const run of plan.runs) {
    total += run.lengthMm;
    for (const p of run.composition.placements) if (p.source === 'technical_fill') fill += p.widthMm;
  }
  return { mm: fill, ratio: total > 0 ? fill / total : 1 };
}

function aisleScore(plan: KitchenLayoutPlan, minAisleMm: number): number {
  if (plan.aisleMm == null) return 100;
  if (plan.aisleMm < minAisleMm) return clamp((plan.aisleMm / minAisleMm) * 60);
  const bonusRange = 300;
  return clamp(90 + Math.min(10, ((plan.aisleMm - minAisleMm) / bonusRange) * 10));
}

function normalizedWeights(partial?: Partial<KitchenOptimizerWeights>): KitchenOptimizerWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...(partial ?? {}) };
  const sum = Object.values(merged).reduce((s, x) => s + Math.max(0, x), 0) || 1;
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, Math.max(0, v) / sum])) as unknown as KitchenOptimizerWeights;
}

function scoreCandidate(plan: KitchenLayoutPlan, c: KitchenConstraintResult, triangle: KitchenWorkTriangleResult, minAisleMm: number, weights: KitchenOptimizerWeights): KitchenOptimizationScoreBreakdown {
  const tFill = technicalFill(plan);
  const layoutBlocking = plan.issues.filter(i => i.severity === 'blocking').length;
  const layoutWarnings = plan.issues.filter(i => i.severity === 'warning').length;
  const utilityWarnings = plan.issues.filter(i => i.code === 'UTILITY_NOT_NEAR_REQUIRED_MODULE' || i.code === 'UTILITY_SIDE_HAS_NO_RUN').length;
  const moduleCount = plan.runs.reduce((s, r) => s + r.composition.modules.length, 0);
  const feasibility = clamp((plan.ready ? 100 : 35) - layoutBlocking * 25 - c.issues.filter(i => i.severity === 'blocking').length * 25 - layoutWarnings * 3);
  const aisle = aisleScore(plan, minAisleMm);
  const utilities = clamp(100 - utilityWarnings * 18);
  const technical = clamp(100 - tFill.ratio * 300 - Math.min(20, tFill.mm / 50));
  const work = triangle.available ? clamp(100 - triangle.penalty) : 75;
  const simplicity = clamp(100 - Math.max(0, plan.runs.length - 1) * 5 - Math.max(0, moduleCount - 8) * 0.8 - c.corners.length * 3);
  const total = feasibility * weights.feasibility + aisle * weights.aisle + utilities * weights.utilities + technical * weights.technicalFill + work * weights.workTriangle + simplicity * weights.simplicity;
  return { feasibility: round1(feasibility), aisle: round1(aisle), utilities: round1(utilities), technicalFill: round1(technical), workTriangle: round1(work), simplicity: round1(simplicity), total: round1(clamp(total)) };
}

function candidateReasons(plan: KitchenLayoutPlan, constraints: KitchenConstraintResult, triangle: KitchenWorkTriangleResult, technicalMm: number): string[] {
  const reasons: string[] = [];
  if (!plan.ready || !constraints.ready) reasons.push('Rejected by blocking geometry/constraint rules.');
  else reasons.push('Passes blocking geometry and room-constraint checks.');
  if (plan.aisleMm != null) reasons.push(`Aisle/clearance: ${plan.aisleMm} mm.`);
  if (technicalMm === 0) reasons.push('No technical filler required.');
  else reasons.push(`Technical/site-fit filler: ${technicalMm} mm.`);
  const utilWarnings = plan.issues.filter(i => i.code.startsWith('UTILITY_')).length;
  reasons.push(utilWarnings ? `${utilWarnings} utility proximity warning(s).` : 'No declared utility proximity conflicts.');
  if (triangle.available) reasons.push(`Work triangle perimeter: ${triangle.perimeterMm} mm.`);
  return reasons;
}

function dedupeKey(kind: KitchenLayoutKind, requirements: Array<KitchenRunRequirement & { side?: KitchenRunSide }>): string {
  return `${kind}|${requirements.map(r => `${r.libraryModuleId}:${r.count ?? 1}:${r.widthMm ?? ''}:${r.side ?? ''}`).join(',')}`;
}

export function optimizeKitchenLayouts(input: KitchenAutoLayoutOptimizerInput): KitchenAutoLayoutOptimizationResult {
  const issues: string[] = [];
  const kinds = [...new Set(input.allowedKinds?.length ? input.allowedKinds : DEFAULT_KINDS)];
  const requirements = input.requirements ?? [];
  const utilities = input.utilities ?? [];
  const minAisleMm = Math.max(600, Math.round(input.minAisleMm ?? 900));
  const weights = normalizedWeights(input.weights);
  const strategies: KitchenOptimizationStrategy[] = ['compact', 'utility_affinity', 'distributed'];
  const candidates: KitchenLayoutCandidate[] = [];
  const seen = new Set<string>();

  for (const kind of kinds) {
    for (const strategy of strategies) {
      const assigned = strategyRequirements(requirements, kind, strategy, utilities);
      const key = dedupeKey(kind, assigned);
      if (seen.has(key)) continue;
      seen.add(key);
      const plannerInput: KitchenLayoutPlannerInput = {
        layoutId: `${input.optimizationId}:${kind}:${strategy}`,
        kind,
        roomWidthMm: input.roomWidthMm,
        roomDepthMm: input.roomDepthMm,
        requirements: assigned,
        utilities,
        minAisleMm,
        ...(input.runDepthMm != null ? { runDepthMm: input.runDepthMm } : {}),
        ...(input.islandDepthMm != null ? { islandDepthMm: input.islandDepthMm } : {}),
        ...(input.islandLengthMm != null ? { islandLengthMm: input.islandLengthMm } : {}),
        ...(input.cornerReserveMm != null ? { cornerReserveMm: input.cornerReserveMm } : {}),
        ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
      };
      const plan = planKitchenLayout(plannerInput);
      const constraintInput: KitchenConstraintInput = {
        ...(input.constraints ?? {}),
        corners: input.constraints?.corners?.length ? input.constraints.corners : inferCorners(kind),
      };
      const constraintResult = evaluateKitchenConstraints(plan, constraintInput);
      const triangle = evaluateWorkTriangle(plan, input.constraints);
      const fill = technicalFill(plan);
      const score = scoreCandidate(plan, constraintResult, triangle, minAisleMm, weights);
      candidates.push({
        id: plannerInput.layoutId,
        rank: 0,
        kind,
        strategy,
        plan,
        constraints: constraintResult,
        workTriangle: triangle,
        technicalFillMm: fill.mm,
        technicalFillRatio: round1(fill.ratio * 100) / 100,
        score,
        reasons: candidateReasons(plan, constraintResult, triangle, fill.mm),
        ready: plan.ready && constraintResult.ready,
      });
    }
  }

  candidates.sort((a, b) => Number(b.ready) - Number(a.ready) || b.score.total - a.score.total || a.technicalFillMm - b.technicalFillMm || a.id.localeCompare(b.id));
  const max = Math.max(1, Math.round(input.maxCandidates ?? candidates.length));
  const selected = candidates.slice(0, max).map((c, i) => ({ ...c, rank: i + 1 }));
  const recommended = selected.find(c => c.ready);
  const readyCandidates = selected.filter(c => c.ready).length;
  const rejectedCandidates = selected.length - readyCandidates;
  if (!recommended) issues.push('No generated kitchen layout passes all blocking constraints.');
  if (!requirements.length) issues.push('No functional module requirements were supplied; ranking is geometry-focused only.');
  return {
    optimizationId: input.optimizationId,
    candidates: selected,
    ...(recommended ? { recommended } : {}),
    readyCandidates,
    rejectedCandidates,
    issues,
  };
}
