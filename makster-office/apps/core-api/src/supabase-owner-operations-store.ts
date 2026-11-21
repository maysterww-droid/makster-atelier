
import type {
  OwnerOperationsState,WarehouseItem,WarehouseReservation,SupplierProfile,SupplierQuote,MaterialProcurementRfq,MaterialRfqCommunication,ProcurementAward,ProductionWorkCenter,ProjectCapacityOverride,ProductionTimeEntry,TreasuryBalance,OwnerDecisionPlan,OwnerQueuePriorityOverride,ProductionOperation,FinanceLedgerEntry,FinanceSettings,MaksterOfficeLead,MaksterOfficeCampaign,MaksterOfficeContentItem,MaksterOfficeApproval,MaksterOfficeAgentRun,MaksterOfficeCycle,MaksterOfficeOwnerBrief,MaksterGrowthConnection,MaksterGrowthSyncSnapshot,MaksterAutopilotDecision,MaksterAutopilotRun,GrowthSpendGuardrail,GrowthProviderExecution,GrowthAuditLogEntry,GrowthInboundLeadEvent,MaksterCreativeAsset,MaksterContentDraftSet,MaksterPublishJob,MaksterContentPerformance,MaksterPilotProject,MaksterPilotRun,MaksterRolePolicy,MaksterOperationalIncident,MaksterBackupManifest,MaksterReadinessSnapshot,CashEvent,FixedMonthlyCost
} from '../../../packages/owner-operations/src/types.js';

type Json=Record<string,unknown>;
export interface SupabaseOwnerOperationsStoreOptions{url:string;secretKey:string;organizationId:string;fetchImpl?:typeof fetch}

