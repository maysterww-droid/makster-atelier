import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import type { BuiltCommercialPackage, ClientQuoteTerms, CommercialPricingProfile } from '../../commercial-engine/src/types.js';
import type { BuiltProductionPack } from '../../production-pack/src/types.js';

export const CHANGE_INTELLIGENCE_VERSION = '1.7.0' as const;
export type ChangeKind = 'added'|'removed'|'changed';
export type ChangeCategory = 'dimensions'|'construction'|'modules'|'contents'|'fronts'|'materials'|'hardware'|'style'|'other';
export interface ProjectChangeImpact { path:string; category:ChangeCategory; kind:ChangeKind; label:string; before?:unknown; after?:unknown; beforeText?:string; afterText?:string; customerVisible:boolean; productionImpact:boolean; commercialImpact:boolean; }
export interface NumericDelta { before:number; after:number; delta:number; }
export interface EngineeringImpact { panelPartCount:NumericDelta; uniquePanelCount:NumericDelta; totalPanelAreaMm2:NumericDelta; hardwareRequirementCount:NumericDelta; machiningOperationCount:NumericDelta; warnings:NumericDelta; errors:NumericDelta; blocking:NumericDelta; readyForProduction:{before:boolean;after:boolean}; cncReady:{before:boolean;after:boolean}; addedPartIds:string[]; removedPartIds:string[]; changedPartIds:string[]; addedHardwareIds:string[]; removedHardwareIds:string[]; changedHardwareIds:string[]; }
export interface CommercialLineDelta { id:string; category:string; name:string; beforeAmountMinor:number; afterAmountMinor:number; deltaMinor:number; beforeQuantity:number; afterQuantity:number; }
export interface CommercialImpact { available:boolean; currency?:string; lineChanges?:CommercialLineDelta[]; costBasisMinor?:NumericDelta; netSalesMinor?:NumericDelta; customerTotalMinor?:NumericDelta; grossProfitMinor?:NumericDelta; grossMarginBps?:NumericDelta; priceChangePercentBps?:number; }
export interface ChangeImpactReport { changeVersion:typeof CHANGE_INTELLIGENCE_VERSION; reportId:string; projectId:string; fromRevision:number; toRevision:number; generatedAt:string; status:'no_change'|'changed'|'blocked'; projectChanges:ProjectChangeImpact[]; engineering:EngineeringImpact; commercial:CommercialImpact; summary:{projectChanges:number; productionChanges:number; customerVisibleChanges:number; commercialChanges:number;}; blockers:string[]; fingerprintSha256:string; }
export interface CompareRevisionsInput { beforeProject:ProjectModelV1; afterProject:ProjectModelV1; beforeEngineering:EngineeringCompileResult; afterEngineering:EngineeringCompileResult; beforeQuote?:BuiltCommercialPackage; afterQuote?:BuiltCommercialPackage; generatedAt?:string; reportId?:string; }
export interface RequoteInput { basePackage:BuiltCommercialPackage; afterProject:ProjectModelV1; afterEngineering:EngineeringCompileResult; pricing:CommercialPricingProfile; quoteTerms:ClientQuoteTerms; productionPack?:BuiltProductionPack; quoteId?:string; quoteVersion?:number; packageId?:string; generatedAt?:string; }
export interface RequoteResult { commercialPackage:BuiltCommercialPackage; supersedesQuoteId:string; fromRevision:number; toRevision:number; }
export interface CustomerChangeSummary { reportId:string; projectId:string; fromRevision:number; toRevision:number; currency:string; changes:Array<{label:string;beforeText?:string;afterText?:string}>; previousTotalMinor:number; newTotalMinor:number; deltaMinor:number; }
