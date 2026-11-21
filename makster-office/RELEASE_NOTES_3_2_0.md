# Makster AI 3.2.0 — Costing, Margin & Actual vs Estimate

## Purpose

3.2 separates project price from real project profitability.

Cost sources:
1. Purchasing commitments from approved/ordered/received Purchase Orders.
2. Actual procurement cost from received quantities only.
3. Manual estimate entries for labor, installation, transport, subcontracting, overhead and other costs.
4. Manual actual entries for those same non-purchasing costs.

## Cost categories

- material
- hardware
- appliance
- labor
- installation
- transport
- subcontract
- overhead
- other

## Accounting logic

Purchase Order total is a committed cost, not automatically an actual cost.

Actual procurement:
`unit price × received quantity`

This prevents a full supplier order from being counted as spent before goods are received.

Manual cost entries have:
- basis: estimate / actual
- category
- description
- amount
- currency
- author/time
- optional note

## Main KPIs

- Contract Value
- Purchasing Committed
- Purchasing Actual
- Manual Estimate
- Manual Actual
- Total Estimate
- Total Actual
- Remaining Forecast
- Forecast Margin
- Forecast Margin %
- Actual Margin
- Actual Margin %
- Actual vs Estimate variance by category

## Job Control integration

`jobControl.money.committedPurchaseMinor`
is synchronized from active Purchase Orders.

`jobControl.money.actualCostMinor`
is synchronized from:
- actually received purchasing value
- manual ACTUAL cost entries

It is no longer necessary to manually maintain total actual project cost.

## API

GET  /api/v1/projects/:projectId/costing
POST /api/v1/projects/:projectId/cost-entries
POST /api/v1/projects/:projectId/cost-entries/:entryId/delete

All mutations require expectedRevision and create a new Project Revision.

## UI

New Costing tab:
- Contract / Estimate / Actual
- Forecast and Actual margin
- Procurement committed vs received
- Manual costs
- category table
- manual cost ledger

## Production Pack

New:
- costing.json
- cost-entries.csv

Costing snapshot is tied to the exact Project Revision.
