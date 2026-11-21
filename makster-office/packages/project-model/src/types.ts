export const PROJECT_SCHEMA_VERSION = '1.0.0' as const;

export type UUID = string;
export type ISODateTime = string;
export type CurrencyCode = string;

/** Canonical geometry unit: one integer unit = 0.1 mm. */
export type Mm10 = number & { readonly __brand: 'Mm10' };

export const mm = (valueMm: number): Mm10 => Math.round(valueMm * 10) as Mm10;
export const toMm = (value: Mm10): number => Number(value) / 10;

export type DimensionState = 'confirmed' | 'observed' | 'estimated' | 'unknown';

export interface MeasuredMm10 {
  value: Mm10 | null;
  state: DimensionState;
  tolerance?: Mm10;
}

export interface Vector3Mm10 {
  x: Mm10;
  y: Mm10;
  z: Mm10;
}

export interface Transform3D {
  position: Vector3Mm10;
  rotationZDeg: 0 | 90 | 180 | 270;
}

export interface Dimensions3D {
  width: MeasuredMm10;
  height: MeasuredMm10;
  depth: MeasuredMm10;
}

export interface Box3D {
  origin: Vector3Mm10;
  size: Dimensions3D;
}

export type ProjectType =
  | 'wardrobe'
  | 'walk_in'
  | 'kitchen'
  | 'cabinet'
  | 'sideboard'
  | 'built_in'
  | 'mixed';

export type WallOpeningKind = 'door' | 'window' | 'niche' | 'passage' | 'other';
export type ObstacleKind =
  | 'socket'
  | 'switch'
  | 'pipe'
  | 'radiator'
  | 'vent'
  | 'window'
  | 'door'
  | 'column'
  | 'duct'
  | 'boiler'
  | 'other';

export interface WallSegment {
  id: UUID;
  start: Vector3Mm10;
  end: Vector3Mm10;
  height: MeasuredMm10;
  thickness?: MeasuredMm10;
}

export interface WallOpening {
  id: UUID;
  kind: WallOpeningKind;
  hostWallId?: UUID;
  bounds: Box3D;
  note?: string;
}

export interface Obstacle {
  id: UUID;
  kind: ObstacleKind;
  hostWallId?: UUID;
  bounds: Box3D;
  note?: string;
}

export interface Room {
  id: UUID;
  name: string;
  origin: Vector3Mm10;
  dimensions?: Dimensions3D;
  walls: WallSegment[];
  openings: WallOpening[];
  obstacles: Obstacle[];
}

export type FurnitureKind =
  | 'wardrobe'
  | 'walk_in'
  | 'kitchen'
  | 'cabinet'
  | 'sideboard'
  | 'built_in'
  | 'custom';

export type MountingMode = 'freestanding' | 'built_in' | 'wall_hung' | 'base_supported';

export type BackPanelMode = 'overlay' | 'groove' | 'recessed' | 'none';
export type PlinthMode = 'none' | 'integrated' | 'separate';

export interface BackPanelSpec {
  mode: BackPanelMode;
  thickness?: MeasuredMm10;
  materialSelectionId?: UUID;
  /** Distance from the rear edge of a carcass part to the groove centreline. */
  grooveInset?: MeasuredMm10;
  /** Groove depth into the carcass part. */
  grooveDepth?: MeasuredMm10;
  /** Added width beyond the back-panel thickness for machining clearance. */
  grooveClearance?: MeasuredMm10;
}

export interface PlinthSpec {
  mode: PlinthMode;
  height?: MeasuredMm10;
  setback?: MeasuredMm10;
  materialSelectionId?: UUID;
}

export interface ConstructionSpec {
  carcassThickness: MeasuredMm10;
  backPanel: BackPanelSpec;
  plinth?: PlinthSpec;
  defaultCarcassMaterialSelectionId?: UUID;
  defaultFrontMaterialSelectionId?: UUID;
  defaultEdgeMaterialSelectionId?: UUID;
}

export type FurnitureModuleKind =
  | 'shelves'
  | 'drawers'
  | 'short_clothes'
  | 'long_clothes'
  | 'appliance'
  | 'sink'
  | 'open'
  | 'mixed'
  | 'custom';

export interface FixedModuleWidth {
  mode: 'fixed';
  value: MeasuredMm10;
}

export interface FillModuleWidth {
  mode: 'fill';
  min?: MeasuredMm10;
  max?: MeasuredMm10;
}

