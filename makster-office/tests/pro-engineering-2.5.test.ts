import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ProjectModelV1 } from '../packages/project-model/src/index.js';
import { MaksterEngineeringCompiler } from '../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../packages/production-pack/src/index.js';
import { applyVisualCommand, buildVisualScene, compileVisualCommand } from '../packages/visual-product/src/index.js';

async function kitchen(): Promise<ProjectModelV1> {
  return JSON.parse(await readFile(new URL('file://' + process.cwd() + '/packages/project-model/examples/kitchen.pro.v1.json'), 'utf8')) as ProjectModelV1;
}
const compile = (p: ProjectModelV1) => new MaksterEngineeringCompiler().compile(p);

test('2.5 Kitchen Pro fixture compiles with dedicated ruleset and production-ready engineering', async()=>{
  const e=compile(await kitchen());
  assert.equal(e.ruleSetId,'kitchen-pro-engineering-v2.7.9');
  assert.equal(e.readyForProduction,true);
  assert.equal(e.checks.blocking,0);
});

test('2.5 kitchen base carcasses preserve exact 720 x 560 side geometry', async()=>{
  const e=compile(await kitchen());
  const sides=e.parts.filter(p=>p.kind==='side');
  assert.equal(sides.length,6);
  assert.ok(sides.every(p=>Number(p.length)===7200 && Number(p.width)===5600));
});

test('2.5 kitchen production labels preserve real module numbers instead of repeating M1', async()=>{
  const e=compile(await kitchen());
  const sideNames=e.parts.filter(p=>p.kind==='side').map(p=>p.name);
  assert.equal(sideNames.filter(x=>x.startsWith('M1 ')).length,2);
  assert.equal(sideNames.filter(x=>x.startsWith('M2 ')).length,2);
  assert.equal(sideNames.filter(x=>x.startsWith('M3 ')).length,2);
});

test('2.5 worktops are physical BOM parts with exact dimensions and material', async()=>{
  const e=compile(await kitchen());
  const tops=e.parts.filter(p=>p.kind==='worktop');
  assert.equal(tops.length,3);
  assert.ok(tops.every(p=>Number(p.length)===6000 && Number(p.width)===6000 && Number(p.thickness)===380));
  assert.ok(tops.every(p=>p.materialSelectionId==='44444444-4444-4444-8444-444444444445'));
});

test('2.5 sink base removes top and back panels instead of inventing closed plumbing box', async()=>{
  const e=compile(await kitchen());
  const id='55555555-5555-4555-8555-555555555571';
  const parts=e.parts.filter(p=>p.moduleId===id);
  assert.equal(parts.some(p=>p.kind==='top'),false);
  assert.equal(parts.some(p=>p.kind==='back'),false);
  assert.equal(parts.some(p=>p.kind==='bottom'),true);
});

test('2.5 LEGRABOX section reuses trusted current drawer formulas', async()=>{
  const e=compile(await kitchen());
  assert.equal(e.parts.filter(p=>p.kind==='drawer_bottom').length,3);
  assert.equal(e.parts.filter(p=>p.kind==='drawer_back').length,3);
  assert.equal(e.parts.filter(p=>p.kind==='drawer_front').length,3);
  const runner=e.hardware.find(h=>h.name.includes('LEGRABOX runner'));
  assert.ok(runner);
  assert.equal(runner.quantity,3);
  assert.equal(runner.estimated,false);
});

test('2.5 kitchen leg hardware is an explicit requirement and totals 12 pcs', async()=>{
  const e=compile(await kitchen());
  const legs=e.hardware.filter(h=>h.role==='leg');
  assert.equal(legs.reduce((n,h)=>n+h.quantity,0),12);
  assert.ok(legs.every(h=>h.hardwareSelectionId==='88888888-8888-4888-8888-888888888884'));
});

