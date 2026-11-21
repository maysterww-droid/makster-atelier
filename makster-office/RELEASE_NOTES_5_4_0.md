# Makster AI 5.4.0 — Provider Execution + Lead Ingestion + Spend Guardrails + Audit

## Delivered

5.4 turns the 5.3 recommendation loop into an execution-safe provider architecture.

### Provider execution chain

Autopilot
→ Owner Approve
→ Spend Guardrail re-check
→ idempotent Provider Execution
→ external confirmation/failure
→ Audit Log

The external mutation is only reported `EXECUTED` when the configured server-side executor confirms it.

### Spend Guardrails

The Owner can configure:

- daily projected spend ceiling
- monthly spend ceiling
- max one-step budget increase %
- max one-step budget decrease %
- whether PAUSE is allowed

Owner Approval cannot bypass these limits.

### Execution idempotency

Every external mutation receives an idempotency key based on:

decision + provider campaign + target budget

Makster also refuses a second active/executed provider execution for the same decision.

### Real-provider boundary

The Core supports a server-side executor connection.

Environment:

- MAKSTER_GROWTH_EXECUTOR_URL
- MAKSTER_GROWTH_EXECUTOR_TOKEN

Growth connections carry an opaque executorConnectionRef, never provider access tokens.

If executor credentials/reference are missing:
provider execution remains `READY_FOR_CONNECTION` / `PROVIDER_NOT_CONNECTED`.

### Signed lead ingestion

New normalized inbound endpoint:

POST `/api/v1/ai-office/growth/leads/ingest`

Security:

HMAC-SHA256 via `MAKSTER_GROWTH_INGEST_SECRET`.

Unverified lead:
HTTP 403 / REJECTED.

Duplicate provider+providerLeadId:
DUPLICATE, no second CRM lead.

Valid lead:
INGESTED → AI Office CRM.

Campaign attribution is preserved through providerCampaignId.

### Audit Log

Audit records:

- guardrail changes
- provider executions
- blocked executions
- provider failures
- connection activation
- lead ingestion
- duplicate leads
- rejected webhook events

### UI

AI Office now shows:

- Spend Guardrails
- Provider Executions
- provider confirmation/error
- Inbound Lead Gateway events
- duplicate/rejected counts
- Audit Log
- Execute Provider on already Owner-approved Autopilot decisions

## Runtime verification

Weak Instagram/Meta campaign:
- monthly plan EUR 1,000
- spend EUR 500
- leads 6
- qualified 0
- Autopilot: PAUSE / 90%

Owner approved.
Guardrail passed.
Configured executor received exactly one mutation.
Executor response: CONFIRMED.
Makster provider execution: EXECUTED.

Lead gateway:
- signed Meta lead → INGESTED
- identical providerLeadId → DUPLICATE
- invalid HMAC → HTTP 403 / REJECTED

## Important boundary

This archive contains the real execution contract and server-side gateway integration, but it does not contain the user's actual Google/Meta/TikTok OAuth credentials.

A provider-specific executor service must authorize those accounts and implement the provider-native APIs behind the documented `/execute` contract.

No live advertising account was changed during build verification.
