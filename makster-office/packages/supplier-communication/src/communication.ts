import { createHash, randomUUID } from 'node:crypto';
import type { ProductionService } from '../../production-pack/src/types.js';
import { validateQuote } from '../../procurement-intelligence/src/procurement.js';
import type { SupplierQuote, SupplierRfq, SupplierCapabilityProfile } from '../../procurement-intelligence/src/types.js';
import {
  SUPPLIER_COMMUNICATION_VERSION,
  type CommunicationProvider,
  type ImportSupplierReplyInput,
  type ParsedSupplierReply,
  type ProviderSendResult,
  type ReminderCandidate,
  type ReminderPolicy,
  type RfqInvitationDraft,
  type SupplierCommunicationMessage,
  type SupplierCommunicationRecipient,
  type SupplierCommunicationThread,
} from './types.js';

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function responseToken(rfqId: string, supplierId: string): string {
  return sha256Text(`${rfqId}:${supplierId}:makster-rfq-v1`).slice(0, 20).toUpperCase();
}

function serviceLabel(service: ProductionService): string {
  return ({ cutting:'Cutting', edging:'Edge banding', drilling:'Drilling' } as Record<string,string>)[service] ?? service;
}

function invitationText(rfq: SupplierRfq, recipient: SupplierCommunicationRecipient, token: string): string {
  const services = rfq.services.map(serviceLabel).join(', ');
  const deadline = rfq.responseDeadline ? new Date(rfq.responseDeadline).toISOString() : 'not specified';
  return `Hello ${recipient.supplierName},\n\nMakster requests a quotation for furniture production services.\n\nRFQ ID: ${rfq.rfqId}\nProject revision: ${rfq.revision}\nServices: ${services}\nCurrency: ${rfq.currency}\nDelivery required: ${rfq.deliveryRequired ? 'yes' : 'no'}\nResponse deadline: ${deadline}\nResponse token: ${token}\n\nPlease reply using the structured block below. Values may be changed, but keep the field names.\n\nMAKSTER QUOTE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${token}\nTOTAL_PRICE: \nDELIVERY_PRICE: 0\nLEAD_DAYS: \nDELIVERY_MODE: pickup\nSERVICES: ${rfq.services.join(',')}\nVALID_UNTIL: \nNOTE: \nEND MAKSTER QUOTE\n\nIf you cannot quote this request, reply with:\nMAKSTER DECLINE\nRFQ_ID: ${rfq.rfqId}\nRESPONSE_TOKEN: ${token}\nEND MAKSTER DECLINE\n\nThank you.\nMakster Procurement`;
}

export function composeRfqInvitation(rfq: SupplierRfq, recipient: SupplierCommunicationRecipient): RfqInvitationDraft {
  if (!rfq.invitedSupplierIds.includes(recipient.supplierId)) throw new Error('supplier_not_invited_to_rfq');
  if (!recipient.email.includes('@')) throw new Error('supplier_email_invalid');
  const token = responseToken(rfq.rfqId, recipient.supplierId);
  return {
    recipient,
    subject: `RFQ ${rfq.rfqId} — Project revision ${rfq.revision}`,
    bodyText: invitationText(rfq, recipient, token),
    responseToken: token,
  };
}

export function createCommunicationThread(input: {
  rfq: SupplierRfq;
  recipient: SupplierCommunicationRecipient;
  provider: CommunicationProvider['kind'];
  providerAccountRef?: string;
  threadId?: string;
  createdAt?: string;
}): { thread: SupplierCommunicationThread; draft: RfqInvitationDraft } {
  const draft = composeRfqInvitation(input.rfq, input.recipient);
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    draft,
    thread: {
      communicationVersion: SUPPLIER_COMMUNICATION_VERSION,
      threadId: input.threadId ?? randomUUID(),
      rfqId: input.rfq.rfqId,
      projectId: input.rfq.projectId,
      revision: input.rfq.revision,
      supplierId: input.recipient.supplierId,
      supplierName: input.recipient.supplierName,
      supplierEmail: input.recipient.email,
      provider: input.provider,
      ...(input.providerAccountRef ? { providerAccountRef: input.providerAccountRef } : {}),
      status: 'draft',
      subject: draft.subject,
      responseToken: draft.responseToken,
      ...(input.rfq.responseDeadline ? { responseDeadline: input.rfq.responseDeadline } : {}),
      createdAt,
      reminderCount: 0,
    },
  };
}

