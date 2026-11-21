import { SupabaseUnifiedBusinessStore } from './dist/apps/core-api/src/supabase-business-store.js';

function normalizeSecret(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/[\s\u200B\u200C\u200D\uFEFF]/g, '');
}

const url = String(process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const secretKey = normalizeSecret(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!url || !secretKey) {
  console.error('STAGING_PROBE_FAIL: missing Supabase URL or Secret key');
  process.exit(2);
}
if (!secretKey.startsWith('sb_secret_') && !secretKey.startsWith('eyJ')) {
  console.error('STAGING_PROBE_FAIL: Secret key format is not recognized');
  process.exit(2);
}

const store = new SupabaseUnifiedBusinessStore({ url, secretKey });
const projectId = '26000000-0000-4000-8000-000000000002';
const changeOrderId = '26000000-0000-4000-8000-000000000061';
const expectedQuoteId = '26000000-0000-4000-8000-000000000032';

try {
  const contract = await store.getContractByProject(projectId);
  const changeOrder = await store.getChangeOrder(changeOrderId);
  const authorization = await store.getAuthorization(projectId, 2);

  const checks = {
    storeModeSupabase: store.mode === 'supabase',
    contractFound: Boolean(contract),
    contractRevision2: contract?.currentRevision === 2,
    contractQuote2: contract?.currentQuoteId === expectedQuoteId,
    changeOrderFound: Boolean(changeOrder),
    changeOrderAccepted: changeOrder?.status === 'accepted',
    tokenHashOnly: typeof changeOrder?.approvalTokenHashSha256 === 'string' && /^[a-f0-9]{64}$/.test(changeOrder.approvalTokenHashSha256),
    authorizationFound: Boolean(authorization),
    authorizationRevision2: authorization?.revision === 2,
    authorizationQuote2: authorization?.quoteId === expectedQuoteId,
  };

  const passed = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ passed, checks, contractId: contract?.contractId, authorizationId: authorization?.authorizationId }, null, 2));
  process.exit(passed ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause ? String(error.cause) : '';
  console.error('STAGING_PROBE_FAIL:', message);
  if (cause) console.error('CAUSE:', cause);
  if (message.includes('UND_ERR_INVALID_ARG') || cause.includes('UND_ERR_INVALID_ARG')) {
    console.error('The copied key still contains an invalid character. Copy only the key value from Supabase and retry.');
  } else if (message.includes('401') || message.includes('403')) {
    console.error('Supabase rejected the key. Make sure you copied the Secret/service_role key, not the Publishable/anon key.');
  }
  process.exit(3);
}
