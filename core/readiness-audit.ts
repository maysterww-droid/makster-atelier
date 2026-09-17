export type ReadinessItem={id:string;status:'READY'|'PENDING_EXTERNAL'|'BLOCKED';note:string};
export function studioReadinessAudit():ReadinessItem[]{return[
{id:'architecture',status:'READY',note:'Shared studio core and brand isolation implemented'},
{id:'workflow',status:'READY',note:'Brief through approval/export contracts implemented'},
{id:'qa',status:'READY',note:'Blocking QA and human approval gates implemented'},
{id:'cost-budget-provenance',status:'READY',note:'Cost ledger, budget guard and provenance implemented'},
{id:'workspace-contract',status:'READY',note:'Workspace UI/view/action contracts implemented'},
{id:'host-contract',status:'READY',note:'Makster/VYTA host bridge contract implemented'},
{id:'makster-asset-bridge',status:'READY',note:'READY-only module package and Product Truth lock implemented'},
{id:'live-module-library',status:'PENDING_EXTERNAL',note:'Needs concrete Supabase project/storage wiring'},
{id:'live-host-ui',status:'PENDING_EXTERNAL',note:'Needs actual Makster Office and VYTA Office frontend repositories'},
{id:'runway-adapter',status:'PENDING_EXTERNAL',note:'Connect after studio gate'},
{id:'heygen-adapter',status:'PENDING_EXTERNAL',note:'Connect when presenter/localization use case is enabled'},
{id:'voice-adapter',status:'PENDING_EXTERNAL',note:'Connect branded voice provider'},
{id:'live-render-assembly',status:'PENDING_EXTERNAL',note:'Requires real generated media/provider outputs'}];}
