
export type OpsCurrency='EUR'|'CZK'|'USD'|'GBP'|string;
export type OpsUnit='pcs'|'set'|'m2'|'m'|'mm'|'service';

export interface WarehouseItem {
  id:string;
  sku:string;
  name:string;
  manufacturer?:string;
  unit:OpsUnit;
  onHand:number;
  minStock?:number;
  unitCostMinor?:number;
  currency:OpsCurrency;
  location?:string;
  updatedAt:string;
}
export interface WarehouseReservation {
  id:string;
  itemId:string;
  projectId:string;
  quantity:number;
  priority:number;
  status:'reserved'|'consumed'|'released';
  createdAt:string;
  note?:string;
}
export interface SupplierProfile {
  id:string;
  name:string;
  currency:OpsCurrency;
  leadTimeDays:number;
  reliabilityPct:number;
  defectPct:number;
  paymentTermsDays:number;
  priceIndex:number;
  active:boolean;
  email?:string;
  categories?:string[];
  languages?:Array<'en'|'cs'|'de'|'pl'>;
  updatedAt:string;
}

export interface SupplierQuoteLine {
  sku:string;
  quantity:number;
  unit:OpsUnit;
  unitPriceMinor:number;
}
export interface SupplierQuote {
  id:string;
  supplierId:string;
  rfqId?:string;
  reference?:string;
  currency:OpsCurrency;
  lines:SupplierQuoteLine[];
  leadTimeDays:number;
  validUntil?:string;
  deliveryCostMinor?:number;
  createdAt:string;
}



export type MaterialRfqStatus='draft'|'ready_to_send'|'sent'|'partially_quoted'|'quoted'|'compared'|'winner_selected'|'awarded'|'closed';

export interface MaterialProcurementRfq {
  id:string;
  projectId:string;
  projectTitle:string;
  sku:string;
  description:string;
  quantity:number;
  unit:OpsUnit;
  currency:OpsCurrency;
  supplierIds:string[];
  strategy:'optimal'|'cheapest'|'fastest';
  responseDeadline:string;
  status:MaterialRfqStatus;
  createdBy:string;
  createdAt:string;
  sentAt?:string;
  recommendedQuoteId?:string;
  selectedQuoteId?:string;
  awardedPurchaseOrderId?:string;
  note?:string;
}

export interface MaterialRfqCommunication {
  id:string;
  rfqId:string;
  supplierId:string;
  supplierName:string;
  supplierEmail:string;
  direction:'outbound'|'inbound';
  kind:'rfq_invitation'|'reminder'|'supplier_reply'|'quote_received'|'decline';
  status:'draft'|'sent'|'received'|'failed';
  subject:string;
  bodyText:string;
  responseToken:string;
  provider:'memory'|'gmail';
  providerAccountRef?:string;
  providerMessageId?:string;
  providerThreadId?:string;
  createdAt:string;
  sentAt?:string;
  receivedAt?:string;
  parsedQuoteId?:string;
  error?:string;
}

export type WorkCenterKind='cutting'|'edging'|'drilling'|'assembly'|'installation';

export interface ProductionWorkCenter {
  id:string;
  name:string;
  kind:WorkCenterKind;
  dailyCapacityHours:number;
  active:boolean;
  workdays:number[];
  updatedAt:string;
}

export interface ProjectCapacityOverride {
  id:string;
  projectId:string;
  centerKind:WorkCenterKind;
  hours:number;
  note?:string;
  updatedAt:string;
}


export interface ProductionTimeEntry {
  id:string;
  projectId:string;
  centerKind:WorkCenterKind;
  plannedHours:number;
  actualHours:number;
  completedAt:string;
  recordedBy:string;
  note?:string;
}

export interface TreasuryBalance {
  id:string;
  currency:OpsCurrency;
  openingBalanceMinor:number;
  asOf:string;
  updatedAt:string;
}

export interface ProcurementAward {
  id:string;
  quoteId:string;
  supplierId:string;
  projectId:string;
  sku:string;
  quantity:number;
  unit:OpsUnit;
  currency:OpsCurrency;
  totalCostMinor:number;
  paymentDueAt:string;
  expectedAt:string;
  status:'pending_project_order'|'ordered'|'failed'|'cancelled';
  purchaseOrderId?:string;
  cashEventId?:string;
  awardedBy:string;
  awardedAt:string;
  error?:string;
}

