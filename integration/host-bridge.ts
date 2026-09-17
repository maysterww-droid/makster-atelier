import type { CreativeHostContext } from './host-contract';import {assertHostBrand} from './host-contract';
export type StudioLaunch={route:string;query:Record<string,string>;context:CreativeHostContext};
export function launchCreativeStudio(context:CreativeHostContext):StudioLaunch{assertHostBrand(context);return{route:'/creative',query:{brand:context.brand_id,...(context.campaign_id?{campaign:context.campaign_id}:{}),...(context.project_id?{project:context.project_id}:{})},context};}
export function returnToHost(context:CreativeHostContext){return context.return_path;}
