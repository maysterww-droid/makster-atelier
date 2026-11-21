
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type {
  MaterialProcurementRfq,MaterialRfqCommunication,OwnerOperationsState,OpsUnit,SupplierProfile,SupplierQuote
} from './types.js';
import { buildBomAllocationPlan, compareSupplierQuotesForShortage } from './bom-allocation.js';

export interface MaterialRfqDraft {
  supplierId:string;
  supplierName:string;
  supplierEmail:string;
  subject:string;
  bodyText:string;
  responseToken:string;
}
export interface ParsedMaterialRfqReply {
  classification:'quote_candidate'|'declined'|'needs_review';
  quote?:SupplierQuote;
  warnings:string[];
  missingFields:string[];
}
function stableTokenHash(x:string){
  let a=2166136261>>>0,b=0x9e3779b9>>>0;
  for(let i=0;i<x.length;i++){a=Math.imul(a^x.charCodeAt(i),16777619)>>>0;b=Math.imul(b+x.charCodeAt(i)+i,2246822519)>>>0}
  return `${a.toString(16).padStart(8,'0')}${b.toString(16).padStart(8,'0')}${(a^b).toString(16).padStart(8,'0')}`;
}
const token=(rfqId:string,supplierId:string)=>stableTokenHash(`${rfqId}:${supplierId}:makster-material-rfq-v1`).slice(0,20).toUpperCase();

export function materialSupplierEligibility(supplier:SupplierProfile,rfq:Pick<MaterialProcurementRfq,'currency'|'sku'>){
  if(!supplier.active||supplier.currency!==rfq.currency)return false;
  if(!supplier.email?.includes('@'))return false;
  const categories=(supplier.categories??[]).map(x=>x.toLowerCase());
  if(!categories.length)return true;
  const sku=rfq.sku.toLowerCase();
  return categories.some(c=>sku.includes(c)||c==='all'||c==='materials'||c==='hardware');
}

export function createMaterialRfq(input:{
  projectId:string;projectTitle:string;sku:string;description:string;quantity:number;unit:OpsUnit;currency:string;
  suppliers:SupplierProfile[];strategy?:'optimal'|'cheapest'|'fastest';responseDeadline?:string;createdBy?:string;note?:string;rfqId?:string;
}):MaterialProcurementRfq{
  if(!input.projectId||!input.sku.trim()||input.quantity<=0)throw new Error('material_rfq_invalid_demand');
  const id=input.rfqId??crypto.randomUUID();
  const probe={currency:input.currency,sku:input.sku};
  const eligible=input.suppliers.filter(s=>materialSupplierEligibility(s,probe as any));
  if(!eligible.length)throw new Error('material_rfq_has_no_eligible_suppliers');
  const deadline=input.responseDeadline??new Date(Date.now()+48*3600_000).toISOString();
  return {
    id,projectId:input.projectId,projectTitle:input.projectTitle,sku:input.sku,description:input.description,
    quantity:input.quantity,unit:input.unit,currency:input.currency,supplierIds:eligible.map(x=>x.id),
    strategy:input.strategy??'optimal',responseDeadline:deadline,status:'ready_to_send',
    createdBy:input.createdBy??'owner',createdAt:new Date().toISOString(),...(input.note?{note:input.note}:{})
  };
}

export function composeMaterialRfqInvitation(rfq:MaterialProcurementRfq,supplier:SupplierProfile):MaterialRfqDraft{
  if(!rfq.supplierIds.includes(supplier.id))throw new Error('material_supplier_not_invited');
  if(!supplier.email?.includes('@'))throw new Error('material_supplier_email_missing');
  const responseToken=token(rfq.id,supplier.id);
  const subject=`Makster RFQ ${rfq.id} — ${rfq.sku} × ${rfq.quantity} ${rfq.unit}`;
  const bodyText=`Hello ${supplier.name},

Makster requests a quotation for a furniture project material/hardware item.

RFQ ID: ${rfq.id}
Project: ${rfq.projectTitle}
SKU / code: ${rfq.sku}
Description: ${rfq.description}
Quantity: ${rfq.quantity}
Unit: ${rfq.unit}
Currency: ${rfq.currency}
Response deadline: ${rfq.responseDeadline}
Response token: ${responseToken}

Please reply using the structured block below.

MAKSTER MATERIAL QUOTE
RFQ_ID: ${rfq.id}
RESPONSE_TOKEN: ${responseToken}
UNIT_PRICE: 
DELIVERY_PRICE: 0
LEAD_DAYS: 
VALID_UNTIL: 
NOTE: 
END MAKSTER MATERIAL QUOTE

If you cannot quote this item:

MAKSTER MATERIAL DECLINE
RFQ_ID: ${rfq.id}
RESPONSE_TOKEN: ${responseToken}
END MAKSTER MATERIAL DECLINE

Thank you.
Makster Procurement`;
  return {supplierId:supplier.id,supplierName:supplier.name,supplierEmail:supplier.email,subject,bodyText,responseToken};
}

