
export type CatalogTrust =
  | 'manufacturer_verified'
  | 'project_verified'
  | 'imported_unverified'
  | 'planning_only';

export interface MasterCatalogSource {
  trust: CatalogTrust;
  source: string;
}

export interface HardwareCatalogRecord extends MasterCatalogSource {
  id: string;
  manufacturer: string;
  family: string;
  role: 'hinge' | 'runner' | 'lift' | 'connector' | 'other';
  code?: string;
  planning?: Record<string, unknown>;
  compatibility?: {
    maxFrontThicknessMm?: number;
    nominalLengthMm?: number;
    maxDynamicLoadKg?: number;
  };
  drillingProfile?: {
    status: 'verified_profile_reference' | 'existing_project_profile' | 'not_imported';
    profileId?: string;
  };
  notes?: string;
}

export interface ApplianceCatalogRecord extends MasterCatalogSource {
  id: string;
  manufacturer: string;
  model: string;
  kind: 'dishwasher' | 'fridge' | 'oven' | 'hob' | 'hood' | 'microwave' | 'sink' | 'other';
  installation: 'cabinet' | 'worktop' | 'wall' | 'sink_cutout';
  /** Commercial positioning is optional and never required for engineering fit. */
  priceTier?: 'budget' | 'mid' | 'premium' | 'unknown';
  priceGuidance?: {
    currency: string;
    purchaseMin?: number;
    purchaseMax?: number;
    clientMin?: number;
    clientMax?: number;
    source?: string;
    asOf?: string;
    verified: boolean;
  };
  /** Production policy for cutout/fit. */
  productionPolicy?: {
    fitModeDefault?: 'preverified' | 'site_fit';
    cutoutExecutionDefault?: 'workshop_cnc' | 'on_site';
    drawingRequired?: boolean;
  };
  applianceDimensionsMm?: Record<string, unknown>;
  niche?: Record<string, unknown>;
  compatibility?: {
    nicheWidthMm?: number;
    nicheWidthRangeMm?: [number, number];
    nicheHeightMm?: number;
    nicheHeightRangeMm?: [number, number];
    minNicheDepthMm?: number;
    minVentilationAreaCm2?: number;
  };
  notes?: string;
}

export interface CatalogSearchInput {
  manufacturer?: string;
  q?: string;
  role?: HardwareCatalogRecord['role'];
  kind?: ApplianceCatalogRecord['kind'];
  productionReadyOnly?: boolean;
}

export const HARDWARE_MANUFACTURERS = [
  { id: 'blum', name: 'Blum', coverage: 'selected_verified_profiles' },
  { id: 'hettich', name: 'Hettich', coverage: 'planning_only' },
  { id: 'hafele', name: 'Häfele', coverage: 'planning_only' },
  { id: 'gtv', name: 'GTV', coverage: 'existing_project_profiles' },
  { id: 'grass', name: 'GRASS', coverage: 'planning_only' },
  { id: 'salice', name: 'Salice', coverage: 'planning_only' },
] as const;

export const APPLIANCE_MANUFACTURERS = [
  'Bosch', 'Siemens', 'Miele', 'Liebherr', 'NEFF', 'AEG', 'Electrolux',
  'Whirlpool', 'Samsung', 'LG', 'Beko',
] as const;

