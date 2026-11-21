import type { EngineeringCompileResult, MachiningOperation } from '../../engineering-engine/src/types.js';
import type { ProjectModelV1 } from '../../project-model/src/types.js';

export const PRODUCTION_PACK_VERSION = '1.0.0' as const;

export type ProductionRoute = 'manual_workshop' | 'outsource';
export type OutsourcePreset = 'cutting_only' | 'cutting_edging' | 'cutting_edging_drilling';
export type ProductionService = 'cutting' | 'edging' | 'drilling';

export interface ProductionPackBlocker {
  code: string;
  message: string;
  targetId?: string;
}

export interface ProductionPackFileInfo {
  name: string;
  mediaType: string;
  purpose: string;
  sha256: string;
  byteLength: number;
}

export interface ProductionPackSummary {
  physicalPanelParts: number;
  uniquePanelRows: number;
  edgeOperations: number;
  edgeLengthMm: number;
  machiningOperations: number;
  exactMachiningOperations: number;
  unresolvedMachiningOperations: number;
  hardwareRequirementRows: number;
  installationDecisionRows: number;
  openSiteTaskRows: number;
  openSiteIssueRows: number;
}

export interface ProductionPackManifest {
  packVersion: typeof PRODUCTION_PACK_VERSION;
  packId: string;
  route: ProductionRoute;
  outsourcePreset?: OutsourcePreset;
  services: ProductionService[];
  projectId: string;
  revision: number;
  projectTitle: string;
  generatedAt: string;
  engineeringEngineVersion: string;
  engineeringRulesetId: string;
  engineeringInputChecksum: string;
  ready: boolean;
  blockers: ProductionPackBlocker[];
  warnings: string[];
  summary: ProductionPackSummary;
  files: ProductionPackFileInfo[];
}

export interface ProductionPackBuildInput {
  project: ProjectModelV1;
  engineering: EngineeringCompileResult;
  route: ProductionRoute;
  outsourcePreset?: OutsourcePreset;
  packId?: string;
  generatedAt?: string;
  supplierName?: string;
  orderReference?: string;
}

export interface BuiltProductionPack {
  manifest: ProductionPackManifest;
  files: Record<string, string>;
}

export interface PartDrillingGroup {
  partId: string;
  operations: MachiningOperation[];
}
