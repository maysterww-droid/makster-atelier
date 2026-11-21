
import test from 'node:test';
import assert from 'node:assert/strict';
import { mm, createEmptyProjectModel } from '../packages/project-model/src/index.js';
import { analyzeProjectCatalogSelections } from '../packages/engineering-engine/src/index.js';

test('2.7.5 reads confirmed front thickness from ProjectModel for hinge selection',()=>{
  const p=createEmptyProjectModel({projectId:'27500000-0000-4000-8000-000000000001',title:'P',projectType:'kitchen'});
  const mat='27500000-0000-4000-8000-000000000010';
  const mod='27500000-0000-4000-8000-000000000020';
  p.selections.materials.push({id:mat,role:'front',source:'manual',thickness:mm(18)});
  p.furniture.push({
    id:'27500000-0000-4000-8000-000000000030',kind:'kitchen',name:'Base',transform:{position:{x:0,y:0,z:0},rotationZDeg:0},
    dimensions:{width:mm(600),height:mm(900),depth:mm(600)},mounting:'base_supported',
    construction:{carcassThickness:mm(18),backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:mod,kind:'base',width:{mode:'fixed',value:mm(600)},contents:[]}],
    fronts:[{id:'27500000-0000-4000-8000-000000000040',moduleIds:[mod],kind:'hinged',count:1,split:'none',opening:'left',materialSelectionId:mat}]
  });
  const r=analyzeProjectCatalogSelections(p);
  const h=r.recommendations.find(x=>x.target==='hinge')!;
  assert.equal(h.context.frontThicknessMm,18);
  assert.ok(h.result.candidates.length>=1);
});

test('2.7.5 does not invent runner length from cabinet depth',()=>{
  const p=createEmptyProjectModel({projectId:'27500000-0000-4000-8000-000000000002',title:'P',projectType:'kitchen'});
  const mod='27500000-0000-4000-8000-000000000021';
  p.furniture.push({
    id:'27500000-0000-4000-8000-000000000031',kind:'kitchen',name:'Drawers',transform:{position:{x:0,y:0,z:0},rotationZDeg:0},
    dimensions:{width:mm(600),height:mm(900),depth:mm(600)},mounting:'base_supported',
    construction:{carcassThickness:mm(18),backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:mod,kind:'base',width:{mode:'fixed',value:mm(600)},contents:[{id:'27500000-0000-4000-8000-000000000050',kind:'drawer_stack',count:3,frontMode:'external'}]}],
    fronts:[]
  });
  const r=analyzeProjectCatalogSelections(p);
  const runner=r.recommendations.find(x=>x.target==='runner')!;
  assert.equal(runner.context.desiredNominalLengthMm,undefined);
  assert.match(runner.note,/does not derive one from cabinet depth/);
});

test('2.7.5 reads appliance requiredSpace as niche context',()=>{
  const p=createEmptyProjectModel({projectId:'27500000-0000-4000-8000-000000000003',title:'P',projectType:'kitchen'});
  const mod='27500000-0000-4000-8000-000000000022';
  p.furniture.push({
    id:'27500000-0000-4000-8000-000000000032',kind:'kitchen',name:'DW',transform:{position:{x:0,y:0,z:0},rotationZDeg:0},
    dimensions:{width:mm(600),height:mm(900),depth:mm(600)},mounting:'base_supported',
    construction:{carcassThickness:mm(18),backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:mod,kind:'base',width:{mode:'fixed',value:mm(600)},contents:[],kitchen:{type:'base',function:'dishwasher',hasTop:false,hasBottom:false,hasBack:false,appliances:[{kind:'dishwasher',installation:'cabinet',fitMode:'preverified',requiredSpace:{width:mm(600),height:mm(820),depth:mm(560)}}]}}],
    fronts:[]
  });
  const r=analyzeProjectCatalogSelections(p);
  const a=r.recommendations.find(x=>x.target==='appliance')!;
  assert.equal(a.context.nicheWidthMm,600);
  assert.equal(a.context.nicheHeightMm,820);
  assert.equal(a.context.nicheDepthMm,560);
  assert.ok(a.result.ready);
});
