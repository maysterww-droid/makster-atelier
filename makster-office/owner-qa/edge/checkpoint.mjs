// A private, atomic QA checkpoint in an EXISTING staging table. No image binaries.
export const ORG='3ac6478a-a986-451f-9425-ba383aaa4ceb';
export const CHECKPOINT='60100000-0000-4000-a000-000000000001';
export const SCOPE='MAKSTER_OFFICE_QA_601';
const allowed=new Set(['creativeAssets','contentDraftSets','officeContent','publishJobs','contentPerformance','growthSyncSnapshots','growthAuditLog']);
const owned=x=>x?.smm?.scope==='MAKSTER_SMM_6'&&x.smm.brandId==='makster-atelier';
export class CheckpointStore {
 constructor({url,key,fetchImpl=fetch}){if(url!=='https://gkqntgfrbngspvrsqvmx.supabase.co'||!key)throw Error('QA_STAGING_CONFIGURATION_REQUIRED');this.url=url;this.key=key;this.fetch=fetchImpl;this.dirty=false;}
 async request(query,init={}){const r=await this.fetch(`${this.url}/rest/v1/makster_growth_sync_snapshots?${query}`,{...init,headers:{apikey:this.key,Authorization:`Bearer ${this.key}`,'content-type':'application/json',Prefer:'return=representation'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Object.assign(Error('QA_PERSISTENCE_UNAVAILABLE'),{status:503});return r.json();}
 async get(){if(!this.state){const rows=await this.request(`id=eq.${CHECKPOINT}&organization_id=eq.${ORG}&select=data_json`);const d=rows[0]?.data_json;if(d?.scope!==SCOPE||d.brandId!=='makster-atelier'||!Number.isSafeInteger(d.revision))throw Object.assign(Error('QA_CHECKPOINT_NOT_INITIALIZED'),{status:503});this.revision=d.revision;this.state=structuredClone(d.state);}return this.state;}
 async applySmmRecords(records){await this.get();for(const {table,value}of records){if(!allowed.has(table)||!owned(value)||typeof value.id!=='string')throw Error('QA_RECORD_SCOPE_REQUIRED');const rows=this.state[table];const i=rows.findIndex(x=>x.id===value.id);if(i>=0&&!owned(rows[i]))throw Error('QA_CROSS_SCOPE_OVERWRITE_BLOCKED');if(i<0)rows.push(structuredClone(value));else rows[i]=structuredClone(value);}this.dirty=true;}
 async addGrowthAuditLog(value){await this.applySmmRecords([{table:'growthAuditLog',value}]);}
 async commit(){if(!this.dirty)return;const data={scope:SCOPE,brandId:'makster-atelier',revision:this.revision+1,state:this.state};const rows=await this.request(`id=eq.${CHECKPOINT}&organization_id=eq.${ORG}&data_json->>scope=eq.${SCOPE}&data_json->>revision=eq.${this.revision}`,{method:'PATCH',body:JSON.stringify({data_json:data,updated_at:new Date().toISOString()})});if(rows.length!==1)throw Object.assign(Error('QA_CONCURRENT_UPDATE_RETRY'),{status:409});this.revision++;this.dirty=false;}
}