test('2.5 sink cutout reaches machining with exact requested geometry but unverified provenance', async()=>{
  const e=compile(await kitchen());
  const cut=e.machining.find(m=>m.kind==='cutout');
  assert.ok(cut);
  assert.equal(Number(cut.length),5000);
  assert.equal(Number(cut.toolWidth),4000);
  assert.equal(Number(cut.x),500);
  assert.equal(Number(cut.y),1000);
  assert.equal(cut.estimated,true);
  assert.equal(cut.verificationSource,'estimated');
});

test('2.5 kitchen stays CNC HOLD until cutout and runner machining trust is resolved', async()=>{
  const e=compile(await kitchen());
  assert.equal(e.cncReady,false);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_CUTOUT_CNC_VERIFICATION_REQUIRED'));
  assert.ok(e.issues.some(i=>i.code==='RUNNER_MANUFACTURING_DATA_REQUIRED'));
  assert.ok(e.cncRelease.blockers.length>0);
});

test('2.5 manual workshop pack is READY for kitchen with CHECK/REFERENCE operations', async()=>{
  const p=await kitchen(); const e=compile(p);
  const pack=buildProductionPack({project:p,engineering:e,route:'manual_workshop',packId:'kitchen-manual-25'});
  assert.equal(pack.manifest.ready,true);
  assert.ok(pack.files['cutlist.csv']?.includes('worktop'));
  assert.ok(pack.files['hardware.csv']?.includes('Adjustable kitchen leg'));
});

test('2.5 outsource cutting and edging can be READY independently of unresolved drilling', async()=>{
  const p=await kitchen(); const e=compile(p);
  const pack=buildProductionPack({project:p,engineering:e,route:'outsource',outsourcePreset:'cutting_edging',packId:'kitchen-edge-25'});
  assert.equal(pack.manifest.ready,true);
  assert.ok(pack.files['cutlist.csv']);
  assert.ok(pack.files['edging.csv']);
  assert.equal(pack.files['drilling.csv'],undefined);
});

test('2.5 outsource drilling fails closed for unverified kitchen machining', async()=>{
  const p=await kitchen(); const e=compile(p);
  const pack=buildProductionPack({project:p,engineering:e,route:'outsource',outsourcePreset:'cutting_edging_drilling',packId:'kitchen-drill-25'});
  assert.equal(pack.manifest.ready,false);
  assert.ok(pack.manifest.blockers.some(b=>b.code==='OUTSOURCE_DRILLING_NOT_EXACT'));
});

test('2.5 appliance fit check blocks an oven wider than its real cabinet opening', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[2].kitchen.appliance.requiredSpace.width.value=9000;
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_DOES_NOT_FIT' && i.severity==='blocking'));
  assert.equal(e.readyForProduction,false);
});

test('2.5 valid 560 mm oven remains accepted in configured 600 mm base section', async()=>{
  const e=compile(await kitchen());
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_DOES_NOT_FIT'),false);
});

test('2.5 dishwasher is modeled as an appliance niche rather than a fabricated carcass', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const m=changed.furniture[0].modules[2];
  m.kind='appliance'; m.kitchen.function='dishwasher'; m.kitchen.appliance={kind:'dishwasher',manufacturer:'Bosch',model:'SMV-demo',requiredSpace:{width:{value:6000,state:'confirmed'},height:{value:7200,state:'confirmed'},depth:{value:5500,state:'confirmed'}}}; m.kitchen.worktop.enabled=true; m.kitchen.plinth.enabled=false;
  m.contents=[{id:'d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',kind:'appliance_space',applianceKind:'dishwasher',requiredSpace:m.kitchen.appliance.requiredSpace}];
  const e=compile(changed);
  assert.equal(e.parts.filter(x=>x.moduleId===m.id && x.kind==='side').length,0);
  assert.equal(e.parts.filter(x=>x.moduleId===m.id && x.kind==='worktop').length,1);
});

test('2.5 kitchen module width mismatch is blocking rather than silently stretched', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[0].width.value.value=5500;
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='MODULE_WIDTH_SUM_MISMATCH' && i.severity==='blocking'));
});

