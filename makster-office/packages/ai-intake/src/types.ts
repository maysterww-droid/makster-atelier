import type { ProjectChangeSet, ProjectModelV1, ProjectType } from '../../project-model/src/index.js';

export interface AiIntakeRequest {
  text: string;
  project: ProjectModelV1;
  imageUrls?: string[];
  locale?: string;
}

export type IntakeInteriorKind = 'shelves' | 'drawers' | 'short_clothes' | 'long_clothes' | 'open';

export interface AiMaterialRequest {
  role: 'carcass' | 'front' | 'edge' | 'back' | 'glass' | 'profile' | 'other';
  manufacturer: string | null;
  code: string | null;
  name: string | null;
}

export interface AiModuleIntent {
  moduleIndex: number;
  kind: IntakeInteriorKind;
  shelfCount: number | null;
  drawerCount: number | null;
  railCount: number | null;
}

export interface AiProjectIntentV1 {
  intentVersion: '1.0.0';
  summary: string;
  projectType: ProjectType | null;
  titleSuggestion: string | null;
  dimensionsMm: {
    width: number | null;
    height: number | null;
    depth: number | null;
  };
  moduleCount: number | null;
  modules: AiModuleIntent[];
  frontCount: number | null;
  mirroredFrontIndexes: number[];
  materials: AiMaterialRequest[];
  notes: string[];
  missingInformation: string[];
  confidence: number;
}

export interface AiIntakeResult {
  intent: AiProjectIntentV1;
  changeSet: ProjectChangeSet;
}

export interface AiIntakeProvider {
  extract(request: AiIntakeRequest): Promise<AiProjectIntentV1>;
}
