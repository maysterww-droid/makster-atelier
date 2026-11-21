import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SupabaseUnifiedBusinessStore } from '../apps/core-api/src/supabase-business-store.js';
import { MemoryUnifiedBusinessStore } from '../apps/core-api/src/business-store.js';
import type { BuiltCommercialPackage } from '../packages/commercial-engine/src/index.js';
import type { ClientChangeOrder, ClientRevisionAuthorization, ProjectCommercialContract } from '../packages/client-change-order/src/index.js';
import type { ChangeImpactReport } from '../packages/change-intelligence/src/index.js';

const ORG='00000000-0000-4000-8000-000000000001';
const PROJECT='11111111-1111-4111-8111-111111111111';
const QUOTE='22222222-2222-4222-8222-222222222222';
const ESTIMATE='33333333-3333-4333-8333-333333333333';
const PACKAGE='44444444-4444-4444-8444-444444444444';
const CONTRACT='55555555-5555-4555-8555-555555555555';
const CHANGE='66666666-6666-4666-8666-666666666666';
const AUTH='77777777-7777-4777-8777-777777777777';
const NEXT_QUOTE='88888888-8888-4888-8888-888888888888';
const REPORT='99999999-9999-4999-8999-999999999999';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');

function built(quoteId=QUOTE,quoteVersion=1,revision=1):BuiltCommercialPackage {
  const estimateId=quoteId===QUOTE?ESTIMATE:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const packageId=quoteId===QUOTE?PACKAGE:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  return {
    estimate:{commercialVersion:'1.6.0',estimateId,estimateVersion:quoteVersion,projectId:PROJECT,revision,projectTitle:'Persistent test',currency:'EUR',generatedAt:'2026-09-05T12:00:00.000Z',engineeringInputChecksum:hash(`eng-${revision}`),pricingProfileId:'TEST_ONLY_persistent',pricingProfileFingerprint:hash('pricing'),ready:true,blockers:[],warnings:[],lines:[{id:'labor',category:'labor',label:'Workshop',quantity:1,unit:'job',unitCostMinor:10000,totalCostMinor:10000,source:'manual'}],totals:{directCostMinor:10000,overheadMinor:1000,totalCostMinor:11000,sellBeforeDiscountMinor:15000,discountMinor:0,netSalesMinor:15000,taxMinor:3150,grossSalesMinor:18150,profitMinor:4000,marginBps:2667,markupBps:3636,discountBps:0,taxBps:2100},estimateFingerprint:hash(`estimate-${quoteId}`)},
    quote:{commercialVersion:'1.6.0',quoteId,quoteVersion,estimateId,estimateFingerprint:hash(`estimate-${quoteId}`),projectId:PROJECT,revision,projectTitle:'Persistent test',clientName:'Client',currency:'EUR',status:'draft',issuedAt:'2026-09-05T12:00:00.000Z',validUntil:'2026-09-19T12:00:00.000Z',netAmountMinor:15000,taxBps:2100,taxAmountMinor:3150,totalAmountMinor:18150,paymentSchedule:[{label:'Deposit',bps:5000,amountMinor:9075},{label:'Balance',bps:5000,amountMinor:9075}],inclusions:['Furniture'],exclusions:[],notes:[],seller:{name:'Makster Atelier'},quoteFingerprint:hash(`quote-${quoteId}`)},
    manifest:{commercialVersion:'1.6.0',packageId,estimateId,estimateFingerprint:hash(`estimate-${quoteId}`),quoteId,quoteFingerprint:hash(`quote-${quoteId}`),projectId:PROJECT,revision,generatedAt:'2026-09-05T12:00:00.000Z',files:[{name:'client-offer.html',mediaType:'text/html',purpose:'Client offer',sha256:hash('offer'),byteLength:5}]},
    files:{'client-offer.html':'offer'}
  };
}
const context={pricing:{profileId:'TEST_ONLY_persistent',name:'Persistent',currency:'EUR',materialPrices:[],edgePrices:[],hardwarePrices:[],labor:[],fixedCosts:[],overheadBps:0,markupBps:0,discountBps:0,taxBps:2100},quoteTerms:{clientName:'Client',sellerName:'Makster Atelier'},productionRoute:'manual_workshop' as const};

