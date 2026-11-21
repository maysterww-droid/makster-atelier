import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildProcurementInbox, ownerNotificationsFromInbox } from '../../../packages/procurement-inbox/src/index.js';
import type { GmailConnectionRecord, GmailSyncCursor } from '../../../packages/connections-gmail/src/index.js';
import type { SupplierCommunicationMessage, SupplierCommunicationThread } from '../../../packages/supplier-communication/src/index.js';
import type { SupplierQuote } from '../../../packages/procurement-intelligence/src/index.js';

const output=process.argv[2]??'engineering-output/procurement-inbox-demo';
await mkdir(output,{recursive:true});
const thread:SupplierCommunicationThread={communicationVersion:'1.3.0',threadId:'thread-demo',rfqId:'rfq-demo',projectId:'project-demo',revision:7,supplierId:'supplier-demo',supplierName:'Prague Cut Service',supplierEmail:'quotes@prague-cut.example',provider:'gmail',providerAccountRef:'gmail-demo',status:'replied',subject:'RFQ demo',responseToken:'DEMO',createdAt:'2026-09-03T10:00:00Z',lastInboundAt:'2026-09-03T14:00:00Z',reminderCount:0};
const messages:SupplierCommunicationMessage[]=[
 {communicationVersion:'1.3.0',messageId:'msg-quote',threadId:thread.threadId,direction:'inbound',kind:'quote_received',status:'received',subject:'Re: RFQ demo',bodyText:'Structured quote',payloadSha256:'1'.repeat(64),receivedAt:'2026-09-03T13:00:00Z'},
 {communicationVersion:'1.3.0',messageId:'msg-review',threadId:thread.threadId,direction:'inbound',kind:'supplier_reply',status:'received',subject:'Re: RFQ demo',bodyText:'About 420 EUR, maybe next week. Please confirm.',payloadSha256:'2'.repeat(64),receivedAt:'2026-09-03T13:30:00Z'},
 {communicationVersion:'1.3.0',messageId:'msg-decline',threadId:thread.threadId,direction:'inbound',kind:'decline',status:'received',subject:'Re: RFQ demo',bodyText:'We cannot take this order this week.',payloadSha256:'3'.repeat(64),receivedAt:'2026-09-03T14:00:00Z'}
];
const quote:SupplierQuote={procurementVersion:'1.2.0',quoteId:'quote-demo',rfqId:'rfq-demo',supplierId:'supplier-demo',status:'submitted',currency:'EUR',basePrice:410,deliveryPrice:18,totalPrice:428,leadDays:5,services:['cutting','edging'],deliveryMode:'supplier_delivery',submittedAt:'2026-09-03T13:00:00Z'};
const connection:GmailConnectionRecord={connectionVersion:'1.5.0',connectionId:'gmail-demo',organizationId:'org-demo',provider:'gmail',accountEmail:'owner@makster.example',scopes:['gmail.readonly','gmail.send'],status:'reauth_required',lastError:'invalid_grant',createdAt:'2026-09-01T09:00:00Z',connectedAt:'2026-09-01T09:00:00Z',updatedAt:'2026-09-03T14:00:00Z'};
const cursor:GmailSyncCursor={connectionVersion:'1.5.0',connectionId:'gmail-demo',historyId:'100',watchTopic:'projects/demo/topics/makster-gmail',watchExpirationAt:'2026-09-03T14:30:00Z',lastWatchRenewAt:'2026-09-02T09:00:00Z',lastSyncAt:'2026-09-02T09:00:00Z',syncStatus:'idle',updatedAt:'2026-09-02T09:00:00Z'};
const inbox=buildProcurementInbox({organizationId:'org-demo',threads:[thread],messagesByThread:new Map([[thread.threadId,messages]]),quotesByRfq:new Map([[thread.rfqId,[quote]]]),connections:[{connection,cursor}],now:'2026-09-03T14:02:00Z'});
const notifications=ownerNotificationsFromInbox(inbox);
await writeFile(join(output,'01-procurement-inbox.json'),JSON.stringify(inbox,null,2));
await writeFile(join(output,'02-owner-notifications.json'),JSON.stringify(notifications,null,2));
console.log(JSON.stringify({output,total:inbox.total,newCount:inbox.newCount,quotes:inbox.quoteCount,needsReview:inbox.needsReviewCount,declines:inbox.declineCount,critical:inbox.criticalCount,notifications:notifications.length},null,2));
