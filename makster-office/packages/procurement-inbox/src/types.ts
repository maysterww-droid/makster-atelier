import type { GmailConnectionRecord, GmailSyncCursor } from '../../connections-gmail/src/types.js';
import type { SupplierCommunicationMessage, SupplierCommunicationThread } from '../../supplier-communication/src/types.js';
import type { SupplierQuote } from '../../procurement-intelligence/src/types.js';

export const PROCUREMENT_INBOX_VERSION = '1.5.0' as const;

export type ProcurementInboxKind = 'new_quote' | 'needs_review' | 'decline' | 'connection_alert';
export type ProcurementInboxSeverity = 'info' | 'warning' | 'critical';
export type ProcurementInboxDisposition = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface ProcurementInboxItem {
  inboxVersion: typeof PROCUREMENT_INBOX_VERSION;
  itemId: string;
  organizationId: string;
  kind: ProcurementInboxKind;
  severity: ProcurementInboxSeverity;
  disposition: ProcurementInboxDisposition;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  revision?: number;
  rfqId?: string;
  supplierId?: string;
  supplierName?: string;
  threadId?: string;
  sourceMessageId?: string;
  providerMessageId?: string;
  connectionId?: string;
  quoteId?: string;
  actionCode?: string;
  sourceKey: string;
}

export type GmailConnectionHealthState =
  | 'healthy'
  | 'sync_due'
  | 'watch_renew_due'
  | 'watch_missing'
  | 'watch_expiring'
  | 'reauth_required'
  | 'error'
  | 'revoked';

export interface GmailConnectionHealth {
  inboxVersion: typeof PROCUREMENT_INBOX_VERSION;
  connectionId: string;
  organizationId: string;
  accountEmail: string;
  state: GmailConnectionHealthState;
  severity: ProcurementInboxSeverity;
  syncDue: boolean;
  watchRenewDue: boolean;
  watchExpiresInMinutes?: number;
  lastSyncAt?: string;
  lastWatchRenewAt?: string;
  actionCode?: 'sync_now' | 'renew_watch' | 'reauthorize' | 'inspect_error' | 'reconnect';
  reason: string;
  evaluatedAt: string;
}

export interface InboxSourceContext {
  organizationId: string;
  threads: SupplierCommunicationThread[];
  messagesByThread: Map<string, SupplierCommunicationMessage[]>;
  quotesByRfq: Map<string, SupplierQuote[]>;
  connections: Array<{ connection: GmailConnectionRecord; cursor: GmailSyncCursor | null }>;
  dispositions?: Map<string, ProcurementInboxDisposition>;
  now?: string;
}

export interface ProcurementInboxSummary {
  inboxVersion: typeof PROCUREMENT_INBOX_VERSION;
  generatedAt: string;
  total: number;
  newCount: number;
  quoteCount: number;
  needsReviewCount: number;
  declineCount: number;
  criticalCount: number;
  items: ProcurementInboxItem[];
  connectionHealth: GmailConnectionHealth[];
}

export interface OwnerNotification {
  inboxVersion: typeof PROCUREMENT_INBOX_VERSION;
  notificationId: string;
  organizationId: string;
  severity: ProcurementInboxSeverity;
  title: string;
  body: string;
  relatedItemId: string;
  createdAt: string;
  readAt?: string;
}
