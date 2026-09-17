export type AspectRatio='9:16'|'1:1'|'16:9';
export type ExportVariant={id:string;aspect_ratio:AspectRatio;duration_seconds:number;status:'PLANNED'|'RENDERED'|'QA_PASS'|'QA_FAIL';asset_id?:string};
export function standardVariants(duration=15):ExportVariant[]{return(['9:16','1:1','16:9'] as AspectRatio[]).map((r,i)=>({id:`VAR-${i+1}`,aspect_ratio:r,duration_seconds:duration,status:'PLANNED'}));}
export function deliverable(v:ExportVariant){return v.status==='QA_PASS'&&Boolean(v.asset_id);}