test('2.5 missing kitchen module construction spec is blocking', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  delete changed.furniture[0].modules[0].kitchen;
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_MODULE_SPEC_REQUIRED' && i.severity==='blocking'));
});

test('2.5 controlled ProjectModel may carry manual-verified cutout provenance without Visual bypass', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[0].kitchen.worktop.cutouts[0].verifiedForCnc=true;
  const e=compile(changed); const cut=e.machining.find(m=>m.kind==='cutout');
  assert.ok(cut);
  assert.equal(cut.estimated,false);
  assert.equal(cut.verificationSource,'manual_verified');
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_CUTOUT_CNC_VERIFICATION_REQUIRED'),false);
});

test('2.5 Visual configure_kitchen_run converts one real furniture object in one revision', async()=>{
  const p=await kitchen();
  const next=applyVisualCommand(p,{type:'configure_kitchen_run',furnitureIndex:0,widthsMm:[450,750,600],moduleType:'base',heightMm:720,depthMm:560,opening:'gola'});
  assert.equal(next.revision,p.revision+1);
  assert.equal(next.furniture[0]!.kind,'kitchen');
  assert.deepEqual(next.furniture[0]!.modules.map(m=>(m.width as any).value.value),[4500,7500,6000]);
});

test('2.5 Visual set_kitchen_module persists type, function and carcass flags in ProjectModel', async()=>{
  const p=await kitchen();
  const next=applyVisualCommand(p,{type:'set_kitchen_module',furnitureIndex:0,moduleIndex:0,moduleType:'wall',function:'open',heightMm:900,depthMm:330,hasTop:true,hasBottom:true,hasBack:false,opening:'push_to_open',worktop:false,plinth:false});
  const m=next.furniture[0]!.modules[0]!;
  assert.equal(m.kitchen?.type,'wall'); assert.equal(m.kitchen?.function,'open'); assert.equal(m.kitchen?.hasBack,false); assert.equal(Number(m.height?.value),9000); assert.equal(Number(m.depth?.value),3300);
});

test('2.5 Visual drawer command accepts only an existing runner selection', async()=>{
  const p=await kitchen();
  assert.throws(()=>compileVisualCommand(p,{type:'set_kitchen_drawers',furnitureIndex:0,moduleIndex:1,count:3,runnerHardwareSelectionId:'missing-runner'}),/visual_runner_not_found/);
  const next=applyVisualCommand(p,{type:'set_kitchen_drawers',furnitureIndex:0,moduleIndex:1,count:4,runnerHardwareSelectionId:'88888888-8888-4888-8888-888888888883',frontHeightMm:160,bottomThicknessMm:16});
  const d=next.furniture[0]!.modules[1]!.contents.find(x=>x.kind==='drawer_stack');
  assert.ok(d&&d.kind==='drawer_stack'); if(d&&d.kind==='drawer_stack') assert.equal(d.count,4);
});

test('2.5 Visual appliance command persists installation envelope and Engineering validates it', async()=>{
  const p=await kitchen();
  const next=applyVisualCommand(p,{type:'set_kitchen_appliance',furnitureIndex:0,moduleIndex:2,kind:'oven',manufacturer:'Bosch',model:'TooWide',widthMm:900,heightMm:600,depthMm:550});
  const m=next.furniture[0]!.modules[2]!;
  assert.equal(m.kitchen?.appliance?.model,'TooWide');
  assert.ok(compile(next).issues.some(i=>i.code==='KITCHEN_APPLIANCE_DOES_NOT_FIT'));
});

