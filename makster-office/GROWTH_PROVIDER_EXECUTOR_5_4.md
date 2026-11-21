# Makster AI 5.4 — Growth Provider Executor Contract

## Purpose

Makster Core never stores Google/Meta/TikTok access tokens in campaign or browser state.

The Core talks to a server-side Provider Executor through:

- `MAKSTER_GROWTH_EXECUTOR_URL`
- `MAKSTER_GROWTH_EXECUTOR_TOKEN`

A Growth Connection stores only an opaque `executorConnectionRef`.

## Execution request

Makster sends:

```json
{
  "connectionRef": "opaque-provider-auth-reference",
  "provider": "meta_ads",
  "providerCampaignId": "external-campaign-id",
  "action": "scale | reduce | pause",
  "targetBudgetMinor": 150000,
  "currency": "EUR",
  "idempotencyKey": "growth:<decision>:<campaign>:<target>"
}
```

Executor must return HTTP 2xx only after the provider accepted the mutation:

```json
{
  "providerRequestId": "provider-or-adapter-request-id",
  "providerStatus": "confirmed"
}
```

Any provider/API rejection must be returned as non-2xx with an `error`.

## Spend safety sequence

Autopilot recommendation
→ Owner Approval
→ Guardrail re-check
→ idempotency check
→ Provider Executor
→ provider confirmation/failure
→ Audit Log

Owner Approval does NOT bypass guardrails.

## Guardrails

Per company/provider:

- projected daily spend ceiling
- projected monthly spend ceiling
- maximum single budget increase %
- maximum single budget decrease %
- allow/disallow PAUSE
- Owner Approval always required

AI Office campaign budget is treated as a monthly plan. The daily guardrail uses a 30-day projection.

## Lead ingestion gateway

Endpoint:

`POST /api/v1/ai-office/growth/leads/ingest`

The normalized gateway signs the canonical JSON payload using:

`HMAC-SHA256(MAKSTER_GROWTH_INGEST_SECRET, JSON.stringify(body))`

Header:

`x-makster-signature: sha256=<hex>`

Provider-native webhooks should first be verified by the provider-specific gateway, then normalized and re-signed for Makster Core.

Duplicate key:

`provider + providerLeadId`

A duplicate event is logged but does not create a second CRM lead.

## Secrets

Never expose in frontend state:

- provider access tokens
- refresh tokens
- client secrets
- executor bearer token
- lead-ingestion HMAC secret

5.4 stores only non-secret account IDs and opaque executor connection references.
