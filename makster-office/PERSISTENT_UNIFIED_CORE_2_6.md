# Makster AI 2.6.0 — Persistent Unified Core

## Runtime selection
Makster uses Supabase business persistence only when all three are present:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (Project repository / user RLS)
- `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` (server-only Business Store)

Set `MAKSTER_BUSINESS_STORE=memory` to force local/offline memory mode.

## What is persisted
- immutable Commercial Estimate / lines;
- immutable Client Quote and package manifest;
- exact commercial package snapshot including generated files;
- quote lifecycle events;
- exact requote pricing/terms/production route context;
- quote lineage;
- Change Impact report;
- Commercial Contract;
- payment schedule and paid-installment state;
- Client Change Order lifecycle;
- token **hash** only;
- Client Revision Authorization.

## Why package snapshots exist beside normalized tables
Normalized 1.6 tables remain the reporting/query surface. The immutable package snapshot is the exact rehydration artifact needed so a server restart does not have to regenerate historical client documents from potentially newer code.

## Accepted Change Order transaction
The domain engine still calculates the deterministic accepted state. Supabase then commits in one transaction:

1. accepted Change Order decision;
2. updated current contract revision/quote/amount/payment schedule;
3. immutable ClientRevisionAuthorization;
4. base quote → `superseded`;
5. new quote → `accepted`.

An exact retry with the same authorization fingerprint returns `already_applied`; a conflicting authorization for the same Project Revision is rejected.

## Raw token rule
The one-time client approval token is returned once by the API. Only its SHA-256 hash is persisted in `private.client_change_order_secrets`, reached through service-only RPC functions. The public/customer-safe payload never contains this hash.

## Current boundary
This is persistence wiring + prepared SQL + deterministic adapter tests. No live Supabase migration was applied by the release build. Staging migration and live restart acceptance are the next deployment action before production data is trusted.
