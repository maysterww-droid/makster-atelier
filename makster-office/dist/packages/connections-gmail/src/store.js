export class MemoryGmailConnectionStore {
    connections = new Map();
    secrets = new Map();
    cursors = new Map();
    async saveConnection(connection, secret) { this.connections.set(connection.connectionId, structuredClone(connection)); this.secrets.set(connection.connectionId, structuredClone(secret)); }
    async getConnection(id) { const v = this.connections.get(id); return v ? structuredClone(v) : null; }
    async listConnections(organizationId) { return [...this.connections.values()].filter(c => !organizationId || c.organizationId === organizationId).map(c => structuredClone(c)); }
    async getSecret(id) { const v = this.secrets.get(id); return v ? structuredClone(v) : null; }
    async updateConnection(c) { if (!this.connections.has(c.connectionId))
        throw new Error('gmail_connection_not_found'); this.connections.set(c.connectionId, structuredClone(c)); }
    async getCursor(id) { const v = this.cursors.get(id); return v ? structuredClone(v) : null; }
    async saveCursor(c) { this.cursors.set(c.connectionId, structuredClone(c)); }
}
export class SupabaseGmailConnectionStore {
    options;
    constructor(options) {
        this.options = options;
        if (!options.url || !options.secretKey)
            throw new Error('supabase_connection_store_config_required');
    }
    headers(extra = {}) { const h = { apikey: this.options.secretKey, 'content-type': 'application/json', ...extra }; if (!this.options.secretKey.startsWith('sb_secret_'))
        h.authorization = `Bearer ${this.options.secretKey}`; return h; }
    async request(path, init = {}) { const r = await fetch(`${this.options.url}/rest/v1/${path}`, { ...init, headers: this.headers(init.headers) }); const t = await r.text(); if (!r.ok)
        throw new Error(`supabase_connection_store_${r.status}:${t}`); return t ? JSON.parse(t) : undefined; }
    async saveConnection(c, s) {
        await this.request('organization_connections?on_conflict=id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: c.connectionId, organization_id: c.organizationId, provider: 'gmail', account_email: c.accountEmail, scopes: c.scopes, status: c.status, connected_at: c.connectedAt ?? null, last_error: c.lastError ?? null, updated_at: c.updatedAt }) });
        await this.request('organization_connection_secrets?on_conflict=connection_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ connection_id: s.connectionId, encrypted_refresh_token: s.refreshToken, refresh_token_fingerprint_sha256: s.refreshTokenFingerprintSha256, token_updated_at: s.tokenUpdatedAt }) });
    }
    async getConnection(id) { const rows = await this.request(`organization_connections?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' }); return rows[0] ? this.mapConnection(rows[0]) : null; }
    async listConnections(org) { const q = org ? `?organization_id=eq.${encodeURIComponent(org)}&select=*` : '?select=*'; const rows = await this.request(`organization_connections${q}`, { method: 'GET' }); return rows.map(r => this.mapConnection(r)); }
    async getSecret(id) { const rows = await this.request(`organization_connection_secrets?connection_id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' }); const r = rows[0]; return r ? { connectionId: r.connection_id, refreshToken: r.encrypted_refresh_token, refreshTokenFingerprintSha256: r.refresh_token_fingerprint_sha256, tokenUpdatedAt: r.token_updated_at } : null; }
    async updateConnection(c) { const body = { account_email: c.accountEmail, scopes: c.scopes, status: c.status, connected_at: c.connectedAt ?? null, last_error: c.lastError ?? null, updated_at: c.updatedAt }; await this.request(`organization_connections?id=eq.${encodeURIComponent(c.connectionId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(body) }); }
    async getCursor(id) { const rows = await this.request(`gmail_sync_cursors?connection_id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' }); const r = rows[0]; return r ? { connectionVersion: '1.5.0', connectionId: r.connection_id, ...(r.history_id ? { historyId: r.history_id } : {}), ...(r.watch_expiration_at ? { watchExpirationAt: r.watch_expiration_at } : {}), ...(r.watch_topic ? { watchTopic: r.watch_topic } : {}), ...(r.last_watch_renew_at ? { lastWatchRenewAt: r.last_watch_renew_at } : {}), syncStatus: r.sync_status, ...(r.last_sync_at ? { lastSyncAt: r.last_sync_at } : {}), ...(r.last_full_sync_at ? { lastFullSyncAt: r.last_full_sync_at } : {}), ...(r.last_error ? { lastError: r.last_error } : {}), updatedAt: r.updated_at } : null; }
    async saveCursor(c) { await this.request('gmail_sync_cursors?on_conflict=connection_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ connection_id: c.connectionId, history_id: c.historyId ?? null, watch_expiration_at: c.watchExpirationAt ?? null, watch_topic: c.watchTopic ?? null, last_watch_renew_at: c.lastWatchRenewAt ?? null, sync_status: c.syncStatus, last_sync_at: c.lastSyncAt ?? null, last_full_sync_at: c.lastFullSyncAt ?? null, last_error: c.lastError ?? null, updated_at: c.updatedAt }) }); }
    mapConnection(r) { return { connectionVersion: '1.5.0', connectionId: r.id, organizationId: r.organization_id, provider: 'gmail', accountEmail: r.account_email, scopes: r.scopes ?? [], status: r.status, createdAt: r.created_at, ...(r.connected_at ? { connectedAt: r.connected_at } : {}), updatedAt: r.updated_at, ...(r.last_error ? { lastError: r.last_error } : {}) }; }
}
