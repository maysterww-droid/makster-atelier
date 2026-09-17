import { automaticChecks } from '../qa/automatic-checks';import { buildQaReport } from '../qa/qa-report';import { standardVariants } from '../core/export-variants';
const clean={brand_id:'MAKSTER_ATELIER' as const,has_unapproved_asset:false,cross_brand_asset:false,selected_take_missing:false,product_drift:false,continuity_error:false,bad_typography:false,obvious_ai_artifact:false,unsupported_claim:false,invented_ui:false};
const pass=buildQaReport('MAK-CR-0001',automaticChecks(clean));if(!pass.result.passed)throw new Error('Expected clean fixture to pass');
const contaminated=buildQaReport('MAK-CR-0001',automaticChecks({...clean,cross_brand_asset:true}));if(contaminated.result.passed)throw new Error('Expected cross-brand contamination to block');
const drift=buildQaReport('MAK-CR-0001',automaticChecks({...clean,product_drift:true}));if(drift.result.passed)throw new Error('Expected product drift to block');
const variants=standardVariants(15);if(variants.length!==3||variants[0].aspect_ratio!=='9:16'||variants[2].aspect_ratio!=='16:9')throw new Error('Variant plan invalid');