function block(text:string,start:string,end:string){
  const s=text.indexOf(start);if(s<0)return undefined;
  const e=text.indexOf(end,s+start.length);if(e<0)return undefined;
  return text.slice(s+start.length,e).trim();
}
function fields(text:string){
  const m=new Map<string,string>();
  for(const raw of text.split(/\r?\n/)){const i=raw.indexOf(':');if(i>0)m.set(raw.slice(0,i).trim().toUpperCase(),raw.slice(i+1).trim())}
  return m;
}
export function parseMaterialRfqReply(input:{
  rfq:MaterialProcurementRfq;supplier:SupplierProfile;text:string;fromEmail:string;receivedAt?:string;quoteId?:string;
}):ParsedMaterialRfqReply{
  const warnings:string[]=[];
  if(!input.supplier.email)warnings.push('supplier_email_missing');
  else if(input.supplier.email.toLowerCase()!==input.fromEmail.trim().toLowerCase())warnings.push('sender_email_mismatch');
  const decline=block(input.text,'MAKSTER MATERIAL DECLINE','END MAKSTER MATERIAL DECLINE');
  if(decline!==undefined){
    const f=fields(decline);
    if(f.get('RFQ_ID')!==input.rfq.id)warnings.push('rfq_id_mismatch');
    if(f.get('RESPONSE_TOKEN')!==token(input.rfq.id,input.supplier.id))warnings.push('response_token_mismatch');
    return {classification:warnings.length?'needs_review':'declined',warnings,missingFields:[]};
  }
  const q=block(input.text,'MAKSTER MATERIAL QUOTE','END MAKSTER MATERIAL QUOTE');
  if(q===undefined)return {classification:'needs_review',warnings:[...warnings,'structured_material_quote_block_missing'],missingFields:['structured_quote_block']};
  const f=fields(q),required=['RFQ_ID','RESPONSE_TOKEN','UNIT_PRICE','LEAD_DAYS'];
  const missingFields=required.filter(k=>!f.get(k));
  if(f.get('RFQ_ID')!==input.rfq.id)warnings.push('rfq_id_mismatch');
  if(f.get('RESPONSE_TOKEN')!==token(input.rfq.id,input.supplier.id))warnings.push('response_token_mismatch');
  if(missingFields.length||warnings.length)return {classification:'needs_review',warnings,missingFields};
  const unitPrice=Number(f.get('UNIT_PRICE')),delivery=Number(f.get('DELIVERY_PRICE')||0),lead=Number(f.get('LEAD_DAYS'));
  if(!(unitPrice>=0)||!(delivery>=0)||!(lead>0))return {classification:'needs_review',warnings:['invalid_numeric_quote_fields'],missingFields:[]};
  const quote:SupplierQuote={
    id:input.quoteId??crypto.randomUUID(),supplierId:input.supplier.id,rfqId:input.rfq.id,
    reference:`Material RFQ ${input.rfq.id}`,currency:input.rfq.currency,
    lines:[{sku:input.rfq.sku,quantity:input.rfq.quantity,unit:input.rfq.unit,unitPriceMinor:Math.round(unitPrice*100)}],
    leadTimeDays:lead,...(f.get('VALID_UNTIL')?{validUntil:f.get('VALID_UNTIL')!}:{}),
    deliveryCostMinor:Math.round(delivery*100),createdAt:input.receivedAt??new Date().toISOString()
  };
  return {classification:'quote_candidate',quote,warnings:[],missingFields:[]};
}

export function materialRfqComparison(rfq:MaterialProcurementRfq,state:OwnerOperationsState){
  const ranking=compareSupplierQuotesForShortage(state,{sku:rfq.sku,shortage:rfq.quantity,unit:rfq.unit},rfq.strategy)
    .filter(x=>state.supplierQuotes.find(q=>q.id===x.quoteId)?.rfqId===rfq.id);
  return {rfqId:rfq.id,strategy:rfq.strategy,ranking,recommendedQuoteId:ranking[0]?.quoteId??null};
}


