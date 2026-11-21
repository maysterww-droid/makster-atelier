# Makster AI 5.6 — Production Deployment Checklist

Makster may be called PRODUCTION READY only when the Production Readiness Gate is open.

## Critical gates

1. Persistent shared database
   - SUPABASE_URL configured
   - SUPABASE_SERVICE_ROLE_KEY configured server-side only
   - all prepared migrations applied and smoke-tested

2. Roles & access
   - organization role policies bootstrapped
   - owner/admin permissions verified
   - finance/marketing/production/installer separation reviewed
   - frontend convenience controls are not treated as the security boundary; server/RLS remains authoritative

3. Recovery
   - application recovery export generated and validated
   - managed PostgreSQL backup/PITR configured separately
   - restore drill performed before production launch

4. Observability
   - API request/error/latency metrics visible
   - p95 latency reviewed
   - critical/high incidents closed
   - production alerts routed to an owner/operator

5. Real pilot
   - at least 3 real furniture projects completed end-to-end
   - lead/commercial/procurement/production/installation/payment/finance/content checkpoints complete

6. Public runtime
   - NODE_ENV=production
   - MAKSTER_PUBLIC_BASE_URL configured
   - HTTPS/reverse proxy configured
   - secrets stored server-side

7. Growth integrations, when enabled
   - MAKSTER_GROWTH_INGEST_SECRET configured
   - provider executor authorized
   - spend guardrails configured
   - provider mutation tested with a low-risk campaign

## Important backup boundary

`/api/v1/system/backup/export` is an application-level recovery export for ProjectModel + Owner Operations.

It is useful for disaster recovery and migration checks, but it does NOT replace:
- managed PostgreSQL backups
- point-in-time recovery
- provider account backups
- object/media storage backup

## Release statuses

DEVELOPMENT
- critical infrastructure missing

PILOT_READY
- real pilot has started, but critical production gates remain

RELEASE_CANDIDATE
- critical failures closed, remaining production warnings exist

PRODUCTION_READY
- no critical FAIL/WARN gates and readiness score >= 90