test('2.5 Visual cutout command cannot self-assert CNC trust', async()=>{
  const p=await kitchen();
  assert.throws(()=>compileVisualCommand(p,{type:'set_kitchen_cutout',furnitureIndex:0,moduleIndex:0,kind:'sink',widthMm:500,depthMm:400,offsetXMm:50,offsetYMm:100,verifiedForCnc:true}),/visual_cnc_verification_requires_manufacturing_trust/);
  const next=applyVisualCommand(p,{type:'set_kitchen_cutout',furnitureIndex:0,moduleIndex:0,kind:'sink',widthMm:480,depthMm:380,offsetXMm:60,offsetYMm:110,verifiedForCnc:false});
  assert.equal(next.furniture[0]!.modules[0]!.kitchen?.worktop?.cutouts?.[0]?.verifiedForCnc,false);
});

test('2.5 Visual material assignment enforces selection roles and projects kitchen metadata to scene', async()=>{
  const p=await kitchen();
  assert.throws(()=>compileVisualCommand(p,{type:'set_kitchen_materials',furnitureIndex:0,carcassMaterialSelectionId:'44444444-4444-4444-8444-444444444445'}),/visual_material_role_mismatch/);
  const next=applyVisualCommand(p,{type:'set_kitchen_materials',furnitureIndex:0,carcassMaterialSelectionId:'44444444-4444-4444-8444-444444444441',frontMaterialSelectionId:'44444444-4444-4444-8444-444444444442',backMaterialSelectionId:'44444444-4444-4444-8444-444444444443',edgeMaterialSelectionId:'44444444-4444-4444-8444-444444444444',worktopMaterialSelectionId:'44444444-4444-4444-8444-444444444445',legHardwareSelectionId:'88888888-8888-4888-8888-888888888884'});
  const scene=buildVisualScene(next);
  assert.equal(scene.visualVersion,'2.6.1');
  assert.equal(scene.furniture[0]!.modules[0]!.kitchen?.function,'sink');
  assert.equal(scene.furniture[0]!.modules[1]!.kitchen?.function,'drawers');
});

test('2.5 paired kitchen front compiles as two real leaves with paired Blum hinge sides', async()=>{
  const e=compile(await kitchen());
  const fronts=e.parts.filter(p=>p.kind==='front');
  assert.equal(fronts.length,2);
  assert.deepEqual(fronts.map(p=>p.name),['Front 1L','Front 1R']);
  assert.ok(fronts.every(p=>Number(p.width)===2970 && Number(p.length)===7160));
  const hinges=e.hardware.find(h=>h.role==='hinge');
  assert.ok(hinges); assert.equal(hinges.quantity,4); assert.equal(hinges.estimated,false);
});

test('2.5 Visual kitchen front editor supports none, single and paired double without arbitrary JSON patch', async()=>{
  const p=await kitchen();
  const removed=applyVisualCommand(p,{type:'set_kitchen_front',furnitureIndex:0,moduleIndex:0,mode:'none'});
  assert.equal(removed.furniture[0]!.fronts.some(f=>f.moduleIds.includes(removed.furniture[0]!.modules[0]!.id)),false);
  const doubled=applyVisualCommand(removed,{type:'set_kitchen_front',furnitureIndex:0,moduleIndex:0,mode:'double',materialSelectionId:'44444444-4444-4444-8444-444444444442',openingMode:'gola'});
  const front=doubled.furniture[0]!.fronts.find(f=>f.moduleIds.includes(doubled.furniture[0]!.modules[0]!.id));
  assert.ok(front); assert.equal(front?.count,2); assert.equal(front?.split,'vertical'); assert.deepEqual(front?.hingeSides,['left','right']);
  assert.equal(compile(doubled).issues.some(i=>i.code==='FRONT_COUNT_MAPPING_UNSUPPORTED'),false);
});

test('2.5 appliance-designation alone is not enough for Production READY', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  delete changed.furniture[0].modules[2].kitchen.appliance;
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_SPEC_REQUIRED' && i.severity==='blocking'));
  assert.equal(e.readyForProduction,false);
});

test('2.5 sink/hob worktop requires explicit cutout geometry before production', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[0].kitchen.worktop.cutouts=[];
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_WORKTOP_CUTOUT_REQUIRED' && i.severity==='blocking'));
  assert.equal(e.readyForProduction,false);
});

