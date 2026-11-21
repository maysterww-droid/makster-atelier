import { ProductionWorker, PRODUCTION_WORKER_VERSION } from '../../../packages/production-worker/src/index.js';
import { SupabaseProductionWorkerBackend } from './supabase-backend.js';
const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secretKey)
    throw new Error('SUPABASE_URL_and_SUPABASE_SECRET_KEY_required');
const workerId = process.env.MAKSTER_WORKER_ID ?? `makster-worker-${process.pid}`;
const visibilityTimeoutSeconds = Number(process.env.MAKSTER_WORKER_VISIBILITY_SECONDS ?? 300);
const pollMs = Number(process.env.MAKSTER_WORKER_POLL_MS ?? 1000);
const once = process.argv.includes('--once');
// Real verified machine postprocessors must be explicitly registered in code/deployment.
// 0.9 deliberately ships with no live CNC implementation.
const registry = new Map();
const backend = new SupabaseProductionWorkerBackend(url, secretKey, registry);
const worker = new ProductionWorker(backend, { workerId, visibilityTimeoutSeconds, allowTestOnly: false });
console.log(JSON.stringify({ service: 'makster-production-worker', version: PRODUCTION_WORKER_VERSION, workerId, mode: once ? 'once' : 'loop' }));
for (;;) {
    const result = await worker.runOnce();
    if (result.status !== 'idle')
        console.log(JSON.stringify(result));
    if (once)
        break;
    if (result.status === 'idle')
        await new Promise((resolve) => setTimeout(resolve, pollMs));
}
