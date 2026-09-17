import type { CreativeStatus } from './state-machine';

export type BrandId = 'MAKSTER_ATELIER' | 'VYTA';
export type CreativeRequest = { brand_id: BrandId; objective: string; audience?: string; channel?: string; locale?: string };
export type CreativeProjectSeed = { id: string; brand_id: BrandId; status: CreativeStatus; brief: CreativeRequest; approval: { required: true; status: 'PENDING' }; shots: unknown[]; provenance: unknown[] };

export function createCreativeProject(id: string, request: CreativeRequest): CreativeProjectSeed {
  if (!request.brand_id) throw new Error('brand_id is mandatory');
  if (!request.objective?.trim()) throw new Error('objective is mandatory');
  return {
    id,
    brand_id: request.brand_id,
    status: 'DRAFT',
    brief: Object.freeze({ ...request }),
    approval: { required: true, status: 'PENDING' },
    shots: [],
    provenance: []
  };
}

export function assertBrandIsolation(projectBrand: BrandId, assetBrand: BrandId): void {
  if (projectBrand !== assetBrand) throw new Error(`BRAND_ISOLATION_VIOLATION: ${assetBrand} cannot enter ${projectBrand} project`);
}