test('2.6.1 appliance object without confirmed installation envelope remains blocked', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[2].kitchen.appliance={kind:'oven',manufacturer:'Unknown / non-branded'};
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_ENVELOPE_REQUIRED' && i.severity==='blocking'));
  assert.equal(e.readyForProduction,false);
});

test('2.6.1 selected third-party GTV runner stays in BOM but blocks unverified dimensions', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  const gtv='77777777-7777-4777-8777-777777777777';
  changed.selections.hardware.push({id:gtv,role:'runner',source:'manual',manufacturer:'GTV',name:'GTV concealed runner soft close'});
  changed.furniture[0].modules[1].contents[0].runnerHardwareSelectionId=gtv;
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='DRAWER_RUNNER_PROFILE_UNVERIFIED' && i.severity==='blocking'));
  assert.ok(e.hardware.some(h=>h.hardwareSelectionId===gtv && h.role==='runner'));
});

test('2.6.1 selected third-party GTV hinge stays in BOM but blocks unverified drilling', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.selections.hardware=changed.selections.hardware.filter((h:any)=>h.role!=='hinge');
  const gtv='77777777-7777-4777-8777-777777777778';
  changed.selections.hardware.push({id:gtv,role:'hinge',source:'manual',manufacturer:'GTV',name:'GTV concealed hinge soft close'});
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='HINGE_PROFILE_UNVERIFIED' && i.severity==='blocking'));
  assert.ok(e.hardware.some(h=>h.hardwareSelectionId===gtv && h.role==='hinge'));
});

test('2.6.1 appliance envelope must be confirmed, not merely observed', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[2].kitchen.appliance.requiredSpace.width.state='observed';
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_ENVELOPE_REQUIRED' && i.severity==='blocking'));
  assert.equal(e.readyForProduction,false);
});

test('2.6.1 one cabinet can carry oven + hob as separate appliances', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const m=changed.furniture[0].modules[2];
  const oven=m.kitchen.appliance;
  m.kitchen.appliances=[{...oven,installation:'cabinet'},{kind:'hob',manufacturer:'TEST',model:'HOB-600',installation:'worktop',requiredSpace:{width:{value:5600,state:'confirmed'},height:{value:600,state:'confirmed'},depth:{value:4900,state:'confirmed'}}}];
  m.kitchen.worktop.cutouts=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',kind:'hob',width:{value:5600,state:'confirmed'},depth:{value:4900,state:'confirmed'},offsetX:{value:200,state:'confirmed'},offsetY:{value:550,state:'confirmed'},verifiedForCnc:false}];
  const e=compile(changed);
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_HOB_CUTOUT_REQUIRED'),false);
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_ENVELOPE_REQUIRED'),false);
  assert.ok(e.machining.some(x=>x.kind==='cutout' && x.note?.includes('hob')));
});

test('2.6.1 hob in a combined appliance zone requires its own cutout', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const m=changed.furniture[0].modules[2];
  m.kitchen.appliances=[m.kitchen.appliance,{kind:'hob',installation:'worktop',requiredSpace:{width:{value:5600,state:'confirmed'},height:{value:600,state:'confirmed'},depth:{value:4900,state:'confirmed'}}}];
  m.kitchen.worktop.cutouts=[];
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_HOB_CUTOUT_REQUIRED' && i.severity==='blocking'));
});

test('2.6.1 wall-side worktop plinth/upstand is a physical BOM part', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const w=changed.furniture[0].modules[1].kitchen.worktop;
  w.wallTrim={enabled:true,height:{value:40*10,state:'confirmed'},depth:{value:12*10,state:'confirmed'},materialSelectionId:'44444444-4444-4444-8444-444444444445'};
  const e=compile(changed);
  const trim=e.parts.find(x=>x.tags?.includes('kitchen-worktop-wall-trim'));
  assert.ok(trim); assert.equal(Number(trim.length),6000); assert.equal(Number(trim.width),400); assert.equal(Number(trim.thickness),120);
});

