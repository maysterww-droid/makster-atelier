import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import { MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../../../packages/production-pack/src/index.js';
import { createSupplierRfq } from '../../../packages/procurement-intelligence/src/index.js';
import { composeRfqInvitation, createCommunicationThread, parseSupplierReply } from '../../../packages/supplier-communication/src/index.js';
import { GmailApiClient, GoogleOAuthClient, encryptSecret, sha256Secret, syncGmailConnection } from '../../../packages/connections-gmail/src/index.js';
const out = process.argv[2] ?? 'engineering-output/gmail-live-sync-demo';
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile('packages/project-model/examples/wardrobe.blum.v1.json', 'utf8'));
const engineering = new MaksterEngineeringCompiler().compile(project);
const pack = buildProductionPack({ project, engineering, route: 'outsource', outsourcePreset: 'cutting_edging', packId: 'gmail-sync-pack', generatedAt: '2026-09-03T12:00:00Z' });
const suppliers = [{ id: 'supplier-prague-cut', name: 'Prague Cut Service', email: 'quotes@prague-cut.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['supplier_delivery'], typicalLeadDays: 5 }];
const rfq = createSupplierRfq({ pack, suppliers, currency: 'EUR', rfqId: 'rfq-gmail-sync-demo', requestedAt: '2026-09-03T12:01:00Z' });
const draft = composeRfqInvitation(rfq, { supplierId: suppliers[0].id, supplierName: suppliers[0].name, email: suppliers[0].email });
const created = createCommunicationThread({ rfq, recipient: draft.recipient, provider: 'gmail', providerAccountRef: 'gmail-connection-demo', threadId: 'communication-thread-demo', createdAt: '2026-09-03T12:02:00Z' });
const thread = { ...created.thread, status: 'sent', providerThreadId: 'gmail-thread-demo', providerRootRfcMessageId: '<makster-root-demo@makster.ai>', lastOutboundAt: '2026-09-03T12:03:00Z' };
const reply = `MAKSTER QUOTE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${draft.responseToken}\nTOTAL_PRICE: 428\nDELIVERY_PRICE: 18\nLEAD_DAYS: 5\nDELIVERY_MODE: supplier_delivery\nSERVICES: cutting,edging\nVALID_UNTIL: 2026-09-10T12:00:00Z\nNOTE: Imported by Gmail history sync\nEND MAKSTER QUOTE`;
const oauth = new GoogleOAuthClient({ clientId: 'DEMO_CLIENT', clientSecret: 'DEMO_SECRET', redirectUri: 'https://makster.example/api/v1/connections/gmail/callback' });
const authorizationUrl = oauth.buildAuthorizationUrl({ state: 'SIGNED_STATE_DEMO' });
const demoKey = Buffer.alloc(32, 7);
const refreshToken = 'TEST_ONLY_REFRESH_TOKEN_DO_NOT_USE';
const encrypted = encryptSecret(refreshToken, demoKey, 'demo-v1');
const connection = { connectionVersion: '1.5.0', connectionId: 'gmail-connection-demo', organizationId: 'demo-org', provider: 'gmail', accountEmail: 'owner@makster.example', scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'], status: 'connected', createdAt: '2026-09-03T12:00:00Z', connectedAt: '2026-09-03T12:00:00Z', updatedAt: '2026-09-03T12:00:00Z' };
const cursor = { connectionVersion: '1.5.0', connectionId: connection.connectionId, historyId: '100', watchTopic: 'projects/demo/topics/makster-gmail', watchExpirationAt: '2026-09-10T12:00:00Z', syncStatus: 'idle', updatedAt: '2026-09-03T12:00:00Z' };
const fakeFetch = (async (url, init) => {
    const u = String(url);
    if (u.includes('/history?'))
        return new Response(JSON.stringify({ historyId: '105', history: [{ messagesAdded: [{ message: { id: 'gmail-reply-1' } }] }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.includes('/messages/gmail-reply-1?'))
        return new Response(JSON.stringify({ id: 'gmail-reply-1', threadId: 'gmail-thread-demo', historyId: '105', internalDate: String(Date.parse('2026-09-03T14:00:00Z')), payload: { mimeType: 'text/plain', headers: [{ name: 'From', value: 'Prague Cut Service <quotes@prague-cut.example>' }, { name: 'To', value: 'owner@makster.example' }, { name: 'Subject', value: 'Re: ' + thread.subject }, { name: 'Message-ID', value: '<supplier-reply-demo@example>' }, { name: 'In-Reply-To', value: '<makster-root-demo@makster.ai>' }, { name: 'References', value: '<makster-root-demo@makster.ai>' }], body: { data: Buffer.from(reply, 'utf8').toString('base64url') } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    throw new Error(`unexpected demo Gmail request ${u} ${init?.method ?? 'GET'}`);
});
const gmail = new GmailApiClient('TEST_ONLY_ACCESS_TOKEN', fakeFetch);
const synced = await syncGmailConnection({ connectionId: connection.connectionId, client: gmail, cursor, threads: [thread], now: '2026-09-03T14:01:00Z' });
const matched = synced.result.matchedInbound[0];
const parsed = parseSupplierReply({ rfq, supplier: suppliers[0], text: matched.message.text, fromEmail: matched.message.from, receivedAt: '2026-09-03T14:00:00Z', quoteId: 'quote-gmail-sync-demo' });
await Promise.all([
    writeFile(join(out, '01-oauth-authorization.json'), JSON.stringify({ authorizationUrl, offline: true, scopes: connection.scopes }, null, 2)),
    writeFile(join(out, '02-encrypted-refresh-token-demo.json'), JSON.stringify({ encrypted, refreshTokenFingerprintSha256: sha256Secret(refreshToken), notice: 'TEST ONLY ciphertext. Encryption key and plaintext are not persisted.' }, null, 2)),
    writeFile(join(out, '03-connection.json'), JSON.stringify(connection, null, 2)),
    writeFile(join(out, '04-sync-cursor-before.json'), JSON.stringify(cursor, null, 2)),
    writeFile(join(out, '05-gmail-history-sync.json'), JSON.stringify(synced, null, 2)),
    writeFile(join(out, '06-auto-imported-quote.json'), JSON.stringify(parsed, null, 2)),
]);
console.log(JSON.stringify({ connectionId: connection.connectionId, mode: synced.result.mode, fetched: synced.result.fetchedMessageCount, matched: synced.result.matchedInbound.length, newHistoryId: synced.cursor.historyId, classification: parsed.classification, quoteTotal: parsed.quote?.totalPrice }, null, 2));
