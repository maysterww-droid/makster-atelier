import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';
import { createSupplierRfq } from '../packages/procurement-intelligence/src/index.js';
import { GmailApiEmailProvider, MemoryEmailProvider, buildRfc2822, composeReminder, composeRfqInvitation, createCommunicationThread, dueReminderCandidates, parseSupplierReply, sendThreadMessage, } from '../packages/supplier-communication/src/index.js';
async function setup() {
    const p = JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
    const engineering = new MaksterEngineeringCompiler().compile(p);
    const pack = buildProductionPack({ project: p, engineering, route: 'outsource', outsourcePreset: 'cutting_edging', packId: 'comm-pack-1', generatedAt: '2026-09-03T12:00:00Z' });
    const suppliers = [
        { id: 's1', name: 'Prague Cut Service', email: 'quotes@prague-cut.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['supplier_delivery'], typicalLeadDays: 5 },
        { id: 's2', name: 'QuickPanel', email: 'rfq@quickpanel.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['supplier_delivery'], typicalLeadDays: 2 },
    ];
    const rfq = createSupplierRfq({ pack, suppliers, currency: 'EUR', rfqId: 'rfq-comm-1', requestedAt: '2026-09-03T12:01:00Z', responseDeadline: '2026-09-07T12:00:00Z' });
    return { p, pack, suppliers, rfq };
}
test('RFQ invitation is bound to RFQ, revision and deterministic response token', async () => {
    const { rfq, suppliers } = await setup();
    const draft = composeRfqInvitation(rfq, { supplierId: 's1', supplierName: suppliers[0].name, email: suppliers[0].email });
    assert.match(draft.bodyText, /RFQ_ID: rfq-comm-1/);
    assert.match(draft.bodyText, /Project revision: 1/);
    assert.match(draft.bodyText, /SERVICES: cutting,edging/);
    assert.ok(draft.responseToken.length >= 8);
});
test('memory provider sends invitation and binds provider thread/message IDs', async () => {
    const { rfq, suppliers } = await setup();
    const provider = new MemoryEmailProvider();
    const { thread, draft } = createCommunicationThread({ rfq, recipient: { supplierId: 's1', supplierName: suppliers[0].name, email: suppliers[0].email }, provider: 'memory', threadId: 'thread-1', createdAt: '2026-09-03T12:02:00Z' });
    const sent = await sendThreadMessage({ provider, thread, kind: 'rfq_invitation', bodyText: draft.bodyText, now: '2026-09-03T12:03:00Z' });
    assert.equal(sent.thread.status, 'sent');
    assert.equal(sent.thread.providerRootRfcMessageId, sent.providerResult.rfcMessageId);
    assert.equal(provider.sent.length, 1);
});
test('structured supplier reply imports a validated quote', async () => {
    const { rfq, suppliers } = await setup();
    const draft = composeRfqInvitation(rfq, { supplierId: 's1', supplierName: suppliers[0].name, email: suppliers[0].email });
    const reply = `MAKSTER QUOTE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${draft.responseToken}\nTOTAL_PRICE: 428\nDELIVERY_PRICE: 18\nLEAD_DAYS: 5\nDELIVERY_MODE: supplier_delivery\nSERVICES: cutting,edging\nVALID_UNTIL: 2026-09-10T12:00:00Z\nNOTE: Includes delivery\nEND MAKSTER QUOTE`;
    const parsed = parseSupplierReply({ rfq, supplier: suppliers[0], fromEmail: suppliers[0].email, text: reply, receivedAt: '2026-09-03T15:00:00Z', quoteId: 'q-from-email' });
    assert.equal(parsed.classification, 'quote_candidate');
    assert.equal(parsed.quote?.totalPrice, 428);
    assert.equal(parsed.quote?.basePrice, 410);
    assert.equal(parsed.quote?.quoteId, 'q-from-email');
});
test('freeform reply is never silently converted into procurement quote', async () => {
    const { rfq, suppliers } = await setup();
    const parsed = parseSupplierReply({ rfq, supplier: suppliers[0], fromEmail: suppliers[0].email, text: 'Hello, we can probably do this for about 400 EUR next week.' });
    assert.equal(parsed.classification, 'needs_review');
    assert.equal(parsed.quote, undefined);
    assert.ok(parsed.warnings.includes('freeform_reply_not_auto_imported'));
});
test('wrong response token cannot create automatic quote', async () => {
    const { rfq, suppliers } = await setup();
    const reply = `MAKSTER QUOTE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: WRONG\nTOTAL_PRICE: 428\nDELIVERY_PRICE: 18\nLEAD_DAYS: 5\nDELIVERY_MODE: supplier_delivery\nSERVICES: cutting,edging\nEND MAKSTER QUOTE`;
    const parsed = parseSupplierReply({ rfq, supplier: suppliers[0], fromEmail: suppliers[0].email, text: reply });
    assert.equal(parsed.classification, 'needs_review');
    assert.ok(parsed.warnings.includes('response_token_mismatch'));
});
test('sender email mismatch forces Needs Review even with a valid structured block', async () => {
    const { rfq, suppliers } = await setup();
    const draft = composeRfqInvitation(rfq, { supplierId: 's1', supplierName: suppliers[0].name, email: suppliers[0].email });
    const reply = `MAKSTER QUOTE
RFQ_ID: ${rfq.rfqId}
RESPONSE_TOKEN: ${draft.responseToken}
TOTAL_PRICE: 428
DELIVERY_PRICE: 18
LEAD_DAYS: 5
DELIVERY_MODE: supplier_delivery
SERVICES: cutting,edging
END MAKSTER QUOTE`;
    const parsed = parseSupplierReply({ rfq, supplier: suppliers[0], fromEmail: 'spoof@example.com', text: reply });
    assert.equal(parsed.classification, 'needs_review');
    assert.ok(parsed.warnings.includes('sender_email_mismatch'));
});
test('reminder engine waits 48h, stops after reply, and respects maximum reminder count', async () => {
    const { rfq, suppliers } = await setup();
    const { thread } = createCommunicationThread({ rfq, recipient: { supplierId: 's1', supplierName: suppliers[0].name, email: suppliers[0].email }, provider: 'memory', threadId: 'thread-rem', createdAt: '2026-09-03T12:00:00Z' });
    const sent = { ...thread, status: 'sent', lastOutboundAt: '2026-09-03T12:00:00Z' };
    assert.equal(dueReminderCandidates({ threads: [sent], now: '2026-09-05T11:59:00Z' }).length, 0);
    const due = dueReminderCandidates({ threads: [sent], now: '2026-09-05T12:01:00Z' });
    assert.equal(due.length, 1);
    const replied = { ...sent, status: 'replied', lastInboundAt: '2026-09-04T10:00:00Z' };
    assert.equal(dueReminderCandidates({ threads: [replied], now: '2026-09-06T12:00:00Z' }).length, 0);
    const exhausted = { ...sent, reminderCount: 2 };
    assert.equal(dueReminderCandidates({ threads: [exhausted], now: '2026-09-06T12:00:00Z' }).length, 0);
    assert.match(composeReminder(sent), /rfq-comm-1/);
});
test('Gmail provider sends RFC2822 base64url raw and preserves threadId', async () => {
    let request;
    const fakeFetch = (async (url, init) => {
        request = { url, init, body: JSON.parse(init.body) };
        return new Response(JSON.stringify({ id: 'gmail-msg-1', threadId: 'gmail-thread-1' }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const provider = new GmailApiEmailProvider('test-token', fakeFetch);
    const result = await provider.send({ to: 'x@example.com', subject: 'RFQ test', text: 'Hello', threadId: 'existing-thread' });
    assert.equal(result.messageId, 'gmail-msg-1');
    assert.equal(request.url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    assert.equal(request.body.threadId, 'existing-thread');
    assert.match(request.init.headers.authorization, /Bearer test-token/);
    const raw = Buffer.from(request.body.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    assert.match(raw, /To: x@example.com/);
    assert.match(raw, /Subject: RFQ test/);
    assert.match(buildRfc2822({ to: 'x@example.com', subject: 's', text: 't' }), /Content-Type: text\/plain/);
});
