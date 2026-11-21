import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  GoogleOAuthClient,
  GmailApiClient,
  MemoryGmailConnectionStore,
  decryptSecret,
  encryptSecret,
  matchMessageToThread,
  parseGmailMessage,
  parseGmailPushNotification,
  signOauthState,
  syncGmailConnection,
  verifyOauthState,
  type GmailConnectionRecord,
  type GmailConnectionSecretRecord,
  type GmailSyncCursor,
} from '../packages/connections-gmail/src/index.js';
import type { SupplierCommunicationThread } from '../packages/supplier-communication/src/index.js';

const key=randomBytes(32);

test('refresh token encryption uses authenticated AES-256-GCM and detects tampering',()=>{
  const encrypted=encryptSecret('refresh-secret',key,'test-v1');
  assert.equal(decryptSecret(encrypted,key),'refresh-secret');
  assert.equal(encrypted.algorithm,'AES-256-GCM');
  const tampered={...encrypted,ciphertextB64:Buffer.from('tampered').toString('base64')};
  assert.throws(()=>decryptSecret(tampered,key),/encrypted_secret_authentication_failed/);
});

test('OAuth state is signed, expires, and cannot be modified',()=>{
  const payload={organizationId:'org-1',returnUrl:'/production',nonce:'n1',issuedAt:1000,expiresAt:5000};
  const token=signOauthState(payload,'state-secret');
  assert.equal(verifyOauthState(token,'state-secret',2000).organizationId,'org-1');
  assert.throws(()=>verifyOauthState(token+'x','state-secret',2000),/oauth_state_invalid_signature|oauth_state_malformed/);
  assert.throws(()=>verifyOauthState(token,'state-secret',5001),/oauth_state_expired/);
});

test('Google authorization URL requests offline Gmail read/send access and state',()=>{
  const oauth=new GoogleOAuthClient({clientId:'client',clientSecret:'secret',redirectUri:'https://makster.example/api/v1/connections/gmail/callback'});
  const url=new URL(oauth.buildAuthorizationUrl({state:'signed-state'}));
  assert.equal(url.origin,'https://accounts.google.com');
  assert.equal(url.searchParams.get('access_type'),'offline');
  assert.equal(url.searchParams.get('include_granted_scopes'),'true');
  assert.equal(url.searchParams.get('state'),'signed-state');
  const scope=url.searchParams.get('scope')??'';
  assert.match(scope,/gmail\.readonly/);
  assert.match(scope,/gmail\.send/);
});

test('Google token exchange and refresh use OAuth token endpoint without persisting access token',async()=>{
  const calls:any[]=[];
  const fakeFetch:typeof fetch=(async(url:any,init:any)=>{calls.push({url:String(url),body:String(init?.body??'')});return new Response(JSON.stringify({access_token:'a1',expires_in:3600,refresh_token:'r1',token_type:'Bearer',scope:'s'}),{status:200});}) as typeof fetch;
  const oauth=new GoogleOAuthClient({clientId:'client',clientSecret:'secret',redirectUri:'https://m/cb'},fakeFetch);
  const first=await oauth.exchangeCode('code');
  assert.equal(first.refreshToken,'r1');
  assert.match(calls[0].body,/grant_type=authorization_code/);
  await oauth.refreshAccessToken('r1');
  assert.match(calls[1].body,/grant_type=refresh_token/);
  assert.equal(calls[0].url,'https://oauth2.googleapis.com/token');
});

test('Gmail parser extracts headers and plain text body from MIME message',()=>{
  const raw={id:'m1',threadId:'gt1',historyId:'99',payload:{mimeType:'multipart/alternative',headers:[{name:'From',value:'Supplier <supplier@example.com>'},{name:'Subject',value:'Re: RFQ 1'},{name:'Message-ID',value:'<reply@x>'},{name:'In-Reply-To',value:'<root@x>'}],parts:[{mimeType:'text/plain',body:{data:Buffer.from('MAKSTER QUOTE').toString('base64url')}}]}};
  const m=parseGmailMessage(raw);
  assert.equal(m.from,'supplier@example.com');
  assert.equal(m.text,'MAKSTER QUOTE');
  assert.equal(m.inReplyTo,'<root@x>');
});

const thread:SupplierCommunicationThread={communicationVersion:'1.3.0',threadId:'ct1',rfqId:'rfq1',projectId:'p1',revision:1,supplierId:'s1',supplierName:'Supplier',supplierEmail:'supplier@example.com',provider:'gmail',status:'sent',subject:'RFQ rfq1 — Project revision 1',responseToken:'TOKEN',providerThreadId:'gmail-thread-1',providerRootRfcMessageId:'<root@makster.ai>',createdAt:'2026-09-03T10:00:00Z',lastOutboundAt:'2026-09-03T10:00:00Z',reminderCount:0};

test('Gmail reply matching prefers provider thread and requires supplier sender',()=>{
  const match=matchMessageToThread({id:'m',threadId:'gmail-thread-1',from:'supplier@example.com',subject:'Re: RFQ rfq1 — Project revision 1',text:'x'},[thread]);
  assert.equal(match?.matchReason,'provider_thread');
  assert.equal(match?.communicationThreadId,'ct1');
  assert.equal(matchMessageToThread({id:'m2',threadId:'gmail-thread-1',from:'attacker@example.com',subject:thread.subject,text:'x'},[thread]),null);
});

