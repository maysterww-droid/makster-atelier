import type { BrandId } from './creative-director';

export type CreativeBrief = { objective: string; audience: string; channel: string; locale: string; duration_seconds?: number; aspect_ratios?: string[]; constraints?: string[] };
export type Concept = { id: string; title: string; premise: string; hook: string; product_truth: string[]; references: string[] };
export type ScriptBeat = { id: string; start_s: number; end_s: number; visual: string; voiceover?: string; on_screen_text?: string };
export type StoryboardFrame = { id: string; beat_id: string; description: string; reference_ids: string[] };
export type Shot = { id: string; order: number; storyboard_frame_id: string; prompt: string; camera: Record<string, unknown>; lighting: Record<string, unknown>; reference_ids: string[]; takes: Take[]; selected_take_id: string | null };
export type Take = { id: string; asset_id: string; provider?: string; model?: string; qa_status: 'PENDING'|'PASS'|'FAIL'; cost?: number; currency?: string };

export type PipelineProject = { id: string; brand_id: BrandId; brief: CreativeBrief; concept?: Concept; script?: ScriptBeat[]; storyboard?: StoryboardFrame[]; shots: Shot[] };

export function validateBrief(brief: CreativeBrief): string[] {
  const errors: string[] = [];
  if (!brief.objective?.trim()) errors.push('BRIEF_OBJECTIVE_REQUIRED');
  if (!brief.audience?.trim()) errors.push('BRIEF_AUDIENCE_REQUIRED');
  if (!brief.channel?.trim()) errors.push('BRIEF_CHANNEL_REQUIRED');
  if (!brief.locale?.trim()) errors.push('BRIEF_LOCALE_REQUIRED');
  if (brief.duration_seconds !== undefined && brief.duration_seconds <= 0) errors.push('BRIEF_DURATION_INVALID');
  return errors;
}

export function selectTake(shot: Shot, takeId: string): Shot {
  const take = shot.takes.find(t => t.id === takeId);
  if (!take) throw new Error(`TAKE_NOT_FOUND: ${takeId}`);
  if (take.qa_status !== 'PASS') throw new Error(`TAKE_NOT_QA_APPROVED: ${takeId}`);
  return { ...shot, selected_take_id: takeId };
}
