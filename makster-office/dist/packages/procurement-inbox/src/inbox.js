import { createHash } from 'node:crypto';
import { PROCUREMENT_INBOX_VERSION } from './types.js';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
function dt(value) { if (!value)
    return undefined; const n = Date.parse(value); return Number.isFinite(n) ? n : undefined; }
function stableId(...parts) { return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24); }
export function assessGmailConnectionHealth(input) {
    const now = input.now ?? new Date().toISOString();
    const nowMs = Date.parse(now);
    const c = input.connection;
    const cursor = input.cursor;
    const base = { inboxVersion: PROCUREMENT_INBOX_VERSION, connectionId: c.connectionId, organizationId: c.organizationId, accountEmail: c.accountEmail, evaluatedAt: now };
    if (c.status === 'reauth_required')
        return { ...base, state: 'reauth_required', severity: 'critical', syncDue: false, watchRenewDue: false, actionCode: 'reauthorize', reason: c.lastError ?? 'Gmail authorization must be renewed' };
    if (c.status === 'error')
        return { ...base, state: 'error', severity: 'critical', syncDue: false, watchRenewDue: false, actionCode: 'inspect_error', reason: c.lastError ?? 'Gmail connection error' };
    if (c.status === 'revoked')
        return { ...base, state: 'revoked', severity: 'warning', syncDue: false, watchRenewDue: false, actionCode: 'reconnect', reason: 'Gmail connection is disconnected' };
    const lastSync = dt(cursor?.lastSyncAt);
    const lastWatch = dt(cursor?.lastWatchRenewAt);
    const watchExp = dt(cursor?.watchExpirationAt);
    const syncDue = !lastSync || nowMs - lastSync >= DAY_MS;
    const watchRenewDue = !lastWatch || nowMs - lastWatch >= DAY_MS;
    const expMinutes = watchExp === undefined ? undefined : Math.floor((watchExp - nowMs) / 60000);
    const common = { ...base, syncDue, watchRenewDue, ...(cursor?.lastSyncAt ? { lastSyncAt: cursor.lastSyncAt } : {}), ...(cursor?.lastWatchRenewAt ? { lastWatchRenewAt: cursor.lastWatchRenewAt } : {}), ...(expMinutes !== undefined ? { watchExpiresInMinutes: expMinutes } : {}) };
    if (!cursor?.watchTopic || !watchExp)
        return { ...common, state: 'watch_missing', severity: 'warning', watchRenewDue: true, actionCode: 'renew_watch', reason: 'Gmail push watch is not configured' };
    if (watchExp <= nowMs + HOUR_MS)
        return { ...common, state: 'watch_expiring', severity: 'critical', watchRenewDue: true, actionCode: 'renew_watch', reason: 'Gmail push watch is expired or expires within one hour' };
    if (watchRenewDue)
        return { ...common, state: 'watch_renew_due', severity: 'warning', actionCode: 'renew_watch', reason: 'Daily Gmail watch renewal is due' };
    if (syncDue)
        return { ...common, state: 'sync_due', severity: 'warning', actionCode: 'sync_now', reason: 'Daily safety sync is due' };
    return { ...common, state: 'healthy', severity: 'info', reason: 'Gmail connection is healthy' };
}
function dispositionFor(sourceId, map) { return map?.get(sourceId) ?? 'new'; }
export function buildProcurementInbox(input) {
    const now = input.now ?? new Date().toISOString();
    const items = [];
    for (const thread of input.threads) {
        const messages = input.messagesByThread.get(thread.threadId) ?? [];
        for (const msg of messages) {
            if (msg.direction !== 'inbound')
                continue;
            let kind = null;
            let severity = 'info';
            let title = '';
            let summary = '';
            let quoteId;
            if (msg.kind === 'quote_received') {
                kind = 'new_quote';
                title = `Новое предложение · ${thread.supplierName}`;
                const quote = (input.quotesByRfq.get(thread.rfqId) ?? []).find(q => q.supplierId === thread.supplierId);
                quoteId = quote?.quoteId;
                summary = quote ? `${quote.totalPrice} ${quote.currency} · ${quote.leadDays} дн.` : 'Структурированное предложение получено';
            }
            else if (msg.kind === 'decline') {
                kind = 'decline';
                severity = 'warning';
                title = `Отказ · ${thread.supplierName}`;
                summary = 'Поставщик отказался от RFQ';
            }
            else if (msg.kind === 'supplier_reply') {
                kind = 'needs_review';
                severity = 'warning';
                title = `Требует проверки · ${thread.supplierName}`;
                summary = msg.bodyText.replace(/\s+/g, ' ').trim().slice(0, 180) || 'Свободный ответ поставщика';
            }
            if (!kind)
                continue;
            const sourceId = msg.messageId;
            items.push({ inboxVersion: PROCUREMENT_INBOX_VERSION, itemId: `msg_${stableId(sourceId)}`, sourceKey: sourceId, organizationId: input.organizationId, kind, severity, disposition: dispositionFor(sourceId, input.dispositions), title, summary, createdAt: msg.receivedAt ?? thread.lastInboundAt ?? thread.createdAt, updatedAt: now, projectId: thread.projectId, revision: thread.revision, rfqId: thread.rfqId, supplierId: thread.supplierId, supplierName: thread.supplierName, threadId: thread.threadId, sourceMessageId: sourceId, ...(msg.providerMessageId ? { providerMessageId: msg.providerMessageId } : {}), ...(quoteId ? { quoteId } : {}) });
        }
    }
    const connectionHealth = input.connections.map(x => assessGmailConnectionHealth({ connection: x.connection, cursor: x.cursor, now }));
    for (const h of connectionHealth) {
        if (h.state === 'healthy')
            continue;
        const source = `connection:${h.connectionId}:${h.state}`;
        items.push({ inboxVersion: PROCUREMENT_INBOX_VERSION, itemId: `conn_${stableId(source)}`, sourceKey: source, organizationId: input.organizationId, kind: 'connection_alert', severity: h.severity, disposition: dispositionFor(source, input.dispositions), title: `Gmail · ${h.accountEmail}`, summary: h.reason, createdAt: now, updatedAt: now, connectionId: h.connectionId, ...(h.actionCode ? { actionCode: h.actionCode } : {}) });
    }
    const order = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => order[a.severity] - order[b.severity] || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { inboxVersion: PROCUREMENT_INBOX_VERSION, generatedAt: now, total: items.length, newCount: items.filter(i => i.disposition === 'new').length, quoteCount: items.filter(i => i.kind === 'new_quote').length, needsReviewCount: items.filter(i => i.kind === 'needs_review').length, declineCount: items.filter(i => i.kind === 'decline').length, criticalCount: items.filter(i => i.severity === 'critical').length, items, connectionHealth };
}
export function updateInboxDisposition(map, sourceKey, disposition) { map.set(sourceKey, disposition); }
export function ownerNotificationsFromInbox(summary) {
    return summary.items.filter(i => i.disposition === 'new' && (i.severity === 'critical' || i.kind === 'needs_review' || i.kind === 'new_quote' || i.kind === 'decline')).map(i => ({
        inboxVersion: PROCUREMENT_INBOX_VERSION,
        notificationId: `notif_${stableId(i.itemId, i.kind)}`,
        organizationId: i.organizationId,
        severity: i.severity,
        title: i.title,
        body: i.summary,
        relatedItemId: i.itemId,
        createdAt: summary.generatedAt,
    }));
}
