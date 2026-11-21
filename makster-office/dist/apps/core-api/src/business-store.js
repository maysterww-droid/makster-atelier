function authorizationKey(projectId, revision) { return `${projectId}:${revision}`; }
export class MemoryUnifiedBusinessStore {
    mode = 'memory';
    commercialPackages = new Map();
    commercialQuotesByProject = new Map();
    quoteStatuses = new Map();
    quoteContexts = new Map();
    quoteLineage = new Map();
    changeReports = new Map();
    contracts = new Map();
    changeOrders = new Map();
    authorizations = new Map();
    async countProjectQuotes(projectId) { return (this.commercialQuotesByProject.get(projectId) ?? []).length; }
    async saveCommercialPackage(input) {
        const id = input.built.quote.quoteId;
        if (!this.commercialPackages.has(id)) {
            this.commercialPackages.set(id, structuredClone(input.built));
            const ids = this.commercialQuotesByProject.get(input.built.quote.projectId) ?? [];
            if (!ids.includes(id))
                ids.push(id);
            this.commercialQuotesByProject.set(input.built.quote.projectId, ids);
            this.quoteContexts.set(id, structuredClone(input.context));
        }
        this.quoteStatuses.set(id, input.status);
    }
    async getCommercialPackage(quoteId) { const v = this.commercialPackages.get(quoteId); return v ? structuredClone(v) : undefined; }
    async listProjectQuotes(projectId) {
        const ids = this.commercialQuotesByProject.get(projectId) ?? [];
        return ids.map(id => ({ built: structuredClone(this.commercialPackages.get(id)), status: this.quoteStatuses.get(id) ?? 'draft', ...(this.quoteLineage.get(id) ? { lineage: structuredClone(this.quoteLineage.get(id)) } : {}) }));
    }
    async getQuoteStatus(quoteId) { return this.quoteStatuses.get(quoteId); }
    async setQuoteStatus(input) { this.quoteStatuses.set(input.quoteId, input.status); }
    async getQuoteContext(quoteId) { const v = this.quoteContexts.get(quoteId); return v ? structuredClone(v) : undefined; }
    async saveQuoteLineage(input) { this.quoteLineage.set(input.quoteId, structuredClone(input.lineage)); }
    async getQuoteLineage(quoteId) { const v = this.quoteLineage.get(quoteId); return v ? structuredClone(v) : undefined; }
    async saveChangeReport(input) { this.changeReports.set(input.report.reportId, structuredClone(input.report)); }
    async getChangeReport(reportId) { const v = this.changeReports.get(reportId); return v ? structuredClone(v) : undefined; }
    async createContract(contract) { if (this.contracts.has(contract.projectId))
        throw new Error('commercial_contract_already_exists'); this.contracts.set(contract.projectId, structuredClone(contract)); }
    async updateContract(contract) { this.contracts.set(contract.projectId, structuredClone(contract)); }
    async getContractByProject(projectId) { const v = this.contracts.get(projectId); return v ? structuredClone(v) : undefined; }
    async getContractById(contractId) { const v = [...this.contracts.values()].find(x => x.contractId === contractId); return v ? structuredClone(v) : undefined; }
    async createChangeOrder(input) { if (this.changeOrders.has(input.order.changeOrderId))
        return; this.changeOrders.set(input.order.changeOrderId, structuredClone(input.order)); }
    async updateChangeOrder(input) { this.changeOrders.set(input.order.changeOrderId, structuredClone(input.order)); }
    async getChangeOrder(changeOrderId) { const v = this.changeOrders.get(changeOrderId); return v ? structuredClone(v) : undefined; }
    async listProjectChangeOrders(projectId) { return [...this.changeOrders.values()].filter(x => x.binding.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(x => structuredClone(x)); }
    async saveAuthorization(input) { this.authorizations.set(authorizationKey(input.authorization.projectId, input.authorization.revision), structuredClone(input.authorization)); }
    async getAuthorization(projectId, revision) { const v = this.authorizations.get(authorizationKey(projectId, revision)); return v ? structuredClone(v) : undefined; }
    async applyAcceptedChangeOrderAtomic(input) {
        // Memory fallback cannot provide DB transactions, but applies the exact same state changes synchronously in one turn.
        this.changeOrders.set(input.order.changeOrderId, structuredClone(input.order));
        this.contracts.set(input.contract.projectId, structuredClone(input.contract));
        this.authorizations.set(authorizationKey(input.authorization.projectId, input.authorization.revision), structuredClone(input.authorization));
        this.quoteStatuses.set(input.baseQuoteId, 'superseded');
        this.quoteStatuses.set(input.newQuoteId, 'accepted');
    }
}
