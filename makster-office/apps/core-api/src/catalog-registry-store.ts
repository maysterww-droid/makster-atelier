
import type { CatalogImportCandidate, CatalogImportResult } from '../../../packages/engineering-engine/src/catalog-import-pipeline.js';
import type { HardwareCatalogRecord, ApplianceCatalogRecord } from '../../../packages/engineering-engine/src/master-catalog.js';

export type StoredCandidate = CatalogImportCandidate<HardwareCatalogRecord|ApplianceCatalogRecord> & {
  target:'hardware'|'appliance';
  status:'pending_review'|'promoted'|'rejected';
  createdAt:string;
  reviewedAt?:string;
  reviewedBy?:string;
};

export interface CatalogRegistryStore {
  mode:'memory'|'supabase';
  saveImport(result:CatalogImportResult):Promise<void>;
  listReviewQueue():Promise<StoredCandidate[]>;
  getCandidate(candidateId:string):Promise<StoredCandidate|undefined>;
  promote(candidateId:string,record:HardwareCatalogRecord|ApplianceCatalogRecord,reviewedBy:string):Promise<void>;
  reject(candidateId:string,reviewedBy:string,reason?:string):Promise<void>;
  listPromoted():Promise<Array<HardwareCatalogRecord|ApplianceCatalogRecord>>;
}

export class MemoryCatalogRegistryStore implements CatalogRegistryStore {
  readonly mode='memory' as const;
  private candidates=new Map<string,StoredCandidate>();
  private promoted=new Map<string,HardwareCatalogRecord|ApplianceCatalogRecord>();
  async saveImport(result:CatalogImportResult){
    const now=new Date().toISOString();
    for(const c of result.candidates)this.candidates.set(c.candidateId,{...structuredClone(c),target:result.target,status:'pending_review',createdAt:now});
  }
  async listReviewQueue(){return [...this.candidates.values()].filter(x=>x.status==='pending_review').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
  async getCandidate(id:string){return this.candidates.get(id);}
  async promote(id:string,record:HardwareCatalogRecord|ApplianceCatalogRecord,reviewedBy:string){
    const c=this.candidates.get(id);if(!c)throw new Error('catalog_candidate_not_found');
    c.status='promoted';c.reviewedBy=reviewedBy;c.reviewedAt=new Date().toISOString();
    this.promoted.set(record.id,structuredClone(record));
  }
  async reject(id:string,reviewedBy:string,reason?:string){
    const c=this.candidates.get(id);if(!c)throw new Error('catalog_candidate_not_found');
    c.status='rejected';c.reviewedBy=reviewedBy;c.reviewedAt=new Date().toISOString();
    if(reason)c.warnings=[...c.warnings,`Rejected: ${reason}`];
  }
  async listPromoted(){return [...this.promoted.values()].map(x=>structuredClone(x));}
}

export class SupabaseCatalogRegistryStore implements CatalogRegistryStore {
  readonly mode='supabase' as const;
  constructor(private readonly options:{url:string;secretKey:string;fetchImpl?:typeof fetch}){}
  private headers(extra?:HeadersInit):HeadersInit{
    const h:any={apikey:this.options.secretKey,'content-type':'application/json',...(extra??{})};
    if(!this.options.secretKey.startsWith('sb_secret_'))h.authorization=`Bearer ${this.options.secretKey}`;
    return h;
  }
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const r=await (this.options.fetchImpl??fetch)(`${this.options.url}/rest/v1/${path}`,{...init,headers:this.headers(init.headers)});
    const text=await r.text();if(!r.ok)throw new Error(`supabase_catalog_${r.status}: ${text}`);
    return text?JSON.parse(text) as T:undefined as T;
  }
  async saveImport(result:CatalogImportResult){
    await this.request('catalog_import_jobs',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({
      id:result.importId,target:result.target,format:result.format,parsed_count:result.parsedCount,rejected_count:result.rejectedCount,issues_json:result.issues,status:'review'
    })});
    if(result.candidates.length)await this.request('catalog_import_candidates',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(result.candidates.map(c=>({
      id:c.candidateId,import_id:result.importId,target:result.target,status:'pending_review',candidate_json:c,confidence:c.confidence,production_eligible:false
    })))});
  }
  async listReviewQueue(){
    const rows=await this.request<any[]>('catalog_import_candidates?status=eq.pending_review&select=id,target,status,candidate_json,created_at,reviewed_at,reviewed_by&order=created_at.asc');
    return rows.map(r=>({...r.candidate_json,target:r.target,status:r.status,createdAt:r.created_at,...(r.reviewed_at?{reviewedAt:r.reviewed_at}:{}),...(r.reviewed_by?{reviewedBy:r.reviewed_by}:{})}));
  }
  async getCandidate(id:string){
    const rows=await this.request<any[]>(`catalog_import_candidates?id=eq.${encodeURIComponent(id)}&select=id,target,status,candidate_json,created_at,reviewed_at,reviewed_by`);
    const r=rows[0];return r?{...r.candidate_json,target:r.target,status:r.status,createdAt:r.created_at,...(r.reviewed_at?{reviewedAt:r.reviewed_at}:{}),...(r.reviewed_by?{reviewedBy:r.reviewed_by}:{})}:undefined;
  }
  async promote(id:string,record:HardwareCatalogRecord|ApplianceCatalogRecord,reviewedBy:string){
    await this.request(`catalog_import_candidates?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({status:'promoted',reviewed_by:reviewedBy,reviewed_at:new Date().toISOString()})});
    await this.request('catalog_master_records',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:record.id,target:'family' in record?'hardware':'appliance',manufacturer:record.manufacturer,trust:record.trust,source:record.source,record_json:record})});
  }
  async reject(id:string,reviewedBy:string,reason?:string){
    await this.request(`catalog_import_candidates?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({status:'rejected',reviewed_by:reviewedBy,reviewed_at:new Date().toISOString(),review_note:reason??null})});
  }
  async listPromoted(){
    const rows=await this.request<Array<{record_json:HardwareCatalogRecord|ApplianceCatalogRecord}>>('catalog_master_records?select=record_json&order=updated_at.asc');
    return rows.map(r=>r.record_json);
  }
}
