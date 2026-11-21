
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { OwnerOperationsState, WarehouseItem, WarehouseReservation, SupplierProfile, SupplierQuote, MaterialProcurementRfq, MaterialRfqCommunication, ProcurementAward, ProductionWorkCenter, ProjectCapacityOverride, ProductionTimeEntry, TreasuryBalance, OwnerDecisionPlan, OwnerQueuePriorityOverride, ProductionOperation, FinanceLedgerEntry, FinanceSettings, MaksterOfficeLead, MaksterOfficeCampaign, MaksterOfficeContentItem, MaksterOfficeApproval, MaksterOfficeAgentRun, MaksterOfficeCycle, MaksterOfficeOwnerBrief, MaksterGrowthConnection, MaksterGrowthSyncSnapshot, MaksterAutopilotDecision, MaksterAutopilotRun, GrowthSpendGuardrail, GrowthProviderExecution, GrowthAuditLogEntry, GrowthInboundLeadEvent, MaksterCreativeAsset, MaksterContentDraftSet, MaksterPublishJob, MaksterContentPerformance, MaksterPilotProject, MaksterPilotRun, MaksterRolePolicy, MaksterOperationalIncident, MaksterBackupManifest, MaksterReadinessSnapshot, CashEvent, FixedMonthlyCost } from '../../../packages/owner-operations/src/types.js';

const empty=():OwnerOperationsState=>({version:'5.6.0',warehouseItems:[],warehouseReservations:[],suppliers:[],supplierQuotes:[],materialRfqs:[],materialRfqCommunications:[],procurementAwards:[],productionWorkCenters:[],projectCapacityOverrides:[],productionTimeEntries:[],treasuryBalances:[],queuePriorityOverrides:[],decisionPlans:[],productionOperations:[],financeLedgerEntries:[],financeSettings:[],officeLeads:[],officeCampaigns:[],officeContent:[],officeApprovals:[],officeAgentRuns:[],officeCycles:[],officeOwnerBriefs:[],growthConnections:[],growthSyncSnapshots:[],officeAutopilotDecisions:[],officeAutopilotRuns:[],growthSpendGuardrails:[],growthProviderExecutions:[],growthAuditLog:[],growthInboundLeadEvents:[],creativeAssets:[],contentDraftSets:[],publishJobs:[],contentPerformance:[],pilotProjects:[],pilotRuns:[],rolePolicies:[],operationalIncidents:[],backupManifests:[],readinessSnapshots:[],cashEvents:[],fixedMonthlyCosts:[],updatedAt:new Date().toISOString()});

export class OwnerOperationsStore{
  private state:OwnerOperationsState;
  constructor(private readonly filePath:string){
    this.state=existsSync(filePath)?JSON.parse(readFileSync(filePath,'utf8')):empty();
    this.state.version='5.6.0';
    this.state.supplierQuotes??=[];this.state.materialRfqs??=[];this.state.materialRfqCommunications??=[];this.state.procurementAwards??=[];
    this.state.productionWorkCenters??=[];this.state.projectCapacityOverrides??=[];
    this.state.productionTimeEntries??=[];this.state.treasuryBalances??=[];
    this.state.queuePriorityOverrides??=[];this.state.decisionPlans??=[];this.state.productionOperations??=[];this.state.financeLedgerEntries??=[];this.state.financeSettings??=[];this.state.officeLeads??=[];this.state.officeCampaigns??=[];this.state.officeContent??=[];this.state.officeApprovals??=[];this.state.officeAgentRuns??=[];this.state.officeCycles??=[];this.state.officeOwnerBriefs??=[];this.state.growthConnections??=[];this.state.growthSyncSnapshots??=[];this.state.officeAutopilotDecisions??=[];this.state.officeAutopilotRuns??=[];this.state.growthSpendGuardrails??=[];this.state.growthProviderExecutions??=[];this.state.growthAuditLog??=[];this.state.growthInboundLeadEvents??=[];this.state.creativeAssets??=[];this.state.contentDraftSets??=[];this.state.publishJobs??=[];this.state.contentPerformance??=[];this.state.pilotProjects??=[];this.state.pilotRuns??=[];this.state.rolePolicies??=[];this.state.operationalIncidents??=[];this.state.backupManifests??=[];this.state.readinessSnapshots??=[];
  }
  private save(){this.state.updatedAt=new Date().toISOString();writeFileSync(this.filePath,JSON.stringify(this.state,null,2)+'\n','utf8')}

