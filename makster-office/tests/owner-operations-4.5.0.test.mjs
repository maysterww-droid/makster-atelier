
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../dist/packages/project-model/src/index.js';
import * as e from '../dist/packages/engineering-engine/src/index.js';
import { buildOwnerScenarioPlanner, evaluateOwnerScenario, buildPredictiveOwnerControl } from '../dist/packages/owner-operations/src/index.js';

const M=v=>({value:pm.mm(v),state:'confirmed'});
function state(){
  return {version:'4.5.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()};
}
function project(id,title,target){
  let p=pm.createEmptyProjectModel({projectId:id,title,projectType:'kitchen',currency:'EUR'});
  p.selections.materials=[
    {id:id.slice(0,-1)+'a',role:'carcass',source:'manual',manufacturer:'EGGER',code:'W980',name:'White',thickness:M(18),grainDirection:'none'},
    {id:id.slice(0,-1)+'b',role:'edge',source:'manual',manufacturer:'EGGER',code:'W980-E',name:'Edge',thickness:M(.8),grainDirection:'none'}
  ];
  p.furniture=[{id:id.slice(0,-1)+'c',kind:'kitchen',name:'Base',transform:{position:{x:pm.mm(0),y:pm.mm(0),z:pm.mm(0)},rotationZDeg:0},dimensions:{width:M(600),height:M(900),depth:M(600)},mounting:'base_supported',construction:{carcassThickness:M(18),defaultCarcassMaterialSelectionId:p.selections.materials[0].id,defaultEdgeMaterialSelectionId:p.selections.materials[1].id,backPanel:{mode:'none'},plinth:{mode:'none'}},modules:[{id:id.slice(0,-1)+'d',kind:'base',width:{mode:'fixed',value:M(600)},contents:[],kitchen:{type:'base',function:'storage',hasTop:true,hasBottom:true,hasBack:false}}],fronts:[]}];
  p=e.updateJobControl(p,{stage:'production',client:{name:title},money:{currency:'EUR',contractValueMinor:1000000,receivedMinor:200000},targetInstallationAt:target});
  return p;
}

test('Cash Protection scenario removes a forecast cash gap without mutating source project',()=>{
  const p=project('45000000-0000-4000-8000-000000000001','Cash Job','2026-09-30T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:50000,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  s.cashEvents=[{id:'x',type:'outflow',category:'supplier',amountMinor:100000,currency:'EUR',dueAt:'2026-09-09T00:00:00Z',status:'committed'}];
  const rows=[{project:p,engineering:eng,queuePosition:1}];
  const report=buildOwnerScenarioPlanner(rows,s,'EUR',new Date('2026-09-07T00:00:00Z'));
  assert.equal(report.baseline.cashGapMinor,50000);
  const cash=report.scenarios.find(x=>x.scenario.id==='cash-protection');
  assert.ok(cash);
  assert.equal(cash.cashGapMinor,0);
  assert.ok(cash.improvement.cashGapDeltaMinor>0);
  assert.equal(p.jobControl.money.receivedMinor,200000);
});

test('Capacity Relief lowers or preserves risk for an overloaded assembly project',()=>{
  const p=project('45000000-0000-4000-8000-000000000011','Capacity Job','2026-09-10T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  s.projectCapacityOverrides=[{id:'o',projectId:p.projectId,centerKind:'assembly',hours:40,updatedAt:new Date().toISOString()}];
  const rows=[{project:p,engineering:eng,queuePosition:1}];
  const report=buildOwnerScenarioPlanner(rows,s,'EUR',new Date('2026-09-07T00:00:00Z'));
  const cap=report.scenarios.find(x=>x.scenario.id==='capacity-relief');
  assert.ok(cap);
  assert.ok(cap.riskScore<=report.baseline.riskScore);
  assert.ok(cap.scheduleRiskProjects<=report.baseline.scheduleRiskProjects);
});

test('Custom scenario evaluates cash injection and queue/capacity options independently',()=>{
  const a=project('45000000-0000-4000-8000-000000000021','A','2026-09-20T08:00:00Z');
  const b=project('45000000-0000-4000-8000-000000000022','B','2026-09-09T08:00:00Z');
  const ea=new e.MaksterEngineeringCompiler().compile(a),eb=new e.MaksterEngineeringCompiler().compile(b),s=state();
  s.treasuryBalances=[{id:'t',currency:'EUR',openingBalanceMinor:0,asOf:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}];
  s.cashEvents=[{id:'x',type:'outflow',category:'rent',amountMinor:100000,currency:'EUR',dueAt:'2026-09-08T00:00:00Z',status:'committed'}];
  const rows=[{project:a,engineering:ea,queuePosition:1},{project:b,engineering:eb,queuePosition:2}];
  const base=buildOwnerScenarioPlanner(rows,s,'EUR',new Date('2026-09-07T00:00:00Z')).baseline;
  const custom=evaluateOwnerScenario(rows,s,{
    id:'custom',name:'Custom',cashInjectionMinor:150000,cashInjectionDate:'2026-09-07T12:00:00Z',
    queueOrder:[b.projectId,a.projectId],extraCapacityHoursPerDay:{assembly:8,installation:8}
  },'EUR',new Date('2026-09-07T00:00:00Z'),base);
  assert.equal(custom.cashGapMinor,0);
  assert.ok(custom.riskScore<=base.riskScore);
});

test('planner always returns baseline plus four generated alternatives and one recommendation',()=>{
  const p=project('45000000-0000-4000-8000-000000000031','Planner','2026-10-01T08:00:00Z');
  const eng=new e.MaksterEngineeringCompiler().compile(p),s=state();
  const r=buildOwnerScenarioPlanner([{project:p,engineering:eng,queuePosition:1}],s,'EUR',new Date('2026-09-07T00:00:00Z'));
  assert.ok(['4.5.0','4.6.0','4.7.0','4.8.0','4.9.0','5.0.0'].includes(r.version));
  assert.equal(r.scenarios.length,4);
  assert.ok(['baseline','cash-protection','capacity-relief','priority-rescue','balanced-rescue'].includes(r.recommendedScenarioId));
});
