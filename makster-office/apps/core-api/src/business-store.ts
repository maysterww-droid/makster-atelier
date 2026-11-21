import type { BuiltCommercialPackage, CommercialQuoteStatus, ClientQuoteTerms, CommercialPricingProfile } from '../../../packages/commercial-engine/src/index.js';
import type { ProductionRoute, OutsourcePreset } from '../../../packages/production-pack/src/index.js';
import type { ChangeImpactReport } from '../../../packages/change-intelligence/src/index.js';
import type { ClientChangeOrder, ClientRevisionAuthorization, ProjectCommercialContract } from '../../../packages/client-change-order/src/index.js';

export interface CommercialQuoteContextRecord {
  pricing: CommercialPricingProfile;
  quoteTerms: ClientQuoteTerms;
  productionRoute: ProductionRoute;
  outsourcePreset?: OutsourcePreset;
}

export interface CommercialQuoteLineageRecord {
  supersedesQuoteId: string;
  changeReportId: string;
  createdAt: string;
}

export interface UnifiedBusinessStore {
  mode: 'memory'|'supabase';
  countProjectQuotes(projectId:string):Promise<number>;
  saveCommercialPackage(input:{organizationId:string; built:BuiltCommercialPackage; status:CommercialQuoteStatus; context:CommercialQuoteContextRecord}):Promise<void>;
  getCommercialPackage(quoteId:string):Promise<BuiltCommercialPackage|undefined>;
  listProjectQuotes(projectId:string):Promise<Array<{built:BuiltCommercialPackage;status:CommercialQuoteStatus;lineage?:CommercialQuoteLineageRecord}>>;
  getQuoteStatus(quoteId:string):Promise<CommercialQuoteStatus|undefined>;
  setQuoteStatus(input:{organizationId:string;quoteId:string;status:CommercialQuoteStatus;createdAt?:string}):Promise<void>;
  getQuoteContext(quoteId:string):Promise<CommercialQuoteContextRecord|undefined>;
  saveQuoteLineage(input:{organizationId:string;projectId:string;quoteId:string;lineage:CommercialQuoteLineageRecord}):Promise<void>;
  getQuoteLineage(quoteId:string):Promise<CommercialQuoteLineageRecord|undefined>;
  saveChangeReport(input:{organizationId:string;report:ChangeImpactReport;baseQuoteId?:string;requoteId?:string}):Promise<void>;
  getChangeReport(reportId:string):Promise<ChangeImpactReport|undefined>;
  createContract(contract:ProjectCommercialContract):Promise<void>;
  updateContract(contract:ProjectCommercialContract):Promise<void>;
  getContractByProject(projectId:string):Promise<ProjectCommercialContract|undefined>;
  getContractById(contractId:string):Promise<ProjectCommercialContract|undefined>;
  createChangeOrder(input:{organizationId:string;order:ClientChangeOrder}):Promise<void>;
  updateChangeOrder(input:{organizationId:string;order:ClientChangeOrder}):Promise<void>;
  getChangeOrder(changeOrderId:string):Promise<ClientChangeOrder|undefined>;
  listProjectChangeOrders(projectId:string):Promise<ClientChangeOrder[]>;
  saveAuthorization(input:{organizationId:string;authorization:ClientRevisionAuthorization}):Promise<void>;
  getAuthorization(projectId:string,revision:number):Promise<ClientRevisionAuthorization|undefined>;
  applyAcceptedChangeOrderAtomic(input:{organizationId:string;order:ClientChangeOrder;contract:ProjectCommercialContract;authorization:ClientRevisionAuthorization;baseQuoteId:string;newQuoteId:string}):Promise<void>;
}

function authorizationKey(projectId:string,revision:number){return `${projectId}:${revision}`;}

export class MemoryUnifiedBusinessStore implements UnifiedBusinessStore {
  readonly mode='memory' as const;
  private readonly commercialPackages=new Map<string,BuiltCommercialPackage>();
  private readonly commercialQuotesByProject=new Map<string,string[]>();
  private readonly quoteStatuses=new Map<string,CommercialQuoteStatus>();
  private readonly quoteContexts=new Map<string,CommercialQuoteContextRecord>();
  private readonly quoteLineage=new Map<string,CommercialQuoteLineageRecord>();
  private readonly changeReports=new Map<string,ChangeImpactReport>();
  private readonly contracts=new Map<string,ProjectCommercialContract>();
  private readonly changeOrders=new Map<string,ClientChangeOrder>();
  private readonly authorizations=new Map<string,ClientRevisionAuthorization>();

