
import test from 'node:test';
import assert from 'node:assert/strict';
import { importCatalogSource, promoteCatalogCandidate, registerHardwareCatalogRecord, searchHardwareCatalog } from '../packages/engineering-engine/src/index.js';

test('2.7.9 CSV hardware import stages unverified records',()=>{
 const r=importCatalogSource({importId:'i1',target:'hardware',format:'csv',fileName:'h.csv',contentText:'manufacturer;family;role;code;nominalLengthMm;maxDynamicLoadKg\\nBlum;Test Runner;runner;X1;550;40'});
 assert.equal(r.parsedCount,1);
 assert.equal(r.candidates[0]?.trust,'imported_unverified');
 assert.equal(r.candidates[0]?.productionEligible,false);
});

test('2.7.9 promotion requires evidence for manufacturer_verified',()=>{
 const r=importCatalogSource({importId:'i2',target:'hardware',format:'json',fileName:'h.json',contentText:'[{"manufacturer":"Blum","family":"Test Hinge","role":"hinge","code":"HX"}]'});
 assert.throws(()=>promoteCatalogCandidate({candidate:r.candidates[0]!,reviewedBy:'tester',manufacturerEvidenceConfirmed:false,trust:'manufacturer_verified'}));
 const rec=promoteCatalogCandidate({candidate:r.candidates[0]!,reviewedBy:'tester',manufacturerEvidenceConfirmed:true,trust:'manufacturer_verified'});
 registerHardwareCatalogRecord(rec as any);
 assert.ok(searchHardwareCatalog({q:'Test Hinge'}).length>=1);
});
