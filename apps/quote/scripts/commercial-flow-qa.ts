import assert from 'node:assert/strict';
import { effectiveQuoteStatus, quoteActionAllowed, quoteReference } from '../src/lib/quote-lifecycle.ts';
import { readProjectCommercialSettings } from '../src/lib/project-pricing.ts';

function test(name:string,run:()=>void){
  try{run();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

test('active quote becomes effectively expired after validity deadline',()=>{
  const deadline='2026-09-14T12:00:00.000Z';
  assert.equal(effectiveQuoteStatus('approved',deadline,Date.parse('2026-09-14T11:59:59.000Z')),'approved');
  assert.equal(effectiveQuoteStatus('approved',deadline,Date.parse('2026-09-14T12:00:01.000Z')),'expired');
  assert.equal(effectiveQuoteStatus('sent',deadline,Date.parse('2026-09-14T12:00:01.000Z')),'expired');
  assert.equal(effectiveQuoteStatus('accepted',deadline,Date.parse('2026-09-15T12:00:00.000Z')),'accepted');
  assert.equal(effectiveQuoteStatus('rejected',deadline,Date.parse('2026-09-15T12:00:00.000Z')),'rejected');
  assert.equal(effectiveQuoteStatus('superseded',deadline,Date.parse('2026-09-15T12:00:00.000Z')),'superseded');
});

test('client actions stop at expiry and terminal states stay terminal',()=>{
  const deadline='2026-09-14T12:00:00.000Z';
  assert.equal(quoteActionAllowed('approved',deadline,Date.parse('2026-09-14T11:00:00.000Z')),true);
  assert.equal(quoteActionAllowed('sent',deadline,Date.parse('2026-09-14T11:00:00.000Z')),true);
  assert.equal(quoteActionAllowed('approved',deadline,Date.parse('2026-09-14T12:00:01.000Z')),false);
  assert.equal(quoteActionAllowed('accepted',deadline,Date.parse('2026-09-14T11:00:00.000Z')),false);
  assert.equal(quoteActionAllowed('rejected',deadline,Date.parse('2026-09-14T11:00:00.000Z')),false);
  assert.equal(quoteActionAllowed('superseded',deadline,Date.parse('2026-09-14T11:00:00.000Z')),false);
});

test('published quote reference is stable and client-friendly',()=>{
  assert.equal(quoteReference('12345678-abcd-4abc-8abc-123456789abc',3),'MQ-003-12345678');
  assert.equal(quoteReference('abcd-1234',12),'MQ-012-ABCD1234');
  assert.equal(quoteReference('',1),'MQ-001-PROJECT');
});

test('project VAT is canonical and legacy quote VAT is only a fallback',()=>{
  assert.equal(readProjectCommercialSettings({taxBps:2100,quoteCommercial:{taxBps:0}}).taxBps,2100);
  assert.equal(readProjectCommercialSettings({quoteCommercial:{taxBps:2100}}).taxBps,2100);
});

console.log('Makster Quote commercial flow QA passed.');
