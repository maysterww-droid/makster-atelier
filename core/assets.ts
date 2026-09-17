import type { BrandId } from './creative-director';

export type AssetKind = 'LOGO'|'PHOTO'|'RENDER'|'GLB'|'UI'|'VIDEO'|'AUDIO'|'MUSIC'|'SFX'|'FONT'|'DOCUMENT';
export type CreativeAsset = { id: string; brand_id: BrandId; kind: AssetKind; uri: string; source: string; approved: boolean; checksum?: string; metadata?: Record<string, unknown> };

export class AssetRegistry {
  private assets = new Map<string, CreativeAsset>();
  register(asset: CreativeAsset): void { this.assets.set(asset.id, Object.freeze({ ...asset })); }
  get(id: string, brandId: BrandId): CreativeAsset {
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`ASSET_NOT_FOUND: ${id}`);
    if (asset.brand_id !== brandId) throw new Error(`BRAND_ISOLATION_VIOLATION: ${id}`);
    return asset;
  }
  approved(id: string, brandId: BrandId): CreativeAsset {
    const asset = this.get(id, brandId);
    if (!asset.approved) throw new Error(`ASSET_NOT_APPROVED: ${id}`);
    return asset;
  }
}
