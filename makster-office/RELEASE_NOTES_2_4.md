# Makster AI 2.4 — Release Notes

## Unified branch
- Restored Change Intelligence 1.7 source into the active Visual/CAD branch.
- Restored Client Change Order & Approval 1.8 source into the active Visual/CAD branch.
- Adapted both to the current Commercial Engine 1.6 `BuiltCommercialPackage` model instead of replacing the newer commercial implementation with an old branch.

## Business workflow
- Quote list/lifecycle in one project.
- Accepted quote → revision-bound Commercial Contract Record.
- Payment schedule and paid-installment tracking.
- Revision-to-revision Change Impact Report.
- Deterministic requote from stored original pricing/terms context.
- Client-safe Change Order.
- One-time client approval token; hash-only persistence model.
- Client Accept/Decline and immutable ClientRevisionAuthorization.
- Manufacturing Approval commercial gate for changed revisions.

## UI
- New Business tab alongside Design / Engineering / Quote / Production.
- Contract status, revision mismatch, payment schedule, Requote and Change Orders visible in the current project.
- Customer offer / contract record / change order documents open as HTML.

## Security / correctness
- Invalid/expired Change Order token → HTTP 403.
- Commercial conflicts → HTTP 409.
- Invalid payment/client inputs → HTTP 422.
- Already-paid installments do not change after accepted Change Order.
- Customer Change Order does not leak cost/profit data.

## Persistence boundary
Prepared 1.7/1.8 Supabase migrations are included and adapted to `client_commercial_quotes`, but live Supabase was not modified and the demo runtime still keeps new business records in memory.