export interface RatioModuleWidth {
  mode: 'ratio';
  ratio: number;
  min?: MeasuredMm10;
  max?: MeasuredMm10;
}

export type ModuleWidthSpec = FixedModuleWidth | FillModuleWidth | RatioModuleWidth;

export interface ShelfStackElement {
  id: UUID;
  kind: 'shelf_stack';
  count: number;
  adjustable: boolean;
  /** Optional user-selected shelf centre-line elevations measured from module bottom. */
  elevationsFromBottom?: MeasuredMm10[];
  materialSelectionId?: UUID;
}

export type ManualMachiningMethod = 'manufacturer_cnc' | 'manual_template' | 'manual_measure';

export interface DrawerBottomInstallationSpec {
  mode: 'overlay' | 'groove';
  machiningMethod?: ManualMachiningMethod;
  /** Slot width for a grooved bottom. */
  grooveWidth?: MeasuredMm10;
  /** How far the bottom panel enters the drawer sides/front/back. */
  grooveDepth?: MeasuredMm10;
  /** Vertical distance from lower drawer-side edge to the lower face of the bottom panel. */
  bottomRecessFromLowerEdge?: MeasuredMm10;
  /** Timber drawer box joint convention used to derive the HDF cut size. */
  boxJoint?: 'front_back_between_sides' | 'custom';
}

export interface DrawerBoxConfig {
  /** Drawer side height for timber drawer boxes. */
  sideHeight?: MeasuredMm10;
  /** Drawer side thickness; 16 mm is the default Makster timber-box convention. */
  sideThickness?: MeasuredMm10;
  bottomThickness?: MeasuredMm10;
  bottomInstallation?: DrawerBottomInstallationSpec;
  /** Visible/internal drawer front height for generated drawer fronts. */
  frontHeight?: MeasuredMm10;
  /**
   * Confirmed cabinet-side runner centre-lines measured from the module bottom.
   * One value per drawer. Required for automatic CNC release of runner drilling.
   */
  runnerLinesFromBottom?: MeasuredMm10[];
  materialSelectionId?: UUID;
  bottomMaterialSelectionId?: UUID;
}

export interface DrawerStackElement {
  id: UUID;
  kind: 'drawer_stack';
  count: number;
  frontMode: 'internal' | 'external';
  runnerHardwareSelectionId?: UUID;
  drawerBox?: DrawerBoxConfig;
}

export interface ClothesRailElement {
  id: UUID;
  kind: 'clothes_rail';
  count: number;
  railHardwareSelectionId?: UUID;
}

export interface ApplianceSpaceElement {
  id: UUID;
  kind: 'appliance_space';
  applianceKind: string;
  requiredSpace?: Dimensions3D;
}

export interface OpenSpaceElement {
  id: UUID;
  kind: 'open_space';
  label?: string;
}

export interface CustomInteriorElement {
  id: UUID;
  kind: 'custom';
  label: string;
}

export type InteriorElement =
  | ShelfStackElement
  | DrawerStackElement
  | ClothesRailElement
  | ApplianceSpaceElement
  | OpenSpaceElement
  | CustomInteriorElement;


export type KitchenModuleType = 'base' | 'wall' | 'tall';
export type KitchenFunction = 'storage' | 'drawers' | 'sink' | 'hob' | 'oven' | 'dishwasher' | 'fridge' | 'hood' | 'microwave' | 'pantry' | 'open';
export type KitchenCutoutKind = 'sink' | 'hob' | 'custom';

export interface KitchenCutoutSpec {
  id: UUID;
  kind: KitchenCutoutKind;
  /** Workshop means geometry is prepared before installation; on_site moves the cut to installation checklist. */
  execution?: 'workshop' | 'on_site';
  width?: MeasuredMm10;
  depth?: MeasuredMm10;
  offsetX?: MeasuredMm10;
  offsetY?: MeasuredMm10;
  /** True only after a technologist/manufacturer-specific verification of the CNC contour. */
  verifiedForCnc?: boolean;
}

export interface KitchenWallTrimSpec {
  enabled: boolean;
  materialSelectionId?: UUID;
  height?: MeasuredMm10;
  depth?: MeasuredMm10;
}

export interface KitchenWorktopSpec {
  enabled: boolean;
  materialSelectionId?: UUID;
  thickness?: MeasuredMm10;
  depth?: MeasuredMm10;
  frontOverhang?: MeasuredMm10;
  cutouts?: KitchenCutoutSpec[];
  /** Narrow wall-side plinth/upstand installed along the rear edge of a worktop. */
  wallTrim?: KitchenWallTrimSpec;
}

