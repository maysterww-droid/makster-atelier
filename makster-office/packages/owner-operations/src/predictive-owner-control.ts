
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import { buildCostingReport } from '../../engineering-engine/src/costing.js';
import type { OwnerOperationsState, WorkCenterKind } from './types.js';
import { buildProductionCapacityPlan } from './production-capacity.js';
import { buildCashGapForecast, buildReplenishmentPlan } from './operations-intelligence.js';
import { compareSupplierQuotesForShortage } from './bom-allocation.js';

export type PredictiveSeverity='critical'|'high'|'medium'|'low';
export type PredictiveActionKind='collect_cash'|'expedite_procurement'|'add_capacity'|'protect_margin'|'replenish_stock'|'monitor';

export interface PredictiveAction {
  id:string;
  kind:PredictiveActionKind;
  severity:PredictiveSeverity;
  projectId?:string;
  projectTitle?:string;
  title:string;
  reason:string;
  recommendedAction:string;
  dueAt?:string;
  financialImpactMinor?:number;
  hoursImpact?:number;
  sku?:string;
  supplierName?:string;
  evidence:Record<string,unknown>;
}

export interface PredictiveProjectRisk {
  projectId:string;
  projectTitle:string;
  queuePosition:number;
  score:number;
  level:'critical'|'high'|'medium'|'low';
  scheduleRisk:'normal'|'tight'|'late';
  cashExposureMinor:number;
  marginPercent:number;
  marginLeakageMinor:number;
  shortageCount:number;
  actionCount:number;
}

export interface PredictiveOwnerControlReport {
  version:'5.0.0';
  generatedAt:string;
  currency:string;
  overallRisk:'critical'|'high'|'medium'|'low';
  riskScore:number;
  firstCashGapAt:string|null;
  cashGapMinor:number;
  actions:PredictiveAction[];
  projects:PredictiveProjectRisk[];
  summary:{
    criticalActions:number;
    highActions:number;
    projectedMarginLeakageMinor:number;
    projectsAtScheduleRisk:number;
    procurementShortagePositions:number;
  };
}

const severityRank=(x:PredictiveSeverity)=>x==='critical'?0:x==='high'?1:x==='medium'?2:3;
const level=(score:number):PredictiveProjectRisk['level']=>score>=75?'critical':score>=50?'high':score>=25?'medium':'low';
const addDays=(date:string,days:number)=>{
  const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
};