export async function sendThreadMessage(input: {
  provider: CommunicationProvider;
  thread: SupplierCommunicationThread;
  kind: 'rfq_invitation' | 'reminder';
  bodyText: string;
  subject?: string;
  now?: string;
}): Promise<{ thread: SupplierCommunicationThread; message: SupplierCommunicationMessage; providerResult: ProviderSendResult }> {
  const now = input.now ?? new Date().toISOString();
  const rfcMessageId = input.thread.providerRootRfcMessageId ?? `<makster-${randomUUID()}@makster.ai>`;
  const providerResult = await input.provider.send({
    to: input.thread.supplierEmail,
    subject: input.subject ?? input.thread.subject,
    text: input.bodyText,
    messageIdHeader: input.kind === 'rfq_invitation' ? rfcMessageId : `<makster-${randomUUID()}@makster.ai>`,
    ...(input.thread.providerThreadId ? { threadId: input.thread.providerThreadId } : {}),
    ...(input.thread.providerRootRfcMessageId ? { inReplyTo: input.thread.providerRootRfcMessageId, references:[input.thread.providerRootRfcMessageId] } : {}),
  });
  const message: SupplierCommunicationMessage = {
    communicationVersion: SUPPLIER_COMMUNICATION_VERSION,
    messageId: randomUUID(),
    threadId: input.thread.threadId,
    direction: 'outbound',
    kind: input.kind,
    status: 'sent',
    subject: input.subject ?? input.thread.subject,
    bodyText: input.bodyText,
    payloadSha256: sha256Text(input.bodyText),
    providerMessageId: providerResult.messageId,
    ...(providerResult.threadId ? { providerThreadId: providerResult.threadId } : {}),
    sentAt: providerResult.sentAt,
  };
  const thread: SupplierCommunicationThread = {
    ...input.thread,
    status: 'sent',
    lastOutboundAt: now,
    providerRootRfcMessageId: input.thread.providerRootRfcMessageId ?? providerResult.rfcMessageId ?? rfcMessageId,
    ...(providerResult.threadId ? { providerThreadId: providerResult.threadId } : {}),
    reminderCount: input.kind === 'reminder' ? input.thread.reminderCount + 1 : input.thread.reminderCount,
  };
  return { thread, message, providerResult };
}

function block(text: string, start: string, end: string): string | undefined {
  const s = text.indexOf(start);
  if (s < 0) return undefined;
  const e = text.indexOf(end, s + start.length);
  if (e < 0) return undefined;
  return text.slice(s + start.length, e).trim();
}

function parseFields(body: string): Map<string,string> {
  const out = new Map<string,string>();
  for (const raw of body.split(/\r?\n/)) {
    const i = raw.indexOf(':');
    if (i <= 0) continue;
    const key = raw.slice(0,i).trim().toUpperCase();
    const value = raw.slice(i+1).trim();
    out.set(key, value);
  }
  return out;
}

function parseServices(raw: string): ProductionService[] {
  const allowed = new Set<ProductionService>(['cutting','edging','drilling']);
  return raw.split(',').map(x=>x.trim().toLowerCase()).filter((x): x is ProductionService => allowed.has(x as ProductionService));
}

