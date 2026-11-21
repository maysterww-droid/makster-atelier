import {
  optimizeKitchenLayouts,
  type KitchenAutoLayoutOptimizerInput,
  type KitchenLayoutCandidate,
} from './kitchen-auto-layout-optimizer.js';
import {
  planKitchenMixedHeight,
  type KitchenApplianceBinding,
  type KitchenMixedHeightPlan,
  type KitchenTallPosition,
  type KitchenTallRequirement,
} from './kitchen-mixed-height-appliance-layout.js';
import {
  evaluateKitchenErgonomics,
  type KitchenErgonomicsResult,
  type KitchenErgonomicsRules,
} from './kitchen-ergonomics-design-intelligence.js';

export interface KitchenDesignGeneratorWeights {
  engineering: number;
  ergonomics: number;
  manufacturing: number;
  utilities: number;
  prepSurface: number;
  applianceAccess: number;
}

export interface KitchenDesignGeneratorInput extends Omit<KitchenAutoLayoutOptimizerInput, 'maxCandidates'> {
  /** Maximum number of design variants to evaluate before ranking. Hard capped at 30. */
  maxGeneratedVariants?: number;
  /** Number of ready designs to expose as shortlist. Defaults to 3. */
  topN?: number;
  tallRequirements?: KitchenTallRequirement[];
  applianceBindings?: KitchenApplianceBinding[];
  createWallLayer?: boolean;
  baseCabinetHeightMm?: number;
  tallCabinetHeightMm?: number;
  wallCabinetHeightMm?: number;
  wallBottomZMm?: number;
  wallDepthMm?: number;
  minHoodClearanceMm?: number;
  worktopTopZMm?: number;
  ergonomicsRules?: KitchenErgonomicsRules;
  rankingWeights?: Partial<KitchenDesignGeneratorWeights>;
}

export interface KitchenDesignScoreBreakdown {
  engineering: number;
  ergonomics: number;
  manufacturing: number;
  utilities: number;
  prepSurface: number;
  applianceAccess: number;
  total: number;
}

export interface KitchenDesignVariant {
  id: string;
  rank: number;
  baseCandidateId: string;
  kind: KitchenLayoutCandidate['kind'];
  strategy: KitchenLayoutCandidate['strategy'];
  tallPositionMode: 'none' | KitchenTallPosition;
  base: KitchenLayoutCandidate;
  mixedHeight: KitchenMixedHeightPlan;
  ergonomics: KitchenErgonomicsResult;
  score: KitchenDesignScoreBreakdown;
  ready: boolean;
  reasons: string[];
}

export interface KitchenDesignGeneratorResult {
  generationId: string;
  generatedCount: number;
  evaluatedCount: number;
  readyCount: number;
  rejectedCount: number;
  topDesigns: KitchenDesignVariant[];
  allVariants: KitchenDesignVariant[];
  recommended?: KitchenDesignVariant;
  issues: string[];
}

const DEFAULT_WEIGHTS: KitchenDesignGeneratorWeights = {
  engineering: 0.32,
  ergonomics: 0.28,
  manufacturing: 0.15,
  utilities: 0.10,
  prepSurface: 0.08,
  applianceAccess: 0.07,
};

function clamp(n: number): number { return Math.max(0, Math.min(100, Math.round(n * 10) / 10)); }

function weights(input?: Partial<KitchenDesignGeneratorWeights>): KitchenDesignGeneratorWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...(input ?? {}) };
  const entries = Object.entries(merged).map(([k, v]) => [k, Math.max(0, Number(v) || 0)] as const);
  const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return Object.fromEntries(entries.map(([k, v]) => [k, v / sum])) as unknown as KitchenDesignGeneratorWeights;
}