export interface KitchenPlinthSpec {
  enabled: boolean;
  height?: MeasuredMm10;
  setback?: MeasuredMm10;
  legHardwareSelectionId?: UUID;
  /** Explicit leg count wins. Otherwise Makster uses the conservative base-module default. */
  legCount?: number;
}

export interface KitchenApplianceSpec {
  kind: 'oven' | 'dishwasher' | 'fridge' | 'hood' | 'microwave' | 'hob' | 'sink' | 'other';
  manufacturer?: string;
  model?: string;
  catalogRecordId?: string;
  catalogTrust?: 'manufacturer_verified' | 'project_verified' | 'imported_unverified' | 'planning_only';
  catalogSource?: string;
  /** Where the appliance is physically installed; used for fit/cutout validation. */
  installation?: 'cabinet' | 'worktop' | 'wall' | 'sink_cutout';
  /**
   * preverified: production requires a fully confirmed W×H×D installation envelope.
   * site_fit: exact/no-name appliance is intentionally fitted on site; known dimensions are still checked,
   * but missing envelope dimensions do not block cabinet/worktop production.
   */
  fitMode?: 'preverified' | 'site_fit';
  requiredSpace?: Dimensions3D;
  /** Confirmed effective ventilation opening for this appliance installation. */
  verifiedVentilationAreaCm2?: number;
  /** Who is expected to supply the appliance/fixture. This does not affect geometric engineering. */
  procurementMode?: 'customer_supplied' | 'makster_supplied' | 'undecided';
  /** Optional commercial positioning when Makster supplies it. */
  priceTier?: 'budget' | 'mid' | 'premium' | 'unknown';
  pricing?: {
    currency: string;
    purchasePrice?: number;
    clientPrice?: number;
    source?: string;
    asOf?: string;
    verified: boolean;
  };
  /** Site fitting policy. Sink/hob default to site-fit/on-site cutout unless explicitly overridden. */
  cutoutExecution?: 'workshop_cnc' | 'on_site';
}

export interface KitchenModuleSpec {
  type: KitchenModuleType;
  function: KitchenFunction;
  hasTop: boolean;
  hasBottom: boolean;
  hasBack: boolean;
  opening?: HandleMode;
  worktop?: KitchenWorktopSpec;
  plinth?: KitchenPlinthSpec;
  /** Legacy single-appliance field retained for backward compatibility. */
  appliance?: KitchenApplianceSpec;
  /** 2.6.1+: multiple appliances can share one cabinet zone, e.g. oven + hob. */
  appliances?: KitchenApplianceSpec[];
  /** Per-module back-panel construction override, used for wall cabinets with grooved backs. */
  backPanelMode?: BackPanelMode;
  wallHangerHardwareSelectionId?: UUID;
  wallHangerCount?: number;
}

export interface FurnitureModule {
  id: UUID;
  /** Stable Makster Kitchen Module Library template identifier. Explicit project values override library defaults. */
  libraryModuleId?: string;
  kind: FurnitureModuleKind;
  name?: string;
  width: ModuleWidthSpec;
  height?: MeasuredMm10;
  depth?: MeasuredMm10;
  contents: InteriorElement[];
  /** Kitchen-specific construction; present only for furniture.kind="kitchen" modules. */
  kitchen?: KitchenModuleSpec;
  tags?: string[];
}

export type FrontKind = 'hinged' | 'sliding' | 'drawer_front' | 'fixed_panel' | 'open';
export type FrontSplit = 'none' | 'vertical' | 'horizontal';
export type FrontOpening = 'left' | 'right' | 'paired' | 'mixed' | 'not_applicable';
export type HandleMode = 'handle' | 'profile' | 'gola' | 'push_to_open' | 'none';

export interface FrontHandleSpec {
  mode: HandleMode;
  hardwareSelectionId?: UUID;
}

export interface FrontSpec {
  id: UUID;
  moduleIds: UUID[];
  kind: FrontKind;
  count: number;
  split: FrontSplit;
  opening: FrontOpening;
  /** Optional explicit hinge side per module/front; preferred for production machining. */
  hingeSides?: Array<'left' | 'right'>;
  /** Explicit hinge hardware assignment for this front. */
  hingeHardwareSelectionId?: UUID;
  materialSelectionId?: UUID;
  handle?: FrontHandleSpec;
  note?: string;
}

export interface FurnitureStyle {
  colorNote?: string;
  finishNote?: string;
  referenceFileIds?: UUID[];
}