export interface CashEvent {
  id:string;
  type:'inflow'|'outflow';
  category:'client_payment'|'supplier'|'rent'|'salary'|'tax'|'transport'|'subcontract'|'overhead'|'other';
  amountMinor:number;
  currency:OpsCurrency;
  dueAt:string;
  status:'planned'|'committed'|'paid'|'received'|'cancelled';
  projectId?:string;
  counterparty?:string;
  note?:string;
  source?:'manual'|'procurement_award'|'project';
  sourceId?:string;
}
export interface FixedMonthlyCost {
  id:string;
  category:string;
  amountMinor:number;
  currency:OpsCurrency;
}

export interface OwnerQueuePriorityOverride {
  id:string;
  projectId:string;
  priority:number;
  sourcePlanId?:string;
  updatedAt:string;
}

export type DecisionActionType=
  |'queue_priority'
  |'capacity_change'
  |'collect_client_payment'
  |'cash_injection'
  |'procurement_award'
  |'margin_review';

export type DecisionActionStatus=
  |'pending_approval'
  |'approved'
  |'rejected'
  |'applied'
  |'ready_external'
  |'failed';

export interface DecisionPlanItem {
  id:string;
  type:DecisionActionType;
  title:string;
  description:string;
  projectId?:string;
  requiresApproval:boolean;
  externalAction:boolean;
  status:DecisionActionStatus;
  financialImpactMinor?:number;
  hoursImpact?:number;
  dueAt?:string;
  payload:Record<string,unknown>;
  approvedBy?:string;
  approvedAt?:string;
  appliedAt?:string;
  error?:string;
}

export interface OwnerDecisionPlan {
  id:string;
  scenarioId:string;
  scenarioName:string;
  baselineRiskScore:number;
  scenarioRiskScore:number;
  baselineCashGapMinor:number;
  scenarioCashGapMinor:number;
  createdBy:string;
  createdAt:string;
  status:'draft'|'partially_approved'|'approved'|'in_execution'|'completed'|'cancelled';
  items:DecisionPlanItem[];
}


export type ProductionOperationStatus='planned'|'ready'|'in_progress'|'blocked'|'completed'|'skipped';

export interface ProductionOperation {
  id:string;
  projectId:string;
  projectTitle:string;
  queuePosition:number;
  centerKind:WorkCenterKind;
  centerName:string;
  sequence:number;
  status:ProductionOperationStatus;
  assignee?:string;
  plannedStart:string;
  plannedFinish:string;
  plannedHours:number;
  actualStart?:string;
  actualFinish?:string;
  actualHours?:number;
  blockedReason?:string;
  blockedAt?:string;
  sourcePlanGeneratedAt:string;
  updatedAt:string;
}


export type FinanceLedgerEntryType=
  |'revenue_recognition'
  |'operating_expense'
  |'tax'
  |'payroll'
  |'owner_injection'
  |'owner_draw'
  |'adjustment';

export interface FinanceLedgerEntry {
  id:string;
  type:FinanceLedgerEntryType;
  category:string;
  amountMinor:number;
  currency:OpsCurrency;
  effectiveAt:string;
  projectId?:string;
  counterparty?:string;
  note?:string;
  source:'manual'|'project'|'cash_event'|'system';
  sourceId?:string;
  createdBy:string;
  createdAt:string;
}

export interface FinanceSettings {
  id:string;
  currency:OpsCurrency;
  targetGrossMarginPercent:number;
  targetOperatingMarginPercent:number;
  taxReservePercent:number;
  runwaySafetyMonths:number;
  updatedAt:string;
}


export type OfficeChannel='google_ads'|'facebook_ads'|'instagram_ads'|'tiktok_ads'|'instagram_organic'|'facebook_organic'|'tiktok_organic'|'linkedin'|'email'|'website';
export type OfficeApprovalStatus='pending'|'approved'|'rejected'|'executed';
export type OfficeCycleStatus='draft'|'running'|'awaiting_approval'|'completed'|'cancelled';