  async countProjectQuotes(projectId:string){return (this.commercialQuotesByProject.get(projectId)??[]).length;}
  async saveCommercialPackage(input:{organizationId:string;built:BuiltCommercialPackage;status:CommercialQuoteStatus;context:CommercialQuoteContextRecord}){
    const id=input.built.quote.quoteId;
    if(!this.commercialPackages.has(id)){
      this.commercialPackages.set(id,structuredClone(input.built));
      const ids=this.commercialQuotesByProject.get(input.built.quote.projectId)??[];
      if(!ids.includes(id)) ids.push(id);
      this.commercialQuotesByProject.set(input.built.quote.projectId,ids);
      this.quoteContexts.set(id,structuredClone(input.context));
    }
    this.quoteStatuses.set(id,input.status);
  }
  async getCommercialPackage(quoteId:string){const v=this.commercialPackages.get(quoteId);return v?structuredClone(v):undefined;}
  async listProjectQuotes(projectId:string){
    const ids=this.commercialQuotesByProject.get(projectId)??[];
    return ids.map(id=>({built:structuredClone(this.commercialPackages.get(id)!),status:this.quoteStatuses.get(id)??'draft',...(this.quoteLineage.get(id)?{lineage:structuredClone(this.quoteLineage.get(id)!)}:{})}));
  }
  async getQuoteStatus(quoteId:string){return this.quoteStatuses.get(quoteId);}
  async setQuoteStatus(input:{organizationId:string;quoteId:string;status:CommercialQuoteStatus}){this.quoteStatuses.set(input.quoteId,input.status);}
  async getQuoteContext(quoteId:string){const v=this.quoteContexts.get(quoteId);return v?structuredClone(v):undefined;}
  async saveQuoteLineage(input:{organizationId:string;projectId:string;quoteId:string;lineage:CommercialQuoteLineageRecord}){this.quoteLineage.set(input.quoteId,structuredClone(input.lineage));}
  async getQuoteLineage(quoteId:string){const v=this.quoteLineage.get(quoteId);return v?structuredClone(v):undefined;}
  async saveChangeReport(input:{organizationId:string;report:ChangeImpactReport}){this.changeReports.set(input.report.reportId,structuredClone(input.report));}
  async getChangeReport(reportId:string){const v=this.changeReports.get(reportId);return v?structuredClone(v):undefined;}
  async createContract(contract:ProjectCommercialContract){if(this.contracts.has(contract.projectId))throw new Error('commercial_contract_already_exists');this.contracts.set(contract.projectId,structuredClone(contract));}
  async updateContract(contract:ProjectCommercialContract){this.contracts.set(contract.projectId,structuredClone(contract));}
  async getContractByProject(projectId:string){const v=this.contracts.get(projectId);return v?structuredClone(v):undefined;}
  async getContractById(contractId:string){const v=[...this.contracts.values()].find(x=>x.contractId===contractId);return v?structuredClone(v):undefined;}
  async createChangeOrder(input:{organizationId:string;order:ClientChangeOrder}){if(this.changeOrders.has(input.order.changeOrderId))return;this.changeOrders.set(input.order.changeOrderId,structuredClone(input.order));}
  async updateChangeOrder(input:{organizationId:string;order:ClientChangeOrder}){this.changeOrders.set(input.order.changeOrderId,structuredClone(input.order));}
  async getChangeOrder(changeOrderId:string){const v=this.changeOrders.get(changeOrderId);return v?structuredClone(v):undefined;}
  async listProjectChangeOrders(projectId:string){return [...this.changeOrders.values()].filter(x=>x.binding.projectId===projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(x=>structuredClone(x));}
  async saveAuthorization(input:{organizationId:string;authorization:ClientRevisionAuthorization}){this.authorizations.set(authorizationKey(input.authorization.projectId,input.authorization.revision),structuredClone(input.authorization));}
  async getAuthorization(projectId:string,revision:number){const v=this.authorizations.get(authorizationKey(projectId,revision));return v?structuredClone(v):undefined;}
  async applyAcceptedChangeOrderAtomic(input:{organizationId:string;order:ClientChangeOrder;contract:ProjectCommercialContract;authorization:ClientRevisionAuthorization;baseQuoteId:string;newQuoteId:string}){
    // Memory fallback cannot provide DB transactions, but applies the exact same state changes synchronously in one turn.
    this.changeOrders.set(input.order.changeOrderId,structuredClone(input.order));
    this.contracts.set(input.contract.projectId,structuredClone(input.contract));
    this.authorizations.set(authorizationKey(input.authorization.projectId,input.authorization.revision),structuredClone(input.authorization));
    this.quoteStatuses.set(input.baseQuoteId,'superseded');
    this.quoteStatuses.set(input.newQuoteId,'accepted');
  }
}
