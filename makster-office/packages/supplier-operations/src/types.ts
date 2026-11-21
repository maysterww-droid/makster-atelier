import type { BuiltProductionPack, OutsourcePreset, ProductionService } from '../../production-pack/src/types.js';

export const SUPPLIER_OPERATIONS_VERSION = '1.1.0' as const;

export type SupplierOrderStatus = 'draft' | 'sent' | 'accepted' | 'in_production' | 'ready' | 'partially_received' | 'received' | 'cancelled';
export type ReceiptDisposition = 'accepted' | 'damaged' | 'missing' | 'wrong_size' | 'wrong_material' | 'wrong_edge' | 'wrong_drilling' | 'other';
export type ReworkReason = Exclude<ReceiptDisposition, 'accepted'>;

export interface SupplierIdentity {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  externalReference?: string;
}

export interface SupplierOrderLine {
  lineId: string;
  partId: string;
  partName: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  material: string;
  services: ProductionService[];
  labelPrefix: string;
}

export interface SupplierOrder {
  orderVersion: typeof SUPPLIER_OPERATIONS_VERSION;
  orderId: string;
  projectId: string;
  revision: number;
  productionPackId: string;
  productionPackManifestSha256: string;
  outsourcePreset: OutsourcePreset;
  supplier: SupplierIdentity;
  currency: string;
  quotedPrice?: number;
  promisedAt?: string;
  supplierReference?: string;
  status: SupplierOrderStatus;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  readyAt?: string;
  receivedAt?: string;
  notes?: string;
  lines: SupplierOrderLine[];
}

export interface SupplierStatusUpdate {
  status: SupplierOrderStatus;
  at?: string;
  quotedPrice?: number;
  promisedAt?: string;
  supplierReference?: string;
  note?: string;
}

export interface ReceiptLineInput {
  partId: string;
  quantity: number;
  disposition: ReceiptDisposition;
  note?: string;
  photoFileIds?: string[];
}

export interface SupplierReceipt {
  receiptId: string;
  orderId: string;
  receivedAt: string;
  receivedBy: string;
  lines: ReceiptLineInput[];
  note?: string;
}

export interface PartReceivingBalance {
  partId: string;
  partName: string;
  ordered: number;
  accepted: number;
  damaged: number;
  missing: number;
  rejectedOther: number;
  outstanding: number;
  complete: boolean;
}

export interface ReceivingSummary {
  orderId: string;
  status: SupplierOrderStatus;
  totalOrdered: number;
  totalAccepted: number;
  totalProblem: number;
  totalOutstanding: number;
  complete: boolean;
  balances: PartReceivingBalance[];
}

export interface ReworkLine {
  partId: string;
  partName: string;
  quantity: number;
  reasons: ReworkReason[];
}

export interface ReworkPack {
  reworkVersion: typeof SUPPLIER_OPERATIONS_VERSION;
  reworkId: string;
  sourceOrderId: string;
  projectId: string;
  revision: number;
  generatedAt: string;
  supplier: SupplierIdentity;
  lines: ReworkLine[];
  ready: boolean;
}

export interface CreateSupplierOrderInput {
  pack: BuiltProductionPack;
  supplier: SupplierIdentity;
  currency: string;
  quotedPrice?: number;
  promisedAt?: string;
  supplierReference?: string;
  notes?: string;
  orderId?: string;
  createdAt?: string;
}
