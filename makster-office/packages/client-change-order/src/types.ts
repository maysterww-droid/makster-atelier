import type { BuiltCommercialPackage } from '../../commercial-engine/src/types.js';
import type { ChangeImpactReport, CustomerChangeSummary } from '../../change-intelligence/src/types.js';

export const CLIENT_CHANGE_ORDER_VERSION = '1.8.0' as const;
export type ClientChangeOrderStatus = 'draft'|'sent'|'viewed'|'accepted'|'declined'|'expired'|'superseded';
export type PaymentInstallmentStatus = 'scheduled'|'due'|'paid'|'waived';

export interface PaymentScheduleTemplateItem {
  id: string;
  label: string;
  shareBps: number;
  dueTrigger?: string;
}

export interface ContractPaymentInstallment {
  installmentId: string;
  label: string;
  amountMinor: number;
  status: PaymentInstallmentStatus;
  dueTrigger?: string;
  paidAt?: string;
  paidAmountMinor?: number;
}

export interface ProjectCommercialContract {
  contractId: string;
  projectId: string;
  organizationId?: string;
  currency: string;
  status: 'active'|'completed'|'cancelled';
  initialRevision: number;
  initialQuoteId: string;
  currentRevision: number;
  currentQuoteId: string;
  agreedAmountMinor: number;
  paymentTemplate: PaymentScheduleTemplateItem[];
  paymentSchedule: ContractPaymentInstallment[];
  updatedAt: string;
  fingerprintSha256: string;
}

export interface ClientChangeOrderBinding {
  projectId: string;
  fromRevision: number;
  toRevision: number;
  baseQuoteId: string;
  newQuoteId: string;
  baseQuoteFingerprintSha256: string;
  newQuoteFingerprintSha256: string;
  changeReportId: string;
  changeReportFingerprintSha256: string;
  currency: string;
  previousTotalMinor: number;
  newTotalMinor: number;
  deltaMinor: number;
}

export interface ClientChangeOrder {
  changeOrderVersion: typeof CLIENT_CHANGE_ORDER_VERSION;
  changeOrderId: string;
  publicReference: string;
  status: ClientChangeOrderStatus;
  binding: ClientChangeOrderBinding;
  summary: CustomerChangeSummary;
  createdAt: string;
  validUntil?: string;
  sentAt?: string;
  viewedAt?: string;
  decidedAt?: string;
  declinedReason?: string;
  approvalTokenHashSha256?: string;
  decision?: {
    decision: 'accepted'|'declined';
    clientName: string;
    clientEmail?: string;
    userAgent?: string;
    ipHashSha256?: string;
    acceptanceFingerprintSha256: string;
  };
}

export interface ClientRevisionAuthorization {
  authorizationId: string;
  projectId: string;
  revision: number;
  quoteId: string;
  changeOrderId: string;
  contractId: string;
  acceptedAt: string;
  agreedAmountMinor: number;
  currency: string;
  authorizationFingerprintSha256: string;
}

export interface CreateChangeOrderInput {
  baseQuote: BuiltCommercialPackage;
  newQuote: BuiltCommercialPackage;
  report: ChangeImpactReport;
  summary: CustomerChangeSummary;
  changeOrderId?: string;
  publicReference?: string;
  createdAt?: string;
  validUntil?: string;
}
