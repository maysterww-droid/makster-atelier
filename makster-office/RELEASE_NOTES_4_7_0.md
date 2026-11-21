# Makster AI 4.7.0 — Operations Control Tower + Production Board

## Purpose

4.7 closes the operational gap between production planning and what actually happens in the workshop.

Makster now tracks live execution instead of treating a project as a single generic `production` stage.

## Live Production Operations

Every active project is expanded into five ordered operations:

1. Cutting
2. Edging
3. Drilling
4. Assembly
5. Installation

Statuses:

- planned
- ready
- in_progress
- blocked
- completed
- skipped

Each operation stores:

- project / queue position
- work center
- sequence
- planned start / finish
- planned hours
- assignee
- actual start / finish
- actual hours
- blocker reason / blocker timestamp
- source Capacity Plan generation time
- last update

## Production Board

Owner Command now contains:

`Operations Control Tower · Production Board`

It shows:

- active projects
- blocked operations
- operations in progress
- ready operations
- late projects
- cascade-delayed operations
- Today
- Tomorrow
- This Week

Every active operation can be:

- assigned
- started
- completed
- blocked
- unblocked

## Dependency Guard

A downstream operation cannot be started while it is still `planned`.

The next operation becomes `ready` only after the previous project operation is completed/skipped.

Example:

Cutting READY
→ Start
→ Complete
→ Edging automatically becomes READY

## Blockers

Blocking an operation requires a reason.

Example:

`Waiting for panels`

The blocker survives production-plan resynchronization.

A Capacity Sync updates the plan but does NOT erase:

- blocked status
- blocker reason
- assignee
- actual start
- actual finish
- actual hours

## Execution-aware replanning

4.7 adds a real shared-resource cascade.

Recalculated operation dates honor:

1. original Capacity Plan
2. previous operation of the same project
3. previous project on the same work center
4. actual completion delay
5. current blocker / overdue execution

Therefore a delay in queue #1 Cutting can shift:

- Cutting of queue #2
- downstream Edging
- Drilling
- Assembly
- Installation

The Project row shows:

- baseline installation finish
- recalculated installation finish
- execution delay days
- new target buffer
- NORMAL / TIGHT / LATE / HIGH risk

## Actual Time Learning

Completing an operation with actual hours automatically creates a Production Time Entry.

This feeds the existing Capacity Intelligence learning loop.

The operator does not need to enter the same actual time twice.

## API

POST `/api/v1/production-operations/sync`

GET `/api/v1/operations-control-tower`

POST `/api/v1/production-operations/:id/assign`

POST `/api/v1/production-operations/:id/start`

POST `/api/v1/production-operations/:id/complete`

POST `/api/v1/production-operations/:id/block`

POST `/api/v1/production-operations/:id/unblock`

POST `/api/v1/production-operations/:id/skip`

## Persistence

File-store and Supabase implementations both persist live operation facts.

Prepared Supabase migration:

`supabase/migration_source/makster_owner_operations_4_7.sql`

New table:

`owner_production_operations`

Prepared staging smoke:

`supabase/tests/015_owner_operations_4_7_smoke.sql`