export interface MaksterOfficeLead {
  id:string;
  name:string;
  company?:string;
  email?:string;
  phone?:string;
  source:OfficeChannel|'referral'|'other';
  country?:string;
  estimatedValueMinor?:number;
  currency:OpsCurrency;
  status:'new'|'contacted'|'qualified'|'measurement_booked'|'proposal'|'negotiation'|'won'|'lost';
  probabilityPercent?:number;
  nextFollowUpAt?:string;
  lostReason?:string;
  actualRevenueMinor?:number;
  actualProfitMinor?:number;
  projectId?:string;
  campaignId?:string;
  providerLeadId?:string;
  landingPage?:string;
  searchTerm?:string;
  owner?:string;
  note?:string;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterOfficeCampaign {
  id:string;
  name:string;
  channel:OfficeChannel;
  objective:'leads'|'traffic'|'awareness'|'remarketing'|'partner_acquisition';
  market:string;
  status:'draft'|'planned'|'active'|'paused'|'completed';
  budgetMinor:number;
  spentMinor:number;
  currency:OpsCurrency;
  impressions:number;
  clicks:number;
  leads:number;
  qualifiedLeads:number;
  wonDeals:number;
  attributedRevenueMinor:number;
  startAt?:string;
  endAt?:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  providerCampaignId?:string;
}

export interface MaksterGrowthConnection {
  id:string;
  provider:'google_ads'|'meta_ads'|'tiktok_ads';
  status:'disconnected'|'configured'|'connected'|'error';
  accountId?:string;
  displayName?:string;
  executorConnectionRef?:string;
  capabilities?:Array<'read_metrics'|'change_budget'|'pause_campaign'|'lead_ingestion'>;
  lastSyncAt?:string;
  lastError?:string;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterGrowthSyncSnapshot {
  id:string;
  provider:'google_ads'|'meta_ads'|'tiktok_ads';
  campaignId?:string;
  providerCampaignId:string;
  capturedAt:string;
  spendMinor:number;
  impressions:number;
  clicks:number;
  leads:number;
  attributedRevenueMinor:number;
  raw?:Record<string,unknown>;
}

export interface MaksterOfficeContentItem {
  id:string;
  channel:OfficeChannel;
  format:'post'|'reel'|'story'|'ad_copy'|'email'|'landing_page'|'video_script'|'case_study';
  title:string;
  body:string;
  status:'draft'|'awaiting_approval'|'approved'|'published'|'rejected';
  campaignId?:string;
  scheduledAt?:string;
  publishedAt?:string;
  createdByAgent:string;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterOfficeApproval {
  id:string;
  kind:'campaign_budget'|'campaign_launch'|'content_publish'|'external_message'|'market_change'|'discount'|'other';
  title:string;
  detail:string;
  amountMinor?:number;
  currency?:OpsCurrency;
  entityType:'campaign'|'content'|'lead'|'cycle'|'other';
  entityId:string;
  status:OfficeApprovalStatus;
  requestedBy:string;
  requestedAt:string;
  decidedBy?:string;
  decidedAt?:string;
  executedAt?:string;
}

export interface MaksterOfficeAgentRun {
  id:string;
  cycleId:string;
  agent:string;
  department:'growth'|'analytics'|'audience'|'creative'|'content'|'ads'|'sales_bridge'|'owner_brief';
  status:'completed'|'failed';
  summary:string;
  output:Record<string,unknown>;
  startedAt:string;
  completedAt:string;
}

export interface MaksterOfficeCycle {
  id:string;
  title:string;
  market:string;
  currency:OpsCurrency;
  monthlyBudgetMinor:number;
  status:OfficeCycleStatus;
  goal:string;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterOfficeOwnerBrief {
  id:string;
  cycleId?:string;
  generatedAt:string;
  headline:string;
  summary:string;
  metrics:{
    activeCampaigns:number;
    spendMinor:number;
    leads:number;
    qualifiedLeads:number;
    wonDeals:number;
    attributedRevenueMinor:number;
    pendingApprovals:number;
  };
  priorities:string[];
  risks:string[];
}


export interface MaksterAutopilotDecision {
  id:string;
  generatedAt:string;
  campaignId:string;
  campaignName:string;
  channel:OfficeChannel;
  action:'scale'|'hold'|'reduce'|'pause';
  confidence:number;
  currentBudgetMinor:number;
  proposedBudgetMinor:number;
  budgetDeltaMinor:number;
  reason:string;
  evidence:{
    spendMinor:number;
    leads:number;
    qualifiedLeads:number;
    wonDeals:number;
    attributedRevenueMinor:number;
    actualProjectRevenueMinor:number;
    actualProjectProfitMinor:number;
    roas:number|null;
    costPerQualifiedLeadMinor:number|null;
    leadQualityPercent:number;
  };
  status:'proposed'|'approved'|'rejected'|'executed';
  approvalId?:string;
  decidedBy?:string;
  decidedAt?:string;
  executedAt?:string;
  executionScope:'internal_plan_only';
  providerExecution:'not_required'|'pending_connection'|'pending_provider_sync'|'executed'|'failed'|'blocked';
}

export interface MaksterAutopilotRun {
  id:string;
  generatedAt:string;
  currency:OpsCurrency;
  mode:'recommend_only';
  decisions:string[];
  summary:{
    scale:number;
    hold:number;
    reduce:number;
    pause:number;
    proposedBudgetBeforeMinor:number;
    proposedBudgetAfterMinor:number;
  };
}


export interface GrowthSpendGuardrail {
  id:string;
  currency:OpsCurrency;
  provider?:'google_ads'|'meta_ads'|'tiktok_ads';
  dailySpendLimitMinor:number;
  monthlySpendLimitMinor:number;
  maxBudgetIncreasePercent:number;
  maxBudgetDecreasePercent:number;
  allowPause:boolean;
  requireOwnerApproval:boolean;
  enabled:boolean;
  updatedAt:string;
}

export interface GrowthProviderExecution {
  id:string;
  decisionId:string;
  approvalId:string;
  campaignId:string;
  provider:'google_ads'|'meta_ads'|'tiktok_ads';
  providerCampaignId:string;
  requestedAction:'scale'|'reduce'|'pause';
  beforeBudgetMinor:number;
  targetBudgetMinor:number;
  currency:OpsCurrency;
  status:'queued'|'blocked'|'executing'|'executed'|'failed'|'provider_not_connected';
  idempotencyKey:string;
  guardrailCheck:{
    allowed:boolean;
    reasons:string[];
    dailyProjectedMinor:number;
    monthlyProjectedMinor:number;
    budgetChangePercent:number;
  };
  requestedBy:string;
  requestedAt:string;
  executedAt?:string;
  providerRequestId?:string;
  providerStatus?:string;
  error?:string;
}

export interface GrowthAuditLogEntry {
  id:string;
  category:'autopilot'|'provider_execution'|'guardrail'|'lead_ingestion'|'connection';
  action:string;
  entityType:'campaign'|'decision'|'lead'|'connection'|'policy';
  entityId:string;
  actor:string;
  status:'info'|'approved'|'blocked'|'executed'|'failed'|'duplicate';
  before?:Record<string,unknown>;
  after?:Record<string,unknown>;
  detail:string;
  provider?:'google_ads'|'meta_ads'|'tiktok_ads';
  createdAt:string;
}

export interface GrowthInboundLeadEvent {
  id:string;
  provider:'google_ads'|'meta_ads'|'tiktok_ads'|'website';
  providerLeadId:string;
  providerCampaignId?:string;
  receivedAt:string;
  status:'ingested'|'duplicate'|'rejected';
  leadId?:string;
  sourceIp?:string;
  signatureVerified:boolean;
  payload:Record<string,unknown>;
  error?:string;
}


export interface MaksterCreativeAsset {
  id:string;
  projectId:string;
  kind:'photo'|'render'|'video'|'document';
  title:string;
  uri?:string;
  tags:string[];
  roomType?:string;
  materialTags:string[];
  approvedForMarketing:boolean;
  hero:boolean;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterContentDraftSet {
  id:string;
  projectId:string;
  generatedAt:string;
  sourceAssetIds:string[];
  items:string[];
  strategy:{
    audience:string;
    angle:string;
    proofPoints:string[];
    channels:OfficeChannel[];
  };
}

export interface MaksterPublishJob {
  id:string;
  contentId:string;
  channel:OfficeChannel;
  status:'draft'|'awaiting_approval'|'approved'|'queued'|'published'|'failed'|'cancelled';
  scheduledAt?:string;
  approvalId?:string;
  providerConnectionId?:string;
  providerPostId?:string;
  providerStatus?:string;
  error?:string;
  createdAt:string;
  updatedAt:string;
}

export interface MaksterContentPerformance {
  id:string;
  contentId:string;
  channel:OfficeChannel;
  capturedAt:string;
  impressions:number;
  views:number;
  clicks:number;
  engagements:number;
  leads:number;
  qualifiedLeads:number;
  attributedRevenueMinor:number;
}

export interface MaksterPilotProject {
  id:string;
  projectId:string;
  title:string;
  startedAt:string;
  status:'active'|'completed'|'blocked'|'removed';
  checkpoints:{
    leadLinked:boolean;
    commercialReady:boolean;
    procurementReady:boolean;
    productionTracked:boolean;
    installationTracked:boolean;
    finalPaymentReady:boolean;
    financeTracked:boolean;
    contentCandidate:boolean;
  };
  blockers:string[];
  score:number;
  updatedAt:string;
}

export interface MaksterPilotRun {
  id:string;
  name:string;
  targetProjectCount:number;
  projectIds:string[];
  status:'draft'|'active'|'completed';
  startedAt:string;
  completedAt?:string;
  createdBy:string;
}


export type MaksterSystemRole=
  |'owner'|'admin'|'sales'|'designer'|'engineer'|'procurement'
  |'production'|'installer'|'finance'|'marketing'|'viewer';

export type MaksterPermission=
  |'projects.read'|'projects.write'|'engineering.write'|'commercial.write'
  |'procurement.write'|'production.write'|'installation.write'
  |'finance.read'|'finance.write'|'marketing.write'
  |'approvals.decide'|'system.admin'|'backup.export'|'backup.restore_validate';

export interface MaksterRolePolicy {
  id:string;
  role:MaksterSystemRole;
  permissions:MaksterPermission[];
  updatedAt:string;
}

export interface MaksterOperationalIncident {
  id:string;
  severity:'critical'|'high'|'medium'|'low';
  component:'api'|'database'|'provider'|'backup'|'auth'|'business_os'|'other';
  code:string;
  message:string;
  status:'open'|'acknowledged'|'resolved';
  firstSeenAt:string;
  lastSeenAt:string;
  resolvedAt?:string;
  details?:Record<string,unknown>;
}

export interface MaksterBackupManifest {
  id:string;
  generatedAt:string;
  mode:'application_export';
  organizationId:string;
  projectCount:number;
  ownerStateVersion:string;
  sha256:string;
  bytes:number;
  containsSecrets:false;
  restorableScope:'projects_and_owner_operations';
  note:string;
}

export interface MaksterReadinessSnapshot {
  id:string;
  generatedAt:string;
  score:number;
  status:'development'|'pilot_ready'|'release_candidate'|'production_ready';
  releaseGateOpen:boolean;
  blockers:string[];
  warnings:string[];
  checks:Array<{
    id:string;
    category:'database'|'auth'|'backup'|'observability'|'pilot'|'integrations'|'security'|'operations';
    label:string;
    status:'pass'|'warn'|'fail';
    detail:string;
    critical:boolean;
  }>;
}

export interface OwnerOperationsState {
  version:'5.6.0';
  warehouseItems:WarehouseItem[];
  warehouseReservations:WarehouseReservation[];
  suppliers:SupplierProfile[];
  supplierQuotes:SupplierQuote[];
  materialRfqs:MaterialProcurementRfq[];
  materialRfqCommunications:MaterialRfqCommunication[];
  procurementAwards:ProcurementAward[];
  productionWorkCenters:ProductionWorkCenter[];
  projectCapacityOverrides:ProjectCapacityOverride[];
  productionTimeEntries:ProductionTimeEntry[];
  treasuryBalances:TreasuryBalance[];
  queuePriorityOverrides:OwnerQueuePriorityOverride[];
  decisionPlans:OwnerDecisionPlan[];
  productionOperations:ProductionOperation[];
  financeLedgerEntries:FinanceLedgerEntry[];
  financeSettings:FinanceSettings[];
  officeLeads:MaksterOfficeLead[];
  officeCampaigns:MaksterOfficeCampaign[];
  officeContent:MaksterOfficeContentItem[];
  officeApprovals:MaksterOfficeApproval[];
  officeAgentRuns:MaksterOfficeAgentRun[];
  officeCycles:MaksterOfficeCycle[];
  officeOwnerBriefs:MaksterOfficeOwnerBrief[];
  growthConnections:MaksterGrowthConnection[];
  growthSyncSnapshots:MaksterGrowthSyncSnapshot[];
  officeAutopilotDecisions:MaksterAutopilotDecision[];
  officeAutopilotRuns:MaksterAutopilotRun[];
  growthSpendGuardrails:GrowthSpendGuardrail[];
  growthProviderExecutions:GrowthProviderExecution[];
  growthAuditLog:GrowthAuditLogEntry[];
  growthInboundLeadEvents:GrowthInboundLeadEvent[];
  creativeAssets:MaksterCreativeAsset[];
  contentDraftSets:MaksterContentDraftSet[];
  publishJobs:MaksterPublishJob[];
  contentPerformance:MaksterContentPerformance[];
  pilotProjects:MaksterPilotProject[];
  pilotRuns:MaksterPilotRun[];
  rolePolicies:MaksterRolePolicy[];
  operationalIncidents:MaksterOperationalIncident[];
  backupManifests:MaksterBackupManifest[];
  readinessSnapshots:MaksterReadinessSnapshot[];
  cashEvents:CashEvent[];
  fixedMonthlyCosts:FixedMonthlyCost[];
  updatedAt:string;
}
