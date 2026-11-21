export const BXF_INTELLIGENCE_VERSION = '0.7.0' as const;

export type BxfImportStatus = 'recognized' | 'inspection_only' | 'rejected';
export type BxfTrustSource = 'manufacturer_bxf' | 'fixture_only';

export interface XmlAttributeMap { [name: string]: string }

export interface XmlNode {
  name: string;
  localName: string;
  attributes: XmlAttributeMap;
  text: string;
  children: XmlNode[];
}

export interface BxfCandidateSku {
  value: string;
  path: string;
  confidence: number;
}

export interface BxfCandidateDrilling {
  path: string;
  tag: string;
  attributes: XmlAttributeMap;
  numericValues: Record<string, number>;
  confidence: number;
}

export interface NormalizedRunnerDrillingHole {
  fromFrontMm: number;
  diameterMm: number;
  depthMm: number;
  fastener: 'chipboard_screw' | 'system_screw' | 'other';
  optional?: boolean;
}

export interface NormalizedHardwareManufacturingProfile {
  manufacturer: 'Blum';
  hardwareCode: string;
  profileKind: 'runner_cabinet_drilling';
  catalogVersion: string;
  sourceKind: BxfTrustSource;
  sourceChecksumSha256: string;
  sourceSchemaFingerprint: string;
  adapterId: string;
  verified: boolean;
  holes: NormalizedRunnerDrillingHole[];
}

export interface BxfAdapterResult {
  adapterId: string;
  recognized: boolean;
  manufacturer?: 'Blum';
  schemaVersion?: string;
  projectReference?: string;
  hardwareCodes: string[];
  manufacturingProfiles: NormalizedHardwareManufacturingProfile[];
  warnings: string[];
}

export interface BxfInspectionReport {
  parserVersion: typeof BXF_INTELLIGENCE_VERSION;
  fileName: string;
  byteLength: number;
  sha256: string;
  rootElement?: string;
  namespaceUris: string[];
  schemaFingerprint?: string;
  status: BxfImportStatus;
  adapter?: BxfAdapterResult;
  candidateSkus: BxfCandidateSku[];
  candidateDrillings: BxfCandidateDrilling[];
  warnings: string[];
}

export interface BxfAdapter {
  id: string;
  /** Adapter must only return recognized=true if the structure is explicitly known. */
  extract(root: XmlNode, source: { sha256: string; schemaFingerprint: string }): BxfAdapterResult;
}
