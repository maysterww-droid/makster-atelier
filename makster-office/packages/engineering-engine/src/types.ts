import type { GrainDirection, HardwareRole, Mm10, ProjectModelV1, UUID } from '../../project-model/src/types.js';

export const ENGINEERING_ENGINE_VERSION = '0.7.0' as const;
export const DEFAULT_WARDROBE_RULESET_ID = 'wardrobe-modular-boxes-release-v0.7' as const;

export type EngineeringSeverity = 'info' | 'warning' | 'error' | 'blocking';
export type EngineeringIssueCategory =
  | 'input'
  | 'geometry'
  | 'construction'
  | 'material'
  | 'hardware'
  | 'edge'
  | 'manufacturing';

export type PanelPartKind =
  | 'side'
  | 'top'
  | 'bottom'
  | 'shelf'
  | 'back'
  | 'front'
  | 'drawer_side'
  | 'drawer_back'
  | 'drawer_bottom'
  | 'drawer_front'
  | 'plinth'
  | 'worktop'
  | 'custom';

export type PanelEdgeSide = 'top' | 'right' | 'bottom' | 'left';

export interface PanelEdgeOperation {
  side: PanelEdgeSide;
  materialSelectionId?: UUID;
  thickness?: Mm10;
  note?: string;
}

export interface PanelPart {
  id: string;
  furnitureId: UUID;
  moduleId?: UUID;
  sourceElementId?: UUID;
  sourceFrontId?: UUID;
  kind: PanelPartKind;
  name: string;
  quantity: number;
  materialSelectionId?: UUID;
  length: Mm10;
  width: Mm10;
  thickness: Mm10;
  grainDirection: GrainDirection;
  edges: PanelEdgeOperation[];
  estimated: boolean;
  tags?: string[];
}

export interface HardwareRequirement {
  id: string;
  furnitureId: UUID;
  moduleId?: UUID;
  sourceElementId?: UUID;
  sourceFrontId?: UUID;
  role: HardwareRole;
  hardwareSelectionId?: UUID;
  name: string;
  quantity: number;
  unit: 'pcs' | 'set' | 'mm';
  length?: Mm10;
  estimated: boolean;
  note?: string;
}

export type MachiningFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
export type MachiningOperationKind = 'drill' | 'hinge_cup' | 'groove' | 'cutout' | 'reference_line';
export type MachiningVerificationSource = 'makster_rule' | 'manufacturer_catalog' | 'manufacturer_bxf' | 'manual_verified' | 'fixture_only' | 'estimated';

