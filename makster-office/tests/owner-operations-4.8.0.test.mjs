
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import {
  buildProcurementAutomationCenter,createMaterialRfq,composeMaterialRfqInvitation,
  parseMaterialRfqReply,materialRfqComparison,materialRfqReminderCandidates
} from '../dist/packages/owner-operations/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});
function state(){
  return {
    version:'4.8.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],
    materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],
    projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],
    decisionPlans:[],productionOperations:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()
  };
}
function project(){
  let p=pm.createEmptyProjectModel({projectId:'48000000-0000-4000-8000-000000000001',title:'RFQ Kitchen',projectType:'kitchen',currency:'EUR'});
  p.selections.materials=[
    {id:'48000000-0000-4000-8000-000000000010',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'White',thickness:M(18),grainDirection:'none'},
    {id:'48000000-0000-4000-8000-000000000011',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-E',name:'Edge',thickness:M(.8),grainDirection:'none'}
  ];
  p.furniture=[{
    id:'48000000-0000-4000-8000-000000000020',kind:'kitchen',name:'Base',
    transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},
    dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',
    construction:{carcassThickness:M(18),defaultCarcassMaterialSelectionId:p.selections.materials[0].id,defaultEdgeMaterialSelectionId:p.selections.materials[1].id,backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:'48000000-0000-4000-8000-000000000021',kind:'base',width:{mode:'fixed',value:M(600)},contents:[],kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}}],
    fronts:[]
  }];
  return p;
}
const supplier=(id,name,email,lead=5)=>({id,name,email,currency:'EUR',leadTimeDays:lead,reliabilityPct:98,defectPct:1,paymentTermsDays:30,priceIndex:95,active:true,categories:['materials'],languages:['en'],updatedAt:new Date().toISOString()});

test('Procurement Center exposes BOM shortage and RFQ closes that gap',()=>{
  const p=project(),eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  s.suppliers=[supplier('s1','Supplier 1','one@example.com')];
  const before=buildProcurementAutomationCenter([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T00:00:00Z'));
  const d=before.shortages.find(x=>x.sku==='W980');
  assert.ok(d&&d.shortage>0&&d.needsRfq);
  const rfq=createMaterialRfq({projectId:p.projectId,projectTitle:p.title,sku:d.sku,description:d.description,quantity:d.shortage,unit:d.unit,currency:'EUR',suppliers:s.suppliers,rfqId:'48000000-0000-4000-8000-000000000099'});
  s.materialRfqs=[rfq];
  const after=buildProcurementAutomationCenter([{project:p,engineering:eng,queuePosition:1}],s,new Date('2026-09-07T00:00:00Z'));
  const d2=after.shortages.find(x=>x.sku==='W980');
  assert.equal(d2.needsRfq,false);
  assert.equal(d2.rfqId,rfq.id);
});

test('structured supplier reply imports quote only with matching RFQ token/email',()=>{
  const s=state(),sup=supplier('s1','Supplier 1','one@example.com');
  const rfq=createMaterialRfq({projectId:'p',projectTitle:'Kitchen',sku:'BLUM-X',description:'Hinge',quantity:20,unit:'pcs',currency:'EUR',suppliers:[sup],rfqId:'rfq-structured'});
  const draft=composeMaterialRfqInvitation(rfq,sup);
  const text=`MAKSTER MATERIAL QUOTE
RFQ_ID: ${rfq.id}
RESPONSE_TOKEN: ${draft.responseToken}
UNIT_PRICE: 5.25
DELIVERY_PRICE: 10
LEAD_DAYS: 4
VALID_UNTIL: 2026-09-30T00:00:00Z
NOTE: stock available
END MAKSTER MATERIAL QUOTE`;
  const parsed=parseMaterialRfqReply({rfq,supplier:sup,text,fromEmail:'one@example.com',quoteId:'q1'});
  assert.equal(parsed.classification,'quote_candidate');
  assert.equal(parsed.quote.lines[0].unitPriceMinor,525);
  assert.equal(parsed.quote.deliveryCostMinor,1000);
  assert.equal(parsed.quote.rfqId,rfq.id);

  const wrong=parseMaterialRfqReply({rfq,supplier:sup,text,fromEmail:'attacker@example.com'});
  assert.equal(wrong.classification,'needs_review');
  assert.ok(wrong.warnings.includes('sender_email_mismatch'));
});

test('RFQ comparison ignores same-SKU quotes belonging to another RFQ',()=>{
  const s=state(),a=supplier('a','A','a@example.com',4),b=supplier('b','B','b@example.com',2);
  s.suppliers=[a,b];
  const rfq=createMaterialRfq({projectId:'p',projectTitle:'Kitchen',sku:'BLUM-X',description:'Hinge',quantity:20,unit:'pcs',currency:'EUR',suppliers:s.suppliers,rfqId:'rfq-main'});
  s.materialRfqs=[rfq];
  s.supplierQuotes=[
    {id:'qa',supplierId:'a',rfqId:'rfq-main',currency:'EUR',lines:[{sku:'BLUM-X',quantity:20,unit:'pcs',unitPriceMinor:500}],leadTimeDays:4,deliveryCostMinor:0,createdAt:new Date().toISOString()},
    {id:'qb',supplierId:'b',rfqId:'other-rfq',currency:'EUR',lines:[{sku:'BLUM-X',quantity:20,unit:'pcs',unitPriceMinor:100}],leadTimeDays:1,deliveryCostMinor:0,createdAt:new Date().toISOString()}
  ];
  const cmp=materialRfqComparison(rfq,s);
  assert.equal(cmp.ranking.length,1);
  assert.equal(cmp.ranking[0].quoteId,'qa');
  assert.equal(cmp.recommendedQuoteId,'qa');
});

test('reminders become due only for unanswered sent suppliers',()=>{
  const s=state(),sup=supplier('s1','Supplier','one@example.com');
  const rfq=createMaterialRfq({projectId:'p',projectTitle:'Kitchen',sku:'X',description:'Item',quantity:2,unit:'pcs',currency:'EUR',suppliers:[sup],rfqId:'rfq-rem',responseDeadline:'2026-09-10T17:00:00Z'});
  rfq.status='sent';s.materialRfqs=[rfq];
  const draft=composeMaterialRfqInvitation(rfq,sup);
  s.materialRfqCommunications=[{id:'c',rfqId:rfq.id,supplierId:sup.id,supplierName:sup.name,supplierEmail:sup.email,direction:'outbound',kind:'rfq_invitation',status:'sent',subject:draft.subject,bodyText:draft.bodyText,responseToken:draft.responseToken,provider:'memory',createdAt:'2026-09-07T00:00:00Z',sentAt:'2026-09-07T00:00:00Z'}];
  assert.equal(materialRfqReminderCandidates(s,new Date('2026-09-08T01:00:00Z'),24).length,1);
  s.materialRfqCommunications.push({id:'in',rfqId:rfq.id,supplierId:sup.id,supplierName:sup.name,supplierEmail:sup.email,direction:'inbound',kind:'decline',status:'received',subject:'x',bodyText:'x',responseToken:draft.responseToken,provider:'memory',createdAt:'2026-09-08T02:00:00Z',receivedAt:'2026-09-08T02:00:00Z'});
  assert.equal(materialRfqReminderCandidates(s,new Date('2026-09-08T03:00:00Z'),24).length,0);
});