export const HARDWARE_MASTER_CATALOG: HardwareCatalogRecord[] = [
  {
    id: 'blum-clip-top-blumotion-110-overlay',
    manufacturer: 'Blum',
    family: 'CLIP top BLUMOTION',
    role: 'hinge',
    trust: 'manufacturer_verified',
    source: 'https://www.blum.com/eu/en/products/hingesystems/clip-top-blumotion/',
    planning: { openingAngleDeg: 110, cupDiameterMm: 35 },
    compatibility: { maxFrontThicknessMm: 24 },
    drillingProfile: { status: 'verified_profile_reference', profileId: 'blum-clip-top-blumotion-110-overlay' },
    notes: 'Exact SKU must still be resolved before procurement.',
  },
  {
    id: 'blum-movento-760h-550',
    manufacturer: 'Blum',
    family: 'MOVENTO 760H',
    role: 'runner',
    code: '760H5500S',
    trust: 'manufacturer_verified',
    source: 'https://publications.blum.com/2026/catalogue/en/420/',
    planning: { nominalLengthMm: 550, dynamicCapacityKg: 40 },
    compatibility: { nominalLengthMm: 550, maxDynamicLoadKg: 40 },
    drillingProfile: { status: 'not_imported' },
    notes: 'Planning/SKU identity is verified; CNC drilling remains blocked until exact manufacturer drilling data is imported.',
  },
  {
    id: 'blum-legrabox-750-550',
    manufacturer: 'Blum',
    family: 'LEGRABOX cabinet profile 750',
    role: 'runner',
    code: '750.5501S',
    trust: 'manufacturer_verified',
    source: 'https://publications.blum.com/2026/catalogue/en/212/',
    planning: { nominalLengthMm: 550, dynamicCapacityKg: 40 },
    compatibility: { nominalLengthMm: 550, maxDynamicLoadKg: 40 },
    drillingProfile: { status: 'not_imported' },
    notes: 'Planning/SKU identity is verified; exact drilling remains gated.',
  },
  {
    id: 'gtv-modern-slide-existing',
    manufacturer: 'GTV',
    family: 'Modern Slide',
    role: 'runner',
    trust: 'project_verified',
    source: 'internal:R13_GTV_MODERN_SLIDE',
    planning: { usesExistingMaksterProfile: true },
    drillingProfile: { status: 'existing_project_profile', profileId: 'gtv-modern-slide' },
    notes: 'Uses the existing Makster GTV-specific profile; never substituted with Blum geometry.',
  },
];

export const APPLIANCE_MASTER_CATALOG: ApplianceCatalogRecord[] = [
  {
    id: 'bosch-smv6zcx10e',
    manufacturer: 'Bosch',
    model: 'SMV6ZCX10E',
    kind: 'dishwasher',
    installation: 'cabinet',
    priceTier: 'unknown',
    productionPolicy: { fitModeDefault: 'preverified', drawingRequired: true },
    trust: 'manufacturer_verified',
    source: 'https://media3.bosch-home.com/Documents/specsheet/sl-SI/SMV6ZCX10E.pdf',
    applianceDimensionsMm: { width: 598, heightRange: [815, 875], depth: 550 },
    niche: { widthMm: 600, minDepthMm: 550, heightRangeMm: [815, 875] },
    compatibility: { nicheWidthMm: 600, nicheHeightRangeMm: [815, 875], minNicheDepthMm: 550 },
  },
  {
    id: 'siemens-sn65zx07ce',
    manufacturer: 'Siemens',
    model: 'SN65ZX07CE',
    kind: 'dishwasher',
    installation: 'cabinet',
    priceTier: 'unknown',
    productionPolicy: { fitModeDefault: 'preverified', drawingRequired: true },
    trust: 'manufacturer_verified',
    source: 'https://www.siemens-home.bsh-group.com/es/es/product/SN65ZX07CE',
    applianceDimensionsMm: { width: 598, height: 815, depth: 550 },
    niche: { referenceInstallationDimensionsMm: { height: 815, width: 598, depth: 550 } },
    notes: 'Exact appliance dimensions are verified; niche compatibility remains UNKNOWN until its installation drawing is normalized.',
  },
  {
    id: 'liebherr-irbd-5120',
    manufacturer: 'Liebherr',
    model: 'IRBd 5120',
    kind: 'fridge',
    installation: 'cabinet',
    priceTier: 'unknown',
    productionPolicy: { fitModeDefault: 'preverified', drawingRequired: true },
    trust: 'manufacturer_verified',
    source: 'https://www.liebherr.com/en-gb/p/irbd-5120-3011695',
    applianceDimensionsMm: { width: 559, height: 1770, depth: 546 },
    niche: { heightRangeMm: [1772, 1788], widthRangeMm: [560, 570], minDepthMm: 550, ventilationAreaMinCm2: 200 },
    compatibility: { nicheWidthRangeMm: [560, 570], nicheHeightRangeMm: [1772, 1788], minNicheDepthMm: 550, minVentilationAreaCm2: 200 },
  },
  {
    id: 'miele-g7191-scvi-ad-125',
    manufacturer: 'Miele',
    model: 'G 7191 SCVi AD 125 Edition',
    kind: 'dishwasher',
    installation: 'cabinet',
    priceTier: 'unknown',
    productionPolicy: { fitModeDefault: 'preverified', drawingRequired: true },
    trust: 'manufacturer_verified',
    source: 'https://media.miele.com/downloads/n-/ie/FS_12469660_IEE_IE-en-IE.pdf',
    applianceDimensionsMm: { width: 598, heightRange: [805, 870], depth: 550 },
    niche: { widthMm: 600, minDepthMm: 560, heightRangeMm: [805, 870] },
    compatibility: { nicheWidthMm: 600, nicheHeightRangeMm: [805, 870], minNicheDepthMm: 560 },
  },
];


