# Makster AI 4.1.0 — Supabase Owner Operations + BOM Allocation + Supplier Quotes + Payment Calendar

## What changed

4.1 hardens the Owner Command Center from a demo-only file store into an organization-level persistence architecture suitable for Supabase, and connects warehouse stock directly to Engineering BOM demand.

## Supabase Owner Operations Store

New server implementation:
- `SupabaseOwnerOperationsStore`

When `SUPABASE_URL` and a server secret are configured, Makster uses Supabase for Owner Operations unless:
`MAKSTER_OWNER_OPERATIONS_STORE=file`

Supported server secret:
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The browser never receives this secret.

Prepared migration:
- `supabase/migration_source/makster_owner_operations_4_1.sql`

Tables:
- owner_warehouse_items
- owner_warehouse_reservations
- owner_supplier_profiles
- owner_supplier_quotes
- owner_cash_events
- owner_fixed_monthly_costs

Atomic server-only RPCs:
- owner_reserve_warehouse_stock
- owner_adjust_warehouse_stock
- owner_set_reservation_status

The reservation RPC locks the stock row before calculating free stock, preventing two parallel users from reserving the same units.

## BOM Auto Allocation

New cross-project engine:
`buildBomAllocationPlan`

Flow:
Engineering BOM -> aggregate same SKU/unit inside each project -> project queue priority -> existing hard reservations -> free warehouse stock -> shortage.

Important rules:
- existing reservations are protected first
- duplicate BOM lines for one SKU are aggregated
- earlier project queue positions receive free stock first
- later projects receive shortage instead of virtual/double-allocated stock
- shortages are explicit procurement needs

New endpoints:
- GET `/api/v1/bom-allocation-plan`
- POST `/api/v1/bom-allocation-plan/apply`

Apply creates real warehouse reservations from the proposed free-stock allocations.

## Supplier Quote Optimizer

Supplier Profile remains the long-term performance baseline.

4.1 adds actual Supplier Quotes:
- supplier
- SKU / quantity / unit
- quoted unit price
- delivery cost
- lead time
- validity

New endpoint:
- POST `/api/v1/supplier-quotes`

Comparison:
- GET `/api/v1/supplier-quotes/compare?sku=...&quantity=...&strategy=cheapest|fastest|optimal`

Cheapest ranks actual quoted total cost.
Fastest ranks actual quoted lead time.
Optimal uses relative real quote price, delivery speed and supplier reliability/defect history.

This is different from 4.0's supplier-profile ranking: 4.1 can compare concrete offers for a concrete shortage.

## Payment Calendar

New:
`buildPaymentCalendar`

Calendar merges:
- manual company Cash Events
- client receivables expected by delivery/installation date
- remaining supplier Purchase Order balances

Each row shows:
- date
- inflow/outflow
- category
- amount
- project/counterparty
- source
- cumulative running net

Endpoint:
- GET `/api/v1/payment-calendar`

## Owner Command UI

Owner Command now includes:
- BOM -> Warehouse Allocation
- shortage positions
- blocked projects
- projects fully allocatable from stock
- one-click Auto Allocate
- Supplier Quote entry for shortage
- Payment Calendar

## File-store fallback

The 4.0 persistent file store remains available for local/demo operation and is upgraded to Owner Operations 4.1 with supplier quotes.

## Staging smoke

Prepared:
- `supabase/tests/012_owner_operations_4_1_smoke.sql`

It validates the required tables and atomic RPC functions after staging migration.
