import type { QaResult } from './premium-qa';

export type Approval = { required: true; status: 'PENDING' | 'APPROVED' | 'REJECTED'; approved_by?: string; approved_at?: string; notes?: string };

export function requestApproval(qa: QaResult): Approval {
  if (!qa.passed) throw new Error('QUALITY_GATE_BLOCKED: project cannot reach human approval');
  return { required: true, status: 'PENDING' };
}

export function approve(current: Approval, humanId: string, now = new Date().toISOString()): Approval {
  if (!humanId.trim()) throw new Error('Human approver is required');
  return { ...current, status: 'APPROVED', approved_by: humanId, approved_at: now };
}

export function reject(current: Approval, humanId: string, notes: string): Approval {
  if (!humanId.trim()) throw new Error('Human reviewer is required');
  return { ...current, status: 'REJECTED', approved_by: humanId, notes };
}
