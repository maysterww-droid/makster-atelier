import type { BrandId } from '../core/creative-director';
export type CampaignCreativeRequest={request_id:string;brand_id:BrandId;campaign_id:string;objective:string;audience:string;channels:string[];locale:string;deliverables:{aspect_ratio:'9:16'|'1:1'|'16:9';duration_seconds:number}[]};
export type ApprovedCreativeDelivery={request_id:string;brand_id:BrandId;campaign_id:string;project_id:string;approval_id:string;assets:{asset_id:string;aspect_ratio:string;duration_seconds:number}[];qa_passed:true};
export function assertApprovedDelivery(d:ApprovedCreativeDelivery){if(!d.qa_passed)throw new Error('DELIVERY_REQUIRES_QA_PASS');if(!d.approval_id)throw new Error('DELIVERY_REQUIRES_HUMAN_APPROVAL');if(!d.assets.length)throw new Error('DELIVERY_REQUIRES_ASSETS');}
