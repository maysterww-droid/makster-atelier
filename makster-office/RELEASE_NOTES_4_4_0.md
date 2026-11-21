# Makster AI 4.4.0 — Predictive Owner Control

## Goal
4.4 converts the management data already present in Makster into owner-facing decisions.

It combines:
- project queue
- Production Capacity
- Cash Gap Forecast
- BOM shortages
- supplier quotes
- Costing / margin
- client receivables

## Predictive Owner Control

New report:
`PredictiveOwnerControlReport`

Overall:
- risk score 0–100
- LOW / MEDIUM / HIGH / CRITICAL
- first projected cash gap
- cash-gap amount
- critical/high action counts
- projected margin leakage
- number of schedule-risk projects
- procurement shortage positions

## Decision actions

### collect_cash
When the treasury forecast goes negative, Makster identifies projects with outstanding client receivables and proposes a minimum amount to collect before the first gap date.

### expedite_procurement
For each project BOM shortage:
- project production start
- supplier lead time
- latest safe order date
- best available Optimal quote
- quoted total cost

Makster therefore moves from:
"we are missing W980"
to:
"award Supplier B no later than September 10 or the production start is exposed."

### add_capacity
For TIGHT/LATE projects, Makster identifies the heaviest scheduled work-center load and proposes capacity/overtime/queue intervention.

### protect_margin
When:
- margin < configured safety behavior (20% system baseline), or
- actual cost exceeds estimate, or
- forecast margin is negative,

Makster surfaces the project and the leakage amount before another purchasing decision.

### replenish_stock
Minimum-stock replenishment remains separate from project-specific BOM shortage so safety stock is not confused with job demand.

## Project Risk Score
Per active project:
- schedule risk
- BOM shortages
- forecast margin
- actual-vs-estimate leakage
- receivable exposure during a cash-gap period

The result is a ranked Owner risk list rather than a flat project list.

## API
GET `/api/v1/predictive-owner-control?currency=EUR`

## UI
Owner Command now starts with:
`Predictive Owner Control`

It shows:
- company risk score
- critical actions
- schedule exposure
- margin leakage
- ordered action cards
- per-project risk ranking

The existing underlying modules remain visible below it for drill-down.
