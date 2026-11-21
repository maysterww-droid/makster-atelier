# Makster AI 4.5.0 — Owner Scenario Planner + What-If Engine

## Purpose
4.5 adds a non-destructive management simulation layer above Predictive Owner Control.

Makster can now compare multiple interventions BEFORE the owner changes a live order.

## Generated scenarios

### Baseline
Current company/project state.

### Cash Protection
Accelerates enough collectible client receivables to protect the first forecast cash-gap date.

Important:
The simulated early payment also reduces that project's later receivable.
It is a timing shift, not duplicated revenue.

### Capacity Relief
Adds temporary daily capacity to the bottleneck centers detected by Predictive Owner Control.

### Priority Rescue
Moves TIGHT/LATE projects toward the front of the production queue.

### Balanced Rescue
Combines:
- accelerated receivables
- bottleneck capacity
- priority rescue

## What is compared
Each scenario is re-evaluated through the real existing engines:
- Production Capacity
- Cash Gap Forecast
- BOM / procurement exposure
- Costing / margin
- Predictive Owner Control

Metrics:
- overall risk
- risk score
- cash gap
- first cash-gap date
- schedule-risk project count
- critical/high action count
- margin leakage
- scenario score
- improvement vs baseline

## Recommendation
Makster ranks Baseline and all generated scenarios and identifies the best calculated option.

A recommendation remains advisory:
4.5 does not mutate live project queue, accept money, award suppliers or add overtime automatically.

## Custom What-If
Owner can evaluate a custom combination:
- cash injection
- extra Assembly capacity
- extra Installation capacity
- risk-project queue priority

Custom scenarios are also non-destructive.

## API
GET  `/api/v1/owner-scenario-planner?currency=EUR`
POST `/api/v1/owner-scenario-planner/evaluate`

## UI
New top-level Owner Command card:
`Owner Scenario Planner · What-If`

It compares:
Baseline / Cash Protection / Capacity Relief / Priority Rescue / Balanced Rescue
and marks the recommended scenario.