export function parseSupplierReply(input: ImportSupplierReplyInput): ParsedSupplierReply {
  const text = input.text.trim();
  const rawTextSha256 = sha256Text(text);
  const senderWarnings:string[] = [];
  if (!input.supplier.email) senderWarnings.push('supplier_email_missing');
  else if (input.supplier.email.trim().toLowerCase() !== input.fromEmail.trim().toLowerCase()) senderWarnings.push('sender_email_mismatch');
  const quoteBlock = block(text, 'MAKSTER QUOTE', 'END MAKSTER QUOTE');
  const declineBlock = block(text, 'MAKSTER DECLINE', 'END MAKSTER DECLINE');
  if (declineBlock !== undefined) {
    const fields = parseFields(declineBlock);
    const warnings: string[] = [...senderWarnings];
    if (fields.get('RFQ_ID') !== input.rfq.rfqId) warnings.push('rfq_id_mismatch');
    const expected = responseToken(input.rfq.rfqId, input.supplier.id ?? '');
    if (fields.get('RESPONSE_TOKEN') !== expected) warnings.push('response_token_mismatch');
    return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:warnings.length ? 'needs_review' : 'declined', ...(fields.get('RFQ_ID') ? {rfqId:fields.get('RFQ_ID')!}:{}), ...(input.supplier.id ? {supplierId:input.supplier.id}:{}), ...(fields.get('RESPONSE_TOKEN') ? {responseToken:fields.get('RESPONSE_TOKEN')!}:{}), missingFields:[], warnings, rawTextSha256 };
  }
  if (quoteBlock === undefined) return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:'needs_review', rfqId:input.rfq.rfqId, ...(input.supplier.id ? {supplierId:input.supplier.id}:{}), missingFields:['structured_quote_block'], warnings:[...senderWarnings,'freeform_reply_not_auto_imported'], rawTextSha256 };

  const f = parseFields(quoteBlock);
  const required = ['RFQ_ID','RESPONSE_TOKEN','TOTAL_PRICE','LEAD_DAYS','DELIVERY_MODE','SERVICES'];
  const missingFields = required.filter(k => !f.get(k));
  const warnings: string[] = [...senderWarnings];
  if (f.get('RFQ_ID') !== input.rfq.rfqId) warnings.push('rfq_id_mismatch');
  const supplierId = input.supplier.id ?? '';
  const expected = responseToken(input.rfq.rfqId, supplierId);
  if (f.get('RESPONSE_TOKEN') !== expected) warnings.push('response_token_mismatch');
  if (missingFields.length || warnings.length) return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:'needs_review', ...(f.get('RFQ_ID') ? {rfqId:f.get('RFQ_ID')!}:{}), supplierId, ...(f.get('RESPONSE_TOKEN') ? {responseToken:f.get('RESPONSE_TOKEN')!}:{}), missingFields, warnings, rawTextSha256 };

  const totalPrice = Number(f.get('TOTAL_PRICE'));
  const deliveryPrice = Number(f.get('DELIVERY_PRICE') || '0');
  const leadDays = Number(f.get('LEAD_DAYS'));
  if (!(totalPrice >= 0) || !(deliveryPrice >= 0) || !(leadDays > 0)) {
    return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:'needs_review', rfqId:input.rfq.rfqId, supplierId, ...(f.get('RESPONSE_TOKEN') ? {responseToken:f.get('RESPONSE_TOKEN')!}:{}), missingFields:[], warnings:['invalid_numeric_quote_fields'], rawTextSha256 };
  }
  const services = parseServices(f.get('SERVICES') ?? '');
  const basePrice = Math.round((totalPrice - deliveryPrice) * 100) / 100;
  const quote: SupplierQuote = {
    procurementVersion: '1.2.0',
    quoteId: input.quoteId ?? randomUUID(),
    rfqId: input.rfq.rfqId,
    supplierId,
    status:'submitted',
    currency: input.rfq.currency,
    basePrice,
    deliveryPrice,
    totalPrice,
    leadDays,
    ...(f.get('VALID_UNTIL') ? { validUntil:f.get('VALID_UNTIL')! } : {}),
    services,
    deliveryMode: f.get('DELIVERY_MODE') as SupplierQuote['deliveryMode'],
    ...(f.get('NOTE') ? { note:f.get('NOTE')! } : {}),
    submittedAt: input.receivedAt ?? new Date().toISOString(),
  };
  const validation = validateQuote(input.rfq, quote, input.supplier);
  if (validation.length) return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:'needs_review', rfqId:input.rfq.rfqId, supplierId, ...(f.get('RESPONSE_TOKEN') ? {responseToken:f.get('RESPONSE_TOKEN')!}:{}), missingFields:[], warnings:validation, rawTextSha256 };
  return { communicationVersion:SUPPLIER_COMMUNICATION_VERSION, classification:'quote_candidate', rfqId:input.rfq.rfqId, supplierId, ...(f.get('RESPONSE_TOKEN') ? {responseToken:f.get('RESPONSE_TOKEN')!}:{}), quote, missingFields:[], warnings:[], rawTextSha256 };
}

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = { firstReminderAfterHours:48, repeatEveryHours:48, maxReminders:2 };

export function dueReminderCandidates(input:{ threads:SupplierCommunicationThread[]; now?:string; policy?:ReminderPolicy }): ReminderCandidate[] {
  const nowMs = new Date(input.now ?? new Date().toISOString()).getTime();
  const policy = input.policy ?? DEFAULT_REMINDER_POLICY;
  return input.threads.flatMap(thread => {
    if (thread.status === 'replied' || thread.status === 'declined' || thread.status === 'closed') return [];
    if (!thread.lastOutboundAt || thread.reminderCount >= policy.maxReminders) return [];
    const hours = thread.reminderCount === 0 ? policy.firstReminderAfterHours : policy.repeatEveryHours;
    const due = new Date(new Date(thread.lastOutboundAt).getTime() + hours*3600_000);
    if (thread.responseDeadline && due.getTime() > new Date(thread.responseDeadline).getTime()) return [];
    if (due.getTime() > nowMs) return [];
    return [{ threadId:thread.threadId, supplierId:thread.supplierId, supplierName:thread.supplierName, supplierEmail:thread.supplierEmail, reminderNumber:thread.reminderCount+1, dueAt:due.toISOString() }];
  });
}

export function composeReminder(thread: SupplierCommunicationThread): string {
  return `Hello ${thread.supplierName},\n\nThis is a reminder about Makster RFQ ${thread.rfqId} for project revision ${thread.revision}.\nPlease reply in the original thread using the structured Makster quote block.\n\nResponse token: ${thread.responseToken}\n\nThank you.\nMakster Procurement`;
}
