export class ProductionWorkerError extends Error {
    code;
    retriable;
    constructor(code, message, retriable) {
        super(message);
        this.code = code;
        this.retriable = retriable;
        this.name = 'ProductionWorkerError';
    }
}
export function workerError(code, message, retriable = false) {
    throw new ProductionWorkerError(code, message, retriable);
}
