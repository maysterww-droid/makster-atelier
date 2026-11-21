
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import * as pack from '../dist/packages/production-pack/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});

function goldenBase(){
  let p=pm.createEmptyProjectModel({
    projectId:'35000000-0000-4000-8000-000000000001',
    title:'Golden Project #1',
    projectType:'kitchen',
    currency:'EUR'
  });
  p.site.rooms=[{
    id:'35000000-0000-4000-8000-000000000010',name:'Kitchen',
    origin:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},
    dimensions:{width:M(4000),depth:M(3200),height:M(2700)},
    walls:[
      {id:'35000000-0000-4000-8000-000000000011',start:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},end:{x:pm.mm(4000),y:pm.mm(0),z:pm.mm(0)},height:M(2700)},
      {id:'35000000-0000-4000-8000-000000000012',start:{x:pm.mm(4000),y:pm.mm(0),z:pm.mm(0)},end:{x:pm.mm(4000),y:pm.mm(3200),z:pm.mm(0)},height:M(2700)},
      {id:'35000000-0000-4000-8000-000000000013',start:{x:pm.mm(4000),y:pm.mm(3200),z:pm.mm(0)},end:{x:pm.mm(0),y:pm.mm(3200),z:pm.mm(0)},height:M(2700)},
      {id:'35000000-0000-4000-8000-000000000014',start:{x:pm.mm(0),y:pm.mm(3200),z:pm.mm(0)},end:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},height:M(2700)}
    ],openings:[],obstacles:[]
  }];
  p.notes.push({
    id:'35000000-0000-4000-8000-000000000015',
    text:'MAKSTER_ROOM_SCENE_V1:'+JSON.stringify({widthMm:4000,depthMm:3200,heightMm:2700,features:[],utilities:[]}),
    authorType:'system',createdAt:new Date().toISOString()
  });
  p.selections.materials=[
    {id:'35000000-0000-4000-8000-000000000020',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'Platinum White',thickness:M(18),grainDirection:'none'},
    {id:'35000000-0000-4000-8000-000000000021',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-EDGE',name:'Edge White',thickness:M(0.8),grainDirection:'none'}
  ];
  p.furniture=[{
    id:'35000000-0000-4000-8000-000000000030',kind:'kitchen',name:'Base 600',
    roomId:'35000000-0000-4000-8000-000000000010',
    transform:{position:{x:pm.mm(500),y:pm.mm(100),z:pm.mm(0)},rotationZDeg:0},
    dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',
    construction:{
      carcassThickness:M(18),
      defaultCarcassMaterialSelectionId:'35000000-0000-4000-8000-000000000020',
      defaultEdgeMaterialSelectionId:'35000000-0000-4000-8000-000000000021',
      backPanel:{mode:'none'},plinth:{mode:'none'}
    },
    modules:[{
      id:'35000000-0000-4000-8000-000000000031',kind:'base',
      width:{mode:'fixed',value:M(600)},contents:[],
      kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}
    }],
    fronts:[]
  }];
  return p;
}