function report():ChangeImpactReport{return {changeVersion:'1.7.0',reportId:REPORT,projectId:PROJECT,fromRevision:1,toRevision:2,generatedAt:'2026-09-05T12:10:00.000Z',status:'changed',projectChanges:[],engineering:{panelPartCount:{before:1,after:1,delta:0},uniquePanelCount:{before:1,after:1,delta:0},totalPanelAreaMm2:{before:1,after:1,delta:0},hardwareRequirementCount:{before:1,after:1,delta:0},machiningOperationCount:{before:1,after:1,delta:0},warnings:{before:0,after:0,delta:0},errors:{before:0,after:0,delta:0},blocking:{before:0,after:0,delta:0},readyForProduction:{before:true,after:true},cncReady:{before:false,after:false},addedPartIds:[],removedPartIds:[],changedPartIds:[],addedHardwareIds:[],removedHardwareIds:[],changedHardwareIds:[]},commercial:{available:true,currency:'EUR'},summary:{projectChanges:1,productionChanges:0,customerVisibleChanges:1,commercialChanges:1},blockers:[],fingerprintSha256:hash('report')};}
function contract():ProjectCommercialContract{return {contractId:CONTRACT,projectId:PROJECT,organizationId:ORG,currency:'EUR',status:'active',initialRevision:1,initialQuoteId:QUOTE,currentRevision:1,currentQuoteId:QUOTE,agreedAmountMinor:18150,paymentTemplate:[{id:'deposit',label:'Deposit',shareBps:5000},{id:'balance',label:'Balance',shareBps:5000}],paymentSchedule:[{installmentId:'deposit',label:'Deposit',amountMinor:9075,status:'paid',paidAt:'2026-09-05T12:20:00.000Z',paidAmountMinor:9075},{installmentId:'balance',label:'Balance',amountMinor:9075,status:'scheduled'}],updatedAt:'2026-09-05T12:20:00.000Z',fingerprintSha256:hash('contract-1')};}
function order():ClientChangeOrder{return {changeOrderVersion:'1.8.0',changeOrderId:CHANGE,publicReference:'CO-PERSIST-1',status:'sent',binding:{projectId:PROJECT,fromRevision:1,toRevision:2,baseQuoteId:QUOTE,newQuoteId:NEXT_QUOTE,baseQuoteFingerprintSha256:hash(`quote-${QUOTE}`),newQuoteFingerprintSha256:hash(`quote-${NEXT_QUOTE}`),changeReportId:REPORT,changeReportFingerprintSha256:hash('report'),currency:'EUR',previousTotalMinor:18150,newTotalMinor:20000,deltaMinor:1850},summary:{reportId:REPORT,projectId:PROJECT,fromRevision:1,toRevision:2,currency:'EUR',changes:[],previousTotalMinor:18150,newTotalMinor:20000,deltaMinor:1850},createdAt:'2026-09-05T12:30:00.000Z',sentAt:'2026-09-05T12:31:00.000Z',validUntil:'2026-09-19T12:30:00.000Z',approvalTokenHashSha256:hash('RAW-SECRET-TOKEN')};}
function authorization():ClientRevisionAuthorization{return {authorizationId:AUTH,projectId:PROJECT,revision:2,quoteId:NEXT_QUOTE,changeOrderId:CHANGE,contractId:CONTRACT,acceptedAt:'2026-09-05T12:40:00.000Z',agreedAmountMinor:20000,currency:'EUR',authorizationFingerprintSha256:hash('authorization')};}

