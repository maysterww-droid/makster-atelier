
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import { buildCostingReport } from '../../engineering-engine/src/costing.js';
import type { OwnerOperationsState, SupplierProfile } from './types.js';

const STAGE_ORDER=['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'];
const activeProject=(p:ProjectModelV1)=>p.jobControl?.stage!=='closed';

export function warehouseAvailability(state:OwnerOperationsState){
  return state.warehouseItems.map(item=>{
    const reserved=state.warehouseReservations
      .filter(r=>r.itemId===item.id&&r.status==='reserved')
      .reduce((s,r)=>s+r.quantity,0);
    return {...item,reserved,available:Math.max(0,item.onHand-reserved)};
  });
}
export function supplierRanking(suppliers:SupplierProfile[],mode:'cheapest'|'fastest'|'optimal'='optimal'){
  return suppliers.filter(s=>s.active).map(s=>{
    const priceScore=Math.max(0,100-Math.max(0,s.priceIndex-70)*2);
    const speedScore=Math.max(0,100-s.leadTimeDays*5);
    const reliabilityScore=Math.max(0,Math.min(100,s.reliabilityPct-s.defectPct*2));
    const score=mode==='cheapest'?priceScore:mode==='fastest'?speedScore:
      Number((priceScore*.35+speedScore*.25+reliabilityScore*.40).toFixed(1));
    return {...s,score,priceScore,speedScore,reliabilityScore};
  }).sort((a,b)=>b.score-a.score);
}
function dueDate(p:ProjectModelV1){
  const s=p.jobControl;
  return s?.targetInstallationAt??s?.targetDeliveryAt??'9999-12-31T00:00:00.000Z';
}
export function buildOwnerCommandCenter(projects:ProjectModelV1[],state:OwnerOperationsState,currency='EUR'){
  const active=projects.filter(activeProject);
  const queue=active.map(p=>{
    const job=p.jobControl;
    const costing=buildCostingReport(p);
    const contract=job?.money.contractValueMinor??0,received=job?.money.receivedMinor??0;
    const stage=job?.stage??'lead';
    const due=dueDate(p);
    const daysToDue=due.startsWith('9999')?null:Math.ceil((Date.parse(due)-Date.now())/86400000);
    const risk=daysToDue!=null&&daysToDue<0?'late':
      daysToDue!=null&&daysToDue<=7&&['lead','measurement','design','client_approval','contract','deposit','purchasing'].includes(stage)?'high':
      costing.forecastMarginMinor<0?'high':'normal';
    return {
      projectId:p.projectId,title:p.title,stage,
      stageIndex:Math.max(0,STAGE_ORDER.indexOf(stage)),dueAt:due.startsWith('9999')?null:due,daysToDue,risk,
      client:job?.client.name??'',contractValueMinor:contract,receivedMinor:received,
      outstandingMinor:Math.max(0,contract-received),forecastMarginMinor:costing.forecastMarginMinor,
      forecastMarginPercent:costing.forecastMarginPercent
    };
  }).sort((a,b)=>{
    const pa=state.queuePriorityOverrides?.find(x=>x.projectId===a.projectId)?.priority;
    const pb=state.queuePriorityOverrides?.find(x=>x.projectId===b.projectId)?.priority;
    if(pa!=null||pb!=null)return (pa??999999)-(pb??999999);
    const riskRank=(x:string)=>x==='late'?0:x==='high'?1:2;
    return riskRank(a.risk)-riskRank(b.risk)||
      String(a.dueAt??'9999').localeCompare(String(b.dueAt??'9999'))||
      b.stageIndex-a.stageIndex;
  }).map((x,i)=>({...x,queuePosition:i+1}));

  const contractTotal=active.reduce((s,p)=>s+(p.jobControl?.money.contractValueMinor??0),0);
  const receivedTotal=active.reduce((s,p)=>s+(p.jobControl?.money.receivedMinor??0),0);
  const outstandingTotal=Math.max(0,contractTotal-receivedTotal);
  const forecastMarginTotal=active.reduce((s,p)=>s+buildCostingReport(p).forecastMarginMinor,0);
  const committedPurchasesTotal=active.reduce((s,p)=>s+(p.jobControl?.money.committedPurchaseMinor??0),0);
  const actualProjectCostTotal=active.reduce((s,p)=>s+(p.jobControl?.money.actualCostMinor??0),0);
  const marginRatio=contractTotal>0?forecastMarginTotal/contractTotal:0;

  const fixedMonthly=state.fixedMonthlyCosts.filter(x=>x.currency===currency).reduce((s,x)=>s+x.amountMinor,0);
  const breakEvenRevenueMinor=marginRatio>0?Math.ceil(fixedMonthly/marginRatio):0;

  const warehouse=warehouseAvailability(state);
  const stockValueMinor=warehouse.filter(x=>x.currency===currency).reduce((s,x)=>s+(x.unitCostMinor??0)*x.onHand,0);
  const reservedValueMinor=warehouse.filter(x=>x.currency===currency).reduce((s,x)=>s+(x.unitCostMinor??0)*x.reserved,0);

  const now=Date.now();
  const horizon=(days:number)=>{
    const end=now+days*86400000;
    const manual=state.cashEvents.filter(x=>x.currency===currency&&x.status!=='cancelled'&&Date.parse(x.dueAt)>=now&&Date.parse(x.dueAt)<=end);
    let inflow=manual.filter(x=>x.type==='inflow').reduce((s,x)=>s+x.amountMinor,0);
    let outflow=manual.filter(x=>x.type==='outflow').reduce((s,x)=>s+x.amountMinor,0);
    for(const p of active){
      const job=p.jobControl, outstanding=Math.max(0,(job?.money.contractValueMinor??0)-(job?.money.receivedMinor??0));
      const expected=job?.targetInstallationAt??job?.targetDeliveryAt;
      if(outstanding>0&&expected&&Date.parse(expected)>=now&&Date.parse(expected)<=end)inflow+=outstanding;
      for(const o of p.purchaseOrders??[]){
        if(['approved','ordered','partially_received'].includes(o.status)){
          const due=o.expectedAt??o.orderedAt;
          const value=o.lines.reduce((s,l)=>s+(l.unitPriceMinor??0)*Math.max(0,l.quantity-(l.receivedQuantity??0)),0);
          if(due&&Date.parse(due)>=now&&Date.parse(due)<=end)outflow+=value;
        }
      }
    }
    return {days,inflowMinor:inflow,outflowMinor:outflow,netMinor:inflow-outflow};
  };

  const committedCashOutMinor=state.cashEvents.filter(x=>x.currency===currency&&x.type==='outflow'&&x.status==='committed').reduce((s,x)=>s+x.amountMinor,0);
  const committedCashInMinor=state.cashEvents.filter(x=>x.currency===currency&&x.type==='inflow'&&['planned','committed'].includes(x.status)).reduce((s,x)=>s+x.amountMinor,0);
  return {
    version:'5.0.0',currency,generatedAt:new Date().toISOString(),
    activeProjectCount:active.length,queue,
    financials:{
      contractTotalMinor:contractTotal,receivedTotalMinor:receivedTotal,outstandingTotalMinor:outstandingTotal,
      committedPurchasesMinor:committedPurchasesTotal,actualProjectCostMinor:actualProjectCostTotal,
      uncommittedReceivedMinor:receivedTotal-committedPurchasesTotal,
      committedCashOutMinor,committedCashInMinor,
      forecastMarginTotalMinor:forecastMarginTotal,forecastMarginPercent:contractTotal>0?Number((forecastMarginTotal/contractTotal*100).toFixed(1)):0
    },
    breakEven:{fixedMonthlyMinor:fixedMonthly,averageForecastMarginPercent:Number((marginRatio*100).toFixed(1)),breakEvenRevenueMinor},
    warehouse:{itemCount:warehouse.length,stockValueMinor,reservedValueMinor,items:warehouse,reservations:state.warehouseReservations},
    suppliers:{count:state.suppliers.filter(x=>x.active).length,optimal:supplierRanking(state.suppliers,'optimal').slice(0,5),fastest:supplierRanking(state.suppliers,'fastest').slice(0,5),cheapest:supplierRanking(state.suppliers,'cheapest').slice(0,5)},
    cashFlow:{
      d7:horizon(7),d30:horizon(30),d90:horizon(90),
      events:state.cashEvents.filter(x=>x.status!=='cancelled').sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).slice(0,50)
    },
    alerts:[
      ...queue.filter(x=>x.risk!=='normal').map(x=>`${x.title}: ${x.risk==='late'?'deadline passed':'schedule/margin risk'}`),
      ...warehouse.filter(x=>(x.minStock??0)>x.available).map(x=>`${x.name}: stock below minimum after reservations`),
      ...(horizon(30).netMinor<0?[`30-day forecast cash gap: ${Math.abs(horizon(30).netMinor)} minor units`]:[])
    ]
  };
}