export interface FurnitureItem {
  id: UUID;
  kind: FurnitureKind;
  name: string;
  roomId?: UUID;
  transform: Transform3D;
  dimensions: Dimensions3D;
  mounting: MountingMode;
  construction: ConstructionSpec;
  modules: FurnitureModule[];
  fronts: FrontSpec[];
  style?: FurnitureStyle;
  tags?: string[];
}

export type MaterialRole =
  | 'carcass'
  | 'front'
  | 'back'
  | 'worktop'
  | 'edge'
  | 'glass'
  | 'profile'
  | 'other';

export type GrainDirection = 'none' | 'vertical' | 'horizontal' | 'fixed';

export interface MaterialSelection {
  id: UUID;
  role: MaterialRole;
  source: 'catalog' | 'manual';
  catalogMaterialId?: UUID;
  manufacturer?: string;
  code?: string;
  name?: string;
  thickness?: MeasuredMm10;
  finish?: string;
  grainDirection?: GrainDirection;
  /** Optional density used for mass-aware engineering checks. */
  densityKgM3?: number;
  note?: string;
}

export type BlumHingeApplication = 'overlay' | 'inset' | 'dual';
export type BlumDrawerSystem = 'movento' | 'tandem' | 'legrabox';
export type BlumMotionType = 'blumotion' | 'tip_on' | 'tip_on_blumotion';
export type LegraboxHeightCode = 'M' | 'K' | 'C' | 'F';

export interface BlumHingeTechnicalSpec {
  kind: 'blum_hinge';
  system: 'clip_top_blumotion';
  application: BlumHingeApplication;
  openingAngleDeg?: 100 | 107 | 110 | 120 | 155 | 170;
  drillingDistance?: MeasuredMm10;
  mountingPlateSpacing?: MeasuredMm10;
}

export interface BlumRunnerTechnicalSpec {
  kind: 'blum_runner';
  system: BlumDrawerSystem;
  nominalLength: MeasuredMm10;
  motion?: BlumMotionType;
  capacityKg?: 30 | 40 | 60 | 65 | 70;
  legraboxHeightCode?: LegraboxHeightCode;
}

/** Verified dimensional profile for GTV Modern Slide timber-drawer runners. */
export interface GtvModernSlideTechnicalSpec {
  kind: 'gtv_modern_slide';
  family: 'modern_slide_18';
  nominalLength: MeasuredMm10;
  motion?: 'soft_close' | 'push_to_open';
  /** SKW = LW - reduction. */
  drawerInternalWidthReduction: MeasuredMm10;
  /** SKL = NL - reduction. */
  boxLengthReduction: MeasuredMm10;
  /** Maximum side-board thickness documented for the family. */
  maxSideThickness?: MeasuredMm10;
  /** Maximum documented bottom recess from lower edge. */
  maxBottomRecess?: MeasuredMm10;
}

export type HardwareTechnicalSpec = BlumHingeTechnicalSpec | BlumRunnerTechnicalSpec | GtvModernSlideTechnicalSpec;

export type HardwareRole =
  | 'hinge'
  | 'runner'
  | 'lift'
  | 'handle'
  | 'rail'
  | 'connector'
  | 'leg'
  | 'other';

export interface HardwareSelection {
  id: UUID;
  role: HardwareRole;
  source: 'catalog' | 'manual';
  catalogHardwareId?: UUID;
  /** Makster master-catalog record identifier, distinct from legacy UUID catalogHardwareId. */
  catalogRecordId?: string;
  catalogTrust?: 'manufacturer_verified' | 'project_verified' | 'imported_unverified' | 'planning_only';
  catalogSource?: string;
  manufacturer?: string;
  code?: string;
  name?: string;
  technical?: HardwareTechnicalSpec;
  machiningMethod?: ManualMachiningMethod;
  note?: string;
}

export type ConstraintKind =
  | 'installation_gap'
  | 'wall_clearance'
  | 'ceiling_clearance'
  | 'minimum_module_width'
  | 'maximum_module_width'
  | 'material_restriction'
  | 'hardware_restriction'
  | 'custom';

export interface ProjectConstraint {
  id: UUID;
  kind: ConstraintKind;
  targetIds: UUID[];
  severity: 'info' | 'warning' | 'blocking';
  params: Record<string, unknown>;
  note?: string;
}

export type FactSource = 'manual' | 'ai_text' | 'ai_image' | 'import' | 'derived' | 'engineering';

