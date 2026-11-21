
import test from 'node:test';
import assert from 'node:assert/strict';
import { mm, createEmptyProjectModel, validateProjectModel } from '../packages/project-model/src/index.js';
import { analyzeProjectCatalogSelections, applyApprovedCatalogAssignment } from '../packages/engineering-engine/src/index.js';

function hingedProject(){
  const p=createEmptyProjectModel({projectId:'27600000-0000-4000-8000-000000000001',title:'P',projectType:'kitchen'});
  const mat='27600000-0000-4000-8000-000000000010',mod='27600000-0000-4000-8000-000000000020',front='27600000-0000-4000-8000-000000000040';
  p.selections.materials.push({id:mat,role:'front',source:'manual',thickness:mm(18)});
  p.furniture.push({id:'27600000-0000-4000-8000-000000000030',kind:'kitchen',name:'Base',transform:{position:{x:0,y:0,z:0},rotationZDeg:0},
    dimensions:{width:mm(600),height:mm(900),depth:mm(600)},mounting:'base_supported',
    construction:{carcassThickness:mm(18),backPanel:{mode:'none'},plinth:{mode:'none'}},
    modules:[{id:mod,kind:'base',width:{mode:'fixed',value:mm(600)},contents:[]}],
    fronts:[{id:front,moduleIds:[mod],kind:'hinged',count:1,split:'none',opening:'left',materialSelectionId:mat}]
  });
  return p;
}

test('2.7.6 approved hinge assignment writes exact hardware selection and front reference',()=>{
  const p=hingedProject();
  const r=analyzeProjectCatalogSelections(p).recommendations.find(x=>x.target==='hinge')!;
  const c=r.result.recommended!;
  const a=applyApprovedCatalogAssignment(p,{recommendation:r,candidateId:c.record.id,approvedBy:'tester',selectionId:'27600000-0000-4000-8000-000000000099'});
  assert.equal(a.snapshot.revision,p.revision+1);
  assert.equal(a.snapshot.selections.hardware.length,1);
  assert.equal(a.snapshot.furniture[0]!.fronts[0]!.hingeHardwareSelectionId,'27600000-0000-4000-8000-000000000099');
  assert.deepEqual(validateProjectModel(a.snapshot).errors,[]);
});

test('2.7.6 assignment rejects a candidate not present in current recommendation',()=>{
  const p=hingedProject();
  const r=analyzeProjectCatalogSelections(p).recommendations.find(x=>x.target==='hinge')!;
  assert.throws(()=>applyApprovedCatalogAssignment(p,{recommendation:r,candidateId:'fake',approvedBy:'tester',selectionId:'27600000-0000-4000-8000-000000000098'}));
});
