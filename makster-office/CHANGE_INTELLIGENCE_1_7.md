# Makster 1.7 — Change Intelligence & Requote

> **2.4 integration note:** This module is now merged into Unified Business + CAD 2.4 and adapted to the active Commercial 1.6 `BuiltCommercialPackage` / `client_commercial_quotes` model. The conceptual trust rules below are preserved.

## Purpose
A client change must never trigger an opaque full recalculation. Makster compares immutable Project Revisions and explains the impact before a new commercial quote is issued.

## Deterministic pipeline
`Revision N → Engineering N → Quote N` compared with `Revision N+1 → Engineering N+1 → Requote N+1`.

The report contains four layers:
1. Project changes — dimensions, modules, contents, fronts, materials and hardware.
2. Engineering impact — physical part count, unique rows, panel area, hardware groups, machining and readiness.
3. BOM identity impact — added / removed / changed part and hardware requirement IDs.
4. Commercial impact — cost basis, net customer price, customer total, gross profit and gross margin deltas.

## Requote trust rule
A Requote reuses the exact immutable commercial source context of the base quote: cost book/version, service costs, pricing policy and customer terms. It never edits the old quote. A new Quote ID and fingerprint are created and linked using `commercial_quote_lineage`.

## Safety
- Target revision must be newer than the base revision.
- A target revision that is not Production Ready blocks Change Report release.
- A target commercial quote that is HOLD blocks Requote persistence.
- Old Quote financials remain immutable.
- Change reports are immutable and SHA-256 fingerprinted.

## Customer-safe Change Order
`buildCustomerChangeSummary()` creates a customer-facing summary containing only visible changes, previous total, new total and price delta. Internal cost basis, gross profit, margin and cost-line details are excluded.
