import type { QaFinding } from './premium-qa';
export type AutoQaInput={brand_id:'MAKSTER_ATELIER'|'VYTA';has_unapproved_asset:boolean;cross_brand_asset:boolean;selected_take_missing:boolean;product_drift:boolean;continuity_error:boolean;bad_typography:boolean;obvious_ai_artifact:boolean;unsupported_claim:boolean;invented_ui:boolean};
export function automaticChecks(i:AutoQaInput):{name:string;passed:boolean;findings:QaFinding[]}[]{const f=(code:QaFinding['code'],hit:boolean):QaFinding[]=>hit?[{code,severity:'BLOCK'}]:[];return[
{name:'brand-isolation',passed:!i.cross_brand_asset,findings:f('BRAND_VIOLATION',i.cross_brand_asset)},
{name:'asset-approval',passed:!i.has_unapproved_asset,findings:f('BRAND_VIOLATION',i.has_unapproved_asset)},
{name:'take-selection',passed:!i.selected_take_missing,findings:f('LOW_PREMIUM_SCORE',i.selected_take_missing)},
{name:'product-truth',passed:!i.product_drift,findings:f('PRODUCT_DRIFT',i.product_drift)},
{name:'continuity',passed:!i.continuity_error,findings:f('CONTINUITY_ERROR',i.continuity_error)},
{name:'typography',passed:!i.bad_typography,findings:f('BAD_TYPOGRAPHY',i.bad_typography)},
{name:'ai-artifacts',passed:!i.obvious_ai_artifact,findings:f('OBVIOUS_AI_ARTIFACT',i.obvious_ai_artifact)},
{name:'claims',passed:!i.unsupported_claim,findings:f('UNSUPPORTED_CLAIM',i.unsupported_claim)},
{name:'ui-truth',passed:!i.invented_ui,findings:f('INVENTED_UI',i.invented_ui)}];}
