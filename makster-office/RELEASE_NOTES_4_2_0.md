# Makster AI 4.2.0 — Production Capacity + Cash Commitments + Procurement Award

## Purpose

4.2 closes the loop between:
- project priority,
- actual Engineering workload,
- workshop capacity,
- supplier quote decision,
- project Purchase Order,
- committed project cost,
- company cash commitment,
- payment calendar.

## Production Capacity

New engine:
`buildProductionCapacityPlan`

Work centers:
- Cutting
- Edging
- Drilling
- Assembly
- Installation

Each work center has:
- daily capacity hours
- active/inactive state
- workdays

Default planning centers are available automatically.
Owner configuration overrides the matching center only; configuring Assembly does not remove Cutting/Edging/Drilling/Installation.

### Engineering-derived workload

Planning hours use Engineering facts:
- panel part quantity
- edged panel sides
- machining operation count
- furniture count
- module count

The result is a planning estimate, not a time-study standard.

For known real jobs, Owner can set:
`ProjectCapacityOverride`

Example:
Engineering estimate Assembly = 11.4 h
Owner knows this kitchen = 18 h
=> Assembly planning workload becomes 18 h.

### Capacity schedule

Projects enter work centers in Owner Queue order.

A center cannot schedule two queue jobs into the same unavailable capacity period.

The report provides:
- project total planning hours
- workshop start
- workshop finish
- installation finish
- target installation date
- days buffer
- NORMAL / TIGHT / LATE risk
- scheduled hours per work center

Current scheduler is day-granular and Monday-Friday by default.
This is deliberate for production-management planning; shift/minute dispatching is a later layer.

## Procurement Award

New action:
Supplier Quote -> AWARD -> Project Purchase Order -> Cash Commitment.

Endpoint:
POST `/api/v1/supplier-quotes/:quoteId/award`

Input:
- projectId
- SKU
- quantity
- expected Project Revision
- awardedBy

Validation:
- project exists
- expected Revision matches
- quote exists
- supplier active
- quote not expired
- SKU exists in quote
- quantity valid
- same quote/project/SKU cannot be awarded twice while active

### Award lifecycle

1. Owner decision is written as `pending_project_order`.
2. Makster creates the project Purchase Order.
3. PO is approved/ordered in the same persisted project Revision.
4. Purchasing committed cost is recalculated from the PO.
5. Company supplier cash event is created as COMMITTED.
6. Award is finalized as `ordered` with Purchase Order ID and Cash Event ID.

If project-order creation fails, the award is marked `failed` instead of silently disappearing.

## Cash Commitments

Owner Dashboard now distinguishes:
- project committed purchases
- company committed cash outflow

This matters because an ordered PO and a future bank payment are related but not identical management concepts.

## Double-counting protection

Award-generated cash events carry:
- source = `procurement_award`
- sourceId = Purchase Order ID

Payment Calendar detects that lineage.

Therefore the same supplier obligation is NOT counted once from the Purchase Order and again from the award cash event.

## Supabase persistence

Prepared migration:
`supabase/migration_source/makster_owner_operations_4_2.sql`

New tables:
- owner_production_work_centers
- owner_project_capacity_overrides
- owner_procurement_awards

Extended:
- owner_cash_events.source
- owner_cash_events.source_id

Prepared staging smoke:
`supabase/tests/013_owner_operations_4_2_smoke.sql`

## Owner Command UI

New sections/actions:
- Production Capacity & Schedule
- configure work-center daily capacity
- project workload override
- capacity risk / buffer
- Procurement Awards
- choose shortage
- compare actual supplier quotes
- award selected quote
- create real Project PO
- show supplier cash commitment

## Current boundary

The workload coefficients are planning defaults.
They become materially better as a workshop enters actual overrides/history.

4.2 does not yet learn coefficients automatically from completed production timestamps.
That is the logical next step for Capacity Intelligence.
