# Makster AI 4.6.0 — Decision Execution Center + Approval Plan

## Purpose
4.6 closes the gap between Scenario Planning and real operations.

A selected What-If scenario becomes a persisted Owner Decision Plan with explicit approval gates.

## Decision Plan
Each plan stores:
- source scenario
- baseline risk / scenario risk
- baseline cash gap / scenario cash gap
- creator and timestamp
- plan status
- individual decision items

Decision item states:
- pending_approval
- approved
- rejected
- applied
- ready_external
- failed

## Internal vs External Execution

### Internal actions
After explicit Owner approval, Makster can apply:
- queue priority overrides
- production work-center capacity changes
- internal margin-review acknowledgement

### External / money actions
After Owner approval, Makster does NOT silently execute:
- client payment collection
- owner cash injection
- supplier procurement award

These move to:
`ready_external`

That means the decision is approved and prepared, but the real external action still requires its dedicated workflow.

## Queue Priority
4.6 introduces persistent Owner queue-priority overrides.

Owner Command now treats an approved manual priority as authoritative over automatic risk/date sorting.

This lets the Scenario Planner recommendation become an actual production-priority decision without modifying the underlying ProjectModel.

## Approval Safety
No Decision Plan item can execute before explicit approval.

Rejected items remain rejected.

Applying a plan:
- executes only approved internal items
- marks approved external items `ready_external`
- leaves pending/rejected items untouched
- records failures per item

## API
GET  `/api/v1/decision-plans`
POST `/api/v1/decision-plans`
POST `/api/v1/decision-plans/:planId/items/:itemId/approve`
POST `/api/v1/decision-plans/:planId/items/:itemId/reject`
POST `/api/v1/decision-plans/:planId/apply`

## UI
New Owner Command top block:
`Decision Execution Center`

Owner can:
- create a plan from a Scenario Planner result
- approve/reject each action
- apply approved actions
- see internal vs external action type
- see execution state

## Persistence
File-store and Supabase paths support:
- decision plans
- queue priority overrides

Prepared Supabase migration:
`supabase/migration_source/makster_owner_operations_4_6.sql`
