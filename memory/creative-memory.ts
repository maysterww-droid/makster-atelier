import type { BrandId } from '../core/creative-director';

export type MemoryKind = 'APPROVED'|'REJECTED'|'PREFERENCE'|'QA_FAILURE'|'PERFORMANCE'|'COST';
export type CreativeMemoryEvent = { id: string; brand_id: BrandId; project_id: string; shot_id?: string; take_id?: string; kind: MemoryKind; reason_codes: string[]; note?: string; metrics?: Record<string, number|string|boolean>; timestamp: string };

export class CreativeMemory {
  private events: CreativeMemoryEvent[] = [];
  append(event: CreativeMemoryEvent): void { this.events.push(Object.freeze({ ...event, reason_codes: [...event.reason_codes] })); }
  forBrand(brandId: BrandId): readonly CreativeMemoryEvent[] { return this.events.filter(e => e.brand_id === brandId); }
  forProject(projectId: string, brandId: BrandId): readonly CreativeMemoryEvent[] { return this.events.filter(e => e.project_id === projectId && e.brand_id === brandId); }
}
