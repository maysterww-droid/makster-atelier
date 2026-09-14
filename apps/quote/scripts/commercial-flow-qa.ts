import assert from 'node:assert/strict';
import { calculateQuote, type CostBreakdown } from '../src/lib/calculation.ts';
import { applySellingAdjustment } from '../src/lib/project-commercial-options.ts';
import { calculateDepositMinor } from '../src/lib/project-pricing.ts';
import { effectiveQuoteStatus, quoteActionAllowed, quoteReference } from '../src/lib/quote-lifecycle.ts';

function costs(overrides:Partial<CostBreakdown>={}):CostBreakdown{
  return { board:0n, fronts:0n, edges:0n, hardware:0n, production:0n, labour:0n, delivery:0n, installation:0n, other:0n, ...overrides };
}

function test(name:string,run:()=>void){
  try{run();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

const pricing=calculateQuote({costs:costs({board:100_000n}),overheadBps:0,targetMarginBps:3500,taxBps:2100});

test('discount is applied to net price before tax and preserves arithmetic',()=>{
  const adjusted=applySellingAdjustment(pricing,2100,'discount',500);
  assert.equal(adjusted.listNetSalesMinor,153_847n);
  assert.equal(adjusted.sellingAdjustmentMinor,-7_692n);
  assert.equal(adjusted.netSalesMinor,146_155n);
  assert.equal(adjusted.taxMinor,30_693n);
  assert.equal(adjusted.grossSalesMinor,176_848n);
  assert.equal(adjusted.profitMinor,46_155n);
});

test('surcharge is applied to net price before tax',()=>{
  const adjusted=applySellingAdjustment(pricing,2100,'surcharge',500);
  assert.equal(adjusted.sellingAdjustmentMinor,7_692n);
  assert.equal(adjusted.netSalesMinor,161_539n);
  assert.equal(adjusted.grossSalesMinor,195_462n);
});

test('deposit is calculated from client payable total',()=>{
  assert.equal(calculateDepositMinor(176_848n,5000),88_424n);
  assert.equal(calculateDepositMinor(176_848n,0),0n);
  assert.equal(calculateDepositMinor(176_848n,10_000),176_848n);
});

test('active quote becomes effectively expired after validity deadline',()=>{
  const deadline='2026-09-14T12:00:00.000Z';
  assert.equal(effectiveQuoteStatus('approved',deadline,Date.parse('2026-09-14T11:59:59.000Z')),'approved');
  assert.equal(effectiveQuoteStatus('approved',deadline,Date.parse('2026-09-14T12:00:01.000Z')),'expired');
  assert.equal(effectiveQuoteStatus('sent',deadline,Date.parse('2026-09-14T12:00:01.000Z')),'expired');
  assert.equal(effectiveQuoteStatus('accepted',deadline,Date.parse('2026-09-15T12:00:00.000Z')),'accepted');
});

test('client actions stop at expiry and terminal states stay terminal',()=>{
  const deadline='2026-09-14T12:00:00.000Z';
  assert.equal(quoteActionAllowed('approved',deadline,Date.parse('2026-09-14T11:00:00.000Z')),true);
  assert.equal(quoteActionAllowed('sent',deadline,Date.parse('2026-09-14T11:00:00.000Z')),true);
  assert.equal(quoteActionAllowed('approved',deadline,Date.parse('2026-09-14T12:00:01.000Z')),false);
  assert.equal(quoteActionAllowed('accepted',deadline,Date.parse('2026-09-14T11:00:00.000Z')),false);
  assert.equal(quoteActionAllowed('superseded',deadline,Date.parse('2026-09-14T11:00:00.000Z')),false);
});

test('published quote reference is stable and client-friendly',()=>{
  assert.equal(quoteReference('12345678-abcd-4abc-8abc-123456789abc',3),'MQ-003-12345678');
  assert.equal(quoteReference('abcd-1234',12),'MQ-012-ABCD1234');
});

console.log('Makster Quote commercial flow QA passed.');