function closeGoldenProject(){
  let p=goldenBase();
  p=e.updateJobControl(p,{
    stage:'client_approval',
    client:{name:'Golden Client',objectAddress:'Prague'},
    money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:300000}
  });

  const request=e.createClientApprovalRequest(p,{
    kind:'design',title:'Approve Golden Design',
    description:'Approve current technical project',requestedBy:'designer'
  });
  p=e.respondToClientApproval(request.snapshot,request.request.id,{
    approved:true,respondedBy:'Golden Client'
  }).snapshot;

  p=e.updateJobControl(p,{stage:'purchasing'});
  let eng=new e.MaksterEngineeringCompiler().compile(p);
  const purchasing=e.buildPurchasingReport(p,eng);
  assert.equal(purchasing.unresolvedRequirementCount,0);
  assert.ok(purchasing.requirements.length>0);

  const lines=purchasing.requirements.map(x=>({
    kind:x.kind,sourceKey:x.sourceKey,description:x.description,
    manufacturer:x.manufacturer,code:x.code,quantity:x.quantity,unit:x.unit,
    unitPriceMinor:x.kind==='material'?5000:1000
  }));
  const po=e.createPurchaseOrder(p,{
    supplierName:'Golden Supplier',createdBy:'buyer',currency:'EUR',lines
  });
  p=e.updatePurchaseOrderStatus(po.snapshot,po.order.id,{status:'approved',actor:'buyer'}).snapshot;
  p=e.updatePurchaseOrderStatus(p,po.order.id,{status:'ordered',actor:'buyer'}).snapshot;
  const order=p.purchaseOrders.find(o=>o.id===po.order.id);
  for(const line of order.lines)p=e.receivePurchaseLine(p,order.id,line.id,line.quantity).snapshot;

  p=e.addProjectCostEntry(p,{category:'labor',basis:'estimate',description:'Workshop labor estimate',amountMinor:180000,createdBy:'owner'}).snapshot;
  p=e.addProjectCostEntry(p,{category:'installation',basis:'estimate',description:'Installation estimate',amountMinor:60000,createdBy:'owner'}).snapshot;
  p=e.addProjectCostEntry(p,{category:'labor',basis:'actual',description:'Workshop labor actual',amountMinor:170000,createdBy:'owner'}).snapshot;
  p=e.addProjectCostEntry(p,{category:'installation',basis:'actual',description:'Installation actual',amountMinor:55000,createdBy:'owner'}).snapshot;

  eng=new e.MaksterEngineeringCompiler().compile(p);
  assert.equal(e.analyzeProductionReadiness(p,eng).status,'READY');

  p=e.updateJobControl(p,{stage:'handover'});
  assert.equal(e.buildInstallationCloseoutReport(p).status,'READY_TO_SIGN');
  p=e.signInstallationHandover(p,{
    signedBy:'Golden Client',clientName:'Golden Client',
    installerName:'Golden Installer',notes:'Accepted'
  }).snapshot;

  p=e.updateJobControl(p,{stage:'closed',money:{currency:'EUR',receivedMinor:1000000}});
  return p;
}

test('Golden Project #1 closes GREEN end-to-end',()=>{
  const p=closeGoldenProject();
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const gate=e.buildProjectLifecycleReleaseGate(p,eng);

  assert.equal(gate.version,'3.5.0');
  assert.equal(gate.releaseState,'CLOSED');
  assert.equal(gate.overallStatus,'GREEN');
  assert.equal(gate.failCount,0);
  assert.equal(gate.warningCount,0);
  assert.equal(gate.passCount,10);
  assert.equal(gate.nextCriticalAction,'Project lifecycle is fully green.');

  for(const code of ['MEASUREMENT','DESIGN_APPROVAL','COMMERCIAL','ENGINEERING','PURCHASING','COSTING','INSTALLATION','HANDOVER','FINANCIAL_CLOSE','JOB_LIFECYCLE']){
    assert.equal(gate.gates.find(x=>x.code===code)?.status,'pass',code);
  }

  const built=pack.buildProductionPack({project:p,engineering:eng,route:'manual_workshop'});
  assert.ok(built.files['lifecycle-release-gate.json']);
  const packedGate=JSON.parse(built.files['lifecycle-release-gate.json']);
  assert.equal(packedGate.revision,p.revision);
  assert.equal(packedGate.overallStatus,'GREEN');
  assert.equal(packedGate.releaseState,'CLOSED');
});

test('technical change after client approval makes Release Gate RED',()=>{
  const p=closeGoldenProject();
  p.furniture[0].dimensions.width=M(650);
  p.furniture[0].modules[0].width={mode:'fixed',value:M(650)};
  p.revision++;
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const gate=e.buildProjectLifecycleReleaseGate(p,eng);

  assert.equal(e.currentDesignApprovalStatus(p),'stale');
  assert.equal(gate.overallStatus,'RED');
  assert.equal(gate.gates.find(x=>x.code==='DESIGN_APPROVAL')?.status,'fail');
  assert.match(gate.nextCriticalAction,/changed after approval|Re-approval/i);
});

test('open site issue blocks a formerly closed project',()=>{
  let p=closeGoldenProject();
  const reported=e.reportInstallationSiteIssue(p,{
    severity:'blocking',title:'Wall deviation',
    detail:'Filler no longer fits the measured wall.',reportedBy:'installer'
  });
  p=reported.snapshot;
  const eng=new e.MaksterEngineeringCompiler().compile(p);
  const gate=e.buildProjectLifecycleReleaseGate(p,eng);

  assert.equal(gate.overallStatus,'RED');
  assert.equal(gate.gates.find(x=>x.code==='ENGINEERING')?.status,'fail');
  assert.equal(gate.gates.find(x=>x.code==='INSTALLATION')?.status,'fail');
});
