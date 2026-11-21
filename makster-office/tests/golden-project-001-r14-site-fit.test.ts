import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { validateProjectModel } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';

async function r14(): Promise<ProjectModelV1> {
  return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/golden.kitchen.001.r14.site-fit.json'), 'utf8')) as ProjectModelV1;
}

test('Golden Project #1 R14 validates and releases no-name appliances as explicit site-fit operations', async()=>{
  const p=await r14();
  assert.equal(p.revision,14);
  assert.equal(validateProjectModel(p).ok,true);
  const e=new MaksterEngineeringCompiler().compile(p);
  assert.equal(e.issues.filter(i=>i.severity==='blocking').length,0);
  assert.equal(e.readyForProduction,true);
  assert.equal(e.issues.filter(i=>i.code==='KITCHEN_APPLIANCE_SITE_FIT').length,2);
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_ENVELOPE_REQUIRED'),false);
  assert.equal(e.issues.filter(i=>i.code==='KITCHEN_CUTOUT_ON_SITE').length,2);
});

test('R14 keeps the verified GTV drawer geometry unchanged', async()=>{
  const e=new MaksterEngineeringCompiler().compile(await r14());
  const m1=e.parts.filter(p=>p.moduleId==='26100001-0000-4000-8000-000000000001');
  const side=m1.find(p=>p.name==='M1 drawer 1 sides');
  const back=m1.find(p=>p.name==='M1 drawer 1 back');
  assert.equal(Number(side?.length),4900);
  assert.equal(Number(back?.length)+2*Number(side?.thickness),5510);
});


test('R14 manual workshop checklist explicitly carries site-fit and on-site cutout operations', async()=>{
  const p=await r14();
  const e=new MaksterEngineeringCompiler().compile(p);
  const pack=buildProductionPack({project:p,engineering:e,route:'manual_workshop',packId:'golden-r14-site-fit'});
  const checklist=pack.files['workshop-checklist.txt']??'';
  assert.ok(checklist.includes('KITCHEN_APPLIANCE_SITE_FIT'));
  assert.ok(checklist.includes('KITCHEN_CUTOUT_ON_SITE'));
  assert.ok(checklist.includes('GTV_RUNNER_MANUAL_TEMPLATE'));
});