const IMPORTED_HARDWARE_CATALOG: HardwareCatalogRecord[] = [];
const IMPORTED_APPLIANCE_CATALOG: ApplianceCatalogRecord[] = [];

export function allHardwareCatalogRecords(): HardwareCatalogRecord[] {
  return [...HARDWARE_MASTER_CATALOG, ...IMPORTED_HARDWARE_CATALOG];
}
export function allApplianceCatalogRecords(): ApplianceCatalogRecord[] {
  return [...APPLIANCE_MASTER_CATALOG, ...IMPORTED_APPLIANCE_CATALOG];
}
export function registerHardwareCatalogRecord(record: HardwareCatalogRecord): HardwareCatalogRecord {
  const existing=IMPORTED_HARDWARE_CATALOG.findIndex(x=>x.id===record.id);
  if(existing>=0)IMPORTED_HARDWARE_CATALOG[existing]=structuredClone(record);
  else IMPORTED_HARDWARE_CATALOG.push(structuredClone(record));
  return record;
}
export function registerApplianceCatalogRecord(record: ApplianceCatalogRecord): ApplianceCatalogRecord {
  const existing=IMPORTED_APPLIANCE_CATALOG.findIndex(x=>x.id===record.id);
  if(existing>=0)IMPORTED_APPLIANCE_CATALOG[existing]=structuredClone(record);
  else IMPORTED_APPLIANCE_CATALOG.push(structuredClone(record));
  return record;
}

function matchText(values: Array<string | undefined>, q?: string): boolean {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  return values.some(v => v?.toLowerCase().includes(needle));
}

export function hardwareMayAuthorizeDrilling(record: HardwareCatalogRecord): boolean {
  return (record.trust === 'manufacturer_verified' || record.trust === 'project_verified')
    && (record.drillingProfile?.status === 'verified_profile_reference'
      || record.drillingProfile?.status === 'existing_project_profile')
    && Boolean(record.drillingProfile.profileId);
}

export function searchHardwareCatalog(input: CatalogSearchInput = {}): HardwareCatalogRecord[] {
  return allHardwareCatalogRecords().filter(r =>
    (!input.manufacturer || r.manufacturer.toLowerCase() === input.manufacturer.toLowerCase())
    && (!input.role || r.role === input.role)
    && (!input.productionReadyOnly || hardwareMayAuthorizeDrilling(r))
    && matchText([r.id, r.manufacturer, r.family, r.code], input.q)
  );
}

export function searchApplianceCatalog(input: CatalogSearchInput = {}): ApplianceCatalogRecord[] {
  return allApplianceCatalogRecords().filter(r =>
    (!input.manufacturer || r.manufacturer.toLowerCase() === input.manufacturer.toLowerCase())
    && (!input.kind || r.kind === input.kind)
    && matchText([r.id, r.manufacturer, r.model, r.kind], input.q)
  );
}

export function getHardwareCatalogRecord(id: string): HardwareCatalogRecord | undefined {
  return allHardwareCatalogRecords().find(r => r.id === id);
}
export function getApplianceCatalogRecord(id: string): ApplianceCatalogRecord | undefined {
  return allApplianceCatalogRecords().find(r => r.id === id);
}