test('history sync only returns relevant supplier messages and advances history cursor',async()=>{
  const fakeFetch:typeof fetch=(async(url:any)=>{
    const u=String(url);
    if(u.includes('/history?')) return new Response(JSON.stringify({historyId:'120',history:[{messagesAdded:[{message:{id:'m1'}},{message:{id:'m2'}}]}]}),{status:200});
    if(u.includes('/messages/m1?')) return new Response(JSON.stringify({id:'m1',threadId:'gmail-thread-1',historyId:'119',payload:{headers:[{name:'From',value:'supplier@example.com'},{name:'Subject',value:'Re: '+thread.subject}],body:{data:Buffer.from('MAKSTER QUOTE').toString('base64url')}}}),{status:200});
    if(u.includes('/messages/m2?')) return new Response(JSON.stringify({id:'m2',threadId:'other',historyId:'120',payload:{headers:[{name:'From',value:'newsletter@example.com'},{name:'Subject',value:'News'}],body:{data:Buffer.from('hello').toString('base64url')}}}),{status:200});
    throw new Error('unexpected '+u);
  }) as typeof fetch;
  const client=new GmailApiClient('token',fakeFetch);
  const cursor:GmailSyncCursor={connectionVersion:'1.5.0',connectionId:'c1',historyId:'100',syncStatus:'idle',updatedAt:'2026-09-03T10:00:00Z'};
  const {result,cursor:next}=await syncGmailConnection({connectionId:'c1',client,cursor,threads:[thread],now:'2026-09-03T12:00:00Z'});
  assert.equal(result.mode,'history');
  assert.equal(result.matchedInbound.length,1);
  assert.deepEqual(result.ignoredMessageIds,['m2']);
  assert.equal(next.historyId,'120');
});

test('stale Gmail history 404 triggers bounded full sync instead of losing replies',async()=>{
  const fakeFetch:typeof fetch=(async(url:any)=>{
    const u=String(url);
    if(u.includes('/history?')) return new Response(JSON.stringify({error:'stale'}),{status:404});
    if(u.endsWith('/profile')) return new Response(JSON.stringify({emailAddress:'owner@example.com',historyId:'500'}),{status:200});
    if(u.includes('/messages?')) return new Response(JSON.stringify({messages:[{id:'m3'}]}),{status:200});
    if(u.includes('/messages/m3?')) return new Response(JSON.stringify({id:'m3',threadId:'gmail-thread-1',payload:{headers:[{name:'From',value:'supplier@example.com'},{name:'Subject',value:'Re: '+thread.subject}],body:{data:Buffer.from('reply').toString('base64url')}}}),{status:200});
    throw new Error('unexpected '+u);
  }) as typeof fetch;
  const client=new GmailApiClient('token',fakeFetch);
  const cursor:GmailSyncCursor={connectionVersion:'1.5.0',connectionId:'c1',historyId:'old',syncStatus:'idle',updatedAt:'2026-09-03T10:00:00Z'};
  const {result}=await syncGmailConnection({connectionId:'c1',client,cursor,threads:[thread],maxFullSyncMessages:20});
  assert.equal(result.mode,'full');
  assert.equal(result.fullSyncReason,'stale_history');
  assert.equal(result.endHistoryId,'500');
  assert.equal(result.matchedInbound.length,1);
});

test('Gmail push notification parser extracts account and historyId',()=>{
  const data=Buffer.from(JSON.stringify({emailAddress:'Owner@Example.com',historyId:'700'})).toString('base64');
  assert.deepEqual(parseGmailPushNotification({message:{data}}),{emailAddress:'owner@example.com',historyId:'700'});
});

test('Gmail watch uses INBOX filter and returns expiration/history cursor',async()=>{
  let request:any;
  const fakeFetch:typeof fetch=(async(url:any,init:any)=>{request={url:String(url),body:JSON.parse(init.body)};return new Response(JSON.stringify({historyId:'800',expiration:'1780000000000'}),{status:200});}) as typeof fetch;
  const client=new GmailApiClient('token',fakeFetch);
  const watch=await client.watch('projects/demo/topics/makster-gmail');
  assert.equal(watch.historyId,'800');
  assert.equal(request.body.labelFilterBehavior,'INCLUDE');
  assert.deepEqual(request.body.labelIds,['INBOX']);
});

test('memory connection store never exposes decrypted refresh token',async()=>{
  const store=new MemoryGmailConnectionStore();
  const encrypted=encryptSecret('r-secret',key);
  const connection:GmailConnectionRecord={connectionVersion:'1.5.0',connectionId:'c1',organizationId:'org1',provider:'gmail',accountEmail:'owner@example.com',scopes:['gmail'],status:'connected',createdAt:'2026-09-03T10:00:00Z',connectedAt:'2026-09-03T10:00:00Z',updatedAt:'2026-09-03T10:00:00Z'};
  const secret:GmailConnectionSecretRecord={connectionId:'c1',refreshToken:encrypted,refreshTokenFingerprintSha256:'0'.repeat(64),tokenUpdatedAt:'2026-09-03T10:00:00Z'};
  await store.saveConnection(connection,secret);
  const listed=await store.listConnections('org1');
  assert.equal((listed[0] as any).refreshToken,undefined);
  assert.equal(decryptSecret((await store.getSecret('c1'))!.refreshToken,key),'r-secret');
});
