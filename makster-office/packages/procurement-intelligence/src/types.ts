import type { BuiltProductionPack, ProductionService, OutsourcePreset } from '../../production-pack/src/types.js';
import type { SupplierIdentity, SupplierOrder, SupplierReceipt } from '../../supplier-operations/src/types.js';

export const PROCUREMENT_INTELLIGENCE_VERSION = '1.2.0' as const;

export type ProcurementStrategy = 'balanced' | 'cheapest' | 'fastest' | 'quality_first';
export type SupplierQuoteStatus = 'draft' | 'submitted' | 'declined' | 'expired' | 'awarded' | 'not_selected';

export interface SupplierCapabilityProfile extends SupplierIdentity {
  active: boolean;
  currencies: string[];
  services: ProductionService[];
  deliveryModes: Array<'pickup' | 'supplier_delivery' | 'carrier'>;
  minimumOrder?: number;
  typicalLeadDays?: number;
  notes?: string;
}

export interface SupplierPerformanceSnapshot {
  supplierId: string;
  completedOrders: number;
  onTimeOrders: number;
  receivedUnits: number;
  problemUnits: number;
  reworkOrders: number;
  onTimeRate: number;
  problemRate: number;
  reworkRate: number;
  qualityScore: number;
}

export interface SupplierRfq {
  procurementVersion: typeof PROCUREMENT_INTELLIGENCE_VERSION;
  rfqId: string;
  projectId: string;
  revision: number;
  productionPackId: string;
  productionPackManifestSha256: string;
  outsourcePreset: OutsourcePreset;
  services: ProductionService[];
  currency: string;
  invitedSupplierIds: string[];
  requestedAt: string;
  responseDeadline?: string;
  deliveryRequired: boolean;
  notes?: string;
}

export interface SupplierQuote {
  procurementVersion: typeof PROCUREMENT_INTELLIGENCE_VERSION;
  quoteId: string;
  rfqId: string;
  supplierId: string;
  status: SupplierQuoteStatus;
  currency: string;
  basePrice: number;
  deliveryPrice: number;
  totalPrice: number;
  leadDays: number;
  promisedAt?: string;
  validUntil?: string;
  services: ProductionService[];
  deliveryMode: 'pickup' | 'supplier_delivery' | 'carrier';
  exclusions?: string[];
  note?: string;
  submittedAt: string;
}

export interface ProcurementScoreWeights {
  price: number;
  leadTime: number;
  quality: number;
  serviceFit: number;
  logistics: number;
}

export interface ProcurementQuoteScore {
  quoteId: string;
  supplierId: string;
  supplierName: string;
  strategy: ProcurementStrategy;
  totalScore: number;
  components: {
    price: number;
    leadTime: number;
    quality: number;
    serviceFit: number;
    logistics: number;
  };
  facts: {
    totalPrice: number;
    leadDays: number;
    qualityScore: number;
    completedOrders: number;
    servicesMatched: number;
    servicesRequired: number;
    deliveryMode: SupplierQuote['deliveryMode'];
  };
  warnings: string[];
  eligible: boolean;
}

export interface ProcurementComparison {
  procurementVersion: typeof PROCUREMENT_INTELLIGENCE_VERSION;
  comparisonId: string;
  rfqId: string;
  strategy: ProcurementStrategy;
  weights: ProcurementScoreWeights;
  generatedAt: string;
  ranking: ProcurementQuoteScore[];
  recommendedQuoteId?: string;
}

export interface CreateRfqInput {
  pack: BuiltProductionPack;
  suppliers: SupplierCapabilityProfile[];
  currency: string;
  deliveryRequired?: boolean;
  responseDeadline?: string;
  notes?: string;
  rfqId?: string;
  requestedAt?: string;
}

export interface AwardQuoteInput {
  pack: BuiltProductionPack;
  rfq: SupplierRfq;
  quote: SupplierQuote;
  supplier: SupplierCapabilityProfile;
  orderId?: string;
  createdAt?: string;
}

export interface SupplierHistoryInput {
  supplierId: string;
  orders: SupplierOrder[];
  receiptsByOrder: Map<string, SupplierReceipt[]>;
}