class FakeSupabaseState {
  tables=new Map<string,Record<string,unknown>[]>();
  secrets=new Map<string,string>();
  requests:string[]=[];
  rows(table:string){let x=this.tables.get(table);if(!x){x=[];this.tables.set(table,x);}return x;}
  fetch:typeof fetch=async (input,init={})=>{
    const url=new URL(String(input)); const route=url.pathname.replace(/^\/rest\/v1\//,''); const method=String(init.method??'GET').toUpperCase(); const body=init.body?JSON.parse(String(init.body)):undefined; this.requests.push(`${method} ${route} ${init.body??''}`);
    if(route.startsWith('rpc/')) return this.rpc(route.slice(4),body);
    const table=route; const rows=this.rows(table);
    const filters=[...url.searchParams.entries()].filter(([k,v])=>!['select','order','limit','on_conflict'].includes(k)&&v.startsWith('eq.')).map(([k,v])=>[k,v.slice(3)] as const);
    const matches=(r:Record<string,unknown>)=>filters.every(([k,v])=>String(r[k])===v);
    if(method==='POST'){
      const incoming=Array.isArray(body)?body:[body]; const conflict=(url.searchParams.get('on_conflict')??'id').split(',');
      for(const row of incoming){const duplicate=rows.find(r=>conflict.every(k=>String(r[k])===String(row[k])));if(!duplicate)rows.push(structuredClone(row));}
      return new Response('',{status:201});
    }
    if(method==='PATCH'){
      for(const r of rows.filter(matches)) Object.assign(r,structuredClone(body));
      return new Response(null,{status:204});
    }
    if(method==='GET'){
      let out=rows.filter(matches).map(r=>structuredClone(r)); const order=url.searchParams.get('order'); if(order){const [key,dir]=order.split('.');out.sort((a,b)=>String(a[key!]).localeCompare(String(b[key!]))*(dir==='desc'?-1:1));} const limit=Number(url.searchParams.get('limit')??0);if(limit)out=out.slice(0,limit);
      const select=url.searchParams.get('select');if(select&&select!=='*'){const keys=select.split(',');out=out.map(r=>Object.fromEntries(keys.map(k=>[k,r[k]])));}
      return Response.json(out);
    }
    return new Response('unsupported',{status:500});
  };
  private rpc(name:string,body:any){
    if(name==='makster_change_order_secret_put_2_6'){this.secrets.set(body.p_change_order_id,body.p_approval_token_hash_sha256);return new Response(null,{status:204});}
    if(name==='makster_change_order_secret_get_2_6'){const h=this.secrets.get(body.p_change_order_id);return Response.json(h?[{approval_token_hash_sha256:h}]:[]);}
    if(name==='makster_apply_client_change_order_acceptance_2_6'){
      const orderRow=body.p_order; const contractObj=body.p_contract; const auth=body.p_authorization;
      Object.assign(this.rows('client_change_orders').find(r=>r.id===orderRow.id)!,{status:'accepted',decision_json:orderRow.decision_json,sent_at:orderRow.sent_at??null,viewed_at:orderRow.viewed_at??null,decided_at:orderRow.decided_at??null,valid_until:orderRow.valid_until??null});
      Object.assign(this.rows('project_commercial_contracts').find(r=>r.id===contractObj.contractId)!,{status:contractObj.status,current_revision:contractObj.currentRevision,current_quote_id:contractObj.currentQuoteId,agreed_amount_minor:contractObj.agreedAmountMinor,payment_template_json:contractObj.paymentTemplate,payment_schedule_json:contractObj.paymentSchedule,fingerprint_sha256:contractObj.fingerprintSha256,updated_at:contractObj.updatedAt});
      const authRows=this.rows('client_revision_authorizations');if(!authRows.some(r=>r.project_id===auth.projectId&&Number(r.revision)===auth.revision))authRows.push({id:auth.authorizationId,organization_id:body.p_organization_id,project_id:auth.projectId,revision:auth.revision,quote_id:auth.quoteId,change_order_id:auth.changeOrderId,contract_id:auth.contractId,accepted_at:auth.acceptedAt,agreed_amount_minor:auth.agreedAmountMinor,currency:auth.currency,authorization_fingerprint_sha256:auth.authorizationFingerprintSha256});
      for(const [quote,status] of [[body.p_base_quote_id,'superseded'],[body.p_new_quote_id,'accepted']]){const events=this.rows('client_quote_status_events');if(!events.some(r=>r.quote_id===quote&&r.status===status))events.push({organization_id:body.p_organization_id,quote_id:quote,status,created_at:auth.acceptedAt});}
      return Response.json({status:'applied'});
    }
    return new Response('rpc_not_found',{status:404});
  }
}

async function seed(store:SupabaseUnifiedBusinessStore){
  await store.saveCommercialPackage({organizationId:ORG,built:built(),status:'accepted',context});
  await store.saveCommercialPackage({organizationId:ORG,built:built(NEXT_QUOTE,2,2),status:'draft',context});
  await store.saveChangeReport({organizationId:ORG,report:report(),baseQuoteId:QUOTE,requoteId:NEXT_QUOTE});
  await store.saveQuoteLineage({organizationId:ORG,projectId:PROJECT,quoteId:NEXT_QUOTE,lineage:{supersedesQuoteId:QUOTE,changeReportId:REPORT,createdAt:'2026-09-05T12:10:00.000Z'}});
  await store.createContract(contract());
  await store.createChangeOrder({organizationId:ORG,order:order()});
}

test('2.6 Supabase business store rehydrates exact quote/context/contract after store restart',async()=>{
  const backend=new FakeSupabaseState(); const a=new SupabaseUnifiedBusinessStore({url:'https://fake.supabase.test',secretKey:'service',fetchImpl:backend.fetch}); await seed(a);
  const b=new SupabaseUnifiedBusinessStore({url:'https://fake.supabase.test',secretKey:'service',fetchImpl:backend.fetch});
  assert.deepEqual(await b.getCommercialPackage(QUOTE),built());
  assert.deepEqual(await b.getQuoteContext(QUOTE),context);
  assert.equal((await b.getContractByProject(PROJECT))?.contractId,CONTRACT);
  assert.equal((await b.getChangeOrder(CHANGE))?.approvalTokenHashSha256,hash('RAW-SECRET-TOKEN'));
  assert.equal((await b.listProjectQuotes(PROJECT)).length,2);
});

test('2.6 raw client approval token is never persisted',async()=>{
  const backend=new FakeSupabaseState(); const store=new SupabaseUnifiedBusinessStore({url:'https://fake.supabase.test',secretKey:'service',fetchImpl:backend.fetch}); await seed(store);
  const serialized=backend.requests.join('\n'); assert.equal(serialized.includes('RAW-SECRET-TOKEN'),false); assert.equal(serialized.includes(hash('RAW-SECRET-TOKEN')),true);
});

test('2.6 accepted change order is atomic/idempotent through one RPC and survives restart',async()=>{
  const backend=new FakeSupabaseState(); const a=new SupabaseUnifiedBusinessStore({url:'https://fake.supabase.test',secretKey:'service',fetchImpl:backend.fetch}); await seed(a);
  const accepted={...order(),status:'accepted' as const,decidedAt:'2026-09-05T12:40:00.000Z',decision:{decision:'accepted' as const,clientName:'Client',acceptanceFingerprintSha256:hash('accept')}};
  const updatedContract={...contract(),currentRevision:2,currentQuoteId:NEXT_QUOTE,agreedAmountMinor:20000,updatedAt:'2026-09-05T12:40:00.000Z',fingerprintSha256:hash('contract-2')};
  await a.applyAcceptedChangeOrderAtomic({organizationId:ORG,order:accepted,contract:updatedContract,authorization:authorization(),baseQuoteId:QUOTE,newQuoteId:NEXT_QUOTE});
  await a.applyAcceptedChangeOrderAtomic({organizationId:ORG,order:accepted,contract:updatedContract,authorization:authorization(),baseQuoteId:QUOTE,newQuoteId:NEXT_QUOTE});
  const b=new SupabaseUnifiedBusinessStore({url:'https://fake.supabase.test',secretKey:'service',fetchImpl:backend.fetch});
  assert.equal((await b.getContractByProject(PROJECT))?.currentRevision,2);
  assert.equal((await b.getAuthorization(PROJECT,2))?.authorizationId,AUTH);
  assert.equal(await b.getQuoteStatus(QUOTE),'superseded');
  assert.equal(await b.getQuoteStatus(NEXT_QUOTE),'accepted');
  assert.equal(backend.requests.filter(x=>x.includes('rpc/makster_apply_client_change_order_acceptance_2_6')).length,2);
});

test('2.6 memory fallback keeps same business contract for local/offline mode',async()=>{
  const store=new MemoryUnifiedBusinessStore(); await store.saveCommercialPackage({organizationId:ORG,built:built(),status:'draft',context}); assert.equal(store.mode,'memory'); assert.equal((await store.getCommercialPackage(QUOTE))?.quote.quoteId,QUOTE);
});

test('2.6 migration defines immutable snapshots, private hash RPC and atomic acceptance RPC',async()=>{
  const sql=await import('node:fs/promises').then(fs=>fs.readFile(new URL('file://'+process.cwd()+'/supabase/migration_source/makster_persistent_unified_business_2_6.sql'),'utf8'));
  assert.match(sql,/commercial_package_snapshots/); assert.match(sql,/commercial_quote_contexts/); assert.match(sql,/makster_change_order_secret_put_2_6/); assert.match(sql,/makster_apply_client_change_order_acceptance_2_6/); assert.doesNotMatch(sql,/approval_token\s+text/i);
});
