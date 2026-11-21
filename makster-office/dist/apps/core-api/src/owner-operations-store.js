import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const empty = () => ({ version: '5.6.0', warehouseItems: [], warehouseReservations: [], suppliers: [], supplierQuotes: [], materialRfqs: [], materialRfqCommunications: [], procurementAwards: [], productionWorkCenters: [], projectCapacityOverrides: [], productionTimeEntries: [], treasuryBalances: [], queuePriorityOverrides: [], decisionPlans: [], productionOperations: [], financeLedgerEntries: [], financeSettings: [], officeLeads: [], officeCampaigns: [], officeContent: [], officeApprovals: [], officeAgentRuns: [], officeCycles: [], officeOwnerBriefs: [], growthConnections: [], growthSyncSnapshots: [], officeAutopilotDecisions: [], officeAutopilotRuns: [], growthSpendGuardrails: [], growthProviderExecutions: [], growthAuditLog: [], growthInboundLeadEvents: [], creativeAssets: [], contentDraftSets: [], publishJobs: [], contentPerformance: [], pilotProjects: [], pilotRuns: [], rolePolicies: [], operationalIncidents: [], backupManifests: [], readinessSnapshots: [], cashEvents: [], fixedMonthlyCosts: [], updatedAt: new Date().toISOString() });
export class OwnerOperationsStore {
    filePath;
    state;
    constructor(filePath) {
        this.filePath = filePath;
        this.state = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : empty();
        this.state.version = '5.6.0';
        this.state.supplierQuotes ??= [];
        this.state.materialRfqs ??= [];
        this.state.materialRfqCommunications ??= [];
        this.state.procurementAwards ??= [];
        this.state.productionWorkCenters ??= [];
        this.state.projectCapacityOverrides ??= [];
        this.state.productionTimeEntries ??= [];
        this.state.treasuryBalances ??= [];
        this.state.queuePriorityOverrides ??= [];
        this.state.decisionPlans ??= [];
        this.state.productionOperations ??= [];
        this.state.financeLedgerEntries ??= [];
        this.state.financeSettings ??= [];
        this.state.officeLeads ??= [];
        this.state.officeCampaigns ??= [];
        this.state.officeContent ??= [];
        this.state.officeApprovals ??= [];
        this.state.officeAgentRuns ??= [];
        this.state.officeCycles ??= [];
        this.state.officeOwnerBriefs ??= [];
        this.state.growthConnections ??= [];
        this.state.growthSyncSnapshots ??= [];
        this.state.officeAutopilotDecisions ??= [];
        this.state.officeAutopilotRuns ??= [];
        this.state.growthSpendGuardrails ??= [];
        this.state.growthProviderExecutions ??= [];
        this.state.growthAuditLog ??= [];
        this.state.growthInboundLeadEvents ??= [];
        this.state.creativeAssets ??= [];
        this.state.contentDraftSets ??= [];
        this.state.publishJobs ??= [];
        this.state.contentPerformance ??= [];
        this.state.pilotProjects ??= [];
        this.state.pilotRuns ??= [];
        this.state.rolePolicies ??= [];
        this.state.operationalIncidents ??= [];
        this.state.backupManifests ??= [];
        this.state.readinessSnapshots ??= [];
    }
    save() { this.state.updatedAt = new Date().toISOString(); writeFileSync(this.filePath, JSON.stringify(this.state, null, 2) + '\n', 'utf8'); }
    get() { return structuredClone(this.state); }
    addWarehouseItem(input) {
        const item = { id: randomUUID(), ...input, updatedAt: new Date().toISOString() };
        this.state.warehouseItems.push(item);
        this.save();
        return item;
    }
    adjustWarehouseItem(id, delta) {
        const item = this.state.warehouseItems.find(x => x.id === id);
        if (!item)
            throw new Error('warehouse_item_not_found');
        if (!Number.isFinite(delta) || delta === 0)
            throw new Error('warehouse_adjustment_invalid');
        const reserved = this.state.warehouseReservations.filter(x => x.itemId === id && x.status === 'reserved').reduce((s, x) => s + x.quantity, 0);
        const next = item.onHand + delta;
        if (next < reserved)
            throw new Error('warehouse_adjustment_would_consume_reserved_stock');
        if (next < 0)
            throw new Error('warehouse_negative_stock');
        item.onHand = next;
        item.updatedAt = new Date().toISOString();
        this.save();
        return item;
    }
    reserve(input) {
        const item = this.state.warehouseItems.find(x => x.id === input.itemId);
        if (!item)
            throw new Error('warehouse_item_not_found');
        const reserved = this.state.warehouseReservations.filter(x => x.itemId === item.id && x.status === 'reserved').reduce((s, x) => s + x.quantity, 0);
        if (input.quantity <= 0 || reserved + input.quantity > item.onHand)
            throw new Error('warehouse_insufficient_available_stock');
        const r = { id: randomUUID(), itemId: item.id, projectId: input.projectId, quantity: input.quantity, priority: input.priority ?? 100, status: 'reserved', createdAt: new Date().toISOString(), ...(input.note ? { note: input.note } : {}) };
        this.state.warehouseReservations.push(r);
        this.save();
        return r;
    }
    setReservationStatus(id, status) {
        const r = this.state.warehouseReservations.find(x => x.id === id);
        if (!r)
            throw new Error('warehouse_reservation_not_found');
        if (r.status !== 'reserved')
            throw new Error('warehouse_reservation_not_active');
        r.status = status;
        if (status === 'consumed') {
            const item = this.state.warehouseItems.find(x => x.id === r.itemId);
            if (item)
                item.onHand = Math.max(0, item.onHand - r.quantity);
        }
        this.save();
        return r;
    }
    addSupplier(input) {
        const x = { id: randomUUID(), ...input, updatedAt: new Date().toISOString() };
        this.state.suppliers.push(x);
        this.save();
        return x;
    }
    addSupplierQuote(input) {
        const x = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
        this.state.supplierQuotes.push(x);
        this.save();
        return x;
    }
    addMaterialRfq(input) {
        if (this.state.materialRfqs.some(x => x.id === input.id))
            throw new Error('material_rfq_duplicate');
        this.state.materialRfqs.push(input);
        this.save();
        return structuredClone(input);
    }
    updateMaterialRfq(input) {
        const i = this.state.materialRfqs.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('material_rfq_not_found');
        this.state.materialRfqs[i] = input;
        this.save();
        return structuredClone(input);
    }
    addMaterialRfqCommunication(input) {
        this.state.materialRfqCommunications.push(input);
        this.save();
        return structuredClone(input);
    }
    updateMaterialRfqCommunication(input) {
        const i = this.state.materialRfqCommunications.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('material_rfq_communication_not_found');
        this.state.materialRfqCommunications[i] = input;
        this.save();
        return structuredClone(input);
    }
    createProcurementAward(input) {
        const x = { id: randomUUID(), ...input, status: 'pending_project_order', awardedAt: new Date().toISOString() };
        this.state.procurementAwards.push(x);
        this.save();
        return x;
    }
    updateProcurementAward(id, patch) {
        const x = this.state.procurementAwards.find(a => a.id === id);
        if (!x)
            throw new Error('procurement_award_not_found');
        Object.assign(x, patch);
        this.save();
        return x;
    }
    upsertWorkCenter(input) {
        const now = new Date().toISOString(), existing = this.state.productionWorkCenters.find(x => x.id === input.id || x.kind === input.kind);
        if (existing) {
            Object.assign(existing, input, { updatedAt: now });
            this.save();
            return existing;
        }
        const x = { ...input, updatedAt: now };
        this.state.productionWorkCenters.push(x);
        this.save();
        return x;
    }
    setCapacityOverride(input) {
        const now = new Date().toISOString(), existing = this.state.projectCapacityOverrides.find(x => x.projectId === input.projectId && x.centerKind === input.centerKind);
        if (existing) {
            Object.assign(existing, input, { updatedAt: now });
            this.save();
            return existing;
        }
        const x = { id: randomUUID(), ...input, updatedAt: now };
        this.state.projectCapacityOverrides.push(x);
        this.save();
        return x;
    }
    addProductionTimeEntry(input) {
        if (input.plannedHours <= 0 || input.actualHours < 0)
            throw new Error('production_time_invalid');
        const x = { id: randomUUID(), ...input };
        this.state.productionTimeEntries.push(x);
        this.save();
        return x;
    }
    setTreasuryBalance(input) {
        const now = new Date().toISOString();
        const existing = this.state.treasuryBalances.find(x => x.currency === input.currency);
        if (existing) {
            Object.assign(existing, input, { updatedAt: now });
            this.save();
            return existing;
        }
        const x = { id: randomUUID(), ...input, updatedAt: now };
        this.state.treasuryBalances.push(x);
        this.save();
        return x;
    }
    addDecisionPlan(plan) {
        this.state.decisionPlans.push(plan);
        this.save();
        return plan;
    }
    updateDecisionPlan(plan) {
        const i = this.state.decisionPlans.findIndex(x => x.id === plan.id);
        if (i < 0)
            throw new Error('decision_plan_not_found');
        this.state.decisionPlans[i] = plan;
        this.save();
        return plan;
    }
    setQueuePriority(input) {
        const now = new Date().toISOString();
        const existing = this.state.queuePriorityOverrides.find(x => x.projectId === input.projectId);
        if (existing) {
            Object.assign(existing, input, { updatedAt: now });
            this.save();
            return existing;
        }
        const x = { id: randomUUID(), ...input, updatedAt: now };
        this.state.queuePriorityOverrides.push(x);
        this.save();
        return x;
    }
    replaceProductionOperations(operations) {
        this.state.productionOperations = operations;
        this.save();
        return structuredClone(operations);
    }
    updateProductionOperation(operation) {
        const i = this.state.productionOperations.findIndex(x => x.id === operation.id);
        if (i < 0)
            throw new Error('production_operation_not_found');
        this.state.productionOperations[i] = operation;
        this.save();
        return structuredClone(operation);
    }
    addFinanceLedgerEntry(input) {
        if (!Number.isFinite(input.amountMinor) || input.amountMinor < 0)
            throw new Error('finance_ledger_amount_invalid');
        const x = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
        this.state.financeLedgerEntries.push(x);
        this.save();
        return structuredClone(x);
    }
    upsertFinanceSettings(input) {
        const now = new Date().toISOString(), existing = this.state.financeSettings.find(x => x.currency === input.currency);
        if (existing) {
            Object.assign(existing, input, { updatedAt: now });
            this.save();
            return structuredClone(existing);
        }
        const x = { id: randomUUID(), ...input, updatedAt: now };
        this.state.financeSettings.push(x);
        this.save();
        return structuredClone(x);
    }
    addOfficeLead(input) { this.state.officeLeads.push(input); this.save(); return structuredClone(input); }
    updateOfficeLead(input) {
        const i = this.state.officeLeads.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('office_lead_not_found');
        this.state.officeLeads[i] = input;
        this.save();
        return structuredClone(input);
    }
    addOfficeCampaign(input) { this.state.officeCampaigns.push(input); this.save(); return structuredClone(input); }
    updateOfficeCampaign(input) {
        const i = this.state.officeCampaigns.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('office_campaign_not_found');
        this.state.officeCampaigns[i] = input;
        this.save();
        return structuredClone(input);
    }
    addOfficeContent(input) { this.state.officeContent.push(input); this.save(); return structuredClone(input); }
    updateOfficeContent(input) {
        const i = this.state.officeContent.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('office_content_not_found');
        this.state.officeContent[i] = input;
        this.save();
        return structuredClone(input);
    }
    addOfficeApproval(input) { this.state.officeApprovals.push(input); this.save(); return structuredClone(input); }
    updateOfficeApproval(input) {
        const i = this.state.officeApprovals.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('office_approval_not_found');
        this.state.officeApprovals[i] = input;
        this.save();
        return structuredClone(input);
    }
    addOfficeCycle(input) { this.state.officeCycles.push(input); this.save(); return structuredClone(input); }
    updateOfficeCycle(input) {
        const i = this.state.officeCycles.findIndex(x => x.id === input.id);
        if (i < 0)
            throw new Error('office_cycle_not_found');
        this.state.officeCycles[i] = input;
        this.save();
        return structuredClone(input);
    }
    addOfficeAgentRuns(input) { this.state.officeAgentRuns.push(...input); this.save(); return structuredClone(input); }
    addOfficeOwnerBrief(input) { this.state.officeOwnerBriefs.push(input); this.save(); return structuredClone(input); }
    addGrowthConnection(input) { this.state.growthConnections.push(input); this.save(); return structuredClone(input); }
    updateGrowthConnection(input) { const i = this.state.growthConnections.findIndex(x => x.id === input.id); if (i < 0)
        throw new Error('growth_connection_not_found'); this.state.growthConnections[i] = input; this.save(); return structuredClone(input); }
    addGrowthSyncSnapshot(input) { this.state.growthSyncSnapshots.push(input); this.save(); return structuredClone(input); }
    addOfficeAutopilotDecision(input) { this.state.officeAutopilotDecisions.push(input); this.save(); return structuredClone(input); }
    updateOfficeAutopilotDecision(input) { const i = this.state.officeAutopilotDecisions.findIndex(x => x.id === input.id); if (i < 0)
        throw new Error('autopilot_decision_not_found'); this.state.officeAutopilotDecisions[i] = input; this.save(); return structuredClone(input); }
    addOfficeAutopilotRun(input) { this.state.officeAutopilotRuns.push(input); this.save(); return structuredClone(input); }
    upsertGrowthSpendGuardrail(input) {
        const i = this.state.growthSpendGuardrails.findIndex(x => x.id === input.id || (x.currency === input.currency && x.provider === input.provider));
        if (i >= 0)
            this.state.growthSpendGuardrails[i] = input;
        else
            this.state.growthSpendGuardrails.push(input);
        this.save();
        return structuredClone(input);
    }
    addGrowthProviderExecution(input) { this.state.growthProviderExecutions.push(input); this.save(); return structuredClone(input); }
    updateGrowthProviderExecution(input) { const i = this.state.growthProviderExecutions.findIndex(x => x.id === input.id); if (i < 0)
        throw new Error('growth_execution_not_found'); this.state.growthProviderExecutions[i] = input; this.save(); return structuredClone(input); }
    addGrowthAuditLog(input) { this.state.growthAuditLog.push(input); this.save(); return structuredClone(input); }
    addGrowthInboundLeadEvent(input) { this.state.growthInboundLeadEvents.push(input); this.save(); return structuredClone(input); }
    addCreativeAsset(x) { this.state.creativeAssets.push(x); this.save(); return structuredClone(x); }
    addContentDraftSet(x) { this.state.contentDraftSets.push(x); this.save(); return structuredClone(x); }
    addPublishJob(x) { this.state.publishJobs.push(x); this.save(); return structuredClone(x); }
    updatePublishJob(x) { const i = this.state.publishJobs.findIndex(v => v.id === x.id); if (i < 0)
        throw new Error('publish_job_not_found'); this.state.publishJobs[i] = x; this.save(); return structuredClone(x); }
    addContentPerformance(x) { this.state.contentPerformance.push(x); this.save(); return structuredClone(x); }
    addPilotProject(x) { this.state.pilotProjects.push(x); this.save(); return structuredClone(x); }
    addPilotRun(x) { this.state.pilotRuns.push(x); this.save(); return structuredClone(x); }
    addRolePolicy(x) { this.state.rolePolicies.push(x); this.save(); return structuredClone(x); }
    upsertRolePolicy(x) { const i = this.state.rolePolicies.findIndex(v => v.role === x.role); if (i >= 0)
        this.state.rolePolicies[i] = x;
    else
        this.state.rolePolicies.push(x); this.save(); return structuredClone(x); }
    addOperationalIncident(x) { this.state.operationalIncidents.push(x); this.save(); return structuredClone(x); }
    updateOperationalIncident(x) { const i = this.state.operationalIncidents.findIndex(v => v.id === x.id); if (i < 0)
        throw new Error('incident_not_found'); this.state.operationalIncidents[i] = x; this.save(); return structuredClone(x); }
    addBackupManifest(x) { this.state.backupManifests.push(x); this.save(); return structuredClone(x); }
    addReadinessSnapshot(x) { this.state.readinessSnapshots.push(x); this.save(); return structuredClone(x); }
    addCashEvent(input) { const x = { id: randomUUID(), ...input }; this.state.cashEvents.push(x); this.save(); return x; }
    addFixedCost(input) { const x = { id: randomUUID(), ...input }; this.state.fixedMonthlyCosts.push(x); this.save(); return x; }
}
