import type { BrandId } from '../core/creative-director';
export type WorkspaceTab='PROJECTS'|'BRIEF'|'CONCEPT'|'SCRIPT'|'STORYBOARD'|'SHOTS'|'QA'|'APPROVAL'|'EXPORTS';
export type WorkspaceCard={id:string;title:string;subtitle?:string;status:string;thumbnail_asset_id?:string};
export type CreativeWorkspace={brand_id:BrandId;project_id:string;active_tab:WorkspaceTab;cards:WorkspaceCard[];qa_blockers:string[];approval_status:'PENDING'|'APPROVED'|'REJECTED';cost_summary:{currency:string;total:number;accepted:number};};
export const WORKSPACE_TABS:readonly WorkspaceTab[]=['PROJECTS','BRIEF','CONCEPT','SCRIPT','STORYBOARD','SHOTS','QA','APPROVAL','EXPORTS'];
