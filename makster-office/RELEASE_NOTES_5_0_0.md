# Makster AI 5.0.0 — Business Operating System Release Candidate

## What 5.0 changes

5.0 is not another isolated feature module.

It is the first Business Operating System layer that treats the entire company workflow as one connected operating truth:

Client / Project
→ Engineering
→ Commercial authorization
→ Procurement
→ Production execution
→ Installation
→ Handover
→ Final payment
→ Project economics
→ Monthly P&L
→ Close

## Single Source of Truth map

Makster 5.0 explicitly declares which subsystem owns each fact.

### Project stage
Source of truth:
`ProjectModel.jobControl.stage`

### Technical revision
Source of truth:
`ProjectModel.revision`

### Production execution
Source of truth:
`OwnerOperations.productionOperations`

### Procurement
Sources:
- ProjectModel.purchaseOrders
- OwnerOperations.materialRfqs
- OwnerOperations.procurementAwards

### Project economics
Source:
Engineering Costing

### Management P&L
Sources:
- Owner Finance Ledger
- Project data
- Cash data

### Treasury
Sources:
- treasuryBalances
- cashEvents

This avoids having multiple dashboards silently maintain competing versions of the same fact.

## Business Truth Engine

Business OS actively searches for cross-system contradictions.

Examples:

- CLOSED project but client still owes money
- CLOSED furniture project with no production execution history
- CLOSED project with unfinished production operations
- CLOSED project with open Material RFQ
- handover/final-payment stage without signed handover
- installation stage while installation operation is still only PLANNED
- client cash receipts larger than ProjectModel received amount
- closed project with negative actual margin
- orphan production operations
- orphan RFQs
- orphan cash events

Truth issues have severity:

- CRITICAL
- HIGH
- MEDIUM
- LOW

They directly affect Business Health Score.

## Business Health Score

Company receives:

0–100 score

Status:

- GREEN ≥ 80
- AMBER 55–79
- RED < 55

Score is affected by:

- cross-system truth inconsistencies
- RED lifecycle projects
- blocked production
- cash runway
- negative operating forecast

A company can therefore be profitable on paper and still RED operationally.

## End-to-End Project State

Every project receives one Owner row containing:

- project / client
- Job Stage
- technical revision
- lifecycle state
- lifecycle GREEN / AMBER / RED
- current production operation
- production execution status
- delay days
- procurement shortages
- open Material RFQs
- contract
- received
- outstanding
- forecast cost
- actual cost
- forecast profit
- forecast margin
- Close Ready status
- Close blockers
- next action
- truth issue count

## Guarded Project Close

New endpoint:

POST `/api/v1/business-os/projects/:projectId/close`

It is the supported Business OS close path.

Project is NOT allowed to close while any hard close condition remains.

Hard Close Gates:

- signed installation handover
- client final balance = 0
- real production execution completed/skipped for furniture projects
- no unfinished production operations
- no open material RFQs
- no open purchase orders
- no open punch-list items
- no open installation site issues

A failed close returns:

HTTP 409
`business_close_gate_blocked`

with exact blockers.

The older generic Job Control stage mutation still exists for compatibility/manual recovery, but if somebody bypasses the Business OS Close Gate, Business Truth Engine detects the inconsistency instead of silently accepting it.

## Owner Action Queue

5.0 combines:

- Business Truth issues
- Predictive Owner Control actions
- Close-ready projects

into one ordered Owner action list.

Priority:

P1 — critical truth / critical operational risk
P2 — high
P3 — normal intervention / safe closure

## Company Operating Snapshot

Business OS exposes one company-level snapshot:

- active projects
- closed projects
- lifecycle RED projects
- production blocked projects
- procurement blocked projects
- unpaid projects
- Close Ready projects
- truth issue count
- critical truth issue count

Financial context:

- contract backlog
- outstanding client receivables
- forecast project profit
- treasury
- accounts payable
- accounts receivable
- operating profit forecast
- runway
- break-even gap

## Existing 4.x systems retained

5.0 does not replace the modules built in 4.x.

It orchestrates them:

- Warehouse & hard reservations
- Supplier Intelligence
- Procurement Automation / RFQ Center
- Operations Control Tower
- Production Capacity
- Capacity Learning
- Predictive Owner Control
- What-If Scenario Planner
- Decision Execution Center
- Owner Finance & P&L Intelligence
- Project Lifecycle Release Gate
- Installation Closeout
- Client approvals
- Project Costing

## API

GET `/api/v1/business-os?currency=EUR&month=YYYY-MM`

POST `/api/v1/business-os/projects/:projectId/close`

## Owner UI

New top card:

`Makster AI 5.0 · Business Operating System`

Shows:

- Business Health
- cross-system truth issues
- company operating summary
- company financial summary
- Next Owner Actions
- End-to-End Project State
- guarded Close action

All previous operational cards remain available below for drill-down.

## Release Candidate status

5.0 is called Release Candidate intentionally.

The application now has a coherent local/server Business Operating System architecture and regression coverage.

Before calling it production-ready SaaS/ERP, remaining work includes:

- production Supabase migrations actually applied and verified
- authentication / organization permissions in target environment
- real Gmail inbound routing for new Material RFQ threads
- statutory accounting integration
- telemetry / backup / restore / disaster recovery
- multi-user concurrency/load testing
- production observability and alerting
- real workshop pilot with several live jobs
