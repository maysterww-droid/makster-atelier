# Makster AI 4.0.0 — Owner Command Center

## Scope
4.0 restores the company-level management layer above individual projects.

## Owner Command Center
Aggregates all active ProjectModels for one organization:
- order / production queue
- project stage
- client
- deadlines
- contract value
- paid amount
- receivables
- committed purchases
- actual project cost
- forecast margin
- schedule/margin risk

Queue priority uses:
1. late / high-risk jobs
2. nearest installation/delivery date
3. later lifecycle stage

## Warehouse & Hard Reservations
Organization-level warehouse inventory is separated from individual ProjectModel revisions.

Warehouse item:
- SKU
- name / manufacturer
- unit
- physical on-hand quantity
- minimum stock
- unit cost
- location

Reservation:
- warehouse item
- project
- quantity
- project queue priority
- status: reserved / consumed / released

Hard reservation rule:
`available = onHand - active reservations`

Makster refuses:
- a reservation above available stock
- a stock write-off that would consume stock reserved for another project

This restores the old Makster Pro behavior where hardware allocated to an earlier order cannot silently disappear into another job.

## Supplier Intelligence
Supplier profiles include:
- lead time
- reliability
- defect %
- payment terms
- price index

Three ranking modes:
- Cheapest
- Fastest
- Optimal

Optimal score weights:
- 35% price
- 25% speed
- 40% reliability/quality

## Cash Flow Center
Organization-level Cash Events:
- inflow / outflow
- category
- amount
- due date
- status
- project / counterparty / note

Dashboard forecast:
- next 7 days
- next 30 days
- next 90 days

Forecast combines:
- manual cash events
- expected project receivables by delivery/installation date
- open Purchase Order balances by expected supplier date

## Break-even
Owner Command computes:
- monthly fixed costs
- average active-project forecast margin %
- break-even revenue required to cover fixed monthly costs

## Company Financial Roll-up
- contracts total
- received total
- accounts receivable
- committed purchases
- actual project cost
- uncommitted received cash
- forecast margin
- break-even revenue

`uncommitted received` is management guidance, not a bank-account balance.

## UI
New tab:
`Owner Command`

Sections:
- company KPI row
- Cash Forecast + simple visual bars
- financial operations ledger
- alerts
- Order / Production Queue
- Warehouse
- hard project reservations
- Supplier Intelligence

## API
GET  /api/v1/owner-command-center
GET  /api/v1/warehouse
POST /api/v1/warehouse/items
POST /api/v1/warehouse/items/:id/adjust
POST /api/v1/warehouse/reservations
POST /api/v1/warehouse/reservations/:id/consume
POST /api/v1/warehouse/reservations/:id/release
POST /api/v1/suppliers
GET  /api/v1/suppliers/ranking?mode=optimal|fastest|cheapest
POST /api/v1/cash-flow/events
POST /api/v1/cash-flow/fixed-costs

## Persistence
4.0 introduces an organization-level Owner Operations Store.

Demo/runtime persistence:
`MAKSTER_OWNER_OPERATIONS_FILE`
or default:
`.makster-owner-operations.json`

This deliberately lives outside individual project revisions.

A Supabase-native organization store is the next persistence hardening step for multi-user cloud production.
