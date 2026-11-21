# Makster AI 3.1.0 — Purchasing & Supplier Orders

## Purpose

3.1 turns engineering requirements into controlled purchasing.

Sources:
- panel/material BOM from Engineering
- hardware BOM from Engineering
- appliances only when `procurementMode = makster_supplied`

Customer-supplied appliances remain engineering data but do NOT become Makster purchase requirements.

## Purchasing requirements

Each requirement has:
- kind: material / hardware / appliance
- source key
- description
- quantity/unit
- manufacturer/code when available
- optional verified suggested purchase price
- furniture/module/catalog traceability when available

Panel material requirements are expressed in m² from Engineering BOM.
Hardware keeps its engineering unit.
Makster-supplied appliances are 1 pcs per appliance binding.

## Supplier Orders

PurchaseOrder statuses:
- draft
- approved
- ordered
- partially_received
- received
- cancelled

Order lines store:
- item kind
- description
- quantity/unit
- unit price
- received quantity
- source traceability
- appliance catalog reference when applicable

## Money integration

Approved/ordered/received non-cancelled orders update:
`jobControl.money.committedPurchaseMinor`

This gives Job Control a real committed purchasing amount.

## Appliance policy

Makster preserves the furniture-first rule:
- customer_supplied -> no Makster supplier order
- makster_supplied -> purchase requirement
- undecided -> shown in procurement split, but not automatically ordered

A verified `pricing.purchasePrice` is used as the suggested purchasing price.
No price is invented when not verified.

## API

GET  /api/v1/projects/:projectId/purchasing
POST /api/v1/projects/:projectId/purchase-orders
POST /api/v1/projects/:projectId/purchase-orders/:orderId/status
POST /api/v1/projects/:projectId/purchase-orders/:orderId/lines/:lineId/receive

All write actions require `expectedRevision` and create a new Project Revision.

## UI

New Purchasing tab:
- Purchase Requirements
- unresolved counts
- appliance procurement split
- supplier orders
- ordered/received amounts
- draft -> approved -> ordered -> received flow

## Production Pack

New files when purchasing exists:
- purchasing.json
- supplier-orders.csv

These files are revision-specific.
