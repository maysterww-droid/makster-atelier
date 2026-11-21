import type { SupplierQuote, SupplierRfq, SupplierCapabilityProfile } from '../../procurement-intelligence/src/types.js';

export const SUPPLIER_COMMUNICATION_VERSION = '1.3.0' as const;

export type CommunicationProviderKind = 'memory' | 'gmail';
export type CommunicationThreadStatus = 'draft' | 'sent' | 'replied' | 'declined' | 'closed';
export type CommunicationDirection = 'outbound' | 'inbound';
export type CommunicationMessageKind = 'rfq_invitation' | 'reminder' | 'supplier_reply' | 'quote_received' | 'decline' | 'system';
export type CommunicationMessageStatus = 'draft' | 'sent' | 'received' | 'failed';
export type SupplierReplyClassification = 'quote_candidate' | 'declined' | 'needs_review';

export interface SupplierCommunicationRecipient {
  supplierId: string;
  supplierName: string;
  email: string;
  language?: 'en' | 'cs' | 'de' | 'pl';
}

export interface SupplierCommunicationThread {
  communicationVersion: typeof SUPPLIER_COMMUNICATION_VERSION;
  threadId: string;
  rfqId: string;
  projectId: string;
  revision: number;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  provider: CommunicationProviderKind;
  providerAccountRef?: string;
  status: CommunicationThreadStatus;
  subject: string;
  responseToken: string;
  providerThreadId?: string;
  providerRootRfcMessageId?: string;
  responseDeadline?: string;
  createdAt: string;
  lastOutboundAt?: string;
  lastInboundAt?: string;
  reminderCount: number;
}

export interface SupplierCommunicationMessage {
  communicationVersion: typeof SUPPLIER_COMMUNICATION_VERSION;
  messageId: string;
  threadId: string;
  direction: CommunicationDirection;
  kind: CommunicationMessageKind;
  status: CommunicationMessageStatus;
  subject: string;
  bodyText: string;
  payloadSha256: string;
  providerMessageId?: string;
  providerThreadId?: string;
  inReplyToRfcMessageId?: string;
  sentAt?: string;
  receivedAt?: string;
  error?: string;
}

export interface OutboundEmailAttachment {
  filename: string;
  contentType: string;
  content: string | Uint8Array;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  messageIdHeader?: string;
  attachments?: OutboundEmailAttachment[];
}

export interface ProviderSendResult {
  provider: CommunicationProviderKind;
  providerAccountRef?: string;
  messageId: string;
  threadId?: string;
  rfcMessageId?: string;
  sentAt: string;
}

export interface CommunicationProvider {
  readonly kind: CommunicationProviderKind;
  send(email: OutboundEmail): Promise<ProviderSendResult>;
}

export interface RfqInvitationDraft {
  recipient: SupplierCommunicationRecipient;
  subject: string;
  bodyText: string;
  responseToken: string;
}

export interface ParsedSupplierReply {
  communicationVersion: typeof SUPPLIER_COMMUNICATION_VERSION;
  classification: SupplierReplyClassification;
  rfqId?: string;
  supplierId?: string;
  responseToken?: string;
  quote?: SupplierQuote;
  missingFields: string[];
  warnings: string[];
  rawTextSha256: string;
}

export interface ImportSupplierReplyInput {
  rfq: SupplierRfq;
  supplier: SupplierCapabilityProfile;
  text: string;
  fromEmail: string;
  receivedAt?: string;
  quoteId?: string;
}

export interface ReminderPolicy {
  firstReminderAfterHours: number;
  repeatEveryHours: number;
  maxReminders: number;
}

export interface ReminderCandidate {
  threadId: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  reminderNumber: number;
  dueAt: string;
}
