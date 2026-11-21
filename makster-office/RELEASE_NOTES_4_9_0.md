# Makster AI 4.9.0 — Owner Finance & P&L Intelligence

## Purpose

4.9 turns the Owner Command Center into a real management-finance dashboard.

It deliberately separates three different financial truths:

1. Project lifetime economics
   - contract value
   - forecast cost
   - actual cumulative cost
   - forecast / actual project margin

2. Period P&L
   - revenue recognized in the selected month
   - project COGS in that month
   - fixed / variable operating expenses
   - operating profit

3. Cash / liquidity
   - treasury
   - scheduled inflows/outflows
   - cash runway
   - cash-gap forecast

Makster does not treat these as interchangeable.

## Revenue basis

Monthly P&L supports explicit:
`revenue_recognition`

If explicit recognition entries exist for the selected period, P&L uses them.

If there is no explicit recognition, actual period revenue can fall back to client cash receipts with status `received`.

If neither exists:
Actual Revenue = 0

Makster does NOT invent monthly revenue from cumulative contract value.

Forecast Revenue remains separate and is based on projects scheduled for delivery/installation in the selected month.

## Monthly P&L

Owner Finance shows:

- Revenue Actual
- Revenue Forecast
- Project COGS Actual
- Project COGS Forecast
- Gross Profit
- Gross Margin
- Fixed Operating Expenses
- Variable Operating Expenses
- Operating Profit
- Operating Margin
- Tax Reserve
- Net After Tax Reserve

Actual and Forecast are presented side-by-side.

## Project Profitability Ranking

Every project receives:

- contract value
- received money
- accounts receivable
- forecast cost
- actual cumulative cost
- forecast profit
- actual lifetime profit
- forecast margin
- actual margin
- cash conversion %
- stage
- profitability rank score

Owner sees:

- best margin project
- worst margin project
- highest receivable
- highest forecast profit

Low-margin jobs generate alerts.

## Working Capital

Working capital includes:

- Accounts Receivable
- Accounts Payable
- Net Working Capital
- Overdue Receivables
- Supplier obligations due in 30 days

Accounts Payable contains duplicate protection.

If a supplier Cash Commitment already points to a Purchase Order through procurement-award lineage,
that same Purchase Order is not counted again.

## Overdue receivables

Outstanding client balance becomes overdue when:

- target Installation/Delivery date is in the past
- project still has unpaid contract value

This gives Owner Finance a practical collection-risk indicator.

## Break-even Engine

Break-even uses:

Fixed Monthly Costs / contribution margin %

Contribution margin is based on the current project portfolio forecast margin.

Outputs:

- fixed monthly costs
- contribution margin %
- break-even revenue
- contracted revenue in selected month
- remaining revenue gap
- achieved / not achieved

## Cash Runway

Liquidity combines:

- treasury balance
- fixed monthly operating costs
- supplier payments due in the next 30 days
- variable operating cash outflows
- expected cash inflows

Outputs:

- projected 30-day net cash
- monthly burn
- runway months
- STRONG / WATCH / CRITICAL

Runway safety threshold is configurable.

## Finance Settings

Owner can configure per currency:

- target Gross Margin %
- target Operating Margin %
- tax reserve %
- safe runway months

Defaults:

- Gross Margin 35%
- Operating Margin 15%
- tax reserve 20%
- runway safety 3 months

## Finance Trend

Six-month default trend includes:

- actual revenue
- forecast revenue
- forecast operating profit
- forecast gross margin

API supports up to 24 months.

## API

GET  `/api/v1/owner-finance?currency=EUR&month=YYYY-MM`
GET  `/api/v1/owner-finance/trend?currency=EUR&month=YYYY-MM&months=6`

POST `/api/v1/owner-finance/ledger`
POST `/api/v1/owner-finance/settings`

Existing data sources remain:

- Project Costing
- Purchase Orders
- Cash Events
- Treasury Balance
- Fixed Monthly Costs

## UI

New top-level Owner card:

`Owner Finance · P&L Intelligence`

Includes:

- financial KPI scorecard
- monthly Actual vs Forecast P&L
- Break-even
- 6-month trend
- financial alerts
- Project Profitability Ranking
- month selector
- revenue recognition entry
- operating expense entry
- finance settings

## 4.8 integration correction

4.9 also normalizes Owner Command loading so the 4.8 Procurement Automation Center is fetched in both:

- explicit `loadOwnerCommand()`
- lazy Owner Command render path

This removes a state-loading inconsistency from the previous build.

## Supabase

Prepared migration:

`supabase/migration_source/makster_owner_operations_4_9.sql`

New tables:

- owner_finance_ledger
- owner_finance_settings

Prepared smoke:

`supabase/tests/017_owner_operations_4_9_smoke.sql`

## Important boundary

This is management finance, not a statutory accounting/tax system.

Tax reserve is a configurable planning reserve.
Statutory tax/VAT/accounting treatment requires country-specific accounting rules and/or accounting-system integration.
