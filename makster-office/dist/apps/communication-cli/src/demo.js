import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../../../packages/production-pack/src/index.js';
import { createSupplierRfq } from '../../../packages/procurement-intelligence/src/index.js';
import { MemoryEmailProvider, createCommunicationThread, dueReminderCandidates, parseSupplierReply, sendThreadMessage, } from '../../../packages/supplier-communication/src/index.js';
const out = process.argv[2] ?? 'engineering-output/supplier-communication-demo';
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile('packages/project-model/examples/wardrobe.blum.v1.json', 'utf8'));
const engineering = new MaksterEngineeringCompiler().compile(project);
const pack = buildProductionPack({ project, engineering, route: 'outsource', outsourcePreset: 'cutting_edging', packId: 'communication-pack-demo', generatedAt: '2026-09-03T12:00:00Z' });
const suppliers = [
    { id: 'supplier-prague-cut', name: 'Prague Cut Service', email: 'quotes@prague-cut.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['supplier_delivery'], typicalLeadDays: 5 },
    { id: 'supplier-quick-panel', name: 'QuickPanel', email: 'rfq@quickpanel.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['supplier_delivery'], typicalLeadDays: 2 },
    { id: 'supplier-budget-board', name: 'Budget Board', email: 'orders@budget-board.example', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['pickup'], typicalLeadDays: 7 },
];
const rfq = createSupplierRfq({ pack, suppliers, currency: 'EUR', rfqId: 'rfq-communication-demo', requestedAt: '2026-09-03T12:01:00Z', responseDeadline: '2026-09-07T12:00:00Z' });
const provider = new MemoryEmailProvider();
const threads = [];
for (const supplier of suppliers) {
    const created = createCommunicationThread({ rfq, recipient: { supplierId: supplier.id, supplierName: supplier.name, email: supplier.email }, provider: 'memory', threadId: `thread-${supplier.id}`, createdAt: '2026-09-03T12:02:00Z' });
    const sent = await sendThreadMessage({ provider, thread: created.thread, kind: 'rfq_invitation', bodyText: created.draft.bodyText, subject: created.draft.subject, now: '2026-09-03T12:03:00Z' });
    threads.push({ supplier, thread: sent.thread, message: sent.message, draft: created.draft });
}
const prague = threads[0];
const pragueReply = `MAKSTER QUOTE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${prague.draft.responseToken}\nTOTAL_PRICE: 428\nDELIVERY_PRICE: 18\nLEAD_DAYS: 5\nDELIVERY_MODE: supplier_delivery\nSERVICES: cutting,edging\nVALID_UNTIL: 2026-09-10T12:00:00Z\nNOTE: Includes delivery\nEND MAKSTER QUOTE`;
const parsedQuote = parseSupplierReply({ rfq, supplier: suppliers[0], fromEmail: suppliers[0].email, text: pragueReply, receivedAt: '2026-09-03T15:00:00Z', quoteId: 'quote-from-email-demo' });
const quick = threads[1];
const quickDecline = `MAKSTER DECLINE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${quick.draft.responseToken}\nEND MAKSTER DECLINE`;
const parsedDecline = parseSupplierReply({ rfq, supplier: suppliers[1], fromEmail: suppliers[1].email, text: quickDecline, receivedAt: '2026-09-03T15:10:00Z' });
const freeform = parseSupplierReply({ rfq, supplier: suppliers[2], fromEmail: suppliers[2].email, text: 'Hello, we could maybe do this next week for around 400 EUR. Call us.' });
const reminderCandidates = dueReminderCandidates({ threads: [threads[2].thread], now: '2026-09-05T12:05:00Z' });
await Promise.all([
    writeFile(join(out, '01-rfq.json'), JSON.stringify(rfq, null, 2)),
    writeFile(join(out, '02-sent-threads.json'), JSON.stringify(threads.map(({ supplier, thread, message }) => ({ supplier, thread, message })), null, 2)),
    writeFile(join(out, '03-structured-quote-reply.txt'), pragueReply),
    writeFile(join(out, '04-parsed-quote.json'), JSON.stringify(parsedQuote, null, 2)),
    writeFile(join(out, '05-parsed-decline.json'), JSON.stringify(parsedDecline, null, 2)),
    writeFile(join(out, '06-freeform-needs-review.json'), JSON.stringify(freeform, null, 2)),
    writeFile(join(out, '07-reminder-candidates.json'), JSON.stringify(reminderCandidates, null, 2)),
    writeFile(join(out, '08-memory-provider-outbox.json'), JSON.stringify(provider.sent, null, 2)),
]);
console.log(JSON.stringify({ rfqId: rfq.rfqId, sent: provider.sent.length, quoteClassification: parsedQuote.classification, declineClassification: parsedDecline.classification, freeformClassification: freeform.classification, remindersDue: reminderCandidates.length }, null, 2));
