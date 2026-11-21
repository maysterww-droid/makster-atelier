import test from 'node:test';
import assert from 'node:assert/strict';
import { assessGmailConnectionHealth, buildProcurementInbox, ownerNotificationsFromInbox, updateInboxDisposition } from '../packages/procurement-inbox/src/index.js';
const connection = { connectionVersion: '1.5.0', connectionId: 'c1', organizationId: 'org1', provider: 'gmail', accountEmail: 'owner@example.com', scopes: ['gmail'], status: 'connected', createdAt: '2026-09-01T10:00:00Z', connectedAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-03T10:00:00Z' };
const thread = { communicationVersion: '1.3.0', threadId: 't1', rfqId: 'rfq1', projectId: 'p1', revision: 3, supplierId: 's1', supplierName: 'Supplier One', supplierEmail: 'supplier@example.com', provider: 'gmail', providerAccountRef: 'c1', status: 'replied', subject: 'RFQ 1', responseToken: 'token', createdAt: '2026-09-03T10:00:00Z', lastInboundAt: '2026-09-03T12:00:00Z', reminderCount: 0 };
function msg(messageId, kind, body = 'hello') { return { communicationVersion: '1.3.0', messageId, threadId: 't1', direction: 'inbound', kind, status: 'received', subject: 'Re: RFQ 1', bodyText: body, payloadSha256: 'a'.repeat(64), receivedAt: '2026-09-03T12:00:00Z' }; }
test('healthy Gmail connection has no alert and daily operations are not due', () => {
    const cursor = { connectionVersion: '1.5.0', connectionId: 'c1', historyId: '10', watchTopic: 'projects/x/topics/y', watchExpirationAt: '2026-09-09T10:00:00Z', lastWatchRenewAt: '2026-09-03T08:00:00Z', lastSyncAt: '2026-09-03T09:00:00Z', syncStatus: 'idle', updatedAt: '2026-09-03T09:00:00Z' };
    const h = assessGmailConnectionHealth({ connection, cursor, now: '2026-09-03T12:00:00Z' });
    assert.equal(h.state, 'healthy');
    assert.equal(h.syncDue, false);
    assert.equal(h.watchRenewDue, false);
});
test('daily Gmail operations become due after 24h and watch expiry becomes critical', () => {
    const cursor = { connectionVersion: '1.5.0', connectionId: 'c1', historyId: '10', watchTopic: 'projects/x/topics/y', watchExpirationAt: '2026-09-03T12:30:00Z', lastWatchRenewAt: '2026-09-02T08:00:00Z', lastSyncAt: '2026-09-02T09:00:00Z', syncStatus: 'idle', updatedAt: '2026-09-02T09:00:00Z' };
    const h = assessGmailConnectionHealth({ connection, cursor, now: '2026-09-03T12:00:00Z' });
    assert.equal(h.state, 'watch_expiring');
    assert.equal(h.severity, 'critical');
    assert.equal(h.syncDue, true);
    assert.equal(h.watchRenewDue, true);
});
test('reauth required becomes critical owner-facing connection alert', () => {
    const h = assessGmailConnectionHealth({ connection: { ...connection, status: 'reauth_required', lastError: 'invalid_grant' }, cursor: null, now: '2026-09-03T12:00:00Z' });
    assert.equal(h.state, 'reauth_required');
    assert.equal(h.actionCode, 'reauthorize');
    assert.equal(h.severity, 'critical');
});
test('procurement inbox merges quote, Needs Review, decline and connection health with deterministic disposition', () => {
    const messages = new Map([['t1', [msg('m1', 'quote_received'), msg('m2', 'supplier_reply', 'about 400 next week'), msg('m3', 'decline')]]]);
    const quote = { procurementVersion: '1.2.0', quoteId: 'q1', rfqId: 'rfq1', supplierId: 's1', status: 'submitted', currency: 'EUR', basePrice: 410, deliveryPrice: 18, totalPrice: 428, leadDays: 5, deliveryMode: 'supplier_delivery', services: ['cutting', 'edging'], submittedAt: '2026-09-03T12:00:00Z' };
    const cursor = { connectionVersion: '1.5.0', connectionId: 'c1', historyId: '10', syncStatus: 'idle', updatedAt: '2026-09-01T00:00:00Z' };
    const dispositions = new Map();
    updateInboxDisposition(dispositions, 'm1', 'acknowledged');
    const inbox = buildProcurementInbox({ organizationId: 'org1', threads: [thread], messagesByThread: messages, quotesByRfq: new Map([['rfq1', [quote]]]), connections: [{ connection, cursor }], dispositions, now: '2026-09-03T12:00:00Z' });
    assert.equal(inbox.quoteCount, 1);
    assert.equal(inbox.needsReviewCount, 1);
    assert.equal(inbox.declineCount, 1);
    assert.equal(inbox.items.find(i => i.sourceMessageId === 'm1')?.disposition, 'acknowledged');
    assert.ok(inbox.items.some(i => i.kind === 'connection_alert'));
});
test('owner notifications surface new quotes, review items, declines and critical connection issues without resolved items', () => {
    const messages = new Map([['t1', [msg('m1', 'quote_received'), msg('m2', 'supplier_reply')]]]);
    const bad = { ...connection, status: 'reauth_required', lastError: 'invalid_grant' };
    const inbox = buildProcurementInbox({ organizationId: 'org1', threads: [thread], messagesByThread: messages, quotesByRfq: new Map(), connections: [{ connection: bad, cursor: null }], now: '2026-09-03T12:00:00Z' });
    const notifications = ownerNotificationsFromInbox(inbox);
    assert.equal(notifications.length, 3);
    assert.ok(notifications.some(n => n.severity === 'critical'));
});