test('2.6.1 unresolved wall-side plinth dimensions keep Production HOLD', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any;
  changed.furniture[0].modules[1].kitchen.worktop.wallTrim={enabled:true,height:{value:null,state:'unknown'},depth:{value:null,state:'unknown'}};
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_WALL_TRIM_DIMENSIONS_REQUIRED' && i.severity==='blocking'));
});

test('2.6.1 wall cabinet supports grooved back override and GTV hanger BOM without invented drilling', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const f=changed.furniture[0]; const m=f.modules[1];
  const hanger='77777777-7777-4777-8777-777777777779';
  changed.selections.hardware.push({id:hanger,role:'other',source:'manual',manufacturer:'GTV',name:'GTV standard wall hanger'});
  f.construction.backPanel.grooveInset={value:120,state:'confirmed'}; f.construction.backPanel.grooveDepth={value:60,state:'confirmed'}; f.construction.backPanel.grooveClearance={value:10,state:'confirmed'};
  m.kitchen.type='wall'; m.kitchen.backPanelMode='groove'; m.kitchen.wallHangerHardwareSelectionId=hanger; m.kitchen.wallHangerCount=2; m.kitchen.worktop.enabled=false; m.kitchen.plinth.enabled=false;
  const e=compile(changed);
  assert.ok(e.machining.some(x=>x.moduleId===m.id && x.kind==='groove'));
  assert.ok(e.hardware.some(x=>x.moduleId===m.id && x.hardwareSelectionId===hanger && x.quantity===2));
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_WALL_HANGER_PROFILE_UNVERIFIED' && i.severity==='blocking'));
});

test('2.6.1 Visual commands can append a second appliance and configure wall trim', async()=>{
  const p=await kitchen();
  const withHob=applyVisualCommand(p,{type:'set_kitchen_appliance',furnitureIndex:0,moduleIndex:2,kind:'hob',installation:'worktop',manufacturer:'TEST',model:'HOB',widthMm:560,heightMm:60,depthMm:490,append:true});
  assert.equal(withHob.furniture[0]!.modules[2]!.kitchen?.appliances?.length,2);
  const withTrim=applyVisualCommand(withHob,{type:'set_kitchen_wall_trim',furnitureIndex:0,moduleIndex:1,enabled:true,heightMm:40,depthMm:12,materialSelectionId:'44444444-4444-4444-8444-444444444445'});
  assert.equal(Number(withTrim.furniture[0]!.modules[1]!.kitchen?.worktop?.wallTrim?.height?.value),400);
});


test('2.6.1 site-fit appliance may release production with partial/no envelope while preserving known-dimension fit checks', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const m=changed.furniture[0].modules[2];
  m.kitchen.appliance={kind:'oven',manufacturer:'Unknown / non-branded',installation:'cabinet',fitMode:'site_fit',requiredSpace:{width:{value:5600,state:'confirmed'},height:{value:5800,state:'confirmed'},depth:{value:null,state:'unknown'}}};
  const e=compile(changed);
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_ENVELOPE_REQUIRED'),false);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_SITE_FIT' && i.severity==='warning'));
  assert.equal(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_DOES_NOT_FIT'),false);
});

test('2.6.1 site-fit does not waive a known appliance dimension that already exceeds the cabinet', async()=>{
  const p=await kitchen(); const changed=structuredClone(p) as any; const m=changed.furniture[0].modules[2];
  m.kitchen.appliance={kind:'oven',manufacturer:'Unknown / non-branded',installation:'cabinet',fitMode:'site_fit',requiredSpace:{width:{value:9000,state:'confirmed'},height:{value:5800,state:'confirmed'},depth:{value:null,state:'unknown'}}};
  const e=compile(changed);
  assert.ok(e.issues.some(i=>i.code==='KITCHEN_APPLIANCE_DOES_NOT_FIT' && i.severity==='blocking'));
});
