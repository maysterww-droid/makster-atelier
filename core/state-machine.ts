export type CreativeStatus =
  | 'DRAFT' | 'BRIEF_READY' | 'CONCEPT_READY' | 'STORYBOARD_READY'
  | 'PRODUCING' | 'QA' | 'READY_FOR_APPROVAL' | 'APPROVED'
  | 'REJECTED' | 'DELIVERED';

const transitions: Record<CreativeStatus, readonly CreativeStatus[]> = {
  DRAFT: ['BRIEF_READY'],
  BRIEF_READY: ['CONCEPT_READY'],
  CONCEPT_READY: ['STORYBOARD_READY'],
  STORYBOARD_READY: ['PRODUCING'],
  PRODUCING: ['QA'],
  QA: ['PRODUCING', 'READY_FOR_APPROVAL'],
  READY_FOR_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['DELIVERED'],
  REJECTED: ['PRODUCING'],
  DELIVERED: []
};

export function canTransition(from: CreativeStatus, to: CreativeStatus): boolean {
  return transitions[from].includes(to);
}

export function transition(from: CreativeStatus, to: CreativeStatus): CreativeStatus {
  if (!canTransition(from, to)) throw new Error(`Invalid Creative Studio transition: ${from} -> ${to}`);
  return to;
}