/**
 * Provenance is kept outside domain values so the same clean ProjectModel can be
 * consumed by Engineering, Visualizer and Quote without every scalar being wrapped.
 * `path` is a JSON Pointer (RFC 6901) into the ProjectModel snapshot.
 */
export interface FactProvenance {
  path: string;
  source: FactSource;
  confidence: number;
  confirmed: boolean;
  evidenceFileIds?: UUID[];
  note?: string;
}

export interface ProjectNote {
  id: UUID;
  text: string;
  authorType: 'user' | 'agent' | 'system';
  authorId?: UUID;
  createdAt: ISODateTime;
}


export interface InstallationDecision {
  id: UUID;
  conflictId: string;
  resolutionSuggestionId?: string;
  kind: 'design_decision' | 'site_task';
  status: 'approved' | 'completed' | 'cancelled';
  title: string;
  detail: string;
  approvedBy: string;
  approvedAt: ISODateTime;
  completedAt?: ISODateTime;
  /** True only for non-physical warnings that may be considered addressed by a documented site task. */
  addressesWarning?: boolean;
  targetFurnitureId?: UUID;
  targetModuleId?: UUID;
  sourceRevision: number;
}


export interface InstallationSiteIssue {
  id: UUID;
  status: 'open' | 'resolved' | 'cancelled';
  severity: 'info' | 'warning' | 'blocking';
  title: string;
  detail: string;
  reportedBy: string;
  reportedAt: ISODateTime;
  resolvedAt?: ISODateTime;
  targetFurnitureId?: UUID;
  targetModuleId?: UUID;
  sourceRevision: number;
}


export interface InstallationChangeRequest {
  id: UUID;
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  title: string;
  reason: string;
  requestedBy: string;
  requestedAt: ISODateTime;
  reviewedBy?: string;
  reviewedAt?: ISODateTime;
  targetFurnitureId?: UUID;
  proposedPositionMm?: { x?: number; y?: number; z?: number };
  sourceRevision: number;
  appliedRevision?: number;
}

export interface AsBuiltRecord {
  id: UUID;
  title: string;
  detail: string;
  recordedBy: string;
  recordedAt: ISODateTime;
  sourceRevision: number;
  targetFurnitureId?: UUID;
}


export interface InstallationPunchItem {
  id: UUID;
  status: 'open' | 'closed' | 'cancelled';
  severity: 'minor' | 'major';
  title: string;
  detail: string;
  createdBy: string;
  createdAt: ISODateTime;
  closedBy?: string;
  closedAt?: ISODateTime;
  sourceRevision: number;
  targetFurnitureId?: UUID;
}

export interface InstallationHandover {
  id: UUID;
  status: 'signed';
  signedBy: string;
  signedAt: ISODateTime;
  installerName?: string;
  clientName?: string;
  notes?: string;
  sourceRevision: number;
}


export type JobStage =
  | 'lead'
  | 'measurement'
  | 'design'
  | 'client_approval'
  | 'contract'
  | 'deposit'
  | 'purchasing'
  | 'production'
  | 'delivery'
  | 'installation'
  | 'handover'
  | 'final_payment'
  | 'warranty'
  | 'closed';

export interface JobMoneyState {
  contractValueMinor?: number;
  receivedMinor?: number;
  committedPurchaseMinor?: number;
  actualCostMinor?: number;
  currency: CurrencyCode;
}

export interface JobClient {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  objectAddress?: string;
}

export interface JobMilestone {
  id: UUID;
  code: string;
  title: string;
  status: 'pending' | 'ready' | 'done' | 'blocked';
  dueAt?: ISODateTime;
  completedAt?: ISODateTime;
  note?: string;
}

export interface JobControlState {
  stage: JobStage;
  client: JobClient;
  money: JobMoneyState;
  targetDeliveryAt?: ISODateTime;
  targetInstallationAt?: ISODateTime;
  milestones: JobMilestone[];
  updatedAt: ISODateTime;
}


export type PurchaseItemKind = 'material' | 'hardware' | 'appliance' | 'service' | 'other';
export type PurchaseOrderStatus = 'draft' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderLine {
  id: UUID;
  kind: PurchaseItemKind;
  sourceKey?: string;
  description: string;
  manufacturer?: string;
  code?: string;
  quantity: number;
  unit: 'pcs' | 'set' | 'mm' | 'm2' | 'service';
  unitPriceMinor?: number;
  receivedQuantity?: number;
  furnitureId?: UUID;
  moduleId?: UUID;
  applianceCatalogRecordId?: string;
}

