import { createHash } from 'node:crypto';
import type { Mm10, MeasuredMm10, ProjectModelV1 } from '../../project-model/src/types.js';

export function requireMeasured(name: string, measured: MeasuredMm10): Mm10 {
  if (measured.value == null) throw new Error(`missing_dimension:${name}`);
  return measured.value;
}

export function stableChecksum(project: ProjectModelV1): string {
  return createHash('sha256').update(JSON.stringify(project)).digest('hex');
}

export function mm10AreaToMm2(length: Mm10, width: Mm10, quantity = 1): number {
  return (Number(length) / 10) * (Number(width) / 10) * quantity;
}

export function deterministicId(...parts: Array<string | number | undefined>): string {
  return parts.filter((x) => x !== undefined).join(':');
}