export function materialRfqReminderCandidates(state:OwnerOperationsState,now=new Date(),afterHours=24){
  const out:Array<{rfqId:string;supplierId:string;communicationId:string;dueAt:string}>=[];
  for(const rfq of state.materialRfqs??[]){
    if(!['sent','partially_quoted'].includes(rfq.status))continue;
    for(const supplierId of rfq.supplierIds){
      const inbound=(state.materialRfqCommunications??[]).some(x=>x.rfqId===rfq.id&&x.supplierId===supplierId&&x.direction==='inbound');
      if(inbound)continue;
      const outbound=(state.materialRfqCommunications??[]).filter(x=>x.rfqId===rfq.id&&x.supplierId===supplierId&&x.direction==='outbound'&&x.status==='sent').sort((a,b)=>(b.sentAt??b.createdAt).localeCompare(a.sentAt??a.createdAt))[0];
      if(!outbound)continue;
      const base=Date.parse(outbound.sentAt??outbound.createdAt),due=new Date(base+afterHours*3600_000);
      if(due.getTime()<=now.getTime()&&due.getTime()<=Date.parse(rfq.responseDeadline))out.push({rfqId:rfq.id,supplierId,communicationId:outbound.id,dueAt:due.toISOString()});
    }
  }
  return out;
}

export function buildProcurementAutomationCenter(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState,
  now=new Date()
){
  const allocation=buildBomAllocationPlan(rows,state);
  const openRfqs=(state.materialRfqs??[]).filter(x=>!['awarded','closed'].includes(x.status));
  const covered=new Set(openRfqs.map(x=>`${x.projectId}|${x.sku.toLowerCase()}`));
  const shortages=allocation.demands.filter(x=>x.shortage>0).map(d=>{
    const key=`${d.projectId}|${d.sku.toLowerCase()}`;
    const rfq=openRfqs.find(x=>`${x.projectId}|${x.sku.toLowerCase()}`===key);
    return {...d,rfqId:rfq?.id??null,rfqStatus:rfq?.status??null,needsRfq:!covered.has(key)};
  });
  const rfqs=(state.materialRfqs??[]).map(r=>{
    const quotes=(state.supplierQuotes??[]).filter(q=>q.rfqId===r.id);
    const comm=(state.materialRfqCommunications??[]).filter(x=>x.rfqId===r.id);
    const cmp=materialRfqComparison(r,state);
    const pendingSupplierIds=r.supplierIds.filter(id=>!quotes.some(q=>q.supplierId===id)&&!comm.some(c=>c.supplierId===id&&c.direction==='inbound'&&c.kind==='decline'));
    return {
      ...r,quoteCount:quotes.length,communicationCount:comm.length,pendingSupplierCount:pendingSupplierIds.length,
      overdue:Date.parse(r.responseDeadline)<now.getTime()&&pendingSupplierIds.length>0,
      recommendedQuoteId:cmp.recommendedQuoteId,ranking:cmp.ranking
    };
  }).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||b.createdAt.localeCompare(a.createdAt));
  const reminderDue=materialRfqReminderCandidates(state,now);
  return {
    version:'5.0.0',generatedAt:new Date().toISOString(),shortages,rfqs,reminderDue,
    summary:{
      shortagePositions:shortages.length,shortagesWithoutRfq:shortages.filter(x=>x.needsRfq).length,
      openRfqs:rfqs.filter(x=>!['awarded','closed'].includes(x.status)).length,
      overdueRfqs:rfqs.filter(x=>x.overdue).length,
      quotesReceived:rfqs.reduce((s,x)=>s+x.quoteCount,0),
      recommendedWinners:rfqs.filter(x=>x.recommendedQuoteId).length,
      remindersDue:reminderDue.length
    }
  };
}

export function makeMaterialCommunicationDraft(rfq:MaterialProcurementRfq,supplier:SupplierProfile,provider:'memory'|'gmail'='memory'):MaterialRfqCommunication{
  const draft=composeMaterialRfqInvitation(rfq,supplier);
  return {
    id:crypto.randomUUID(),rfqId:rfq.id,supplierId:supplier.id,supplierName:supplier.name,supplierEmail:draft.supplierEmail,
    direction:'outbound',kind:'rfq_invitation',status:'draft',subject:draft.subject,bodyText:draft.bodyText,
    responseToken:draft.responseToken,provider,createdAt:new Date().toISOString()
  };
}