export function buildPredictiveOwnerControl(
  rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,
  state:OwnerOperationsState,
  currency='EUR',
  now=new Date()
):PredictiveOwnerControlReport{
  const projects=rows.map(x=>x.project);
  const capacity=buildProductionCapacityPlan(rows,state,now);
  const cash=buildCashGapForecast(projects,state,currency);
  const replenishment=buildReplenishmentPlan(rows,state);
  const actions:PredictiveAction[]=[];
  const shortagesByProject=new Map<string,Array<any>>();
  // Rebuild allocation detail through replenishment source by using BOM demands exposed from each engineering report.
  // The replenishment plan is company-level, while project shortages are reconstructed from Purchasing/BOM via quote search below.
  const allocation=(awaitableAllocation(rows,state));
  for(const d of allocation.demands.filter((x:any)=>x.shortage>0)){
    const arr=shortagesByProject.get(d.projectId)??[];arr.push(d);shortagesByProject.set(d.projectId,arr);
  }

  // Cash control: if a gap is forecast, propose accelerating the largest collectible receivables first.
  const cashGapAt=(cash.firstCashGapAt??null) as string|null;
  if(cashGapAt&&cash.cashGapMinor>0){
    let remaining=cash.cashGapMinor;
    const collectible=projects.map(p=>{
      const contract=p.jobControl?.money.contractValueMinor??0,received=p.jobControl?.money.receivedMinor??0;
      return {p,outstanding:Math.max(0,contract-received)};
    }).filter(x=>x.outstanding>0).sort((a,b)=>b.outstanding-a.outstanding);
    for(const x of collectible){
      if(remaining<=0)break;
      const impact=Math.min(remaining,x.outstanding);
      actions.push({
        id:`cash:${x.p.projectId}`,kind:'collect_cash',severity:'critical',projectId:x.p.projectId,projectTitle:x.p.title,
        title:`Ускорить платёж клиента · ${x.p.title}`,
        reason:`Прогнозируемый кассовый разрыв ${cash.cashGapMinor} minor units начинается ${cashGapAt.slice(0,10)}.`,
        recommendedAction:`Попробовать получить минимум ${impact} minor units до ${cashGapAt.slice(0,10)}.`,
        dueAt:cashGapAt,financialImpactMinor:impact,
        evidence:{outstandingMinor:x.outstanding,cashGapMinor:cash.cashGapMinor,projectStage:x.p.jobControl?.stage??'lead'}
      });
      remaining-=impact;
    }
  }

  // Project-by-project operational risk.
  const projectRisks:PredictiveProjectRisk[]=[];
  for(const row of rows){
    const p=row.project,cap=capacity.projectSummary.find(x=>x.projectId===p.projectId);
    const costing=buildCostingReport(p);
    const marginPct=costing.forecastMarginPercent;
    const estimate=costing.totalEstimateMinor,actual=costing.totalActualMinor;
    const marginLeak=Math.max(0,actual-estimate);
    const projectShortages=shortagesByProject.get(p.projectId)??[];

    if(cap?.risk==='late'||cap?.risk==='tight'){
      const schedule=capacity.schedule.filter(x=>x.projectId===p.projectId);
      const bottleneck=schedule.sort((a,b)=>b.hours-a.hours)[0];
      const hours=Math.max(1,Number(((bottleneck?.hours??2)*.25).toFixed(1)));
      actions.push({
        id:`capacity:${p.projectId}`,kind:'add_capacity',severity:cap.risk==='late'?'critical':'high',
        projectId:p.projectId,projectTitle:p.title,
        title:`Добавить мощность · ${p.title}`,
        reason:`Прогноз монтажа ${cap.installationFinish}; буфер до целевой даты ${cap.daysBuffer} дн.`,
        recommendedAction:`Добавить/перенести около ${hours} ч на участке ${bottleneck?.centerName??'bottleneck'} или изменить очередь до подтверждения даты клиенту.`,
        hoursImpact:hours,evidence:{installationFinish:cap.installationFinish,targetInstallationAt:cap.targetInstallationAt??null,daysBuffer:cap.daysBuffer,bottleneck:bottleneck?.centerKind??null}
      });
    }

    for(const d of projectShortages){
      const productionStart=cap?.productionStart??now.toISOString().slice(0,10);
      const ranked=compareSupplierQuotesForShortage(state,{sku:d.sku,shortage:d.shortage,unit:d.unit},'optimal');
      const best=ranked[0];
      const lead=best?.leadTimeDays??Math.min(...state.suppliers.filter(x=>x.active).map(x=>x.leadTimeDays),14);
      const latestOrder=addDays(productionStart,-Math.max(0,Math.ceil(lead)));
      const overdue=Date.parse(latestOrder+'T23:59:59Z')<now.getTime();
      actions.push({
        id:`proc:${p.projectId}:${d.sku}`,kind:'expedite_procurement',severity:overdue?'critical':'high',
        projectId:p.projectId,projectTitle:p.title,sku:d.sku,supplierName:best?.supplierName,
        title:`Закрыть shortage ${d.sku} · ${p.title}`,
        reason:`Не хватает ${d.shortage} ${d.unit}; производство запланировано с ${productionStart}.`,
        recommendedAction:best
          ?`Award ${best.supplierName}: ${best.totalCostMinor} minor units, ${best.leadTimeDays} дн. Последний безопасный день заказа: ${latestOrder}.`
          :`Получить quote и оформить заказ не позже ${latestOrder}.`,
        dueAt:latestOrder,financialImpactMinor:best?.totalCostMinor,
        evidence:{shortage:d.shortage,unit:d.unit,productionStart,latestOrderAt:latestOrder,overdue,quoteId:best?.quoteId??null}
      });
    }

    if(marginPct<20||marginLeak>0||costing.forecastMarginMinor<0){
      const severe=costing.forecastMarginMinor<0?'critical':marginPct<10?'high':'medium';
      actions.push({
        id:`margin:${p.projectId}`,kind:'protect_margin',severity:severe,projectId:p.projectId,projectTitle:p.title,
        title:`Защитить маржу · ${p.title}`,
        reason:`Forecast margin ${marginPct}%; фактический перерасход против estimate ${marginLeak} minor units.`,
        recommendedAction:marginLeak>0
          ?`Проверить перерасход ${marginLeak} minor units: change order клиенту, supplier claim или внутренняя корректировка до следующей закупки.`
          :`Не утверждать новые расходы без пересчёта цены/объёма.`,
        financialImpactMinor:marginLeak,
        evidence:{forecastMarginPercent:marginPct,forecastMarginMinor:costing.forecastMarginMinor,estimateMinor:estimate,actualMinor:actual}
      });
    }

    const contract=p.jobControl?.money.contractValueMinor??0,received=p.jobControl?.money.receivedMinor??0;
    const cashExposure=Math.max(0,contract-received);
    let score=0;
    if(cap?.risk==='late')score+=45;else if(cap?.risk==='tight')score+=25;
    score+=Math.min(30,projectShortages.length*10);
    if(marginPct<0)score+=35;else if(marginPct<10)score+=25;else if(marginPct<20)score+=12;
    if(cashGapAt&&cashExposure>0)score+=Math.min(20,Math.round(cashExposure/Math.max(1,cash.cashGapMinor)*10));
    score=Math.min(100,score);
    projectRisks.push({
      projectId:p.projectId,projectTitle:p.title,queuePosition:row.queuePosition,score,level:level(score),
      scheduleRisk:cap?.risk??'normal',cashExposureMinor:cashExposure,marginPercent:marginPct,
      marginLeakageMinor:marginLeak,shortageCount:projectShortages.length,
      actionCount:0
    });
  }

  // General warehouse replenishment, after project-specific shortages.
  for(const x of replenishment.items.filter(x=>x.reason==='below_min_stock')){
    actions.push({
      id:`stock:${x.sku}`,kind:'replenish_stock',severity:'medium',title:`Пополнить минимальный склад · ${x.name}`,
      reason:`Свободно ${x.available} ${x.unit}, минимальный остаток ${x.minStock}.`,
      recommendedAction:`Заказать ${x.recommendedOrderQuantity} ${x.unit} для восстановления страхового остатка.`,
      sku:x.sku,evidence:{available:x.available,minStock:x.minStock,recommendedOrderQuantity:x.recommendedOrderQuantity}
    });
  }

  for(const p of projectRisks)p.actionCount=actions.filter(a=>a.projectId===p.projectId).length;
  actions.sort((a,b)=>severityRank(a.severity)-severityRank(b.severity)||(a.dueAt??'9999').localeCompare(b.dueAt??'9999'));

  const marginLeakTotal=projectRisks.reduce((s,x)=>s+x.marginLeakageMinor,0);
  const maxRisk=projectRisks.length?Math.max(...projectRisks.map(x=>x.score)):0;
  const cashRisk=cash.cashGapMinor>0?Math.min(100,50+Math.round(cash.cashGapMinor/Math.max(1,cash.openingBalanceMinor||cash.cashGapMinor)*50)):0;
  const riskScore=Math.min(100,Math.max(maxRisk,cashRisk,actions.some(x=>x.severity==='critical')?75:0));
  return {
    version:'5.0.0',generatedAt:new Date().toISOString(),currency,
    overallRisk:level(riskScore),riskScore,firstCashGapAt:cashGapAt,cashGapMinor:cash.cashGapMinor,
    actions,projects:projectRisks.sort((a,b)=>b.score-a.score||a.queuePosition-b.queuePosition),
    summary:{
      criticalActions:actions.filter(x=>x.severity==='critical').length,
      highActions:actions.filter(x=>x.severity==='high').length,
      projectedMarginLeakageMinor:marginLeakTotal,
      projectsAtScheduleRisk:projectRisks.filter(x=>x.scheduleRisk!=='normal').length,
      procurementShortagePositions:allocation.shortageCount
    }
  };
}

// Local import-cycle-safe allocation implementation access.
import { buildBomAllocationPlan } from './bom-allocation.js';
function awaitableAllocation(rows:Array<{project:ProjectModelV1;engineering:EngineeringCompileResult;queuePosition:number}>,state:OwnerOperationsState){
  return buildBomAllocationPlan(rows,state);
}
