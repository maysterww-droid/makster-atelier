# Makster AI 4.3.0 — Capacity Intelligence + Cash Gap Forecast + Replenishment Planning

## Capacity Intelligence
Makster now learns planning multipliers from completed production-time records.

Each record stores:
- project
- work center
- planned hours
- actual hours
- completion time
- recorder

Learning is bounded:
- ratios outside 0.25x–4.0x are ignored as outliers
- confidence grows with sample count
- <3 samples = insufficient_data
- 3–7 = learning
- 8+ = trusted
- manual ProjectCapacityOverride remains authoritative

With eight Assembly jobs planned at 10h and actually taking 15h, the trusted multiplier becomes 1.5x and future Assembly workload is corrected accordingly.

## Cash Gap Forecast
New treasury baseline:
- currency
- current/opening available balance
- as-of time

Makster overlays the full Payment Calendar and returns:
- minimum projected balance
- date of minimum
- first negative-balance date
- cash-gap amount
- projected balance after every payment row

This is different from simple 7/30/90-day net cash flow: a month may end positive but still contain a dangerous mid-month liquidity gap.

## Replenishment Planning
Replenishment combines:
- physical stock
- active hard reservations
- free stock
- configured minimum stock
- BOM shortages across active queued jobs

Recommended order quantity:
`minimum stock + BOM shortage - available free stock`

Missing SKUs that exist in BOM but not in Warehouse are also surfaced.

## API
GET  /api/v1/capacity-learning
POST /api/v1/production-time-entries
POST /api/v1/treasury-balance
GET  /api/v1/cash-gap-forecast
GET  /api/v1/replenishment-plan

## Supabase
Prepared migration:
`supabase/migration_source/makster_owner_operations_4_3.sql`

New tables:
- owner_production_time_entries
- owner_treasury_balances

## Owner Command UI
New panels:
- Capacity Intelligence
- actual-time recording
- Cash Gap Forecast
- treasury balance input
- Replenishment Planning
