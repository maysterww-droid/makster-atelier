# Makster AI 2.8.0 — Persistent Catalog Registry & Review Queue

2.8.0 turns the 2.7.9 import pipeline into a persistent registry.

## New persistence layer
- MemoryCatalogRegistryStore for local/demo fallback.
- SupabaseCatalogRegistryStore for persistent server-side storage.
- catalog_import_jobs
- catalog_import_candidates
- catalog_master_records

## Workflow
Import → persistent staging → review queue → promote/reject → persistent master record → runtime catalog.

Promoted records are restored into the active master catalog when Core API starts.

## Review queue
GET /api/v1/catalogs/review-queue

Promotion and rejection use the stored candidate, not a browser-supplied replacement record.

## Supabase
Migration:
supabase/migration_source/makster_catalog_registry_2_8_0.sql

The tables use RLS with no public policy. Server-side access is through SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.

## UI
Catalog now shows Review Queue with refresh, Promote and Reject controls.

## Trust
Persistence never upgrades trust automatically.
manufacturer_verified/project_verified still requires explicit evidence confirmation.
Drilling trust remains separate from catalog-record promotion.