export interface PurchaseOrder {
  id: UUID;
  supplierName: string;
  supplierReference?: string;
  status: PurchaseOrderStatus;
  currency: CurrencyCode;
  lines: PurchaseOrderLine[];
  createdBy: string;
  createdAt: ISODateTime;
  approvedBy?: string;
  approvedAt?: ISODateTime;
  orderedAt?: ISODateTime;
  expectedAt?: ISODateTime;
  receivedAt?: ISODateTime;
  note?: string;
  sourceRevision: number;
}


export type CostCategory =
  | 'material'
  | 'hardware'
  | 'appliance'
  | 'labor'
  | 'installation'
  | 'transport'
  | 'subcontract'
  | 'overhead'
  | 'other';

export interface ProjectCostEntry {
  id: UUID;
  category: CostCategory;
  basis: 'estimate' | 'actual';
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  source: 'manual' | 'purchase_order' | 'derived';
  sourceId?: string;
  createdBy: string;
  createdAt: ISODateTime;
  note?: string;
}


export type ClientApprovalKind =
  | 'design'
  | 'materials'
  | 'commercial'
  | 'change'
  | 'handover_precheck';

export interface ClientApprovalRequest {
  id: UUID;
  kind: ClientApprovalKind;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'cancelled';
  requestedBy: string;
  requestedAt: ISODateTime;
  sourceRevision: number;
  /** SHA-256 of site + furniture + material/hardware selections + constraints at request time. */
  contentFingerprint?: string;
  approvedRevision?: number;
  respondedBy?: string;
  respondedAt?: ISODateTime;
  responseComment?: string;
  /** Public-facing amount only. Never supplier/internal cost. */
  clientAmountMinor?: number;
  /** IDs of furniture/modules/items this approval is about. */
  targetIds?: string[];
}

export interface ClientPortalState {
  enabled: boolean;
  publicTitle?: string;
  welcomeText?: string;
  showContractValue: boolean;
  showPayments: boolean;
  showTargetDates: boolean;
  showMilestones: boolean;
  updatedAt: ISODateTime;
}


export interface ClientShareLink {
  id: UUID;
  tokenHash: string;
  status: 'active' | 'revoked' | 'expired';
  createdBy: string;
  createdAt: ISODateTime;
  expiresAt?: ISODateTime;
  oneTime?: boolean;
  usedAt?: ISODateTime;
  allowApprovalResponses: boolean;
  /** Approval IDs this link may answer. Empty/undefined means no approval response scope. */
  approvalIds?: string[];
  sourceRevision: number;
  label?: string;
}

export interface ProjectModelV1 {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  projectId: UUID;
  revision: number;
  title: string;
  locale: string;
  currency: CurrencyCode;
  unitSystem: 'metric';
  geometryUnit: '0.1mm';
  coordinateSystem: {
    handedness: 'right';
    x: 'right';
    y: 'forward';
    z: 'up';
  };
  projectType: ProjectType;
  site: {
    rooms: Room[];
  };
  furniture: FurnitureItem[];
  selections: {
    materials: MaterialSelection[];
    hardware: HardwareSelection[];
  };
  constraints: ProjectConstraint[];
  facts: FactProvenance[];
  notes: ProjectNote[];
  installationDecisions?: InstallationDecision[];
  installationSiteIssues?: InstallationSiteIssue[];
  installationChangeRequests?: InstallationChangeRequest[];
  asBuiltRecords?: AsBuiltRecord[];
  installationPunchItems?: InstallationPunchItem[];
  installationHandover?: InstallationHandover;
  jobControl?: JobControlState;
  purchaseOrders?: PurchaseOrder[];
  costEntries?: ProjectCostEntry[];
  clientApprovals?: ClientApprovalRequest[];
  clientPortal?: ClientPortalState;
  clientShareLinks?: ClientShareLink[];
}

export type ProjectChangeSource = 'user' | 'ai' | 'client' | 'import' | 'engineering';
export type ProjectPatchOperation = 'set' | 'add' | 'remove' | 'replace';

export interface ProjectPatch {
  op: ProjectPatchOperation;
  /** RFC 6901 JSON Pointer into the ProjectModel snapshot. */
  path: string;
  value?: unknown;
}

export interface ProjectChangeSet {
  changeId: UUID;
  projectId: UUID;
  basedOnRevision: number;
  source: ProjectChangeSource;
  reason?: string;
  confidence?: number;
  patches: ProjectPatch[];
}
