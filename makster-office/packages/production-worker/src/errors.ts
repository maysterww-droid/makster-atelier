import type { WorkerFailureCode } from './types.js';

export class ProductionWorkerError extends Error {
  constructor(
    public readonly code: WorkerFailureCode,
    message: string,
    public readonly retriable: boolean,
  ) {
    super(message);
    this.name = 'ProductionWorkerError';
  }
}

export function workerError(code: WorkerFailureCode, message: string, retriable = false): never {
  throw new ProductionWorkerError(code, message, retriable);
}
