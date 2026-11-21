import type { SupplierCommunicationThread } from '../../supplier-communication/src/types.js';
import { GMAIL_CONNECTIONS_VERSION, type GmailMatchedInbound, type GmailMessageEnvelope, type GmailPushSignal, type GmailSyncCursor, type GmailSyncResult } from './types.js';
import type { GmailApiClient } from './gmail-api.js';

function normalizeSubject(subject:string):string {
  return subject.trim().replace(/^(re|fwd):\s*/i,'').trim().toLowerCase();
}

export function matchMessageToThread(message:GmailMessageEnvelope, threads:SupplierCommunicationThread[]):GmailMatchedInbound | null {
  for(const thread of threads){
    if(thread.providerThreadId && message.threadId===thread.providerThreadId && message.from===thread.supplierEmail.toLowerCase()) return {message,communicationThreadId:thread.threadId,supplierId:thread.supplierId,matchReason:'provider_thread'};
  }
  for(const thread of threads){
    const root=thread.providerRootRfcMessageId;
    if(root && message.inReplyTo===root && message.from===thread.supplierEmail.toLowerCase()) return {message,communicationThreadId:thread.threadId,supplierId:thread.supplierId,matchReason:'in_reply_to'};
  }
  for(const thread of threads){
    const root=thread.providerRootRfcMessageId;
    if(root && message.references?.includes(root) && message.from===thread.supplierEmail.toLowerCase()) return {message,communicationThreadId:thread.threadId,supplierId:thread.supplierId,matchReason:'references'};
  }
  for(const thread of threads){
    if(message.from===thread.supplierEmail.toLowerCase() && normalizeSubject(message.subject)===normalizeSubject(thread.subject)) return {message,communicationThreadId:thread.threadId,supplierId:thread.supplierId,matchReason:'supplier_subject'};
  }
  return null;
}

async function collectHistoryMessageIds(client:GmailApiClient,startHistoryId:string):Promise<{ids:string[];endHistoryId:string}> {
  const ids=new Set<string>(); let token:string|undefined; let endHistoryId=startHistoryId;
  do { const page=await client.listHistory(startHistoryId,token); for(const id of page.messageIds) ids.add(id); endHistoryId=page.historyId; token=page.nextPageToken; } while(token);
  return {ids:[...ids],endHistoryId};
}

async function collectFullMessageIds(client:GmailApiClient,maxMessages:number):Promise<string[]> {
  const ids:string[]=[]; let token:string|undefined;
  do { const page=await client.listRecentInbox(Math.min(100,maxMessages-ids.length),token); ids.push(...page.messageIds); token=page.nextPageToken; } while(token && ids.length<maxMessages);
  return ids.slice(0,maxMessages);
}

export async function syncGmailConnection(input:{
  connectionId:string;
  client:GmailApiClient;
  cursor:GmailSyncCursor | null;
  threads:SupplierCommunicationThread[];
  seenProviderMessageIds?:Set<string>;
  now?:string;
  maxFullSyncMessages?:number;
}):Promise<{result:GmailSyncResult;cursor:GmailSyncCursor}> {
  const now=input.now??new Date().toISOString(); const seen=input.seenProviderMessageIds??new Set<string>();
  let mode:'history'|'full'='history'; let fullSyncReason:'initial_sync'|'stale_history'|undefined; let ids:string[]=[]; let endHistoryId='';
  const startHistoryId=input.cursor?.historyId;
  if(!startHistoryId){ mode='full'; fullSyncReason='initial_sync'; const profile=await input.client.getProfile(); endHistoryId=profile.historyId; ids=await collectFullMessageIds(input.client,input.maxFullSyncMessages??200); }
  else {
    try { const history=await collectHistoryMessageIds(input.client,startHistoryId); ids=history.ids; endHistoryId=history.endHistoryId; }
    catch(error){ if((error as any)?.status!==404) throw error; mode='full'; fullSyncReason='stale_history'; const profile=await input.client.getProfile(); endHistoryId=profile.historyId; ids=await collectFullMessageIds(input.client,input.maxFullSyncMessages??200); }
  }
  const matchedInbound:GmailMatchedInbound[]=[]; const ignored:string[]=[]; const duplicates:string[]=[];
  for(const id of ids){
    if(seen.has(id)){duplicates.push(id);continue;}
    const message=await input.client.getMessage(id);
    const match=matchMessageToThread(message,input.threads);
    if(match) matchedInbound.push(match); else ignored.push(id);
  }
  const result:GmailSyncResult={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId:input.connectionId,mode,...(startHistoryId?{startHistoryId}:{}),endHistoryId,fetchedMessageCount:ids.length,matchedInbound,ignoredMessageIds:ignored,duplicateMessageIds:duplicates,...(fullSyncReason?{fullSyncReason}:{}),syncedAt:now};
  const cursor:GmailSyncCursor={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId:input.connectionId,historyId:endHistoryId,...(input.cursor?.watchExpirationAt?{watchExpirationAt:input.cursor.watchExpirationAt}:{}),...(input.cursor?.watchTopic?{watchTopic:input.cursor.watchTopic}:{}),...(input.cursor?.lastWatchRenewAt?{lastWatchRenewAt:input.cursor.lastWatchRenewAt}:{}),syncStatus:'idle',lastSyncAt:now,...(mode==='full'?{lastFullSyncAt:now}:{...(input.cursor?.lastFullSyncAt?{lastFullSyncAt:input.cursor.lastFullSyncAt}:{})}),updatedAt:now};
  return {result,cursor};
}

export function parseGmailPushNotification(body:any):GmailPushSignal {
  const data=body?.message?.data;
  if(typeof data!=='string') throw new Error('gmail_push_data_missing');
  let parsed:any; try { parsed=JSON.parse(Buffer.from(data,'base64').toString('utf8')); } catch { throw new Error('gmail_push_data_invalid'); }
  if(!parsed?.emailAddress||!parsed?.historyId) throw new Error('gmail_push_payload_invalid');
  return {emailAddress:String(parsed.emailAddress).toLowerCase(),historyId:String(parsed.historyId)};
}
