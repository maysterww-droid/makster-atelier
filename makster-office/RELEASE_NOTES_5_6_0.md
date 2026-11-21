# Makster AI 5.6.0 — Production Hardening + Release Gate

## Purpose

5.6 stops feature accumulation and introduces a hard production-readiness layer.

The system now distinguishes:
- application works
- pilot ready
- release candidate
- production ready

These are not treated as the same thing.

## Production Readiness Gate

New `System` tab and API:

GET `/api/v1/system/readiness`

Checks:
- persistent database
- service-role server credential
- production runtime mode
- public base URL
- persisted role matrix
- real project pilot
- recovery export
- API observability
- critical/high incidents
- growth webhook security
- provider executor
- AI provider
- failed provider executions

Critical FAIL/WARN checks keep the Release Gate closed.

## Multi-user role matrix

Roles:
- owner
- admin
- sales
- designer
- engineer
- procurement
- production
- installer
- finance
- marketing
- viewer

Permission model includes project, engineering, commercial, procurement, production, installation, finance, marketing, approvals, system and recovery permissions.

APIs:
POST `/api/v1/system/roles/bootstrap`
POST `/api/v1/system/roles/:role`
POST `/api/v1/system/access/check`

The matrix is an application policy layer.
In production, Supabase RLS/server authorization remains the true security boundary.

## Observability

GET `/api/v1/system/observability`

Tracks:
- total requests
- 5xx errors
- error rate
- p50
- p95
- p99
- status distribution
- method distribution

The runtime keeps a bounded recent latency window.

## Operational incidents

POST `/api/v1/system/incidents`
POST `/api/v1/system/incidents/:id/resolve`

Open CRITICAL/HIGH incidents close the Production Release Gate.

## Recovery export

GET `/api/v1/system/backup/export`

Exports:
- ProjectModel snapshots
- Owner Operations state

Produces SHA-256 manifest with:
- organization
- project count
- version
- bytes
- checksum
- explicit `containsSecrets=false`

Validation:
POST `/api/v1/system/backup/validate`

This is an application-level recovery export and does NOT replace PostgreSQL PITR/managed database backup.

## Runtime verification

Local/file build intentionally remained NOT PRODUCTION READY.

Initial local readiness:
- score 0
- DEVELOPMENT
- Release Gate CLOSED

After role bootstrap + recovery export:
- score 34
- DEVELOPMENT
- Release Gate CLOSED

Remaining critical blockers correctly reported:
- no persistent shared Supabase production database
- no SUPABASE_SERVICE_ROLE_KEY
- fewer than 3 fully completed real Pilot projects

This is expected and desired behavior.

## Testing

5.6 unit tests: 6 / 6 passed
Full regression: 76 / 76 passed
0 failed
