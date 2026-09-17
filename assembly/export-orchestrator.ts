import type {MasterAssembly} from './master-assembly';import type {ExportVariant} from '../core/export-variants';
export type RenderRequest={project_id:string;master:MasterAssembly;variant:ExportVariant};
export function prepareRender(master:MasterAssembly,variant:ExportVariant):RenderRequest{if(master.status!=='READY_TO_RENDER')throw new Error('MASTER_NOT_READY');return{project_id:master.project_id,master,variant};}