function manufacturingScore(base: KitchenLayoutCandidate): number {
  // Uses only already-derived manufacturing-facing facts: filler ratio and layout simplicity.
  const fillPenalty = Math.min(75, base.technicalFillRatio * 100 * 2.5);
  const fillMmPenalty = Math.min(15, base.technicalFillMm / 50);
  const complexityPenalty = Math.max(0, 100 - base.score.simplicity) * 0.35;
  return clamp(100 - fillPenalty - fillMmPenalty - complexityPenalty);
}

function totalScore(
  base: KitchenLayoutCandidate,
  ergonomics: KitchenErgonomicsResult,
  w: KitchenDesignGeneratorWeights,
): KitchenDesignScoreBreakdown {
  const engineering = base.score.total;
  const ergo = ergonomics.score.total;
  const manufacturing = manufacturingScore(base);
  const utilities = base.score.utilities;
  const prepSurface = ergonomics.score.prepSurface;
  const applianceAccess = ergonomics.score.applianceAccess;
  const total = engineering * w.engineering
    + ergo * w.ergonomics
    + manufacturing * w.manufacturing
    + utilities * w.utilities
    + prepSurface * w.prepSurface
    + applianceAccess * w.applianceAccess;
  return {
    engineering: clamp(engineering),
    ergonomics: clamp(ergo),
    manufacturing,
    utilities: clamp(utilities),
    prepSurface: clamp(prepSurface),
    applianceAccess: clamp(applianceAccess),
    total: clamp(total),
  };
}

function availableTallModes(reqs: KitchenTallRequirement[]): Array<'none' | KitchenTallPosition> {
  if (!reqs.length) return ['none'];
  if (reqs.some(r => r.position != null)) return ['none'];
  return ['start', 'end'];
}

function withTallMode(reqs: KitchenTallRequirement[], mode: 'none' | KitchenTallPosition): KitchenTallRequirement[] {
  if (mode === 'none') return reqs.map(r => ({ ...r }));
  return reqs.map(r => ({ ...r, position: r.position ?? mode }));
}

function reasonList(base: KitchenLayoutCandidate, mixed: KitchenMixedHeightPlan, ergo: KitchenErgonomicsResult, score: KitchenDesignScoreBreakdown): string[] {
  const reasons = [
    `Engineering score: ${score.engineering}/100.`,
    `Ergonomics score: ${score.ergonomics}/100.`,
    `Manufacturing score: ${score.manufacturing}/100; technical filler ${base.technicalFillMm} mm.`,
    `Utilities score: ${score.utilities}/100.`,
    ergo.prepSurface.available
      ? `Best sink-to-cooking prep surface: ${ergo.prepSurface.widthMm} mm.`
      : 'No same-run continuous sink-to-cooking prep surface was derived.',
    `Appliance access score: ${score.applianceAccess}/100.`,
  ];
  const baseBlocking = base.plan.issues.filter(i => i.severity === 'blocking').length + base.constraints.issues.filter(i => i.severity === 'blocking').length;
  const mixedBlocking = mixed.issues.filter(i => i.severity === 'blocking').length;
  const ergoBlocking = ergo.issues.filter(i => i.severity === 'blocking').length;
  if (baseBlocking + mixedBlocking + ergoBlocking) reasons.push(`Rejected: ${baseBlocking + mixedBlocking + ergoBlocking} blocking issue(s) across geometry, mixed-height and ergonomics.`);
  else reasons.push('Passes all blocking geometry, mixed-height and ergonomic checks.');
  return reasons;
}

function variantKey(base: KitchenLayoutCandidate, mixed: KitchenMixedHeightPlan): string {
  const floor = mixed.runs.map(r => `${r.side}:${r.floorPlacements.map(p => `${p.module.libraryModuleId ?? p.module.kind}@${p.xMm}:${p.widthMm}`).join('|')}`).join(';');
  return `${base.kind}|${base.strategy}|${floor}`;
}

