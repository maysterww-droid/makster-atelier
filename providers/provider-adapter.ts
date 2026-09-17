import type { BrandId } from '../core/creative-director';

export type ProviderKind = 'IMAGE' | 'VIDEO' | 'VOICE' | 'MUSIC' | 'SFX';
export type GenerationRequest = { project_id: string; brand_id: BrandId; prompt: string; reference_ids: string[]; aspect_ratio?: string; duration_seconds?: number };
export type GenerationResult = { provider: string; model: string; asset_id: string; cost: number | null; currency: string | null; metadata: Record<string, unknown> };

export interface CreativeProviderAdapter {
  readonly name: string;
  readonly kinds: readonly ProviderKind[];
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

// Provider implementations (Runway, HeyGen, voice, future Veo, etc.) plug in here.
// Core orchestration must never depend on provider-specific request/response formats.