export interface MachiningVerificationDetail {
  manufacturer?: string;
  hardwareCode?: string;
  catalogVersion?: string;
  sourceChecksumSha256?: string;
  schemaFingerprint?: string;
  adapterId?: string;
  manualVerificationId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

/**
 * Coordinates are expressed in the local coordinate system of the target part.
 * x = distance from the referenced edge across the part width, y = distance along part length.
 */
export interface MachiningOperation {
  id: string;
  furnitureId: UUID;
  moduleId?: UUID;
  targetPartId: string;
  sourceFrontId?: UUID;
  sourceElementId?: UUID;
  kind: MachiningOperationKind;
  face: MachiningFace;
  x: Mm10;
  y: Mm10;
  diameter?: Mm10;
  depth?: Mm10;
  length?: Mm10;
  toolWidth?: Mm10;
  reference?: string;
  hardwareSelectionId?: UUID;
  estimated: boolean;
  verificationSource?: MachiningVerificationSource;
  verificationDetail?: MachiningVerificationDetail;
  note?: string;
}

export interface CncReleaseBlocker {
  code: string;
  message: string;
  targetId?: string;
  hardwareSelectionId?: UUID;
}

export interface CncReleaseStatus {
  ready: boolean;
  blockers: CncReleaseBlocker[];
}

export interface EngineeringIssue {
  id: string;
  code: string;
  severity: EngineeringSeverity;
  category: EngineeringIssueCategory;
  message: string;
  furnitureId?: UUID;
  moduleId?: UUID;
  targetId?: UUID | string;
  metadata?: Record<string, unknown>;
}

export interface MaterialBomItem {
  kind: 'panel_material';
  materialSelectionId?: UUID;
  thickness: Mm10;
  grainDirection: GrainDirection;
  quantity: number;
  totalAreaMm2: number;
  partIds: string[];
}

export interface HardwareBomItem {
  kind: 'hardware';
  hardwareSelectionId?: UUID;
  role: HardwareRole;
  name: string;
  quantity: number;
  unit: 'pcs' | 'set' | 'mm';
  requirementIds: string[];
}

export type BomItem = MaterialBomItem | HardwareBomItem;

export interface EngineeringCheckSummary {
  info: number;
  warnings: number;
  errors: number;
  blocking: number;
  passed: number;
}

export interface EngineeringStats {
  furnitureCount: number;
  moduleCount: number;
  panelPartCount: number;
  uniquePanelCount: number;
  hardwareRequirementCount: number;
  machiningOperationCount: number;
  totalPanelAreaMm2: number;
}

export interface EngineeringFurnitureResult {
  furnitureId: UUID;
  name: string;
  parts: PanelPart[];
  hardware: HardwareRequirement[];
  machining: MachiningOperation[];
  issues: EngineeringIssue[];
}


export interface ProductionIntelligenceAction {
  id: string;
  targetType: 'hardware' | 'appliance';
  furnitureId?: UUID;
  moduleId?: UUID;
  hardwareSelectionId?: UUID;
  catalogRecordId: string;
  status: 'ready' | 'manual_required' | 'verification_required' | 'blocked';
  action: string;
  source?: string;
}

export interface CatalogTraceabilityRecord {
  targetType: 'hardware' | 'appliance';
  furnitureId?: UUID;
  moduleId?: UUID;
  hardwareSelectionId?: UUID;
  catalogRecordId: string;
  manufacturer?: string;
  modelOrCode?: string;
  trust?: 'manufacturer_verified' | 'project_verified' | 'imported_unverified' | 'planning_only';
  source?: string;
  productionDrillingAuthorized?: boolean;
}

export interface EngineeringCompileResult {
  artifactVersion: '1.3.0';
  engineVersion: typeof ENGINEERING_ENGINE_VERSION;
  ruleSetId: string;
  projectId: UUID;
  revision: number;
  generatedAt: string;
  inputChecksum: string;
  readyForProduction: boolean;
  /** True only when all required machining operations are exact enough for automated CNC release. */
  cncReady: boolean;
  cncRelease: CncReleaseStatus;
  furniture: EngineeringFurnitureResult[];
  parts: PanelPart[];
  hardware: HardwareRequirement[];
  machining: MachiningOperation[];
  bom: BomItem[];
  catalogTraceability: CatalogTraceabilityRecord[];
  productionIntelligenceActions: ProductionIntelligenceAction[];
  issues: EngineeringIssue[];
  checks: EngineeringCheckSummary;
  stats: EngineeringStats;
}

export interface WardrobeRuleSetV05 {
  id: string;
  carcassMode: 'modular_boxes';
  frontGap: Mm10;
  shelfRearClearance: Mm10;
  backPanelMargin: Mm10;
  defaultEdgeThickness: Mm10;
  maxPanelLength: Mm10;
  maxPanelWidth: Mm10;
  minShelfWidth: Mm10;
  maxShelfSpanWithoutSupport: Mm10;
  railEndClearance: Mm10;
  hingeCountByDoorHeight: Array<{ maxHeight: Mm10; count: number }>;
  blum: {
    hingeCupDiameter: Mm10;
    hingeCupDepth: Mm10;
    defaultHingeDrillingDistance: Mm10;
    mountingPlateSetback: Mm10;
    mountingPlateHoleSpacing: Mm10;
    hingeEndMargin: Mm10;
    maxStandardDoorWidth: Mm10;
    moventoTandemSideClearanceTotal: Mm10;
    runnerLengthReduction: Mm10;
    runnerRearSpace: Mm10;
    defaultDrawerSideThickness: Mm10;
    defaultDrawerSideHeight: Mm10;
    defaultDrawerBottomThickness: Mm10;
    defaultDrawerFrontGap: Mm10;
  };
  backGroove: {
    defaultInset: Mm10;
    defaultDepth: Mm10;
    defaultClearance: Mm10;
  };
  system32: {
    enabled: boolean;
    pitch: Mm10;
    rowFromFront: Mm10;
    rowFromRear: Mm10;
    holeDiameter: Mm10;
    holeDepth: Mm10;
    endMargin: Mm10;
  };
}

export interface EngineeringCompiler {
  compile(project: ProjectModelV1): EngineeringCompileResult;
}