export function generateAndRankKitchenDesigns(input: KitchenDesignGeneratorInput): KitchenDesignGeneratorResult {
  const issues: string[] = [];
  const cap = Math.max(1, Math.min(30, Math.round(input.maxGeneratedVariants ?? 30)));
  const topN = Math.max(1, Math.min(10, Math.round(input.topN ?? 3)));
  const w = weights(input.rankingWeights);
  const tall = input.tallRequirements ?? [];
  const tallModes = availableTallModes(tall);

  // The base optimizer has at most kind x strategy unique candidates (currently 15).
  const baseResult = optimizeKitchenLayouts({
    optimizationId: input.optimizationId,
    roomWidthMm: input.roomWidthMm,
    roomDepthMm: input.roomDepthMm,
    ...(input.allowedKinds ? { allowedKinds: input.allowedKinds } : {}),
    ...(input.requirements ? { requirements: input.requirements } : {}),
    ...(input.utilities ? { utilities: input.utilities } : {}),
    ...(input.constraints ? { constraints: input.constraints } : {}),
    ...(input.runDepthMm != null ? { runDepthMm: input.runDepthMm } : {}),
    ...(input.minAisleMm != null ? { minAisleMm: input.minAisleMm } : {}),
    ...(input.islandDepthMm != null ? { islandDepthMm: input.islandDepthMm } : {}),
    ...(input.islandLengthMm != null ? { islandLengthMm: input.islandLengthMm } : {}),
    ...(input.cornerReserveMm != null ? { cornerReserveMm: input.cornerReserveMm } : {}),
    ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
    ...(input.weights ? { weights: input.weights } : {}),
    maxCandidates: 30,
  });

  const variants: KitchenDesignVariant[] = [];
  const seen = new Set<string>();
  outer: for (const base of baseResult.candidates) {
    for (const tallMode of tallModes) {
      const mixed = planKitchenMixedHeight({
        planId: `${input.optimizationId}:design:${base.id}:${tallMode}`,
        basePlan: base.plan,
        tallRequirements: withTallMode(tall, tallMode),
        ...(input.applianceBindings ? { applianceBindings: input.applianceBindings } : {}),
        ...(input.createWallLayer != null ? { createWallLayer: input.createWallLayer } : {}),
        ...(input.baseCabinetHeightMm != null ? { baseCabinetHeightMm: input.baseCabinetHeightMm } : {}),
        ...(input.tallCabinetHeightMm != null ? { tallCabinetHeightMm: input.tallCabinetHeightMm } : {}),
        ...(input.wallCabinetHeightMm != null ? { wallCabinetHeightMm: input.wallCabinetHeightMm } : {}),
        ...(input.wallBottomZMm != null ? { wallBottomZMm: input.wallBottomZMm } : {}),
        ...(input.wallDepthMm != null ? { wallDepthMm: input.wallDepthMm } : {}),
        ...(input.minHoodClearanceMm != null ? { minHoodClearanceMm: input.minHoodClearanceMm } : {}),
        ...(input.worktopTopZMm != null ? { worktopTopZMm: input.worktopTopZMm } : {}),
        ...(input.standardWidthsMm ? { standardWidthsMm: input.standardWidthsMm } : {}),
      });
      const key = variantKey(base, mixed);
      if (seen.has(key)) continue;
      seen.add(key);
      const ergo = evaluateKitchenErgonomics(mixed, input.ergonomicsRules ?? {});
      const score = totalScore(base, ergo, w);
      const ready = base.ready && mixed.ready && ergo.ready;
      variants.push({
        id: `${input.optimizationId}:variant:${variants.length + 1}`,
        rank: 0,
        baseCandidateId: base.id,
        kind: base.kind,
        strategy: base.strategy,
        tallPositionMode: tallMode,
        base,
        mixedHeight: mixed,
        ergonomics: ergo,
        score,
        ready,
        reasons: reasonList(base, mixed, ergo, score),
      });
      if (variants.length >= cap) break outer;
    }
  }

  variants.sort((a, b) => Number(b.ready) - Number(a.ready)
    || b.score.total - a.score.total
    || b.score.ergonomics - a.score.ergonomics
    || b.score.manufacturing - a.score.manufacturing
    || a.base.technicalFillMm - b.base.technicalFillMm
    || a.id.localeCompare(b.id));

  const ranked = variants.map((v, i) => ({ ...v, rank: i + 1 }));
  const ready = ranked.filter(v => v.ready);
  const topDesigns = ready.slice(0, topN);
  const recommended = topDesigns[0];
  if (!recommended) issues.push('No generated design passes all blocking geometry, mixed-height and ergonomic checks.');
  if (ready.length < topN) issues.push(`Only ${ready.length} ready design(s) are available for a requested Top ${topN}.`);
  if (variants.length === cap) issues.push(`Generation was capped at ${cap} variants.`);
  issues.push(...baseResult.issues);

  return {
    generationId: input.optimizationId,
    generatedCount: variants.length,
    evaluatedCount: ranked.length,
    readyCount: ready.length,
    rejectedCount: ranked.length - ready.length,
    topDesigns,
    allVariants: ranked,
    ...(recommended ? { recommended } : {}),
    issues: [...new Set(issues)],
  };
}

