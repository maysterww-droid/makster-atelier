import type { BrandId } from '../core/creative-director';
export type HostId='MAKSTER_OFFICE'|'VYTA_OFFICE';
export type CreativeHostContext={host_id:HostId;brand_id:BrandId;user_id:string;campaign_id?:string;project_id?:string;locale:string;return_path:string};
export type CreativeEntry={id:'CREATIVE';label:string;route:string;brand_id:BrandId};
export function creativeEntry(host:HostId):CreativeEntry{return host==='MAKSTER_OFFICE'?{id:'CREATIVE',label:'Creative',route:'/creative',brand_id:'MAKSTER_ATELIER'}:{id:'CREATIVE',label:'Creative',route:'/creative',brand_id:'VYTA'};}
export function assertHostBrand(c:CreativeHostContext){const expected=creativeEntry(c.host_id).brand_id;if(c.brand_id!==expected)throw new Error(`HOST_BRAND_MISMATCH: ${c.host_id} requires ${expected}`);}
