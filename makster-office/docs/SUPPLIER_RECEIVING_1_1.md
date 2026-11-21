# Makster 1.1 — Supplier & Receiving

## Goal

Close the external-production loop for workshops that order cutting, edging or drilling from another company.

```text
Project Revision
→ READY Outsource Production Pack
→ Supplier Order
→ sent / accepted / in_production / ready
→ Receiving by part_id
→ accepted / damaged / missing / wrong-*
→ completeness balance
→ targeted Rework Pack
```

## Supplier order binding

A supplier order freezes:

- project ID;
- revision number;
- Production Pack ID;
- SHA-256 of the Production Pack manifest;
- service preset;
- part dimensions/material labels/quantities;
- supplier identity, price and promised date when known.

If the Production Pack manifest changes after the order is created, `assertSupplierOrderMatchesPack()` fails with `supplier_order_pack_manifest_drift`.

## Controlled lifecycle

Allowed transitions:

```text
draft → sent → accepted → in_production → ready
                                      ↘ ready
ready → partially_received → received
ready → received
```

Cancellation is allowed before final receipt. Invalid jumps are rejected.

## Receiving model

Every receipt line references Makster `part_id` and records:

- quantity;
- disposition;
- note;
- optional photo file IDs.

Dispositions:

- accepted
- damaged
- missing
- wrong_size
- wrong_material
- wrong_edge
- wrong_drilling
- other

The system calculates per-part balances:

```text
ordered
accepted
damaged
missing
other rejected
outstanding
complete
```

`outstanding` is driven by accepted-good quantity, so a damaged part can later be replaced without corrupting the order quantity.

## Rework Pack

`buildReworkPack()` contains only parts that still have `outstanding > 0`.

Example test case:

```text
Order:      70 parts
Accepted:   68
Damaged:     1
Missing:     1
Outstanding: 2
Rework:      2 parts only
```

This prevents resending the entire project to the supplier when only two pieces need replacement.

## API

```text
POST /api/v1/projects/:projectId/supplier-orders
GET  /api/v1/supplier-orders
GET  /api/v1/supplier-orders/:orderId
POST /api/v1/supplier-orders/:orderId/status
POST /api/v1/supplier-orders/:orderId/receipts
GET  /api/v1/supplier-orders/:orderId/receiving-summary
POST /api/v1/supplier-orders/:orderId/rework-pack
```

The demo API keeps supplier state in memory. The Supabase migration defines persistent production tables; production writes should be server-side and organization-scoped.

## Supabase 1.1

Migration: `supabase/migration_source/makster_supplier_receiving_1_1.sql`

Adds:

- `suppliers`
- `outsource_production_order_lines`
- `outsource_production_order_events`
- `supplier_receipts`
- `supplier_receipt_lines`
- `supplier_rework_orders`

It also extends `outsource_production_orders` and removes the old one-order-per-pack uniqueness restriction so replacement/rework orders can coexist with the original order.