import { randomUUID } from 'node:crypto';
import { mm, type ProjectModelV1, type FurnitureItem } from '../../project-model/src/index.js';
import { applyKitchenMixedHeightPlan } from './kitchen-mixed-height-appliance-layout.js';

/**
 * Turns a ranked Design Studio variant into a normal ProjectModel snapshot.
 * The generated furniture remains ordinary kitchen furniture consumed by the
 * existing Engineering Engine; Design Studio is not a second manufacturing model.
 */
export function materializeKitchenDesignVariant(
  project: ProjectModelV1,
  variant: KitchenDesignVariant,
  options: { title?: string; roomHeightMm?: number } = {},
): ProjectModelV1 {
  const roomId = randomUUID();
  const templateId = randomUUID();
  const roomHeightMm = Math.max(2200, Math.round(options.roomHeightMm ?? 2700));
  const next = structuredClone(project);
  next.projectType = 'kitchen';
  if (options.title) next.title = options.title;
  next.site.rooms = [{
    id: roomId,
    name: 'Kitchen · Design Studio',
    origin: { x: mm(0), y: mm(0), z: mm(0) },
    dimensions: {
      width: { value: mm(variant.mixedHeight.roomWidthMm), state: 'confirmed' },
      height: { value: mm(roomHeightMm), state: 'estimated' },
      depth: { value: mm(variant.mixedHeight.roomDepthMm), state: 'confirmed' },
    },
    walls: [], openings: [], obstacles: [],
  }];
  const template: FurnitureItem = {
    id: templateId,
    kind: 'kitchen',
    name: 'Kitchen Design Studio template',
    roomId,
    transform: { position: { x: mm(0), y: mm(0), z: mm(0) }, rotationZDeg: 0 },
    dimensions: {
      width: { value: mm(1000), state: 'estimated' },
      height: { value: mm(900), state: 'estimated' },
      depth: { value: mm(600), state: 'estimated' },
    },
    mounting: 'base_supported',
    construction: {
      carcassThickness: { value: mm(18), state: 'estimated' },
      backPanel: { mode: 'overlay', thickness: { value: mm(8), state: 'estimated' } },
      plinth: { mode: 'separate', height: { value: mm(100), state: 'estimated' }, setback: { value: mm(70), state: 'estimated' } },
    },
    modules: [], fronts: [], style: { colorNote: 'Design Studio · material not selected' },
    tags: ['kitchen-design-studio','template'],
  };
  next.furniture = [template];
  const materialized = applyKitchenMixedHeightPlan(next, templateId, variant.mixedHeight);
  materialized.furniture = materialized.furniture.map(item => ({ ...item, roomId }));
  materialized.notes.push({
    id: randomUUID(),
    text: `Kitchen Design Studio selected variant #${variant.rank}: ${variant.kind}/${variant.strategy}; score ${variant.score.total}/100.`,
    authorType: 'system',
    createdAt: new Date().toISOString(),
  });
  return materialized;
}
