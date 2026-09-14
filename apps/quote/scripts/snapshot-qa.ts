import assert from 'node:assert/strict';
import { readQuoteSnapshot } from '../src/lib/quote-snapshot.ts';

function fixture() {
  return {
    schemaVersion:'mq-quote-0.1.12',
    issuedAt:'2026-09-14T12:00:00.000Z',
    validUntil:'2026-09-28T12:00:00.000Z',
    locale:'cs',
    currency:'CZK',
    project:{id:'11111111-1111-4111-8111-111111111111',name:'Kitchen Novák',revisionNumber:3},
    client:{id:'22222222-2222-4222-8222-222222222222',name:'Jan Novák',email:'jan@example.com',phone:'+420123456789',address:'Praha, Czechia'},
    supplier:{
      tradeName:'Makster Atelier',legalName:'Makster Atelier s.r.o.',registrationId:'12345678',vatId:'CZ12345678',address:'Praha, Czechia',email:'hello@example.com',phone:'+420111222333',website:'https://example.com',bankAccount:'123/0100',iban:'CZ6508000000192000145399',footerText:'',
    },
    modules:[{id:'33333333-3333-4333-8333-333333333333',name:'Spodní skříňka',moduleKey:'base-door',widthMm:600,heightMm:720,depthMm:560,quantity:2}],
    extras:[{category:'installation',name:'Montáž',amountMinor:'150000',unit:'job'}],
    commercial:{variantKey:'standard',variantLabel:'Standard',targetMarginBps:3500,adjustmentMode:'discount',adjustmentBps:500,listNetMinor:'1000000',adjustmentMinor:'-50000',actualMarginBps:3150},
    terms:{depositBps:5000,productionLeadText:'6 týdnů',paymentTerms:'50 / 50',warrantyText:'24 měsíců',clientNote:''},
    amounts:{netMinor:'950000',taxMinor:'199500',totalMinor:'1149500',depositMinor:'574750',taxBps:2100},
  };
}

function copy<T>(value:T):T {
  return structuredClone(value);
}

function test(name:string, run:()=>void) {
  try { run(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('valid immutable quote snapshot parses',()=>{
  const parsed=readQuoteSnapshot(fixture());
  assert.ok(parsed);
  assert.equal(parsed.project.revisionNumber,3);
  assert.equal(parsed.amounts.totalMinor,'1149500');
});

test('unsupported schema is rejected',()=>{
  const value=copy(fixture()) as Record<string,unknown>;
  value.schemaVersion='mq-quote-9.9.9';
  assert.equal(readQuoteSnapshot(value),null);
});

test('unknown locale and malformed currency are rejected',()=>{
  const locale=copy(fixture()) as Record<string,unknown>;
  locale.locale='fr';
  assert.equal(readQuoteSnapshot(locale),null);
  const currency=copy(fixture()) as Record<string,unknown>;
  currency.currency='EURO';
  assert.equal(readQuoteSnapshot(currency),null);
});

test('invalid or reversed validity dates are rejected',()=>{
  const malformed=copy(fixture());
  malformed.validUntil='not-a-date';
  assert.equal(readQuoteSnapshot(malformed),null);
  const reversed=copy(fixture());
  reversed.validUntil='2026-09-13T12:00:00.000Z';
  assert.equal(readQuoteSnapshot(reversed),null);
});

test('empty or invalid module geometry is rejected',()=>{
  const empty=copy(fixture());
  empty.modules=[];
  assert.equal(readQuoteSnapshot(empty),null);
  const width=copy(fixture());
  width.modules[0].widthMm=0;
  assert.equal(readQuoteSnapshot(width),null);
  const quantity=copy(fixture());
  quantity.modules[0].quantity=0;
  assert.equal(readQuoteSnapshot(quantity),null);
});

test('negative extras and invalid units are rejected',()=>{
  const negative=copy(fixture());
  negative.extras[0].amountMinor='-1';
  assert.equal(readQuoteSnapshot(negative),null);
  const badUnit=copy(fixture()) as any;
  badUnit.extras[0].unit='kg';
  assert.equal(readQuoteSnapshot(badUnit),null);
});

test('commercial adjustment structure and arithmetic are enforced',()=>{
  assert.ok(readQuoteSnapshot(fixture()));
  const badMode=copy(fixture()) as any;
  badMode.commercial.adjustmentMode='coupon';
  assert.equal(readQuoteSnapshot(badMode),null);
  const negativeList=copy(fixture());
  negativeList.commercial.listNetMinor='-1';
  assert.equal(readQuoteSnapshot(negativeList),null);
  const wrongAdjustment=copy(fixture());
  wrongAdjustment.commercial.adjustmentMinor='-49999';
  assert.equal(readQuoteSnapshot(wrongAdjustment),null);
  const wrongNet=copy(fixture());
  wrongNet.amounts.netMinor='949999';
  wrongNet.amounts.taxMinor='199500';
  wrongNet.amounts.totalMinor='1149499';
  wrongNet.amounts.depositMinor='574750';
  assert.equal(readQuoteSnapshot(wrongNet),null);
});

test('tax, total and deposit arithmetic are enforced',()=>{
  const negative=copy(fixture());
  negative.amounts.netMinor='-1';
  assert.equal(readQuoteSnapshot(negative),null);
  const tax=copy(fixture());
  tax.amounts.taxMinor='199499';
  tax.amounts.totalMinor='1149499';
  assert.equal(readQuoteSnapshot(tax),null);
  const total=copy(fixture());
  total.amounts.totalMinor='1149499';
  assert.equal(readQuoteSnapshot(total),null);
  const deposit=copy(fixture());
  deposit.amounts.depositMinor='574749';
  assert.equal(readQuoteSnapshot(deposit),null);
});

test('required identity fields cannot be blank and optional contact fields stay typed',()=>{
  const client=copy(fixture());
  client.client.name='   ';
  assert.equal(readQuoteSnapshot(client),null);
  const supplier=copy(fixture());
  supplier.supplier.tradeName='';
  assert.equal(readQuoteSnapshot(supplier),null);
  const contact=copy(fixture()) as any;
  contact.client.email=123;
  assert.equal(readQuoteSnapshot(contact),null);
});

console.log('Makster Quote snapshot QA passed.');
