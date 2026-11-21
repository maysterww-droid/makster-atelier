import type { EngineeringCompileResult } from '../../engineering-engine/src/types.js';
import type { BuiltProductionPack } from '../../production-pack/src/types.js';
import type { ProjectModelV1 } from '../../project-model/src/types.js';

export const COMMERCIAL_ENGINE_VERSION = '1.6.0' as const;
export type CurrencyCode = string;
export type MinorMoney = number;
export type CostCategory = 'material'|'edge'|'hardware'|'external_service'|'labor'|'transport'|'installation'|'overhead'|'other';
export type CostSource = 'price_catalog'|'supplier_quote'|'manual'|'derived'|'engineering';
export type CommercialQuoteStatus = 'draft'|'approved'|'sent'|'accepted'|'rejected'|'expired'|'superseded';

export interface CommercialBlocker { code:string; message:string; targetId?:string; }
export interface CommercialWarning { code:string; message:string; targetId?:string; }

export interface MaterialPriceRule {
  materialSelectionId:string;
  label?:string;
  pricingMode:'per_m2'|'per_sheet';
  /** Optional exact board thickness in millimetres. Prefer this when one material family has multiple thickness prices. */
  thicknessMm?:number;
  unitCostMinor:MinorMoney;
  sheetLengthMm?:number;
  sheetWidthMm?:number;
  wasteBps?:number;
  source?:CostSource;
}
export interface EdgePriceRule {
  materialSelectionId?:string;
  unitCostPerMeterMinor:MinorMoney;
  source?:CostSource;
}
export interface HardwarePriceRule {
  hardwareSelectionId?:string;
  name?:string;
  role?:string;
  unitCostMinor:MinorMoney;
  source?:CostSource;
}
export interface LaborCostInput {
  id:string;
  label:string;
  minutes:number;
  hourlyCostMinor:MinorMoney;
  category?:'labor'|'installation';
  source?:CostSource;
}
export interface FixedCostInput {
  id:string;
  label:string;
  category:'external_service'|'transport'|'installation'|'other';
  costMinor:MinorMoney;
  source?:CostSource;
  sourceReference?:string;
}
export interface SupplierQuoteCostInput {
  quoteId:string;
  supplierId:string;
  supplierName:string;
  totalPriceMinor:MinorMoney;
  services:string[];
}

export interface CommercialPricingProfile {
  profileId:string;
  name:string;
  currency:CurrencyCode;
  materialPrices:MaterialPriceRule[];
  edgePrices:EdgePriceRule[];
  hardwarePrices:HardwarePriceRule[];
  labor:LaborCostInput[];
  fixedCosts:FixedCostInput[];
  supplierQuote?:SupplierQuoteCostInput;
  overheadBps:number;
  markupBps:number;
  discountBps:number;
  taxBps:number;
  commercialRoundingMinor?:number;
}

export interface CommercialCostLine {
  id:string;
  category:CostCategory;
  label:string;
  quantity:number;
  unit:string;
  unitCostMinor:MinorMoney;
  totalCostMinor:MinorMoney;
  source:CostSource;
  sourceReference?:string;
  targetId?:string;
  note?:string;
}

export interface CommercialEstimateTotals {
  directCostMinor:MinorMoney;
  overheadMinor:MinorMoney;
  totalCostMinor:MinorMoney;
  sellBeforeDiscountMinor:MinorMoney;
  discountMinor:MinorMoney;
  netSalesMinor:MinorMoney;
  taxMinor:MinorMoney;
  grossSalesMinor:MinorMoney;
  profitMinor:MinorMoney;
  marginBps:number;
  markupBps:number;
  discountBps:number;
  taxBps:number;
}

export interface CommercialEstimate {
  commercialVersion:typeof COMMERCIAL_ENGINE_VERSION;
  estimateId:string;
  estimateVersion:number;
  projectId:string;
  revision:number;
  projectTitle:string;
  currency:CurrencyCode;
  generatedAt:string;
  engineeringInputChecksum:string;
  productionPackId?:string;
  productionPackManifestSha256?:string;
  pricingProfileId:string;
  pricingProfileFingerprint:string;
  ready:boolean;
  blockers:CommercialBlocker[];
  warnings:CommercialWarning[];
  lines:CommercialCostLine[];
  totals:CommercialEstimateTotals;
  estimateFingerprint:string;
}

export interface ClientPaymentTerm { label:string; bps:number; }
export interface ClientQuoteTerms {
  clientName:string;
  clientCompany?:string;
  offerTitle?:string;
  validityDays?:number;
  leadTimeText?:string;
  paymentTerms?:ClientPaymentTerm[];
  inclusions?:string[];
  exclusions?:string[];
  notes?:string[];
  sellerName?:string;
  sellerEmail?:string;
  sellerPhone?:string;
}
export interface ClientQuotePaymentLine { label:string; bps:number; amountMinor:MinorMoney; }
export interface ClientCommercialQuote {
  commercialVersion:typeof COMMERCIAL_ENGINE_VERSION;
  quoteId:string;
  quoteVersion:number;
  estimateId:string;
  estimateFingerprint:string;
  projectId:string;
  revision:number;
  projectTitle:string;
  clientName:string;
  clientCompany?:string;
  currency:CurrencyCode;
  status:CommercialQuoteStatus;
  issuedAt:string;
  validUntil:string;
  leadTimeText?:string;
  netAmountMinor:MinorMoney;
  taxBps:number;
  taxAmountMinor:MinorMoney;
  totalAmountMinor:MinorMoney;
  paymentSchedule:ClientQuotePaymentLine[];
  inclusions:string[];
  exclusions:string[];
  notes:string[];
  seller:{name:string;email?:string;phone?:string};
  quoteFingerprint:string;
}

export interface CommercialPackageFileInfo { name:string; mediaType:string; purpose:string; sha256:string; byteLength:number; }
export interface CommercialPackageManifest {
  commercialVersion:typeof COMMERCIAL_ENGINE_VERSION;
  packageId:string;
  estimateId:string;
  estimateFingerprint:string;
  quoteId:string;
  quoteFingerprint:string;
  projectId:string;
  revision:number;
  generatedAt:string;
  files:CommercialPackageFileInfo[];
}
export interface BuiltCommercialPackage {
  estimate:CommercialEstimate;
  quote:ClientCommercialQuote;
  manifest:CommercialPackageManifest;
  files:Record<string,string>;
}

export interface BuildCommercialEstimateInput {
  project:ProjectModelV1;
  engineering:EngineeringCompileResult;
  pricing:CommercialPricingProfile;
  productionPack?:BuiltProductionPack;
  estimateId?:string;
  estimateVersion?:number;
  generatedAt?:string;
}
export interface BuildClientQuoteInput {
  estimate:CommercialEstimate;
  terms:ClientQuoteTerms;
  quoteId?:string;
  quoteVersion?:number;
  issuedAt?:string;
}
export interface BuildCommercialPackageInput extends BuildCommercialEstimateInput {
  quoteTerms:ClientQuoteTerms;
  quoteId?:string;
  quoteVersion?:number;
  packageId?:string;
}
