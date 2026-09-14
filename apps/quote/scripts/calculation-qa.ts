import assert from 'node:assert/strict';
import { calculateQuote, formatMinor, type CostBreakdown } from '../src/lib/calculation.ts';

function costs(overrides:Partial<CostBreakdown>={}):CostBreakdown{
  return {
    board:0n,
    fronts:0n,
    edges:0n,
    hardware:0n,
    production:0n,
    labour:0n,
    delivery:0n,
    installation:0n,
    other:0n,
    ...overrides,
  };
}

function test(name:string,run:()=>void){
  try{run();console.log(`✓ ${name}`);}catch(error){console.error(`✗ ${name}`);throw error;}
}

test('zero-cost quote stays zero',()=>{
  const result=calculateQuote({costs:costs(),overheadBps:0,targetMarginBps:3500,taxBps:2100});
  assert.equal(result.directCostMinor,0n);
  assert.equal(result.trueCostMinor,0n);
  assert.equal(result.netSalesMinor,0n);
  assert.equal(result.grossSalesMinor,0n);
  assert.equal(result.marginBps,0);
});

test('direct cost includes every cost bucket',()=>{
  const result=calculateQuote({
    costs:costs({board:10_000n,fronts:20_000n,edges:3_000n,hardware:7_000n,production:4_000n,labour:9_000n,delivery:5_000n,installation:6_000n,other:2_000n}),
    overheadBps:0,targetMarginBps:0,taxBps:0,
  });
  assert.equal(result.directCostMinor,66_000n);
  assert.equal(result.trueCostMinor,66_000n);
  assert.equal(result.netSalesMinor,66_000n);
});

test('10% overhead and 35% margin produce a margin-safe price',()=>{
  const result=calculateQuote({costs:costs({board:100_000n}),overheadBps:1000,targetMarginBps:3500,taxBps:2100});
  assert.equal(result.directCostMinor,100_000n);
  assert.equal(result.overheadMinor,10_000n);
  assert.equal(result.trueCostMinor,110_000n);
  assert.equal(result.netSalesMinor,169_231n);
  assert.equal(result.taxMinor,35_539n);
  assert.equal(result.grossSalesMinor,204_770n);
  assert.ok(result.marginBps>=3500,'realised margin must never fall below target because of rounding');
});

test('tax changes gross price but not net price or profit',()=>{
  const base={costs:costs({board:75_000n,hardware:25_000n}),overheadBps:500,targetMarginBps:3000};
  const withoutTax=calculateQuote({...base,taxBps:0});
  const withTax=calculateQuote({...base,taxBps:2100});
  assert.equal(withTax.netSalesMinor,withoutTax.netSalesMinor);
  assert.equal(withTax.profitMinor,withoutTax.profitMinor);
  assert.ok(withTax.grossSalesMinor>withoutTax.grossSalesMinor);
});

test('rounding invariants hold across a broad deterministic matrix',()=>{
  const directCosts=[1n,99n,100n,999n,10_001n,99_999n,1_234_567n];
  const overheads=[0,250,1000,1750];
  const margins=[0,1000,3000,3500,4000,6500];
  const taxes=[0,1200,2100];
  for(const direct of directCosts){
    for(const overheadBps of overheads){
      for(const targetMarginBps of margins){
        for(const taxBps of taxes){
          const result=calculateQuote({costs:costs({board:direct}),overheadBps,targetMarginBps,taxBps});
          assert.equal(result.trueCostMinor,result.directCostMinor+result.overheadMinor);
          assert.equal(result.profitMinor,result.netSalesMinor-result.trueCostMinor);
          assert.equal(result.grossSalesMinor,result.netSalesMinor+result.taxMinor);
          assert.ok(result.netSalesMinor>=result.trueCostMinor);
          assert.ok(result.marginBps>=targetMarginBps-1,`margin ${result.marginBps} unexpectedly below ${targetMarginBps}`);
        }
      }
    }
  }
});

test('invalid basis-point inputs are rejected',()=>{
  assert.throws(()=>calculateQuote({costs:costs(),overheadBps:-1,targetMarginBps:3500,taxBps:0}));
  assert.throws(()=>calculateQuote({costs:costs(),overheadBps:0,targetMarginBps:10_000,taxBps:0}));
  assert.throws(()=>calculateQuote({costs:costs(),overheadBps:0,targetMarginBps:3500,taxBps:-1}));
});

test('negative total cost is rejected',()=>{
  assert.throws(()=>calculateQuote({costs:costs({board:-1n}),overheadBps:0,targetMarginBps:3500,taxBps:0}));
});

test('currency formatting keeps minor-unit precision',()=>{
  const formatted=formatMinor(123_456n,'CZK','cs-CZ');
  assert.match(formatted,/1.?234,56/);
});

console.log('Makster Quote calculation QA passed.');