  applySmmRecords(records:any[]){
    const allowed=new Set(['creativeAssets','contentDraftSets','officeContent','publishJobs','growthSyncSnapshots','contentPerformance']);const next=structuredClone(this.state) as any;
    for(const {table,value} of records){if(!allowed.has(table)||value?.smm?.brandId!=='makster-atelier'||value.smm.scope!=='MAKSTER_SMM_6')throw new Error('smm_scope_invalid');const list=next[table],i=list.findIndex((x:any)=>x.id===value.id);if(i>=0){if(list[i].smm?.scope!=='MAKSTER_SMM_6')throw new Error('smm_record_collision');list[i]=value}else list.push(value)}
    const temp=this.filePath+'.smm-tmp';writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600});renameSync(temp,this.filePath);this.state=next;
  }

  get(){return structuredClone(this.state)}
  addWarehouseItem(input:Omit<WarehouseItem,'id'|'updatedAt'>){
    const item:WarehouseItem={id:randomUUID(),...input,updatedAt:new Date().toISOString()};this.state.warehouseItems.push(item);this.save();return item
  }
  adjustWarehouseItem(id:string,delta:number){
    const item=this.state.warehouseItems.find(x=>x.id===id);if(!item)throw new Error('warehouse_item_not_found');
    if(!Number.isFinite(delta)||delta===0)throw new Error('warehouse_adjustment_invalid');
    const reserved=this.state.warehouseReservations.filter(x=>x.itemId===id&&x.status==='reserved').reduce((s,x)=>s+x.quantity,0);
    const next=item.onHand+delta;
    if(next<reserved)throw new Error('warehouse_adjustment_would_consume_reserved_stock');
    if(next<0)throw new Error('warehouse_negative_stock');
    item.onHand=next;item.updatedAt=new Date().toISOString();this.save();return item
  }
  reserve(input:{itemId:string;projectId:string;quantity:number;priority?:number;note?:string}){
    const item=this.state.warehouseItems.find(x=>x.id===input.itemId);if(!item)throw new Error('warehouse_item_not_found');
    const reserved=this.state.warehouseReservations.filter(x=>x.itemId===item.id&&x.status==='reserved').reduce((s,x)=>s+x.quantity,0);
    if(input.quantity<=0||reserved+input.quantity>item.onHand)throw new Error('warehouse_insufficient_available_stock');
    const r:WarehouseReservation={id:randomUUID(),itemId:item.id,projectId:input.projectId,quantity:input.quantity,priority:input.priority??100,status:'reserved',createdAt:new Date().toISOString(),...(input.note?{note:input.note}:{})};
    this.state.warehouseReservations.push(r);this.save();return r
  }
  setReservationStatus(id:string,status:'consumed'|'released'){
    const r=this.state.warehouseReservations.find(x=>x.id===id);if(!r)throw new Error('warehouse_reservation_not_found');
    if(r.status!=='reserved')throw new Error('warehouse_reservation_not_active');
    r.status=status;
    if(status==='consumed'){const item=this.state.warehouseItems.find(x=>x.id===r.itemId);if(item)item.onHand=Math.max(0,item.onHand-r.quantity)}
    this.save();return r
  }
  addSupplier(input:Omit<SupplierProfile,'id'|'updatedAt'>){
    const x:SupplierProfile={id:randomUUID(),...input,updatedAt:new Date().toISOString()};this.state.suppliers.push(x);this.save();return x
  }
  addSupplierQuote(input:Omit<SupplierQuote,'id'|'createdAt'>){
    const x:SupplierQuote={id:randomUUID(),...input,createdAt:new Date().toISOString()};this.state.supplierQuotes.push(x);this.save();return x
  }
  addMaterialRfq(input:MaterialProcurementRfq){
    if(this.state.materialRfqs.some(x=>x.id===input.id))throw new Error('material_rfq_duplicate');
    this.state.materialRfqs.push(input);this.save();return structuredClone(input)
  }
  updateMaterialRfq(input:MaterialProcurementRfq){
    const i=this.state.materialRfqs.findIndex(x=>x.id===input.id);if(i<0)throw new Error('material_rfq_not_found');
    this.state.materialRfqs[i]=input;this.save();return structuredClone(input)
  }
  addMaterialRfqCommunication(input:MaterialRfqCommunication){
    this.state.materialRfqCommunications.push(input);this.save();return structuredClone(input)
  }
  updateMaterialRfqCommunication(input:MaterialRfqCommunication){
    const i=this.state.materialRfqCommunications.findIndex(x=>x.id===input.id);if(i<0)throw new Error('material_rfq_communication_not_found');
    this.state.materialRfqCommunications[i]=input;this.save();return structuredClone(input)
  }
  createProcurementAward(input:Omit<ProcurementAward,'id'|'awardedAt'|'status'>){
    const x:ProcurementAward={id:randomUUID(),...input,status:'pending_project_order',awardedAt:new Date().toISOString()};
    this.state.procurementAwards.push(x);this.save();return x
  }
  updateProcurementAward(id:string,patch:Partial<Pick<ProcurementAward,'status'|'purchaseOrderId'|'cashEventId'|'error'>>){
    const x=this.state.procurementAwards.find(a=>a.id===id);if(!x)throw new Error('procurement_award_not_found');
    Object.assign(x,patch);this.save();return x
  }
  upsertWorkCenter(input:Omit<ProductionWorkCenter,'updatedAt'>){
    const now=new Date().toISOString(),existing=this.state.productionWorkCenters.find(x=>x.id===input.id||x.kind===input.kind);
    if(existing){Object.assign(existing,input,{updatedAt:now});this.save();return existing}
    const x:ProductionWorkCenter={...input,updatedAt:now};this.state.productionWorkCenters.push(x);this.save();return x
  }
  setCapacityOverride(input:Omit<ProjectCapacityOverride,'id'|'updatedAt'>){
    const now=new Date().toISOString(),existing=this.state.projectCapacityOverrides.find(x=>x.projectId===input.projectId&&x.centerKind===input.centerKind);
    if(existing){Object.assign(existing,input,{updatedAt:now});this.save();return existing}
    const x:ProjectCapacityOverride={id:randomUUID(),...input,updatedAt:now};this.state.projectCapacityOverrides.push(x);this.save();return x
  }

  addProductionTimeEntry(input:Omit<ProductionTimeEntry,'id'>){
    if(input.plannedHours<=0||input.actualHours<0)throw new Error('production_time_invalid');
    const x:ProductionTimeEntry={id:randomUUID(),...input};this.state.productionTimeEntries.push(x);this.save();return x
  }
  setTreasuryBalance(input:Omit<TreasuryBalance,'id'|'updatedAt'>){
    const now=new Date().toISOString();
    const existing=this.state.treasuryBalances.find(x=>x.currency===input.currency);
    if(existing){Object.assign(existing,input,{updatedAt:now});this.save();return existing}
    const x:TreasuryBalance={id:randomUUID(),...input,updatedAt:now};this.state.treasuryBalances.push(x);this.save();return x
  }


  addDecisionPlan(plan:OwnerDecisionPlan){
    this.state.decisionPlans.push(plan);this.save();return plan
  }
  updateDecisionPlan(plan:OwnerDecisionPlan){
    const i=this.state.decisionPlans.findIndex(x=>x.id===plan.id);if(i<0)throw new Error('decision_plan_not_found');
    this.state.decisionPlans[i]=plan;this.save();return plan
  }
  setQueuePriority(input:{projectId:string;priority:number;sourcePlanId?:string}){
    const now=new Date().toISOString();
    const existing=this.state.queuePriorityOverrides.find(x=>x.projectId===input.projectId);
    if(existing){Object.assign(existing,input,{updatedAt:now});this.save();return existing}
    const x:OwnerQueuePriorityOverride={id:randomUUID(),...input,updatedAt:now};this.state.queuePriorityOverrides.push(x);this.save();return x
  }


  replaceProductionOperations(operations:ProductionOperation[]){
    this.state.productionOperations=operations;this.save();return structuredClone(operations)
  }
  updateProductionOperation(operation:ProductionOperation){
    const i=this.state.productionOperations.findIndex(x=>x.id===operation.id);
    if(i<0)throw new Error('production_operation_not_found');
    this.state.productionOperations[i]=operation;this.save();return structuredClone(operation)
  }


  addFinanceLedgerEntry(input:Omit<FinanceLedgerEntry,'id'|'createdAt'>){
    if(!Number.isFinite(input.amountMinor)||input.amountMinor<0)throw new Error('finance_ledger_amount_invalid');
    const x:FinanceLedgerEntry={id:randomUUID(),...input,createdAt:new Date().toISOString()};
    this.state.financeLedgerEntries.push(x);this.save();return structuredClone(x)
  }
  upsertFinanceSettings(input:Omit<FinanceSettings,'id'|'updatedAt'>){
    const now=new Date().toISOString(),existing=this.state.financeSettings.find(x=>x.currency===input.currency);
    if(existing){Object.assign(existing,input,{updatedAt:now});this.save();return structuredClone(existing)}
    const x:FinanceSettings={id:randomUUID(),...input,updatedAt:now};this.state.financeSettings.push(x);this.save();return structuredClone(x)
  }


  addOfficeLead(input:MaksterOfficeLead){this.state.officeLeads.push(input);this.save();return structuredClone(input)}
  updateOfficeLead(input:MaksterOfficeLead){
    const i=this.state.officeLeads.findIndex(x=>x.id===input.id);if(i<0)throw new Error('office_lead_not_found');
    this.state.officeLeads[i]=input;this.save();return structuredClone(input)
  }
  addOfficeCampaign(input:MaksterOfficeCampaign){this.state.officeCampaigns.push(input);this.save();return structuredClone(input)}
  updateOfficeCampaign(input:MaksterOfficeCampaign){
    const i=this.state.officeCampaigns.findIndex(x=>x.id===input.id);if(i<0)throw new Error('office_campaign_not_found');
    this.state.officeCampaigns[i]=input;this.save();return structuredClone(input)
  }
  addOfficeContent(input:MaksterOfficeContentItem){this.state.officeContent.push(input);this.save();return structuredClone(input)}
  updateOfficeContent(input:MaksterOfficeContentItem){
    const i=this.state.officeContent.findIndex(x=>x.id===input.id);if(i<0)throw new Error('office_content_not_found');
    this.state.officeContent[i]=input;this.save();return structuredClone(input)
  }
  addOfficeApproval(input:MaksterOfficeApproval){this.state.officeApprovals.push(input);this.save();return structuredClone(input)}
  updateOfficeApproval(input:MaksterOfficeApproval){
    const i=this.state.officeApprovals.findIndex(x=>x.id===input.id);if(i<0)throw new Error('office_approval_not_found');
    this.state.officeApprovals[i]=input;this.save();return structuredClone(input)
  }
  addOfficeCycle(input:MaksterOfficeCycle){this.state.officeCycles.push(input);this.save();return structuredClone(input)}
  updateOfficeCycle(input:MaksterOfficeCycle){
    const i=this.state.officeCycles.findIndex(x=>x.id===input.id);if(i<0)throw new Error('office_cycle_not_found');
    this.state.officeCycles[i]=input;this.save();return structuredClone(input)
  }
  addOfficeAgentRuns(input:MaksterOfficeAgentRun[]){this.state.officeAgentRuns.push(...input);this.save();return structuredClone(input)}
  addOfficeOwnerBrief(input:MaksterOfficeOwnerBrief){this.state.officeOwnerBriefs.push(input);this.save();return structuredClone(input)}

  addGrowthConnection(input:MaksterGrowthConnection){this.state.growthConnections.push(input);this.save();return structuredClone(input)}
  updateGrowthConnection(input:MaksterGrowthConnection){const i=this.state.growthConnections.findIndex(x=>x.id===input.id);if(i<0)throw new Error('growth_connection_not_found');this.state.growthConnections[i]=input;this.save();return structuredClone(input)}
  addGrowthSyncSnapshot(input:MaksterGrowthSyncSnapshot){this.state.growthSyncSnapshots.push(input);this.save();return structuredClone(input)}
  addOfficeAutopilotDecision(input:MaksterAutopilotDecision){this.state.officeAutopilotDecisions.push(input);this.save();return structuredClone(input)}
  updateOfficeAutopilotDecision(input:MaksterAutopilotDecision){const i=this.state.officeAutopilotDecisions.findIndex(x=>x.id===input.id);if(i<0)throw new Error('autopilot_decision_not_found');this.state.officeAutopilotDecisions[i]=input;this.save();return structuredClone(input)}
  addOfficeAutopilotRun(input:MaksterAutopilotRun){this.state.officeAutopilotRuns.push(input);this.save();return structuredClone(input)}
  upsertGrowthSpendGuardrail(input:GrowthSpendGuardrail){
    const i=this.state.growthSpendGuardrails.findIndex(x=>x.id===input.id||(x.currency===input.currency&&x.provider===input.provider));
    if(i>=0)this.state.growthSpendGuardrails[i]=input;else this.state.growthSpendGuardrails.push(input);this.save();return structuredClone(input)
  }
  addGrowthProviderExecution(input:GrowthProviderExecution){this.state.growthProviderExecutions.push(input);this.save();return structuredClone(input)}
  updateGrowthProviderExecution(input:GrowthProviderExecution){const i=this.state.growthProviderExecutions.findIndex(x=>x.id===input.id);if(i<0)throw new Error('growth_execution_not_found');this.state.growthProviderExecutions[i]=input;this.save();return structuredClone(input)}
  addGrowthAuditLog(input:GrowthAuditLogEntry){this.state.growthAuditLog.push(input);this.save();return structuredClone(input)}
  addGrowthInboundLeadEvent(input:GrowthInboundLeadEvent){this.state.growthInboundLeadEvents.push(input);this.save();return structuredClone(input)}
  addCreativeAsset(x:MaksterCreativeAsset){this.state.creativeAssets.push(x);this.save();return structuredClone(x)}
  addContentDraftSet(x:MaksterContentDraftSet){this.state.contentDraftSets.push(x);this.save();return structuredClone(x)}
  addPublishJob(x:MaksterPublishJob){this.state.publishJobs.push(x);this.save();return structuredClone(x)}
  updatePublishJob(x:MaksterPublishJob){const i=this.state.publishJobs.findIndex(v=>v.id===x.id);if(i<0)throw new Error('publish_job_not_found');this.state.publishJobs[i]=x;this.save();return structuredClone(x)}
  addContentPerformance(x:MaksterContentPerformance){this.state.contentPerformance.push(x);this.save();return structuredClone(x)}
  addPilotProject(x:MaksterPilotProject){this.state.pilotProjects.push(x);this.save();return structuredClone(x)}
  addPilotRun(x:MaksterPilotRun){this.state.pilotRuns.push(x);this.save();return structuredClone(x)}
  addRolePolicy(x:MaksterRolePolicy){this.state.rolePolicies.push(x);this.save();return structuredClone(x)}
  upsertRolePolicy(x:MaksterRolePolicy){const i=this.state.rolePolicies.findIndex(v=>v.role===x.role);if(i>=0)this.state.rolePolicies[i]=x;else this.state.rolePolicies.push(x);this.save();return structuredClone(x)}
  addOperationalIncident(x:MaksterOperationalIncident){this.state.operationalIncidents.push(x);this.save();return structuredClone(x)}
  updateOperationalIncident(x:MaksterOperationalIncident){const i=this.state.operationalIncidents.findIndex(v=>v.id===x.id);if(i<0)throw new Error('incident_not_found');this.state.operationalIncidents[i]=x;this.save();return structuredClone(x)}
  addBackupManifest(x:MaksterBackupManifest){this.state.backupManifests.push(x);this.save();return structuredClone(x)}
  addReadinessSnapshot(x:MaksterReadinessSnapshot){this.state.readinessSnapshots.push(x);this.save();return structuredClone(x)}
  addCashEvent(input:Omit<CashEvent,'id'>){const x:CashEvent={id:randomUUID(),...input};this.state.cashEvents.push(x);this.save();return x}
  addFixedCost(input:Omit<FixedMonthlyCost,'id'>){const x:FixedMonthlyCost={id:randomUUID(),...input};this.state.fixedMonthlyCosts.push(x);this.save();return x}
}
