import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';
import { buildClientQuote, buildCommercialEstimate, buildCommercialPackage, type CommercialPricingProfile } from '../packages/commercial-engine/src/index.js';

async function setup(){
  const project=JSON.parse(await readFile(new URL('file://'+process.cwd()+'/packages/project-model/examples/wardrobe.blum.v1.json'),'utf8')) as ProjectModelV1;
  const engineering=new MaksterEngineeringCompiler().compile(project);
  const pack=buildProductionPack({project,engineering,route:'manual_workshop',packId:'commercial-pack',generatedAt:'2026-09-04T10:00:00Z'});
  const pricing:CommercialPricingProfile={
    profileId:'atelier-demo-eur-v1',name:'TEST ONLY Atelier profile',currency:'EUR',
    materialPrices:[
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 18 mm',pricingMode:'per_sheet',thicknessMm:18,unitCostMinor:9200,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 16 mm',pricingMode:'per_sheet',thicknessMm:16,unitCostMinor:8200,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 8 mm',pricingMode:'per_sheet',thicknessMm:8,unitCostMinor:4500,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444442',label:'Graphite front',pricingMode:'per_m2',thicknessMm:18,unitCostMinor:11500},
      {materialSelectionId:'44444444-4444-4444-8444-444444444443',label:'HDF back',pricingMode:'per_m2',thicknessMm:8,unitCostMinor:1700},
    ],
    edgePrices:[{materialSelectionId:'44444444-4444-4444-8444-444444444444',unitCostPerMeterMinor:75}],
    hardwarePrices:[
      {role:'rail',unitCostMinor:2400},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888881',unitCostMinor:680},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888882',unitCostMinor:6200},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888883',unitCostMinor:8900},
    ],
    labor:[
      {id:'workshop',label:'Workshop fabrication and assembly',minutes:28*60,hourlyCostMinor:2600},
      {id:'install',label:'On-site installation',minutes:10*60,hourlyCostMinor:2900,category:'installation'},
    ],
    fixedCosts:[{id:'transport',label:'Transport and handling',category:'transport',costMinor:12000}],
    overheadBps:800,markupBps:3500,discountBps:0,taxBps:2100,commercialRoundingMinor:1000,
  };
  return {project,engineering,pack,pricing};
}

test('commercial estimate prices exact engineering BOM and becomes ready',async()=>{
  const {project,engineering,pack,pricing}=await setup();
  assert.equal(engineering.readyForProduction,true);
  const estimate=buildCommercialEstimate({project,engineering,productionPack:pack,pricing,estimateId:'est-1',generatedAt:'2026-09-04T10:00:00Z'});
  assert.equal(estimate.ready,true);
  assert.equal(estimate.blockers.length,0);
  assert.ok(estimate.lines.some(l=>l.category==='material'));
  assert.ok(estimate.lines.some(l=>l.category==='hardware'));
  assert.ok(estimate.lines.some(l=>l.category==='edge'));
  assert.ok(estimate.totals.profitMinor>0);
  assert.ok(estimate.totals.grossSalesMinor>estimate.totals.netSalesMinor);
});

test('missing hardware price blocks final commercial readiness instead of guessing',async()=>{
  const {project,engineering,pricing}=await setup(); const altered=structuredClone(pricing); altered.hardwarePrices=[];
  const estimate=buildCommercialEstimate({project,engineering,pricing:altered});
  assert.equal(estimate.ready,false);
  assert.ok(estimate.blockers.some(b=>b.code==='HARDWARE_PRICE_MISSING'));
});

test('same inputs and fixed timestamp produce same estimate fingerprint',async()=>{
  const {project,engineering,pricing}=await setup();
  const a=buildCommercialEstimate({project,engineering,pricing,estimateId:'same',generatedAt:'2026-09-04T10:00:00Z'});
  const b=buildCommercialEstimate({project,engineering,pricing,estimateId:'same',generatedAt:'2026-09-04T10:00:00Z'});
  assert.equal(a.estimateFingerprint,b.estimateFingerprint);
  const changed=structuredClone(pricing); changed.markupBps=3600;
  const c=buildCommercialEstimate({project,engineering,pricing:changed,estimateId:'same',generatedAt:'2026-09-04T10:00:00Z'});
  assert.notEqual(a.estimateFingerprint,c.estimateFingerprint);
});

test('discount reduces profit and is explicit in estimate',async()=>{
  const {project,engineering,pricing}=await setup();
  const base=buildCommercialEstimate({project,engineering,pricing});
  const discountedProfile=structuredClone(pricing); discountedProfile.discountBps=1000;
  const discounted=buildCommercialEstimate({project,engineering,pricing:discountedProfile});
  assert.ok(discounted.totals.discountMinor>0);
  assert.ok(discounted.totals.profitMinor<base.totals.profitMinor);
  assert.ok(discounted.warnings.some(w=>w.code==='DISCOUNT_APPLIED'));
});

test('supplier quote can replace/add real external service cost with source provenance',async()=>{
  const {project,engineering,pricing}=await setup(); const p=structuredClone(pricing);
  p.supplierQuote={quoteId:'q-428',supplierId:'supplier-1',supplierName:'Prague Cut Service',totalPriceMinor:42800,services:['cutting','edging']};
  const estimate=buildCommercialEstimate({project,engineering,pricing:p});
  const external=estimate.lines.find(l=>l.source==='supplier_quote');
  assert.equal(external?.totalCostMinor,42800);
  assert.equal(external?.sourceReference,'q-428');
});

test('client quote never exposes internal cost or margin and payment schedule sums exactly',async()=>{
  const {project,engineering,pricing}=await setup(); const estimate=buildCommercialEstimate({project,engineering,pricing,estimateId:'est-client'});
  const quote=buildClientQuote({estimate,quoteId:'quote-1',issuedAt:'2026-09-04T10:00:00Z',terms:{clientName:'Test Client',paymentTerms:[{label:'Deposit',bps:5000},{label:'Before installation',bps:4000},{label:'Handover',bps:1000}]}});
  assert.equal(quote.paymentSchedule.reduce((s,p)=>s+p.amountMinor,0),quote.totalAmountMinor);
  const json=JSON.stringify(quote);
  assert.equal(json.includes('profitMinor'),false);
  assert.equal(json.includes('totalCostMinor'),false);
});

test('commercial package separates internal breakdown from client-facing offer and hashes payloads',async()=>{
  const {project,engineering,pack,pricing}=await setup();
  const built=buildCommercialPackage({project,engineering,productionPack:pack,pricing,estimateId:'est-pkg',quoteId:'quote-pkg',packageId:'pkg-1',generatedAt:'2026-09-04T10:00:00Z',quoteTerms:{clientName:'Müller',leadTimeText:'30–45 days',inclusions:['Furniture production','Installation'],exclusions:['Electrical work'],sellerName:'Makster Atelier'}});
  assert.equal(built.estimate.ready,true);
  assert.ok(built.files['cost-breakdown.csv']?.includes('PROFIT'));
  assert.equal(built.files['client-offer.html']?.includes('PROFIT'),false);
  assert.equal(built.manifest.files.length,4);
  assert.ok(built.manifest.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)));
});