export class SupabaseOwnerOperationsStore{
  constructor(private readonly options:SupabaseOwnerOperationsStoreOptions){}
  private headers(extra?:HeadersInit):HeadersInit{
    const h:any={apikey:this.options.secretKey,'content-type':'application/json',...(extra??{})};
    if(!this.options.secretKey.startsWith('sb_secret_'))h.authorization=`Bearer ${this.options.secretKey}`;
    return h;
  }
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const response=await (this.options.fetchImpl??fetch)(`${this.options.url}/rest/v1/${path}`,{...init,headers:this.headers(init.headers)});
    const text=await response.text();if(!response.ok)throw new Error(`supabase_owner_ops_${response.status}: ${text}`);
    return text?JSON.parse(text) as T:undefined as T;
  }
  private async rpc<T>(name:string,body:Json):Promise<T>{
    return this.request<T>(`rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
  }
  private org(){return this.options.organizationId}
  async get():Promise<OwnerOperationsState>{
    const q=`organization_id=eq.${encodeURIComponent(this.org())}`;
    const [items,reservations,suppliers,quotes,materialRfqs,materialComms,awards,centers,overrides,timeEntries,treasury,queueOverrides,decisionPlans,productionOperations,financeLedger,financeSettings,officeLeads,officeCampaigns,officeContent,officeApprovals,officeRuns,officeCycles,officeBriefs,growthConnections,growthSnapshots,autopilotDecisions,autopilotRuns,growthGuardrails,growthExecutions,growthAudit,growthInbound,creativeAssets,contentDraftSets,publishJobs,contentPerformance,pilotProjects,pilotRuns,rolePolicies,incidents,backupManifests,readinessSnapshots,cash,fixed]=await Promise.all([
      this.request<any[]>(`owner_warehouse_items?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_warehouse_reservations?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_supplier_profiles?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_supplier_quotes?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_material_rfqs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_material_rfq_communications?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_procurement_awards?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_production_work_centers?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_project_capacity_overrides?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_production_time_entries?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_treasury_balances?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_queue_priority_overrides?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_decision_plans?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_production_operations?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_finance_ledger?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_finance_settings?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_leads?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_campaigns?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_content?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_approvals?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_agent_runs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_cycles?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_owner_briefs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_connections?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_sync_snapshots?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_autopilot_decisions?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_office_autopilot_runs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_guardrails?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_provider_executions?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_audit_log?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_growth_inbound_leads?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_creative_assets?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_content_draft_sets?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_publish_jobs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_content_performance?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_pilot_projects?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_pilot_runs?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_role_policies?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_operational_incidents?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_backup_manifests?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`makster_readiness_snapshots?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_cash_events?${q}&select=*`,{method:'GET'}),
      this.request<any[]>(`owner_fixed_monthly_costs?${q}&select=*`,{method:'GET'})
    ]);
    return {
      version:'5.6.0',
      warehouseItems:items.map(x=>({id:x.id,sku:x.sku,name:x.name,...(x.manufacturer?{manufacturer:x.manufacturer}:{}),unit:x.unit,onHand:Number(x.on_hand),...(x.min_stock!=null?{minStock:Number(x.min_stock)}:{}),...(x.unit_cost_minor!=null?{unitCostMinor:Number(x.unit_cost_minor)}:{}),currency:x.currency,...(x.location?{location:x.location}:{}),updatedAt:x.updated_at})),
      warehouseReservations:reservations.map(x=>({id:x.id,itemId:x.item_id,projectId:x.project_id,quantity:Number(x.quantity),priority:Number(x.priority),status:x.status,createdAt:x.created_at,...(x.note?{note:x.note}:{})})),
      suppliers:suppliers.map(x=>({id:x.id,name:x.name,currency:x.currency,leadTimeDays:Number(x.lead_time_days),reliabilityPct:Number(x.reliability_pct),defectPct:Number(x.defect_pct),paymentTermsDays:Number(x.payment_terms_days),priceIndex:Number(x.price_index),active:Boolean(x.active),...(x.email?{email:x.email}:{}),categories:x.categories??[],languages:x.languages??[],updatedAt:x.updated_at})),
      supplierQuotes:quotes.map(x=>({id:x.id,supplierId:x.supplier_id,...(x.rfq_id?{rfqId:x.rfq_id}:{}),...(x.reference?{reference:x.reference}:{}),currency:x.currency,lines:x.lines_json??[],leadTimeDays:Number(x.lead_time_days),...(x.valid_until?{validUntil:x.valid_until}:{}),...(x.delivery_cost_minor!=null?{deliveryCostMinor:Number(x.delivery_cost_minor)}:{}),createdAt:x.created_at})),
      materialRfqs:materialRfqs.map(x=>x.rfq_json),
      materialRfqCommunications:materialComms.map(x=>x.communication_json),
      procurementAwards:awards.map(x=>({id:x.id,quoteId:x.quote_id,supplierId:x.supplier_id,projectId:x.project_id,sku:x.sku,quantity:Number(x.quantity),unit:x.unit,currency:x.currency,totalCostMinor:Number(x.total_cost_minor),paymentDueAt:x.payment_due_at,expectedAt:x.expected_at,status:x.status,...(x.purchase_order_id?{purchaseOrderId:x.purchase_order_id}:{}),...(x.cash_event_id?{cashEventId:x.cash_event_id}:{}),awardedBy:x.awarded_by,awardedAt:x.awarded_at,...(x.error?{error:x.error}:{})})),
      productionWorkCenters:centers.map(x=>({id:x.id,name:x.name,kind:x.kind,dailyCapacityHours:Number(x.daily_capacity_hours),active:Boolean(x.active),workdays:x.workdays??[1,2,3,4,5],updatedAt:x.updated_at})),
      projectCapacityOverrides:overrides.map(x=>({id:x.id,projectId:x.project_id,centerKind:x.center_kind,hours:Number(x.hours),...(x.note?{note:x.note}:{}),updatedAt:x.updated_at})),
      productionTimeEntries:timeEntries.map(x=>({id:x.id,projectId:x.project_id,centerKind:x.center_kind,plannedHours:Number(x.planned_hours),actualHours:Number(x.actual_hours),completedAt:x.completed_at,recordedBy:x.recorded_by,...(x.note?{note:x.note}:{})})),
      treasuryBalances:treasury.map(x=>({id:x.id,currency:x.currency,openingBalanceMinor:Number(x.opening_balance_minor),asOf:x.as_of,updatedAt:x.updated_at})),
      queuePriorityOverrides:queueOverrides.map(x=>({id:x.id,projectId:x.project_id,priority:Number(x.priority),...(x.source_plan_id?{sourcePlanId:x.source_plan_id}:{}),updatedAt:x.updated_at})),
      decisionPlans:decisionPlans.map(x=>x.plan_json),
      productionOperations:productionOperations.map(x=>x.operation_json),
      financeLedgerEntries:financeLedger.map(x=>({id:x.id,type:x.entry_type,category:x.category,amountMinor:Number(x.amount_minor),currency:x.currency,effectiveAt:x.effective_at,...(x.project_id?{projectId:x.project_id}:{}),...(x.counterparty?{counterparty:x.counterparty}:{}),...(x.note?{note:x.note}:{}),source:x.source,...(x.source_id?{sourceId:x.source_id}:{}),createdBy:x.created_by,createdAt:x.created_at})),
      financeSettings:financeSettings.map(x=>({id:x.id,currency:x.currency,targetGrossMarginPercent:Number(x.target_gross_margin_percent),targetOperatingMarginPercent:Number(x.target_operating_margin_percent),taxReservePercent:Number(x.tax_reserve_percent),runwaySafetyMonths:Number(x.runway_safety_months),updatedAt:x.updated_at})),
      officeLeads:officeLeads.map(x=>x.data_json),
      officeCampaigns:officeCampaigns.map(x=>x.data_json),
      officeContent:officeContent.map(x=>x.data_json),
      officeApprovals:officeApprovals.map(x=>x.data_json),
      officeAgentRuns:officeRuns.map(x=>x.data_json),
      officeCycles:officeCycles.map(x=>x.data_json),
      officeOwnerBriefs:officeBriefs.map(x=>x.data_json),
      growthConnections:growthConnections.map(x=>x.data_json),
      growthSyncSnapshots:growthSnapshots.map(x=>x.data_json),
      officeAutopilotDecisions:autopilotDecisions.map(x=>x.data_json),
      officeAutopilotRuns:autopilotRuns.map(x=>x.data_json),
      growthSpendGuardrails:growthGuardrails.map(x=>x.data_json),
      growthProviderExecutions:growthExecutions.map(x=>x.data_json),
      growthAuditLog:growthAudit.map(x=>x.data_json),
      growthInboundLeadEvents:growthInbound.map(x=>x.data_json),
      creativeAssets:creativeAssets.map(x=>x.data_json),contentDraftSets:contentDraftSets.map(x=>x.data_json),publishJobs:publishJobs.map(x=>x.data_json),contentPerformance:contentPerformance.map(x=>x.data_json),pilotProjects:pilotProjects.map(x=>x.data_json),pilotRuns:pilotRuns.map(x=>x.data_json),rolePolicies:rolePolicies.map(x=>x.data_json),operationalIncidents:incidents.map(x=>x.data_json),backupManifests:backupManifests.map(x=>x.data_json),readinessSnapshots:readinessSnapshots.map(x=>x.data_json),
      cashEvents:cash.map(x=>({id:x.id,type:x.event_type,category:x.category,amountMinor:Number(x.amount_minor),currency:x.currency,dueAt:x.due_at,status:x.status,...(x.project_id?{projectId:x.project_id}:{}),...(x.counterparty?{counterparty:x.counterparty}:{}),...(x.note?{note:x.note}:{}),...(x.source?{source:x.source}:{}),...(x.source_id?{sourceId:x.source_id}:{})})),
      fixedMonthlyCosts:fixed.map(x=>({id:x.id,category:x.category,amountMinor:Number(x.amount_minor),currency:x.currency})),
      updatedAt:new Date().toISOString()
    };
  }
  async addWarehouseItem(input:Omit<WarehouseItem,'id'|'updatedAt'>):Promise<WarehouseItem>{
    const rows=await this.request<any[]>('owner_warehouse_items',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),sku:input.sku,name:input.name,manufacturer:input.manufacturer??null,unit:input.unit,on_hand:input.onHand,min_stock:input.minStock??null,unit_cost_minor:input.unitCostMinor??null,currency:input.currency,location:input.location??null
    })});const x=rows[0];return {id:x.id,...input,updatedAt:x.updated_at};
  }
  async adjustWarehouseItem(id:string,delta:number):Promise<WarehouseItem>{
    const x=await this.rpc<any>('owner_adjust_warehouse_stock',{p_organization_id:this.org(),p_item_id:id,p_delta:delta});
    return {id:x.id,sku:x.sku,name:x.name,...(x.manufacturer?{manufacturer:x.manufacturer}:{}),unit:x.unit,onHand:Number(x.on_hand),...(x.min_stock!=null?{minStock:Number(x.min_stock)}:{}),...(x.unit_cost_minor!=null?{unitCostMinor:Number(x.unit_cost_minor)}:{}),currency:x.currency,...(x.location?{location:x.location}:{}),updatedAt:x.updated_at};
  }
  async reserve(input:{itemId:string;projectId:string;quantity:number;priority?:number;note?:string}):Promise<WarehouseReservation>{
    const x=await this.rpc<any>('owner_reserve_warehouse_stock',{p_organization_id:this.org(),p_item_id:input.itemId,p_project_id:input.projectId,p_quantity:input.quantity,p_priority:input.priority??100,p_note:input.note??null});
    return {id:x.id,itemId:x.item_id,projectId:x.project_id,quantity:Number(x.quantity),priority:Number(x.priority),status:x.status,createdAt:x.created_at,...(x.note?{note:x.note}:{})};
  }
  async setReservationStatus(id:string,status:'consumed'|'released'):Promise<WarehouseReservation>{
    const x=await this.rpc<any>('owner_set_reservation_status',{p_organization_id:this.org(),p_reservation_id:id,p_status:status});
    return {id:x.id,itemId:x.item_id,projectId:x.project_id,quantity:Number(x.quantity),priority:Number(x.priority),status:x.status,createdAt:x.created_at,...(x.note?{note:x.note}:{})};
  }
  async addSupplier(input:Omit<SupplierProfile,'id'|'updatedAt'>):Promise<SupplierProfile>{
    const rows=await this.request<any[]>('owner_supplier_profiles',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),name:input.name,currency:input.currency,lead_time_days:input.leadTimeDays,reliability_pct:input.reliabilityPct,defect_pct:input.defectPct,payment_terms_days:input.paymentTermsDays,price_index:input.priceIndex,active:input.active,email:input.email??null,categories:input.categories??[],languages:input.languages??[]
    })});const x=rows[0];return {id:x.id,...input,updatedAt:x.updated_at};
  }
  async addSupplierQuote(input:Omit<SupplierQuote,'id'|'createdAt'>):Promise<SupplierQuote>{
    const rows=await this.request<any[]>('owner_supplier_quotes',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),supplier_id:input.supplierId,rfq_id:input.rfqId??null,reference:input.reference??null,currency:input.currency,lines_json:input.lines,lead_time_days:input.leadTimeDays,valid_until:input.validUntil??null,delivery_cost_minor:input.deliveryCostMinor??null
    })});const x=rows[0];return {id:x.id,...input,createdAt:x.created_at};
  }


  async addMaterialRfq(input:MaterialProcurementRfq):Promise<MaterialProcurementRfq>{
    await this.request<any[]>('owner_material_rfqs',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({
      id:input.id,organization_id:this.org(),project_id:input.projectId,status:input.status,rfq_json:input,updated_at:new Date().toISOString()
    })});return input;
  }
  async updateMaterialRfq(input:MaterialProcurementRfq):Promise<MaterialProcurementRfq>{
    const rows=await this.request<any[]>(`owner_material_rfqs?id=eq.${encodeURIComponent(input.id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{
      method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({status:input.status,rfq_json:input,updated_at:new Date().toISOString()})
    });if(!rows[0])throw new Error('material_rfq_not_found');return input;
  }
  async addMaterialRfqCommunication(input:MaterialRfqCommunication):Promise<MaterialRfqCommunication>{
    await this.request<any[]>('owner_material_rfq_communications',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({
      id:input.id,organization_id:this.org(),rfq_id:input.rfqId,supplier_id:input.supplierId,status:input.status,communication_json:input,updated_at:new Date().toISOString()
    })});return input;
  }
  async updateMaterialRfqCommunication(input:MaterialRfqCommunication):Promise<MaterialRfqCommunication>{
    const rows=await this.request<any[]>(`owner_material_rfq_communications?id=eq.${encodeURIComponent(input.id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{
      method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({status:input.status,communication_json:input,updated_at:new Date().toISOString()})
    });if(!rows[0])throw new Error('material_rfq_communication_not_found');return input;
  }

  async createProcurementAward(input:Omit<ProcurementAward,'id'|'awardedAt'|'status'>):Promise<ProcurementAward>{
    const rows=await this.request<any[]>('owner_procurement_awards',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),quote_id:input.quoteId,supplier_id:input.supplierId,project_id:input.projectId,sku:input.sku,
      quantity:input.quantity,unit:input.unit,currency:input.currency,total_cost_minor:input.totalCostMinor,payment_due_at:input.paymentDueAt,
      expected_at:input.expectedAt,status:'pending_project_order',awarded_by:input.awardedBy
    })});
    const x=rows[0];return {id:x.id,...input,status:x.status,awardedAt:x.awarded_at};
  }
  async updateProcurementAward(id:string,patch:Partial<Pick<ProcurementAward,'status'|'purchaseOrderId'|'cashEventId'|'error'>>):Promise<ProcurementAward>{
    const body:any={};
    if(patch.status!=null)body.status=patch.status;if(patch.purchaseOrderId!==undefined)body.purchase_order_id=patch.purchaseOrderId;
    if(patch.cashEventId!==undefined)body.cash_event_id=patch.cashEventId;if(patch.error!==undefined)body.error=patch.error;
    const rows=await this.request<any[]>(`owner_procurement_awards?id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify(body)});
    if(!rows[0])throw new Error('procurement_award_not_found');
    const x=rows[0];return {id:x.id,quoteId:x.quote_id,supplierId:x.supplier_id,projectId:x.project_id,sku:x.sku,quantity:Number(x.quantity),unit:x.unit,currency:x.currency,totalCostMinor:Number(x.total_cost_minor),paymentDueAt:x.payment_due_at,expectedAt:x.expected_at,status:x.status,...(x.purchase_order_id?{purchaseOrderId:x.purchase_order_id}:{}),...(x.cash_event_id?{cashEventId:x.cash_event_id}:{}),awardedBy:x.awarded_by,awardedAt:x.awarded_at,...(x.error?{error:x.error}:{})};
  }
  async upsertWorkCenter(input:Omit<ProductionWorkCenter,'updatedAt'>):Promise<ProductionWorkCenter>{
    const rows=await this.request<any[]>(`owner_production_work_centers?on_conflict=organization_id,kind`,{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({
      id:input.id,organization_id:this.org(),name:input.name,kind:input.kind,daily_capacity_hours:input.dailyCapacityHours,active:input.active,workdays:input.workdays
    })});
    const x=rows[0];return {id:x.id,name:x.name,kind:x.kind,dailyCapacityHours:Number(x.daily_capacity_hours),active:Boolean(x.active),workdays:x.workdays??[1,2,3,4,5],updatedAt:x.updated_at};
  }
  async setCapacityOverride(input:Omit<ProjectCapacityOverride,'id'|'updatedAt'>):Promise<ProjectCapacityOverride>{
    const rows=await this.request<any[]>(`owner_project_capacity_overrides?on_conflict=organization_id,project_id,center_kind`,{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({
      organization_id:this.org(),project_id:input.projectId,center_kind:input.centerKind,hours:input.hours,note:input.note??null
    })});
    const x=rows[0];return {id:x.id,projectId:x.project_id,centerKind:x.center_kind,hours:Number(x.hours),...(x.note?{note:x.note}:{}),updatedAt:x.updated_at};
  }


  async addProductionTimeEntry(input:Omit<ProductionTimeEntry,'id'>):Promise<ProductionTimeEntry>{
    const rows=await this.request<any[]>('owner_production_time_entries',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),project_id:input.projectId,center_kind:input.centerKind,planned_hours:input.plannedHours,
      actual_hours:input.actualHours,completed_at:input.completedAt,recorded_by:input.recordedBy,note:input.note??null
    })});
    const x=rows[0];return {id:x.id,...input};
  }
  async setTreasuryBalance(input:Omit<TreasuryBalance,'id'|'updatedAt'>):Promise<TreasuryBalance>{
    const rows=await this.request<any[]>(`owner_treasury_balances?on_conflict=organization_id,currency`,{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({
      organization_id:this.org(),currency:input.currency,opening_balance_minor:input.openingBalanceMinor,as_of:input.asOf
    })});
    const x=rows[0];return {id:x.id,currency:x.currency,openingBalanceMinor:Number(x.opening_balance_minor),asOf:x.as_of,updatedAt:x.updated_at};
  }


  async addDecisionPlan(plan:OwnerDecisionPlan):Promise<OwnerDecisionPlan>{
    await this.request<any[]>('owner_decision_plans',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      id:plan.id,organization_id:this.org(),scenario_id:plan.scenarioId,status:plan.status,plan_json:plan
    })});
    return plan;
  }
  async updateDecisionPlan(plan:OwnerDecisionPlan):Promise<OwnerDecisionPlan>{
    const rows=await this.request<any[]>(`owner_decision_plans?id=eq.${encodeURIComponent(plan.id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{
      method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({status:plan.status,plan_json:plan,updated_at:new Date().toISOString()})
    });
    if(!rows[0])throw new Error('decision_plan_not_found');return plan;
  }
  async setQueuePriority(input:{projectId:string;priority:number;sourcePlanId?:string}):Promise<OwnerQueuePriorityOverride>{
    const rows=await this.request<any[]>(`owner_queue_priority_overrides?on_conflict=organization_id,project_id`,{
      method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({
        organization_id:this.org(),project_id:input.projectId,priority:input.priority,source_plan_id:input.sourcePlanId??null
      })
    });
    const x=rows[0];return {id:x.id,projectId:x.project_id,priority:Number(x.priority),...(x.source_plan_id?{sourcePlanId:x.source_plan_id}:{}),updatedAt:x.updated_at};
  }


  async replaceProductionOperations(operations:ProductionOperation[]):Promise<ProductionOperation[]>{
    await this.request<any[]>(`owner_production_operations?organization_id=eq.${encodeURIComponent(this.org())}`,{method:'DELETE',headers:{prefer:'return=minimal'}});
    if(operations.length){
      await this.request<any[]>('owner_production_operations',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify(
        operations.map(x=>({id:x.id,organization_id:this.org(),project_id:x.projectId,center_kind:x.centerKind,status:x.status,operation_json:x,updated_at:x.updatedAt}))
      )});
    }
    return operations;
  }
  async updateProductionOperation(operation:ProductionOperation):Promise<ProductionOperation>{
    const rows=await this.request<any[]>(`owner_production_operations?id=eq.${encodeURIComponent(operation.id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{
      method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({
        project_id:operation.projectId,center_kind:operation.centerKind,status:operation.status,operation_json:operation,updated_at:operation.updatedAt
      })
    });
    if(!rows[0])throw new Error('production_operation_not_found');return operation;
  }


  async addFinanceLedgerEntry(input:Omit<FinanceLedgerEntry,'id'|'createdAt'>):Promise<FinanceLedgerEntry>{
    const rows=await this.request<any[]>('owner_finance_ledger',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),entry_type:input.type,category:input.category,amount_minor:input.amountMinor,currency:input.currency,
      effective_at:input.effectiveAt,project_id:input.projectId??null,counterparty:input.counterparty??null,note:input.note??null,
      source:input.source,source_id:input.sourceId??null,created_by:input.createdBy
    })});
    const x=rows[0];return {id:x.id,...input,createdAt:x.created_at};
  }
  async upsertFinanceSettings(input:Omit<FinanceSettings,'id'|'updatedAt'>):Promise<FinanceSettings>{
    const rows=await this.request<any[]>(`owner_finance_settings?on_conflict=organization_id,currency`,{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({
      organization_id:this.org(),currency:input.currency,target_gross_margin_percent:input.targetGrossMarginPercent,
      target_operating_margin_percent:input.targetOperatingMarginPercent,tax_reserve_percent:input.taxReservePercent,
      runway_safety_months:input.runwaySafetyMonths
    })});
    const x=rows[0];return {id:x.id,currency:x.currency,targetGrossMarginPercent:Number(x.target_gross_margin_percent),targetOperatingMarginPercent:Number(x.target_operating_margin_percent),taxReservePercent:Number(x.tax_reserve_percent),runwaySafetyMonths:Number(x.runway_safety_months),updatedAt:x.updated_at};
  }


  private async officeInsert<T extends {id:string}>(table:string,input:T):Promise<T>{
    await this.request<any[]>(table,{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({id:input.id,organization_id:this.org(),data_json:input,updated_at:new Date().toISOString()})});return input;
  }
  private async officeUpdate<T extends {id:string}>(table:string,input:T):Promise<T>{
    const rows=await this.request<any[]>(`${table}?id=eq.${encodeURIComponent(input.id)}&organization_id=eq.${encodeURIComponent(this.org())}`,{method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({data_json:input,updated_at:new Date().toISOString()})});
    if(!rows[0])throw new Error('office_entity_not_found');return input;
  }
  async addOfficeLead(x:MaksterOfficeLead){return this.officeInsert('makster_office_leads',x)}
  async updateOfficeLead(x:MaksterOfficeLead){return this.officeUpdate('makster_office_leads',x)}
  async addOfficeCampaign(x:MaksterOfficeCampaign){return this.officeInsert('makster_office_campaigns',x)}
  async updateOfficeCampaign(x:MaksterOfficeCampaign){return this.officeUpdate('makster_office_campaigns',x)}
  async addOfficeContent(x:MaksterOfficeContentItem){return this.officeInsert('makster_office_content',x)}
  async updateOfficeContent(x:MaksterOfficeContentItem){return this.officeUpdate('makster_office_content',x)}
  async addOfficeApproval(x:MaksterOfficeApproval){return this.officeInsert('makster_office_approvals',x)}
  async updateOfficeApproval(x:MaksterOfficeApproval){return this.officeUpdate('makster_office_approvals',x)}
  async addOfficeCycle(x:MaksterOfficeCycle){return this.officeInsert('makster_office_cycles',x)}
  async updateOfficeCycle(x:MaksterOfficeCycle){return this.officeUpdate('makster_office_cycles',x)}
  async addOfficeAgentRuns(xs:MaksterOfficeAgentRun[]){for(const x of xs)await this.officeInsert('makster_office_agent_runs',x);return xs}
  async addOfficeOwnerBrief(x:MaksterOfficeOwnerBrief){return this.officeInsert('makster_office_owner_briefs',x)}

  async addGrowthConnection(x:MaksterGrowthConnection){return this.officeInsert('makster_growth_connections',x)}
  async updateGrowthConnection(x:MaksterGrowthConnection){return this.officeUpdate('makster_growth_connections',x)}
  async addGrowthSyncSnapshot(x:MaksterGrowthSyncSnapshot){return this.officeInsert('makster_growth_sync_snapshots',x)}
  async addOfficeAutopilotDecision(x:MaksterAutopilotDecision){return this.officeInsert('makster_office_autopilot_decisions',x)}
  async updateOfficeAutopilotDecision(x:MaksterAutopilotDecision){return this.officeUpdate('makster_office_autopilot_decisions',x)}
  async addOfficeAutopilotRun(x:MaksterAutopilotRun){return this.officeInsert('makster_office_autopilot_runs',x)}
  async upsertGrowthSpendGuardrail(x:GrowthSpendGuardrail){
    const existing=(await this.request<any[]>(`makster_growth_guardrails?organization_id=eq.${encodeURIComponent(this.org())}&select=*`,{method:'GET'})).find(r=>r.data_json?.id===x.id||(r.data_json?.currency===x.currency&&r.data_json?.provider===x.provider));
    return existing?this.officeUpdate('makster_growth_guardrails',{...x,id:existing.id} as any):this.officeInsert('makster_growth_guardrails',x)
  }
  async addGrowthProviderExecution(x:GrowthProviderExecution){return this.officeInsert('makster_growth_provider_executions',x)}
  async updateGrowthProviderExecution(x:GrowthProviderExecution){return this.officeUpdate('makster_growth_provider_executions',x)}
  async addGrowthAuditLog(x:GrowthAuditLogEntry){return this.officeInsert('makster_growth_audit_log',x)}
  async addGrowthInboundLeadEvent(x:GrowthInboundLeadEvent){return this.officeInsert('makster_growth_inbound_leads',x)}
  async addCreativeAsset(x:MaksterCreativeAsset){return this.officeInsert('makster_creative_assets',x)}
  async addContentDraftSet(x:MaksterContentDraftSet){return this.officeInsert('makster_content_draft_sets',x)}
  async addPublishJob(x:MaksterPublishJob){return this.officeInsert('makster_publish_jobs',x)}
  async updatePublishJob(x:MaksterPublishJob){return this.officeUpdate('makster_publish_jobs',x)}
  async addContentPerformance(x:MaksterContentPerformance){return this.officeInsert('makster_content_performance',x)}
  async addPilotProject(x:MaksterPilotProject){return this.officeInsert('makster_pilot_projects',x)}
  async addPilotRun(x:MaksterPilotRun){return this.officeInsert('makster_pilot_runs',x)}
  async addRolePolicy(x:MaksterRolePolicy){return this.officeInsert('makster_role_policies',x)}
  async upsertRolePolicy(x:MaksterRolePolicy){
    const rows=await this.request<any[]>(`makster_role_policies?organization_id=eq.${encodeURIComponent(this.org())}&select=*`,{method:'GET'});
    const existing=rows.find(r=>r.data_json?.role===x.role);return existing?this.officeUpdate('makster_role_policies',{...x,id:existing.id} as any):this.officeInsert('makster_role_policies',x)
  }
  async addOperationalIncident(x:MaksterOperationalIncident){return this.officeInsert('makster_operational_incidents',x)}
  async updateOperationalIncident(x:MaksterOperationalIncident){return this.officeUpdate('makster_operational_incidents',x)}
  async addBackupManifest(x:MaksterBackupManifest){return this.officeInsert('makster_backup_manifests',x)}
  async addReadinessSnapshot(x:MaksterReadinessSnapshot){return this.officeInsert('makster_readiness_snapshots',x)}
  async addCashEvent(input:Omit<CashEvent,'id'>):Promise<CashEvent>{
    const rows=await this.request<any[]>('owner_cash_events',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({
      organization_id:this.org(),event_type:input.type,category:input.category,amount_minor:input.amountMinor,currency:input.currency,due_at:input.dueAt,status:input.status,project_id:input.projectId??null,counterparty:input.counterparty??null,note:input.note??null,source:input.source??'manual',source_id:input.sourceId??null
    })});return {id:rows[0].id,...input};
  }
  async addFixedCost(input:Omit<FixedMonthlyCost,'id'>):Promise<FixedMonthlyCost>{
    const rows=await this.request<any[]>('owner_fixed_monthly_costs',{method:'POST',headers:{prefer:'return=representation'},body:JSON.stringify({organization_id:this.org(),category:input.category,amount_minor:input.amountMinor,currency:input.currency})});return {id:rows[0].id,...input};
  }
}
