
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { OwnerOperationsState, WorkCenterKind } from './types.js';
import { estimateProjectWorkload } from './production-capacity.js';
import { buildPaymentCalendar, buildBomAllocationPlan } from './bom-allocation.js';

const kinds:WorkCenterKind[]=['cutting','edging','drilling','assembly','installation'];

export function buildCapacityLearning(state:OwnerOperationsState){
  const rows=kinds.map(kind=>{
    const samples=(state.productionTimeEntries??[]).filter(x=>x.centerKind===kind&&x.plannedHours>0&&x.actualHours>=0);
    const ratios=samples.map(x=>x.actualHours/x.plannedHours).filter(x=>Number.isFinite(x)&&x>=.25&&x<=4);
    const count=ratios.length;
    const raw=count?ratios.reduce((s,x)=>s+x,0)/count:1;
    const confidence=Math.min(1,count/8);
    const learned=1+(raw-1)*confidence;
    return {centerKind:kind,sampleCount:count,rawRatio:Number(raw.toFixed(3)),confidence:Number(confidence.toFixed(2)),learnedMultiplier:Number(learned.toFixed(3)),status:count<3?'insufficient_data':count<8?'learning':'trusted'};
  });
  return {version:'5.0.0',centers:rows};
}
export function learnedWorkload(
  project:ProjectModelV1,engineering:EngineeringCompileResult,state:OwnerOperationsState,queuePosition:number
){
  const base=estimateProjectWorkload(project,engineering,state,queuePosition);
  const learning=buildCapacityLearning(state);
  const hours={...base.hours};
  for(const row of learning.centers){
    const overridden=(state.projectCapacityOverrides??[]).some(x=>x.projectId===project.projectId&&x.centerKind===row.centerKind);
    if(!overridden)hours[row.centerKind]=Number((hours[row.centerKind]*row.learnedMultiplier).toFixed(2));
  }
  return {...base,hours,totalHours:Number(Object.values(hours).reduce((s,x)=>s+x,0).toFixed(2)),learning};
}

export function buildCashGapForecast(projects:ProjectModelV1[],state:OwnerOperationsState,currency='EUR'){
  const calendar=buildPaymentCalendar(projects,state,currency);
  const balance=(state.treasuryBalances??[]).filter(x=>x.currency===currency).sort((a,b)=>b.asOf.localeCompare(a.asOf))[0];
  const opening=balance?.openingBalanceMinor??0;
  let running=opening,min=opening,minAt:string|null=null,firstGapAt:string|null=null;
  const rows=calendar.map(x=>{
    running+=x.type==='inflow'?x.amountMinor:-x.amountMinor;
    if(running<min){min=running;minAt=x.date}
    if(running<0&&!firstGapAt)firstGapAt=x.date;
    return {...x,treasuryBalanceMinor:running};
  });
  return {
    version:'5.0.0',currency,openingBalanceMinor:opening,asOf:balance?.asOf??null,
    minimumBalanceMinor:min,minimumBalanceAt:minAt,firstCashGapAt:firstGapAt,
    cashGapMinor:min<0?Math.abs(min):0,status:firstGapAt?'gap':'ok',rows
  };
}

export function buildReplenishmentPlan(
  projects:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState
){
  const allocation=buildBomAllocationPlan(projects,state);
  const demandBySku=new Map<string,{sku:string,unit:string,shortage:number,projects:Set<string>}>();
  for(const d of allocation.demands.filter(x=>x.shortage>0)){
    const k=d.sku.trim().toLowerCase();
    const x=demandBySku.get(k)??{sku:d.sku,unit:d.unit,shortage:0,projects:new Set<string>()};
    x.shortage+=d.shortage;x.projects.add(d.projectId);demandBySku.set(k,x);
  }
  const supplierLead=Math.min(...state.suppliers.filter(x=>x.active).map(x=>x.leadTimeDays),14);
  const items=state.warehouseItems.map(item=>{
    const reserved=state.warehouseReservations.filter(r=>r.itemId===item.id&&r.status==='reserved').reduce((s,r)=>s+r.quantity,0);
    const available=Math.max(0,item.onHand-reserved);
    const shortage=demandBySku.get(item.sku.trim().toLowerCase())?.shortage??0;
    const min=item.minStock??0;
    const reorder=Math.max(0,min+shortage-available);
    return {sku:item.sku,name:item.name,unit:item.unit,onHand:item.onHand,reserved,available,minStock:min,bomShortage:Number(shortage.toFixed(3)),recommendedOrderQuantity:Number(reorder.toFixed(3)),suggestedLeadTimeDays:supplierLead,reason:shortage>0?'bom_shortage':available<min?'below_min_stock':'ok'};
  });
  for(const d of demandBySku.values()){
    if(items.some(x=>x.sku.trim().toLowerCase()===d.sku.trim().toLowerCase()))continue;
    items.push({sku:d.sku,name:d.sku,unit:d.unit as any,onHand:0,reserved:0,available:0,minStock:0,bomShortage:Number(d.shortage.toFixed(3)),recommendedOrderQuantity:Number(d.shortage.toFixed(3)),suggestedLeadTimeDays:supplierLead,reason:'bom_shortage'});
  }
  return {version:'5.0.0',items:items.filter(x=>x.recommendedOrderQuantity>0),shortageCount:allocation.shortageCount};
}
