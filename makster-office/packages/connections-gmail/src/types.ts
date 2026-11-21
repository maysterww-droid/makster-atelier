export const GMAIL_CONNECTIONS_VERSION = '1.5.0' as const;

export const MAKSTER_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

export type GmailConnectionStatus = 'pending' | 'connected' | 'reauth_required' | 'revoked' | 'error';
export type GmailSyncStatus = 'idle' | 'syncing' | 'error';
export type GmailSyncMode = 'history' | 'full';

export interface EncryptedSecretV1 {
  version: 1;
  algorithm: 'AES-256-GCM';
  keyVersion: string;
  ivB64: string;
  ciphertextB64: string;
  authTagB64: string;
}

export interface GmailConnectionRecord {
  connectionVersion: typeof GMAIL_CONNECTIONS_VERSION;
  connectionId: string;
  organizationId: string;
  provider: 'gmail';
  accountEmail: string;
  scopes: string[];
  status: GmailConnectionStatus;
  createdAt: string;
  connectedAt?: string;
  updatedAt: string;
  lastError?: string;
}

export interface GmailConnectionSecretRecord {
  connectionId: string;
  refreshToken: EncryptedSecretV1;
  refreshTokenFingerprintSha256: string;
  tokenUpdatedAt: string;
}

export interface GmailSyncCursor {
  connectionVersion: typeof GMAIL_CONNECTIONS_VERSION;
  connectionId: string;
  historyId?: string;
  watchExpirationAt?: string;
  watchTopic?: string;
  lastWatchRenewAt?: string;
  syncStatus: GmailSyncStatus;
  lastSyncAt?: string;
  lastFullSyncAt?: string;
  lastError?: string;
  updatedAt: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleOAuthTokenResponse {
  accessToken: string;
  expiresIn: number;
  scope?: string;
  tokenType: string;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
}

export interface GmailProfile {
  emailAddress: string;
  historyId: string;
  messagesTotal?: number;
  threadsTotal?: number;
}

export interface GmailWatchResult {
  historyId: string;
  expiration: string;
}

export interface GmailMessageEnvelope {
  id: string;
  threadId: string;
  historyId?: string;
  internalDate?: string;
  from: string;
  to?: string;
  subject: string;
  rfcMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  text: string;
  snippet?: string;
}

export interface GmailHistoryPage {
  historyId: string;
  messageIds: string[];
  nextPageToken?: string;
}

export interface GmailListMessagesPage {
  messageIds: string[];
  nextPageToken?: string;
}

export interface GmailMatchedInbound {
  message: GmailMessageEnvelope;
  communicationThreadId: string;
  supplierId: string;
  matchReason: 'provider_thread' | 'in_reply_to' | 'references' | 'supplier_subject';
}

export interface GmailSyncResult {
  connectionVersion: typeof GMAIL_CONNECTIONS_VERSION;
  connectionId: string;
  mode: GmailSyncMode;
  startHistoryId?: string;
  endHistoryId: string;
  fetchedMessageCount: number;
  matchedInbound: GmailMatchedInbound[];
  ignoredMessageIds: string[];
  duplicateMessageIds: string[];
  fullSyncReason?: 'initial_sync' | 'stale_history';
  syncedAt: string;
}

export interface GmailPushSignal {
  emailAddress: string;
  historyId: string;
}

export interface OAuthStatePayload {
  organizationId: string;
  returnUrl: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface GmailConnectionStore {
  saveConnection(connection: GmailConnectionRecord, secret: GmailConnectionSecretRecord): Promise<void>;
  getConnection(connectionId: string): Promise<GmailConnectionRecord | null>;
  listConnections(organizationId?: string): Promise<GmailConnectionRecord[]>;
  getSecret(connectionId: string): Promise<GmailConnectionSecretRecord | null>;
  updateConnection(connection: GmailConnectionRecord): Promise<void>;
  getCursor(connectionId: string): Promise<GmailSyncCursor | null>;
  saveCursor(cursor: GmailSyncCursor): Promise<void>;
}
