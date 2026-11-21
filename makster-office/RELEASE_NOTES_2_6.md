# Release Notes — Makster AI 2.6.0 Persistent Unified Core

## Goal
Makster 2.6.0 removes process-local business truth from the active Quote → Contract → Change Order → Production-gate chain when Supabase is configured.

The canonical chain remains:

`Project Revision → CAD → Engineering → Production Pack → Commercial Quote → Contract → Payment Schedule → Change Impact → Requote → Change Order → Client Authorization → Manufacturing Approval`

## Added
- `UnifiedBusinessStore` boundary for all Commercial 1.6 / Change 1.7 / Contract & Change Order 1.8 runtime state.
- `SupabaseUnifiedBusinessStore` using server-only `SUPABASE_SECRET_KEY` / legacy service-role fallback.
- `MemoryUnifiedBusinessStore` for offline/local development.
- exact immutable `commercial_package_snapshots` for deterministic rehydration after restart;
- immutable `commercial_quote_contexts` so requote keeps the exact original pricing/terms/production-route context;
- persistent quote lifecycle event lookup;
- persistent Change Impact reports and quote lineage;
- persistent Commercial Contract and payment schedule updates;
- persistent Client Change Order status/view/decision state;
- private approval-token SHA-256 storage via service-only RPC; raw token is never persisted;
- persistent `ClientRevisionAuthorization`;
- atomic service-only RPC for accepted Change Order → contract update → authorization → quote status transitions;
- idempotent immutable inserts/retries;
- health endpoint now reports `businessPersistence: memory | supabase`.

## Security hardening
The Business Store uses service credentials and therefore bypasses normal table RLS. Internal Core API routes now re-check access through the Project repository before returning service-role business data. Public Change Order view/decision routes intentionally do not require a user bearer token; they are authorized by the one-time client token and resolve organization binding from the existing contract.

## Supabase deployment boundary
The migration is prepared at:

`supabase/migration_source/makster_persistent_unified_business_2_6.sql`

This release does **not** apply it to the live database automatically. Apply Core → Commercial 1.6 → Change 1.7 → Client Change Order 1.8 → Persistent Unified Business 2.6 in a staging branch/project first.

## Restart acceptance proof
The 2.6 test suite instantiates a Supabase store, writes quote/context/contract/change-order state, discards that store instance, creates a new store instance against the same backend state and verifies exact rehydration. Accepted Change Order is then applied twice through the atomic RPC to prove idempotent retry semantics and rehydrated again from a new store instance.

## Idempotent client decision replay

Public Change Order decisions are safe against network/browser retries. Repeating the same already-successful Accept/Decline with the same token returns the persisted result (`idempotentReplay: true`) and does not create a second contract mutation or revision authorization. A conflicting later decision is rejected.
